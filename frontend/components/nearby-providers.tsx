'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {api,ApiError} from '@/lib/api';
import {urls} from '@/lib/urls';
import type {ServiceContext} from '@/lib/types';
import {LatestSearch,validPoint,type Point,type NearbyResult} from '@/lib/location';
import {LocationMap} from './location-map';
import {LocationChooser,useCustomerLocation,defaultMapPoint} from './customer-location';
import {Notice} from './ui';
import {ServiceAccessState} from './service-access';
import {HorizontalCarousel} from './horizontal-carousel';

export function NearbyProviders({context,carousel=false}:{context:ServiceContext;carousel?:boolean}){
  const {draft,active,radius,busy,edit,confirmLocation}=useCustomerLocation();
  const [view,setView]=useState<Point>(defaultMapPoint);
  const [searchState,setSearchState]=useState<{key:string;result:NearbyResult|null;error:string}|null>(null);const [selected,setSelected]=useState<number|null>(null);
  const [access,setAccess]=useState(0);
  const [google,setGoogle]=useState<{key:string;status:string;places:Array<{place_id:string;name:string;address:string;google_maps_url?:string;rating?:number;source:string}>}|null>(null);const search=useRef(new LatestSearch());
  const filterKey=JSON.stringify([context.service.id,active?.latitude,active?.longitude,radius]);
  const [paging,setPaging]=useState({key:'',page:1});const page=paging.key===filterKey?paging.page:1;
  const searchKey=JSON.stringify([context.service.id,active?.latitude,active?.longitude,radius,page]);
  const result=searchState?.key===searchKey?searchState.result:null;
  const loading=!!active&&searchState?.key!==searchKey;
  useEffect(()=>{
    if(!active){return;}
    const controller=new AbortController();
    api<{status:string;places:Array<{place_id:string;name:string;address:string;google_maps_url?:string;rating?:number;source:string}>}>(`/services/${context.service.id}/google-places`,{method:'POST',signal:controller.signal,body:JSON.stringify({latitude:active.latitude,longitude:active.longitude,radius_km:radius,page:1})}).then(data=>{if(!controller.signal.aborted)setGoogle({key:filterKey,...data});}).catch(()=>{if(!controller.signal.aborted)setGoogle({key:filterKey,status:'unavailable',places:[]});});
    return()=>controller.abort();
  },[active,context.service.id,radius,filterKey]);
  const failure=searchState?.key===searchKey?searchState.error:'';
  useEffect(()=>{
    if(!active){search.current.cancel();return;}
    let alive=true;
    search.current.run(signal=>api<NearbyResult>(`/services/${context.service.id}/nearby`,{method:'POST',signal,body:JSON.stringify({latitude:active.latitude,longitude:active.longitude,radius_km:radius,page})})).then(response=>{if(alive&&response.current){setSearchState({key:searchKey,result:response.value,error:''});setSelected(null);}}).catch(e=>{if(alive){if(e instanceof ApiError&&[401,403].includes(e.status))setAccess(e.status);else setSearchState({key:searchKey,result:null,error:(e as Error).message});}});
    const current=search.current;return()=>{alive=false;current.cancel();};
  },[active,radius,page,context.service.id,searchKey]);
  const items=useMemo(()=>result?[...result.nearby,...result.also_serves]:[],[result]);
  function select(id:number){setSelected(id);document.getElementById(`nearby-provider-${id}`)?.scrollIntoView({block:'nearest'});}
  if(access)return <ServiceAccessState status={access} next={urls.providers(context.category,context.subcategory,context.service)}/>;
  return <section className="nested-section" aria-label="Nearby provider search"><h2>Find providers near your location</h2><LocationChooser expanded/>{failure&&<Notice error message={failure}/>}
    <LocationMap point={validPoint(draft)?draft:defaultMapPoint} items={items} selectedId={result?selected:null} onPin={point=>edit(point)} onView={setView} onSelect={select}/><button type="button" className="button secondary" disabled={busy} onClick={()=>confirmLocation({...draft,...view})}>Search this area</button><p>Panning leaves results unchanged. Search this area uses the map centre; confirm locality/PIN for the new area first.</p>
    {active&&<p>Searching {active.locality}{active.postal_code?` · ${active.postal_code}`:''}, within {radius} km. Distances are straight-line business distances, not travel distances.</p>}{loading&&<p role="status">Searching eligible providers…</p>}
    {result&&(['nearby','also_serves'] as const).map(group=><div key={group}><h3>{group==='nearby'?'Nearby providers':'Also serves your area'}</h3>{!result[group].length&&<p>{group==='nearby'?'No eligible covering providers within this radius.':'No farther covering providers on this page.'}</p>}<ProviderResults carousel={carousel} label={group==='nearby'?'Nearby providers':'Also serves your area'}>{result[group].map(item=><article id={`nearby-provider-${item.id}`} key={item.id} className={`provider-card${selected===item.id?' selected-provider':''}`} aria-current={selected===item.id?'true':undefined}><h4>{item.company}</h4><p>{item.location} · {item.distance_km.toFixed(2)} km straight-line</p>{item.description&&<p>{item.description}</p>}<button type="button" className="text-link" onClick={()=>select(item.id)}>Show {item.company} on map</button><Link href={urls.provider(context.category,context.subcategory,context.service,item)}>View provider</Link></article>)}</ProviderResults></div>)}{result&&(result.has_more_nearby||result.has_more_also_serves||page>1)&&<div className="button-row"><button disabled={page===1||loading} onClick={()=>setPaging({key:filterKey,page:page-1})}>Previous results</button><span>Page {page}</span><button disabled={(!result.has_more_nearby&&!result.has_more_also_serves)||loading} onClick={()=>setPaging({key:filterKey,page:page+1})}>More results</button></div>}
{active&&google?.key===filterKey&&google.places.length>0&&<div><h3>More businesses on Google Maps</h3><p>Google Maps listings are external businesses, not VISTRAH-verified providers. Confirm service availability directly with each business. Google Maps attribution applies.</p><ProviderResults carousel={carousel} label="Google Maps businesses">{google.places.map(place=><article className="provider-card" key={place.place_id}><h4>{place.name}</h4><p>{place.address}</p>{typeof place.rating==='number'&&<p>Google rating: {place.rating.toFixed(1)}</p>}{place.google_maps_url&&<a href={place.google_maps_url} target="_blank" rel="noopener noreferrer">View on Google Maps</a>}</article>)}</ProviderResults></div>}
  </section>;
}

function ProviderResults({carousel,label,children}:{carousel:boolean;label:string;children:React.ReactNode}){return carousel?<HorizontalCarousel label={label}>{children}</HorizontalCarousel>:<div className="provider-grid">{children}</div>;}
