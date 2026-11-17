'use client';
import {UiText,UiSection} from "./localized-ui";
import {createContext,useCallback,useContext,useEffect,useId,useMemo,useRef,useState,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {MapPin} from 'lucide-react';
import {api,ApiError} from '@/lib/api';
import {destinationLink} from '@/lib/destinations';
import {googleMapsWebKey} from './google-location-picker';
import {MapFirstLocationPicker} from './vistrah-google-maps';
import {googlePlaces,googlePrivacy} from '../../shared/google-location';
import {DEFAULT_SELECTED_LOCATION,type SelectedLocation} from '../../shared/selected-location';
import {lookupGpsPlace,radii,requestGps,validPoint,type CustomerLocation,type Radius} from '@/lib/location';

export const defaultMapPoint={latitude:12.9716,longitude:77.5946};
const emptyLocation:CustomerLocation={
  latitude:defaultMapPoint.latitude,
  longitude:defaultMapPoint.longitude,
  locality:'Bengaluru',
  postal_code:'',
  address:'Bengaluru, Karnataka',
  landmark:'',
};

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
  const [radius,setRadius]=useState<Radius>(5);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const edits=useRef(0),gpsGeneration=useRef(0),identity=useRef<number|null|undefined>(undefined);
  const hasEdits=useRef(false),identityEpoch=useRef(0);
  const path=usePathname();

  const syncIdentity=useCallback((id:number|null)=>{
    if(identity.current===id)return;
    identityEpoch.current++;
    if(identity.current!=null){
      edits.current++;gpsGeneration.current++;hasEdits.current=false;
      setActive(null);setDraft(emptyLocation);setRadius(5);setMessage('');setError('');
    }
    identity.current=id;
  },[]);

  useEffect(()=>{
    let alive=true;const profileEpoch=identityEpoch.current;
    api<{id:number}>('/me').then(async user=>{
      if(!alive||profileEpoch!==identityEpoch.current)return;
      syncIdentity(user.id);
      if(hasEdits.current)return;
      const generation=edits.current,preferenceEpoch=identityEpoch.current;
      try{
        const {location}=await api<{location:CustomerLocation|null}>('/me/location');
        if(alive&&identityEpoch.current===preferenceEpoch&&edits.current===generation&&location&&validPoint(location)){
          setDraft(location);setActive(location);setMessage('Using your saved account location. Changes stay temporary until saved again.');
        }
      }catch{
        if(alive&&identityEpoch.current===preferenceEpoch&&edits.current===generation)setMessage('Saved location is unavailable. Choose a temporary location below.');
      }
    }).catch(()=>{
      if(alive&&profileEpoch===identityEpoch.current)syncIdentity(null);
    });
    return()=>{alive=false;};
  },[path,syncIdentity]);

  const edit=useCallback((values:Partial<CustomerLocation>)=>{
    hasEdits.current=true;edits.current++;gpsGeneration.current++;
    setDraft(previous=>({...previous,...values}));
  },[]);

  const confirmLocation=useCallback((location:CustomerLocation)=>{
    if(!validPoint(location)||location.locality.trim().length<2||!/^([0-9]{6})?$/.test(location.postal_code)){
      setError('Select an area on the map or enter a locality (and optional 6-digit PIN).');return false;
    }
    hasEdits.current=true;edits.current++;gpsGeneration.current++;setError('');
    setActive({...location});setDraft({...location});
    setMessage(`Location confirmed: ${location.locality}${location.postal_code?` (${location.postal_code})`:''}. Temporary unless saved to your account.`);
    return true;
  },[]);

  async function gps(){
    const generation=++gpsGeneration.current;hasEdits.current=true;edits.current++;setError('');setMessage('');setBusy(true);
    try{
      const fix=await requestGps(navigator.geolocation);if(generation!==gpsGeneration.current)return;
      setDraft({...emptyLocation,...fix.point});setActive(null);
      const place=googleMapsWebKey?(await googlePlaces(api,fix.point))[0]:await lookupGpsPlace(fix.point);if(generation!==gpsGeneration.current)return;
      if(!place)throw new Error('No locality found. Select a city chip or enter locality manually.');
      const chosen:CustomerLocation={...emptyLocation,...fix.point,locality:place.label,postal_code:place.postal_code,...(googleMapsWebKey?{source:'google' as const}:{})};
      setDraft(chosen);setActive(chosen);
      setMessage(`Using ${place.label} temporarily (GPS ~${Math.round(fix.accuracy)}m).`);
    }catch(e){if(generation===gpsGeneration.current)setError((e as Error).message);}
    finally{if(generation===gpsGeneration.current)setBusy(false);}
  }

  async function save(){
    if(active?.source==='google'){setError('Google search results stay temporary; edit locality/PIN manually to save permanently.');return;}
    if(!active)return;setBusy(true);setError('');
    try{await api('/me/location',{method:'PUT',body:JSON.stringify(active)});setMessage('Location saved to your account.');}
    catch(e){setError(e instanceof ApiError&&e.status===401?'Sign in to save this location. Your selection remains active for this session.':'Saving is unavailable. '+(e as Error).message);}
    finally{setBusy(false);}
  }

  async function clear(){
    hasEdits.current=true;edits.current++;gpsGeneration.current++;setActive(null);setDraft(emptyLocation);setBusy(true);setError('');
    try{await api('/me/location',{method:'DELETE'});setMessage('Saved and temporary locations cleared.');}
    catch(e){
      if(e instanceof ApiError&&e.status===401)setMessage('Temporary location cleared.');
      else setError('Temporary location cleared. Saved location could not be cleared; retry Clear location.');
    }finally{setBusy(false);}
  }

  return {draft,active,radius,setRadius,busy,error,message,edit,confirmLocation,gps,save,clear,syncIdentity};
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

export function LocationChooser({expanded=false}:{expanded?:boolean}){
  const state=useCustomerLocation(),id=useId(),path=usePathname();
  const [open,setOpen]=useState(expanded);
  const {draft,active,radius,busy,error,message}=state;

  const selectedValue=useMemo(()=>customerToSelected(draft,radius),[draft,radius]);

  function handleSelectedChange(next:SelectedLocation){
    const nextRadius=(radii as readonly number[]).includes(next.radiusKm)?(next.radiusKm as Radius):radius;
    if(nextRadius!==radius)state.setRadius(nextRadius);
    state.edit(selectedToCustomer(next));
  }

  return (
    <UiSection className="customer-location-entry" aria-label="Customer location">
      {!expanded&&(
        <div className="location-entry-heading">
          <button type="button" className="button secondary" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}>
            <MapPin size={18} aria-hidden="true"/>
            <UiText value={active?`${active.locality} · ${radius} km`:'Choose your location'}/>
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
            onConfirm={confirmed=>{
              const nextRadius=(radii as readonly number[]).includes(confirmed.radiusKm)?(confirmed.radiusKm as Radius):radius;
              state.setRadius(nextRadius);
              state.confirmLocation(selectedToCustomer(confirmed));
            }}
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
                  {googleMapsWebKey?googlePrivacy:<UiText value={"Location stays temporary unless saved. GPS runs only when you tap Use Current GPS. Sellers receive only locality/PIN unless you explicitly enter a service address."}/>}
                </small>
              </div>
            }
          />
        )}
      </div>
    </UiSection>
  );
}
