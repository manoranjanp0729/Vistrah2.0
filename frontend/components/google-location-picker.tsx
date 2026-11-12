'use client';
import {useEffect,useRef,useState} from 'react';
import {mountGoogleMap} from '../../shared/google-map-web';
import {googlePlaces,type GooglePlace,type GooglePoint} from '../../shared/google-location';
import {api} from '@/lib/api';

export const googleMapsWebKey=process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY??'';
export function GoogleLocationPicker({point,onPin,onPlace,disabled=false}:{point:GooglePoint;onPin:(p:GooglePoint)=>void;onPlace:(p:GooglePlace)=>void;disabled?:boolean}){
 const node=useRef<HTMLDivElement>(null),controller=useRef<Awaited<ReturnType<typeof mountGoogleMap>>|null>(null);
 const callbacks=useRef({point,onPin,onPlace,disabled});
 useEffect(()=>{callbacks.current={point,onPin,onPlace,disabled};},[point,onPin,onPlace,disabled]);
 const [query,setQuery]=useState(''),[items,setItems]=useState<GooglePlace[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);const epoch=useRef(0);
 useEffect(()=>{let alive=true;const element=node.current;if(!element)return;const invalidateRequests=()=>{epoch.current++;};
  void mountGoogleMap(element,googleMapsWebKey,callbacks.current.point,p=>{if(callbacks.current.disabled)return;epoch.current++;setBusy(false);setItems([]);callbacks.current.onPin(p);},()=>alive).then(map=>{if(alive){controller.current=map;map.update(callbacks.current.point);}else map.destroy();}).catch(()=>{if(alive)setError('Google Maps could not load. Use manual location.');});
  return()=>{alive=false;invalidateRequests();controller.current?.destroy();controller.current=null;};
 },[]);
 useEffect(()=>{controller.current?.update(point);},[point.latitude,point.longitude,point]);
 async function search(reverse=false){const generation=++epoch.current;setBusy(true);setError('');setItems([]);try{const rows=await googlePlaces(api,reverse?point:{query});const current=callbacks.current.point;if(generation===epoch.current&&(!reverse||(point.latitude===current.latitude&&point.longitude===current.longitude))){setItems(rows);if(!rows.length)setError('No locality found. Enter it manually.');}}catch{if(generation===epoch.current)setError('Place lookup is unavailable. Enter your location manually.');}finally{if(generation===epoch.current)setBusy(false);}}
 return <div className="form"><label>Search for an area or address<input value={query} maxLength={250} disabled={disabled||busy} onChange={e=>{epoch.current++;setBusy(false);setItems([]);setQuery(e.target.value);}}/></label><div className="button-row"><button type="button" className="button secondary" disabled={disabled||busy||query.trim().length<2} onClick={()=>void search()}>Search Google Maps</button><button type="button" className="button secondary" disabled={disabled||busy} onClick={()=>void search(true)}>Look up selected pin</button></div><div ref={node} className="location-map" aria-label="Google Maps location picker"/>
 {items.map((place,index)=><button type="button" className="button secondary" key={index} disabled={disabled} onClick={()=>{epoch.current++;setItems([]);onPlace(place);}}>{place.label}{place.postal_code?' · '+place.postal_code:''}</button>)}{error&&<p role="alert">{error}</p>}<p>Click the map to move the pin, then look up its locality or enter it manually.</p></div>;
}
