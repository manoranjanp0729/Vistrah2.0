'use client';
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
 return <div>{account.status==='SUSPENDED'?<p>Suspended accounts require administrator review.</p>:<details><summary>Edit advertiser profile</summary><p>Saving changes sends the profile for review and hides its approved videos until the account is approved again. The handle stays unchanged.</p><form onSubmit={event=>{event.preventDefault();void action(async()=>{await client.profile(account,name,description);await onChanged();});}}><label>Advertiser name<input required minLength={2} maxLength={120} value={name} onChange={event=>setName(event.target.value)}/></label><label>Description<textarea maxLength={2000} value={description} onChange={event=>setDescription(event.target.value)}/></label><button disabled={busy||!account.review_token||name.trim().length<2}>Save and request review</button></form></details>}
 <button type="button" disabled={busy} onClick={()=>void loadHistory()}>Account decisions</button>{error&&<p role="alert">{error}</p>}{history&&<><ul>{history.items.map(item=><li key={item.id}>{item.action} · {item.created_at}<p>{item.details.reason}</p></li>)}</ul>{!history.items.length&&<p>No decisions recorded yet.</p>}{history.has_more&&<button disabled={busy} onClick={()=>void loadHistory(history.page+1)}>More decisions</button>}</>}</div>;
}
export function VideoManagement({video,onChanged}:{video:SellerVideo;onChanged:()=>void|Promise<void>}){
 const [reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 async function act(remove:boolean){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{if(remove)await client.withdraw(video,reason);else if(video.upload_id)await client.release(video.upload_id);await onChanged();}catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}}
 return <details><summary>Manage video</summary><p>Withdrawal takes the video offline permanently. A new upload requires a new review.</p>{video.status!=='REMOVED'&&<><label>Withdrawal reason<textarea maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)}/></label><button disabled={busy||reason.trim().length<10} onClick={()=>void act(true)}>Withdraw video</button></>}{['REJECTED','REMOVED'].includes(video.status)&&video.upload_id&&video.media_status==='VALIDATED'&&<button disabled={busy} onClick={()=>void act(false)}>Release private upload</button>}{error&&<p role="alert">{error}</p>}</details>;
}
export function DiscardUpload({id,onChanged}:{id:string;onChanged:()=>void|Promise<void>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <><button type="button" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await client.release(id);await onChanged();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>Discard unused upload</button>{error&&<p role="alert">{error}</p>}</>;
}
export function VAdsPerformance(){
 const [data,setData]=useState<Performance|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function load(page=1){setBusy(true);setError('');try{setData(await client.analytics(page));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section><h2>Video performance</h2><button disabled={busy} onClick={()=>void load()}>Load / refresh performance</button>{busy&&<p role="status">Loading performance…</p>}{error&&<p role="alert">{error}</p>}{data&&<><p>{data.view_policy}</p><p>{data.totals.videos} videos · {data.totals.views} signed-in views · {data.totals.likes} likes · {data.totals.comments} visible comments</p>{data.items.map(row=><p key={row.id}>{row.title} · {row.status} · {row.views} views · {row.likes} likes · {row.comments} comments</p>)}<button disabled={busy||data.page===1} onClick={()=>void load(data.page-1)}>Previous</button><button disabled={busy||!data.has_more} onClick={()=>void load(data.page+1)}>Next</button></>}</section>;
}
