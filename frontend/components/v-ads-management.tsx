'use client';
import {UiText} from "./localized-ui";
import {useRef,useState} from 'react';
import {api} from '@/lib/api';
import {MapFirstLocationPicker} from './vistrah-google-maps';
import {SELLER_COVERAGE_RADII,type SelectedLocation} from '../../shared/selected-location';
import type {AdvertiserAccount,SellerVideo} from '../../shared/v-ads';
import {managementClient,parseTargetingInput,type AdTargeting,type History,type Performance} from '../../shared/v-ads-management';
const client=managementClient(api);
export function AdvertiserManagement({account,onChanged}:{account:AdvertiserAccount;onChanged:()=>void|Promise<void>}){
 const [name,setName]=useState(account.name),[description,setDescription]=useState(account.description??''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [history,setHistory]=useState<History|null>(null);const lock=useRef(false);
 async function action(work:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await work();}catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}}
 async function loadHistory(page=1){await action(async()=>{const next=await client.history(account.id,page);setHistory(old=>page===1?next:{...next,items:[...(old?.items??[]),...next.items]});});}
 return <div>{account.status==='SUSPENDED'?<p><UiText value={"Suspended accounts require administrator review."}/></p>:<details><summary><UiText value={"Edit advertiser profile"}/></summary><p><UiText value={"Saving changes sends the profile for review and hides its approved videos until the account is approved again. The handle stays unchanged."}/></p><form onSubmit={event=>{event.preventDefault();void action(async()=>{await client.profile(account,name,description);await onChanged();});}}><label><UiText value={"Advertiser name"}/><input required minLength={2} maxLength={120} value={name} onChange={event=>setName(event.target.value)}/></label><label><UiText value={"Description"}/><textarea maxLength={2000} value={description} onChange={event=>setDescription(event.target.value)}/></label><button disabled={busy||!account.review_token||name.trim().length<2}><UiText value={"Save and request review"}/></button></form></details>}
 <button type="button" disabled={busy} onClick={()=>void loadHistory()}><UiText value={"Account decisions"}/></button>{error&&<p role="alert"><UiText value={error}/></p>}{history&&<><ul>{history.items.map(item=><li key={item.id}>{item.action} · {item.created_at}<p>{item.details.reason}</p></li>)}</ul>{!history.items.length&&<p><UiText value={"No decisions recorded yet."}/></p>}{history.has_more&&<button disabled={busy} onClick={()=>void loadHistory(history.page+1)}><UiText value={"More decisions"}/></button>}</>}</div>;
}
export function VideoManagement({video,onChanged}:{video:SellerVideo;onChanged:()=>void|Promise<void>}){
 const [editing,setEditing]=useState(false),[title,setTitle]=useState(video.title),[description,setDescription]=useState(video.description??'');
 const [showAnalytics,setShowAnalytics]=useState(false);
 const [showTargeting,setShowTargeting]=useState(false),[targeting,setTargeting]=useState<AdTargeting|null>(null),[loadingTargeting,setLoadingTargeting]=useState(false);
 const [lat,setLat]=useState(''),[lon,setLon]=useState(''),[radiusKm,setRadiusKm]=useState(''),[regionsText,setRegionsText]=useState(''),[targetingNotice,setTargetingNotice]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 async function run(work:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await work();await onChanged();}catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}}
 async function toggleTargeting(){
  if(showTargeting){setShowTargeting(false);return;}
  setShowTargeting(true);setTargetingNotice('');setError('');setLoadingTargeting(true);
  try{
   const state=await client.targeting(video.id);setTargeting(state);
   const seed=state.pending_revision??state.active_revision??state.latest_revision;
   if(seed){setLat(String(seed.latitude));setLon(String(seed.longitude));setRadiusKm(String(seed.radius_km));setRegionsText(seed.target_regions.join(', '));}
  }catch(e){setError((e as Error).message);}finally{setLoadingTargeting(false);}
 }
 if(video.status==='REMOVED')return <>
  {video.upload_id&&video.media_status==='VALIDATED'&&<button type="button" disabled={busy} onClick={()=>void run(()=>client.release(video.upload_id!) as Promise<void>)}><UiText value={"Release private upload"}/></button>}
  {error&&<p role="alert"><UiText value={error}/></p>}
 </>;
 const views=video.views??0;
 const likes=video.likes??0;
 const comments=video.comments??0;
 const engagementRate=views>0?(((likes+comments)/views)*100).toFixed(1)+'%':'0.0%';
 return <div style={{display:'grid',gap:10}}>
  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
   <button type="button" disabled={busy} onClick={()=>setShowAnalytics(v=>!v)}><UiText value={showAnalytics?'Hide Analytics':'Analytics'}/></button>
   <button type="button" disabled={busy||loadingTargeting} onClick={()=>void toggleTargeting()}><UiText value={showTargeting?'Hide Geo Targeting':'Geo Targeting'}/></button>
   <button type="button" disabled={busy} onClick={()=>{setTitle(video.title);setDescription(video.description??'');setEditing(v=>!v);}}><UiText value={editing?'Cancel Edit':'Edit Ad'}/></button>
   <button type="button" disabled={busy} onClick={()=>void run(async()=>{await client.deleteVideo(video.id);})}><UiText value={"Delete Ad"}/></button>
   {video.status==='REJECTED'&&video.upload_id&&video.media_status==='VALIDATED'&&<button type="button" disabled={busy} onClick={()=>void run(()=>client.release(video.upload_id!) as Promise<void>)}><UiText value={"Release private upload"}/></button>}
  </div>
  {showAnalytics&&<div style={{display:'grid',gridTemplateColumns:'repeat(4, minmax(72px, 1fr))',gap:12,padding:'12px 0',borderTop:'1px solid var(--hairline, var(--border))',borderBottom:'1px solid var(--hairline, var(--border))',fontVariantNumeric:'tabular-nums',fontFeatureSettings:'"tnum" 1'}}>
    <div>
      <div style={{fontSize:16,fontWeight:600}}>{views.toLocaleString()}</div>
      <small style={{color:'var(--text-secondary)'}}><UiText value={"Views"}/></small>
    </div>
    <div>
      <div style={{fontSize:16,fontWeight:600}}>{likes.toLocaleString()}</div>
      <small style={{color:'var(--text-secondary)'}}><UiText value={"Likes"}/></small>
    </div>
    <div>
      <div style={{fontSize:16,fontWeight:600}}>{comments.toLocaleString()}</div>
      <small style={{color:'var(--text-secondary)'}}><UiText value={"Comments"}/></small>
    </div>
    <div>
      <div style={{fontSize:16,fontWeight:600,color:'#16a34a'}}>{engagementRate}</div>
      <small style={{color:'var(--text-secondary)'}}><UiText value={"Engagement"}/></small>
    </div>
  </div>}
  {showTargeting&&<div style={{display:'grid',gap:12,padding:'16px 0',borderTop:'1px solid var(--hairline, var(--border))',borderBottom:'1px solid var(--hairline, var(--border))',fontVariantNumeric:'tabular-nums',fontFeatureSettings:'"tnum" 1'}}>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
    <strong><UiText value={"Select Advertising Radius & Locality — Free for any radius on VISTRAH"}/></strong>
    {targeting?.active_revision?<small style={{color:'#16a34a',fontWeight:600}}><UiText value={"Active Rev #"}/>{targeting.active_revision.revision} ({targeting.active_revision.radius_km} km · ₹0)</small>:<small style={{color:'var(--text-secondary)'}}><UiText value={"Pan-region delivery · ₹0 Free Forever"}/></small>}
   </div>
   {loadingTargeting?<p role="status"><UiText value={"Loading targeting…"}/></p>:<>
    {targeting?.active_revision&&<small><UiText value={"Approved coverage: "}/>{targeting.active_revision.latitude}, {targeting.active_revision.longitude} · {targeting.active_revision.radius_km} km{targeting.active_revision.target_regions.length?` · ${targeting.active_revision.target_regions.join(', ')}`:''}</small>}
    {targeting?.pending_revision&&<small style={{color:'#ca8a04',fontWeight:600}}><UiText value={"Pending review (Rev #"}/>{targeting.pending_revision.revision}): {targeting.pending_revision.latitude}, {targeting.pending_revision.longitude} · {targeting.pending_revision.radius_km} km{targeting.pending_revision.target_regions.length?` · ${targeting.pending_revision.target_regions.join(', ')}`:''}</small>}
    {targeting?.latest_revision?.status==='REJECTED'&&!targeting.pending_revision&&<small style={{color:'#dc2626'}}><UiText value={"Last submitted revision (#"}/>{targeting.latest_revision.revision}<UiText value={") was rejected. Submit an updated boundary below."}/></small>}
    {targetingNotice&&<p role="status"><UiText value={targetingNotice}/></p>}
    {targeting?.pending_revision?<small><UiText value={"A pending targeting revision is awaiting administrator review before another revision can be submitted."}/></small>:<div style={{display:'grid',gap:10}}>
     <MapFirstLocationPicker
      mode="seller"
      radiusOptions={SELLER_COVERAGE_RADII}
      disabled={busy}
      busy={busy}
      preferBackendDetails
      value={{
       latitude:Number.isFinite(Number(lat))&&lat.trim()!==''&&Math.abs(Number(lat))<=90?Number(lat):12.9716,
       longitude:Number.isFinite(Number(lon))&&lon.trim()!==''&&Math.abs(Number(lon))<=180?Number(lon):77.5946,
       formattedAddress:regionsText||'Bengaluru, Karnataka',
       locality:regionsText.split(',')[0]?.trim()||'Bengaluru',
       city:'Bengaluru',
       state:'Karnataka',
       pincode:'',
       landmark:'',
       radiusKm:Number.isFinite(Number(radiusKm))&&Number(radiusKm)>0?Number(radiusKm):10,
      } satisfies SelectedLocation}
      onChange={next=>{
       setLat(String(next.latitude));
       setLon(String(next.longitude));
       setRadiusKm(String(next.radiusKm));
       if(next.locality&&next.locality!=='Bengaluru'){
        const existing=regionsText.split(',').map(s=>s.trim()).filter(Boolean);
        if(!existing.some(r=>r.toLowerCase()===next.locality.toLowerCase())){
         setRegionsText([...existing,next.locality].join(', '));
        }
       }else if(!regionsText.trim()&&next.locality){
        setRegionsText(next.locality);
       }
      }}
      onConfirm={confirmed=>{
       void run(async()=>{
        const payload=parseTargetingInput(String(confirmed.latitude),String(confirmed.longitude),String(confirmed.radiusKm),regionsText);
        const next=await client.submitTargeting(video.id,payload);
        setTargeting(next);
        setTargetingNotice('Targeting revision submitted for administrator review.');
       });
      }}
      confirmLabel="Confirm & Submit Geo Targeting"
      extraFields={
       <label style={{display:'grid',gap:4,fontSize:12,fontWeight:600}}>
        <UiText value={"Target hyper-local consumers (cities / localities)"}/>
        <input maxLength={1000} placeholder="e.g. Bengaluru, Tarikere, Chikkamagaluru, Indiranagar" value={regionsText} onChange={e=>setRegionsText(e.target.value)}/>
        <small style={{fontWeight:400,color:'var(--text-secondary)'}}><UiText value={"New targeting revisions remain inactive until an independent administrator approves them."}/></small>
       </label>
      }
     />
    </div>}
   </>}
  </div>}
  {editing&&<form style={{display:'grid',gap:8}} onSubmit={event=>{event.preventDefault();void run(async()=>{await client.editVideo(video.id,title,description);setEditing(false);});}}>
   <label><UiText value={"Ad title"}/><input required minLength={3} maxLength={160} value={title} onChange={event=>setTitle(event.target.value)}/></label>
   <label><UiText value={"Caption / description"}/><textarea maxLength={2000} value={description} onChange={event=>setDescription(event.target.value)}/></label>
   <small><UiText value={"Edited ads are resubmitted for administrator approval before appearing on the V Ads tab."}/></small>
   <button disabled={busy||title.trim().length<3}><UiText value={"Save changes & submit for approval"}/></button>
  </form>}
  {error&&<p role="alert"><UiText value={error}/></p>}
 </div>;
}
export function DiscardUpload({id,onChanged}:{id:string;onChanged:()=>void|Promise<void>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <><button type="button" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await client.release(id);await onChanged();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><UiText value={"Discard unused upload"}/></button>{error&&<p role="alert"><UiText value={error}/></p>}</>;
}
export function VAdsPerformance(){
 const [data,setData]=useState<Performance|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function load(page=1){setBusy(true);setError('');try{setData(await client.analytics(page));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="tabular-nums"><h2><UiText value={"V Ads performance insights"}/></h2><button disabled={busy} onClick={()=>void load()}><UiText value={"Load / refresh performance"}/></button>{busy&&<p role="status"><UiText value={"Loading performance…"}/></p>}{error&&<p role="alert"><UiText value={error}/></p>}{data&&<><p>{data.view_policy}</p><p>{data.totals.videos} <UiText value={"videos · "}/>{data.totals.views} <UiText value={"signed-in views · "}/>{data.totals.likes} <UiText value={"likes · "}/>{data.totals.comments} <UiText value={"visible comments"}/></p>{data.items.map(row=><p key={row.id}>{row.title} · {row.status} · {row.views} <UiText value={"views · "}/>{row.likes} <UiText value={"likes · "}/>{row.comments} <UiText value={"comments"}/></p>)}<button disabled={busy||data.page===1} onClick={()=>void load(data.page-1)}><UiText value={"Previous"}/></button><button disabled={busy||!data.has_more} onClick={()=>void load(data.page+1)}><UiText value={"Next"}/></button></>}</section>;
}
