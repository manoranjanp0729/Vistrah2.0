'use client';
import {UiText} from "./localized-ui";
import {useRef,useState} from 'react';
import {api} from '@/lib/api';
import type {AdvertiserAccount,SellerVideo} from '../../shared/v-ads';
import {managementClient,type History,type Performance} from '../../shared/v-ads-management';
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
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 async function run(work:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await work();await onChanged();}catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}}
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
   <button type="button" disabled={busy} onClick={()=>{setTitle(video.title);setDescription(video.description??'');setEditing(v=>!v);}}><UiText value={editing?'Cancel Edit':'Edit Ad'}/></button>
   <button type="button" disabled={busy} onClick={()=>void run(async()=>{await client.deleteVideo(video.id);})}><UiText value={"Delete Ad"}/></button>
   {video.status==='REJECTED'&&video.upload_id&&video.media_status==='VALIDATED'&&<button type="button" disabled={busy} onClick={()=>void run(()=>client.release(video.upload_id!) as Promise<void>)}><UiText value={"Release private upload"}/></button>}
  </div>
  {showAnalytics&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(110px, 1fr))',gap:10,padding:12,borderRadius:10,background:'var(--surface-soft, rgba(0,0,0,0.04))',border:'1px solid var(--border)'}}>
    <div style={{textAlign:'center',padding:8,borderRadius:8,background:'var(--surface)'}}>
      <div style={{fontSize:16,fontWeight:700}}>{views.toLocaleString()}</div>
      <small style={{color:'var(--text-secondary)'}}><UiText value={"Views"}/></small>
    </div>
    <div style={{textAlign:'center',padding:8,borderRadius:8,background:'var(--surface)'}}>
      <div style={{fontSize:16,fontWeight:700}}>{likes.toLocaleString()}</div>
      <small style={{color:'var(--text-secondary)'}}><UiText value={"Likes"}/></small>
    </div>
    <div style={{textAlign:'center',padding:8,borderRadius:8,background:'var(--surface)'}}>
      <div style={{fontSize:16,fontWeight:700}}>{comments.toLocaleString()}</div>
      <small style={{color:'var(--text-secondary)'}}><UiText value={"Comments"}/></small>
    </div>
    <div style={{textAlign:'center',padding:8,borderRadius:8,background:'var(--surface)'}}>
      <div style={{fontSize:16,fontWeight:700,color:'#16a34a'}}>{engagementRate}</div>
      <small style={{color:'var(--text-secondary)'}}><UiText value={"Engagement"}/></small>
    </div>
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
 return <section><h2><UiText value={"V Ads performance insights"}/></h2><button disabled={busy} onClick={()=>void load()}><UiText value={"Load / refresh performance"}/></button>{busy&&<p role="status"><UiText value={"Loading performance…"}/></p>}{error&&<p role="alert"><UiText value={error}/></p>}{data&&<><p>{data.view_policy}</p><p>{data.totals.videos} <UiText value={"videos · "}/>{data.totals.views} <UiText value={"signed-in views · "}/>{data.totals.likes} <UiText value={"likes · "}/>{data.totals.comments} <UiText value={"visible comments"}/></p>{data.items.map(row=><p key={row.id}>{row.title} · {row.status} · {row.views} <UiText value={"views · "}/>{row.likes} <UiText value={"likes · "}/>{row.comments} <UiText value={"comments"}/></p>)}<button disabled={busy||data.page===1} onClick={()=>void load(data.page-1)}><UiText value={"Previous"}/></button><button disabled={busy||!data.has_more} onClick={()=>void load(data.page+1)}><UiText value={"Next"}/></button></>}</section>;
}
