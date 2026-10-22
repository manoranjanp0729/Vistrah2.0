'use client';
import {UiText,UiSection} from "./localized-ui";

import {createContext,useCallback,useContext,useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {MapPin} from 'lucide-react';
import {api,ApiError} from '@/lib/api';
import {destinationLink} from '@/lib/destinations';
import {LocationMap} from './location-map';
import {lookupGpsPlace,providerBlocker,radii,requestGps,validPoint,type CustomerLocation,type Radius} from '@/lib/location';

export const defaultMapPoint={latitude:20.5937,longitude:78.9629};
const emptyLocation:CustomerLocation={latitude:NaN,longitude:NaN,locality:'',postal_code:'',address:'',landmark:''};

function useLocationState(){
  const [draft,setDraft]=useState(emptyLocation);
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

  // Preference data belongs only to the current account. Anonymous selections
  // can survive sign-in; an account change or sign-out clears private state.
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
          setDraft(location);setActive(location);setMessage('Using your explicitly saved location. Changes stay temporary until saved again.');
        }
      }catch{
        if(alive&&identityEpoch.current===preferenceEpoch&&edits.current===generation)setMessage('Saved location is unavailable. You can still choose a temporary location.');
      }
    }).catch(()=>{
      if(alive&&profileEpoch===identityEpoch.current)syncIdentity(null);
    });
    return()=>{alive=false;};
  },[path,syncIdentity]);

  function edit(values:Partial<CustomerLocation>){hasEdits.current=true;edits.current++;gpsGeneration.current++;setDraft(previous=>({...previous,...values}));}
  const confirmLocation=useCallback((location:CustomerLocation)=>{
    if(!validPoint(location)||location.locality.trim().length<2||!/^([0-9]{6})?$/.test(location.postal_code)){
      setError('Enter a valid locality, optional six-digit PIN and coordinates.');return false;
    }
    hasEdits.current=true;edits.current++;gpsGeneration.current++;setError('');setActive({...location});setDraft({...location});
    setMessage('Location is temporary unless you choose Save this location.');return true;
  },[]);
  async function gps(){
    const generation=++gpsGeneration.current;hasEdits.current=true;edits.current++;setError('');setMessage('');setBusy(true);
    try{
      const fix=await requestGps(navigator.geolocation);if(generation!==gpsGeneration.current)return;
      setDraft({...emptyLocation,...fix.point});setActive(null);
      const place=await lookupGpsPlace(fix.point);if(generation!==gpsGeneration.current)return;
      const chosen={...emptyLocation,...fix.point,locality:place.label,postal_code:place.postal_code};setDraft(chosen);setActive(chosen);
      setMessage(`Using ${place.label} temporarily. GPS accuracy: approximately ${Math.round(fix.accuracy)} metres.${fix.accuracy>100?' This position may be inaccurate; adjust the pin.':''} Save this location only if you want it remembered.`);
    }catch(e){if(generation===gpsGeneration.current)setError((e as Error).message);}
    finally{if(generation===gpsGeneration.current)setBusy(false);}
  }
  async function save(){
    if(!active)return;setBusy(true);setError('');
    try{await api('/me/location',{method:'PUT',body:JSON.stringify(active)});setMessage('Location saved to your account. You can change it or clear it.');}
    catch(e){setError(e instanceof ApiError&&e.status===401?'Sign in to save this location. Your selection remains temporary.':'Saving is unavailable. Your selection remains temporary. '+(e as Error).message);}
    finally{setBusy(false);}
  }
  async function clear(){
    hasEdits.current=true;edits.current++;gpsGeneration.current++;setActive(null);setDraft(emptyLocation);setBusy(true);setError('');
    try{await api('/me/location',{method:'DELETE'});setMessage('Saved and temporary locations cleared. Past enquiry addresses are retained.');}
    catch(e){
      if(e instanceof ApiError&&e.status===401)setMessage('Temporary location cleared.');
      else setError('Temporary location cleared. Saved location could not be cleared; retry Clear location. '+(e as Error).message);
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

/** Public preference controls only: no provider requests, maps, pins or enquiries. */
export function LocationChooser({expanded=false}:{expanded?:boolean}){
  const state=useCustomerLocation(),id=useId(),path=usePathname();const [open,setOpen]=useState(expanded);
  const {draft,active,radius,busy,error,message}=state;
  return <UiSection  className="customer-location-entry" aria-label="Customer location">
    <div className="location-entry-heading"><button type="button" className="button secondary" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}><MapPin size={18} aria-hidden="true"/><UiText value={"Choose your location"}/></button>
      <p><UiText value={active?`${active.locality}${active.postal_code?' · '+active.postal_code:''} · ${radius} km`:'Choose an area for nearby service discovery.'}/></p>
    </div>
    <p className="location-entry-privacy"><UiText value={"Location is temporary unless explicitly saved. GPS runs only when you choose “Use my location”. MapTiler receives coordinates for place lookup and maps. VISTRAH receives them when you search nearby providers or save a location."}/></p>
    <div id={id} hidden={!open}>
      <p>{providerBlocker}</p>
      {error&&<p className="notice error" role="alert"><UiText value={error}/>{error.startsWith('Sign in')&&<> <Link href={destinationLink('/login',path)}><UiText value={"Sign in"}/></Link></>}</p>}
      <p role="status"><UiText value={message}/></p>
      <button type="button" className="button secondary" onClick={()=>void state.gps()} disabled={busy}><UiText value={"Use my location"}/></button>
      {open&&<LocationMap point={validPoint(draft)?draft:defaultMapPoint} onPin={point=>{if(!busy)state.edit({...point,locality:'',postal_code:'',address:'',landmark:''});}} onView={()=>{}} onSelect={()=>{}}/>}
      <form className="form location-controls" onSubmit={event=>{event.preventDefault();state.confirmLocation(draft);}}>
        <div className="location-field-grid">
          <label><UiText value={"Manual address"}/><input value={draft.address} maxLength={500} disabled={busy} onChange={event=>state.edit({address:event.target.value})}/></label>
          <label><UiText value={"Locality"}/><input value={draft.locality} minLength={2} maxLength={150} required disabled={busy} onChange={event=>state.edit({locality:event.target.value})}/></label>
          <label><UiText value={"PIN code"}/><input value={draft.postal_code} pattern="[0-9]{6}" maxLength={6} disabled={busy} onChange={event=>state.edit({postal_code:event.target.value})}/></label>
          <label><UiText value={"Landmark"}/><input value={draft.landmark} maxLength={200} disabled={busy} onChange={event=>state.edit({landmark:event.target.value})}/></label>
          <label><UiText value={"Search latitude"}/><input type="number" step="any" min={-90} max={90} value={Number.isFinite(draft.latitude)?draft.latitude:''} disabled={busy} onChange={event=>state.edit({latitude:event.target.value===''?NaN:Number(event.target.value)})} required/></label>
          <label><UiText value={"Search longitude"}/><input type="number" step="any" min={-180} max={180} value={Number.isFinite(draft.longitude)?draft.longitude:''} disabled={busy} onChange={event=>state.edit({longitude:event.target.value===''?NaN:Number(event.target.value)})} required/></label>
        </div>
        <button className="button" disabled={busy}><UiText value={"Use this location"}/></button>
        <label htmlFor={id+'-radius'}><UiText value={"Search radius"}/></label><select id={id+'-radius'} value={radius} disabled={busy} onChange={event=>state.setRadius(Number(event.target.value) as Radius)}>{radii.map(value=><option key={value} value={value}>{value} <UiText value={"km"}/></option>)}</select>
      </form>
      <div className="button-row"><button type="button" className="button secondary" disabled={!active||busy} onClick={()=>void state.save()}><UiText value={"Save this location"}/></button><button type="button" className="button secondary" disabled={busy} onClick={()=>void state.clear()}><UiText value={"Clear location"}/></button></div>
      <p><UiText value={"Sellers receive only locality/PIN for enquiries unless you explicitly supply an exact address for that request. Your search point is never copied into an enquiry."}/></p>
    </div>
  </UiSection>;
}

