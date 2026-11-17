'use client';
import {UiText,UiSection} from "./localized-ui";
import {createContext,useCallback,useContext,useEffect,useId,useMemo,useRef,useState,type ReactNode} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import Link from 'next/link';
import {MapPin} from 'lucide-react';
import {api,ApiError} from '@/lib/api';
import {destinationLink} from '@/lib/destinations';
import {googleMapsWebKey} from './google-location-picker';
import {MapFirstLocationPicker,reverseGeocodePoint} from './vistrah-google-maps';
import {googlePlaces,googlePrivacy} from '../../shared/google-location';
import {DEFAULT_SELECTED_LOCATION,isValidCoordinatePair,type SelectedLocation} from '../../shared/selected-location';
import {lookupGpsPlace,radii,requestGps,validPoint,type CustomerLocation,type Radius} from '@/lib/location';

export const WEB_LOCATION_STORAGE_KEY='vistrah.selected_location.v1';
export const defaultMapPoint={latitude:12.9716,longitude:77.5946};

const emptyLocation:CustomerLocation={
  latitude:defaultMapPoint.latitude,
  longitude:defaultMapPoint.longitude,
  locality:'Bengaluru',
  postal_code:'',
  address:'Bengaluru, Karnataka',
  landmark:'',
};

function readStoredWebLocation():SelectedLocation|null{
  if(typeof window==='undefined'||!window.localStorage)return null;
  try{
    const raw=window.localStorage.getItem(WEB_LOCATION_STORAGE_KEY);
    if(!raw)return null;
    const parsed=JSON.parse(raw) as Partial<SelectedLocation>;
    if(typeof parsed.latitude!=='number'||typeof parsed.longitude!=='number')return null;
    if(!isValidCoordinatePair(parsed.latitude,parsed.longitude))return null;
    const locality=String(parsed.locality||parsed.city||'').trim();
    if(!locality)return null;
    return {
      latitude:parsed.latitude,
      longitude:parsed.longitude,
      formattedAddress:String(parsed.formattedAddress||locality),
      locality,
      city:String(parsed.city||''),
      state:String(parsed.state||'Karnataka'),
      pincode:String(parsed.pincode||''),
      landmark:String(parsed.landmark||''),
      radiusKm:typeof parsed.radiusKm==='number'&&parsed.radiusKm>0?parsed.radiusKm:5,
      source:parsed.source,
    };
  }catch{
    return null;
  }
}

function writeStoredWebLocation(sel:SelectedLocation|null){
  if(typeof window==='undefined'||!window.localStorage)return;
  try{
    if(!sel)window.localStorage.removeItem(WEB_LOCATION_STORAGE_KEY);
    else window.localStorage.setItem(WEB_LOCATION_STORAGE_KEY,JSON.stringify(sel));
  }catch{
    // Ignore private-mode storage quota errors.
  }
}

function customerToSelected(loc:CustomerLocation,radiusKm:Radius):SelectedLocation{
  const hasPoint=validPoint(loc);
  return {
    latitude:hasPoint?loc.latitude:DEFAULT_SELECTED_LOCATION.latitude,
    longitude:hasPoint?loc.longitude:DEFAULT_SELECTED_LOCATION.longitude,
    formattedAddress:loc.address||loc.locality||DEFAULT_SELECTED_LOCATION.formattedAddress,
    locality:loc.locality||DEFAULT_SELECTED_LOCATION.locality,
    city:loc.locality.split(',').pop()?.trim()||DEFAULT_SELECTED_LOCATION.city,
    state:'Karnataka',
    pincode:loc.postal_code||'',
    landmark:loc.landmark||'',
    radiusKm,
    source:loc.source==='google'?'google':'manual',
  };
}

function selectedToCustomer(sel:SelectedLocation):CustomerLocation{
  return {
    latitude:sel.latitude,
    longitude:sel.longitude,
    locality:sel.locality.trim(),
    postal_code:sel.pincode.trim(),
    address:sel.formattedAddress.trim(),
    landmark:sel.landmark.trim(),
    ...(sel.source==='google'?{source:'google' as const}:{}),
  };
}

function useLocationState(){
  const [draft,setDraft]=useState<CustomerLocation>(emptyLocation);
  const [active,setActive]=useState<CustomerLocation|null>(null);
  const [radius,setRadiusState]=useState<Radius>(5);
  const [detecting,setDetecting]=useState(false);
  const [locationRevision,setLocationRevision]=useState(0);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const edits=useRef(0),gpsGeneration=useRef(0),identity=useRef<number|null|undefined>(undefined);
  const hasEdits=useRef(false),identityEpoch=useRef(0),autoDetectRan=useRef(false);
  const path=usePathname();

  const setRadius=useCallback((nextRadius:Radius)=>{
    setRadiusState(nextRadius);
    setLocationRevision(r=>r+1);
  },[]);

  const syncIdentity=useCallback((id:number|null)=>{
    if(identity.current===id)return;
    identityEpoch.current++;
    if(identity.current!=null){
      edits.current++;gpsGeneration.current++;hasEdits.current=false;
      setActive(null);setDraft(emptyLocation);setRadiusState(5);setMessage('');setError('');
      writeStoredWebLocation(null);
      setLocationRevision(r=>r+1);
    }
    identity.current=id;
  },[]);

  // 1. Hydrate from localStorage + non-blocking 8s launch auto-detection when empty
  useEffect(()=>{
    let alive=true;
    const stored=readStoredWebLocation();
    if(stored){
      const nextRadius=(radii as readonly number[]).includes(stored.radiusKm)?(stored.radiusKm as Radius):5;
      const cust=selectedToCustomer(stored);
      hasEdits.current=true;
      setRadiusState(nextRadius);
      setDraft(cust);
      setActive(cust);
      setLocationRevision(r=>r+1);
      return;
    }

    if(autoDetectRan.current||typeof navigator==='undefined'||!navigator.geolocation)return;
    autoDetectRan.current=true;
    const bootEdits=edits.current;
    setDetecting(true);

    let settled=false;
    const timer=setTimeout(()=>{
      if(!settled){settled=true;if(alive)setDetecting(false);}
    },8000);

    navigator.geolocation.getCurrentPosition(
      pos=>{
        if(settled||!alive||edits.current!==bootEdits)return;
        settled=true;
        clearTimeout(timer);
        const lat=Number(pos.coords.latitude.toFixed(6));
        const lon=Number(pos.coords.longitude.toFixed(6));
        if(!isValidCoordinatePair(lat,lon)){
          setDetecting(false);
          return;
        }
        void (async()=>{
          try{
            const resolved=await reverseGeocodePoint({latitude:lat,longitude:lon});
            if(!alive||edits.current!==bootEdits)return;
            const fallbackLabel=`${lat.toFixed(3)}° N, ${lon.toFixed(3)}° E`;
            const sel:SelectedLocation={
              latitude:lat,
              longitude:lon,
              locality:resolved?.locality||fallbackLabel,
              formattedAddress:resolved?.formattedAddress||fallbackLabel,
              city:resolved?.city||'',
              state:resolved?.state||'Karnataka',
              pincode:resolved?.postalCode||'',
              landmark:'',
              radiusKm:5,
              source:'gps',
            };
            const cust=selectedToCustomer(sel);
            setDraft(cust);
            setActive(cust);
            writeStoredWebLocation(sel);
            setLocationRevision(r=>r+1);
          }catch{
            // Fail silently without blocking UI.
          }finally{
            if(alive)setDetecting(false);
          }
        })();
      },
      ()=>{
        if(!settled){
          settled=true;
          clearTimeout(timer);
          if(alive)setDetecting(false);
        }
      },
      {enableHighAccuracy:false,timeout:8000,maximumAge:60000},
    );

    return()=>{alive=false;clearTimeout(timer);};
  },[]);

  // 2. Account saved location fallback when signed in and local selection is empty
  useEffect(()=>{
    let alive=true;const profileEpoch=identityEpoch.current;
    api<{id:number}>('/me').then(async user=>{
      if(!alive||profileEpoch!==identityEpoch.current)return;
      syncIdentity(user.id);
      if(hasEdits.current||readStoredWebLocation())return;
      const generation=edits.current,preferenceEpoch=identityEpoch.current;
      try{
        const {location}=await api<{location:CustomerLocation|null}>('/me/location');
        if(alive&&identityEpoch.current===preferenceEpoch&&edits.current===generation&&location&&validPoint(location)){
          setDraft(location);setActive(location);
          writeStoredWebLocation(customerToSelected(location,radius));
          setLocationRevision(r=>r+1);
        }
      }catch{
        // Silent fallback.
      }
    }).catch(()=>{
      if(alive&&profileEpoch===identityEpoch.current)syncIdentity(null);
    });
    return()=>{alive=false;};
  },[path,syncIdentity,radius]);

  const edit=useCallback((values:Partial<CustomerLocation>)=>{
    hasEdits.current=true;edits.current++;gpsGeneration.current++;
    setDraft(previous=>({...previous,...values}));
  },[]);

  const confirmLocation=useCallback((location:CustomerLocation,nextRadius?:Radius)=>{
    if(!validPoint(location)||location.locality.trim().length<2||!/^([0-9]{6})?$/.test(location.postal_code)){
      setError('Select an area on the map or enter a locality (and optional 6-digit PIN).');return false;
    }
    const appliedRadius=nextRadius??radius;
    hasEdits.current=true;edits.current++;gpsGeneration.current++;setError('');
    setRadiusState(appliedRadius);
    setActive({...location});
    setDraft({...location});
    writeStoredWebLocation(customerToSelected(location,appliedRadius));
    setLocationRevision(r=>r+1);
    setMessage(`Location set to ${location.locality}${location.postal_code?` (${location.postal_code})`:''}.`);
    return true;
  },[radius]);

  async function gps(){
    const generation=++gpsGeneration.current;hasEdits.current=true;edits.current++;setError('');setMessage('');setBusy(true);
    try{
      const fix=await requestGps(navigator.geolocation);if(generation!==gpsGeneration.current)return;
      setDraft({...emptyLocation,...fix.point});setActive(null);
      const place=googleMapsWebKey?(await googlePlaces(api,fix.point))[0]:await lookupGpsPlace(fix.point);if(generation!==gpsGeneration.current)return;
      if(!place)throw new Error('No locality found. Select a city chip or enter locality manually.');
      const chosen:CustomerLocation={...emptyLocation,...fix.point,locality:place.label,postal_code:place.postal_code,...(googleMapsWebKey?{source:'google' as const}:{})};
      setDraft(chosen);setActive(chosen);
      writeStoredWebLocation(customerToSelected(chosen,radius));
      setLocationRevision(r=>r+1);
      setMessage(`Using ${place.label} (GPS ~${Math.round(fix.accuracy)}m).`);
    }catch(e){if(generation===gpsGeneration.current)setError((e as Error).message);}
    finally{if(generation===gpsGeneration.current)setBusy(false);}
  }

  async function save(){
    if(active?.source==='google'){setError('Google search results stay saved in this browser; edit locality/PIN manually to sync to account.');return;}
    if(!active)return;setBusy(true);setError('');
    try{await api('/me/location',{method:'PUT',body:JSON.stringify(active)});setMessage('Location saved to your VISTRAH account.');}
    catch(e){setError(e instanceof ApiError&&e.status===401?'Sign in to sync this location to your account.':'Saving is unavailable. '+(e as Error).message);}
    finally{setBusy(false);}
  }

  async function clear(){
    hasEdits.current=true;edits.current++;gpsGeneration.current++;setActive(null);setDraft(emptyLocation);
    writeStoredWebLocation(null);
    setLocationRevision(r=>r+1);
    setBusy(true);setError('');
    try{await api('/me/location',{method:'DELETE'});setMessage('Saved and browser locations cleared.');}
    catch(e){
      if(e instanceof ApiError&&e.status===401)setMessage('Location cleared.');
      else setError('Browser location cleared; account location could not be cleared.');
    }finally{setBusy(false);}
  }

  return {draft,active,radius,setRadius,detecting,locationRevision,busy,error,message,edit,confirmLocation,gps,save,clear,syncIdentity};
}

type LocationState=ReturnType<typeof useLocationState>;
const CustomerLocationContext=createContext<LocationState|null>(null);
export function CustomerLocationProvider({children}:{children:ReactNode}){
  const value=useLocationState();return <CustomerLocationContext.Provider value={value}>{children}</CustomerLocationContext.Provider>;
}
export function useCustomerLocation(){
  const value=useContext(CustomerLocationContext);if(!value)throw new Error('Customer location provider missing');return value;
}
export function useOptionalCustomerLocation(){
  return useContext(CustomerLocationContext);
}

export function LocationChooser({expanded=false,onCommitted}:{expanded?:boolean;onCommitted?:()=>void}){
  const state=useCustomerLocation(),id=useId(),path=usePathname(),router=useRouter();
  const [open,setOpen]=useState(expanded);
  const {draft,active,radius,busy,error,message}=state;

  const selectedValue=useMemo(()=>customerToSelected(active??draft,radius),[active,draft,radius]);

  function handleSelectedChange(next:SelectedLocation){
    const nextRadius=(radii as readonly number[]).includes(next.radiusKm)?(next.radiusKm as Radius):radius;
    if(nextRadius!==radius)state.setRadius(nextRadius);
    state.edit(selectedToCustomer(next));
  }

  function commitAndDismiss(confirmed:SelectedLocation){
    const nextRadius=(radii as readonly number[]).includes(confirmed.radiusKm)?(confirmed.radiusKm as Radius):radius;
    const ok=state.confirmLocation(selectedToCustomer(confirmed),nextRadius);
    if(!ok)return;
    if(onCommitted){
      onCommitted();
      return;
    }
    if(!expanded){
      setOpen(false);
      return;
    }
    if(path==='/location'){
      if(typeof window!=='undefined'&&window.history.length>1){
        router.back();
      }else{
        router.push('/');
      }
    }
  }

  return (
    <UiSection className="customer-location-entry" aria-label="Customer location">
      {!expanded&&(
        <div className="location-entry-heading">
          <button type="button" className="button secondary" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}>
            <MapPin size={18} aria-hidden="true"/>
            <UiText value={active?`${active.locality} · ${radius} km`:'Select Location'}/>
          </button>
          <p className="tabular-nums">
            <UiText value={active?`${active.locality}${active.postal_code?' · '+active.postal_code:''} · within ${radius} km`:'Select your area on the map for nearby service discovery.'}/>
          </p>
        </div>
      )}

      <div id={id} hidden={!open}>
        {error&&(
          <p className="notice error" role="alert">
            <UiText value={error}/>
            {error.startsWith('Sign in')&&<> <Link href={destinationLink('/login',path)}><UiText value={"Sign in"}/></Link></>}
          </p>
        )}
        {message&&<p className="notice" role="status"><UiText value={message}/></p>}

        {open&&(
          <MapFirstLocationPicker
            mode="customer"
            value={selectedValue}
            onChange={handleSelectedChange}
            onConfirm={commitAndDismiss}
            onQuickCommit={commitAndDismiss}
            confirmLabel="Confirm Location"
            radiusOptions={radii}
            disabled={busy}
            busy={busy}
            secondaryActions={
              <div style={{display:'grid',gap:8}}>
                <div className="button-row">
                  <button type="button" className="button secondary" disabled={!active||busy||active.source==='google'} onClick={()=>void state.save()}>
                    <UiText value={"Save to account"}/>
                  </button>
                  <button type="button" className="button secondary" disabled={busy} onClick={()=>void state.clear()}>
                    <UiText value={"Clear location"}/>
                  </button>
                </div>
                <small style={{color:'var(--text-secondary)',lineHeight:1.45}}>
                  {googleMapsWebKey?googlePrivacy:<UiText value={"Your selected area is saved in this browser so every page and the header stay synchronized."}/>}
                </small>
              </div>
            }
          />
        )}
      </div>
    </UiSection>
  );
}
