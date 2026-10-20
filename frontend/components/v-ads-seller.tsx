'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {api,ApiError} from '@/lib/api';
import {AuthGate} from './customer';
import {vAdsClient,validateVideoFile,type Workspace} from '../../shared/v-ads';
import s from './v-ads.module.css';
import {AdvertiserManagement,VideoManagement,DiscardUpload,VAdsPerformance} from './v-ads-management';
const client=vAdsClient(api);
export function VAdsSeller(){return <AuthGate next="/seller/v-ads">{user=>user.seller_enabled?<SellerWorkspace key={user.id}/>:<div className={s.page}><p>Enable seller access with your existing account to manage V Ads.</p><Link href="/seller">Seller dashboard</Link></div>}</AuthGate>;}
function SellerWorkspace(){
  const [data,setData]=useState<Workspace|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [name,setName]=useState(''),[handle,setHandle]=useState(''),[description,setDescription]=useState('');
  const [accountId,setAccountId]=useState(''),[uploadId,setUploadId]=useState(''),[title,setTitle]=useState(''),[videoDescription,setVideoDescription]=useState('');
  const [busy,setBusy]=useState(false);const working=useRef(false);
  const [authRequired,setAuthRequired]=useState(false);
  const account=data?.accounts.find(item=>item.id===accountId)??data?.accounts[0];
  const refresh=useCallback(async()=>{try{setData(await client.workspace());setError('');}catch(e){setError((e as Error).message);}finally{setLoading(false);}},[]);
  useEffect(()=>{let alive=true;client.workspace().then(result=>{if(alive){setData(result);setError('');}})
    .catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[]);
  async function action(work:()=>Promise<void>){if(working.current)return;working.current=true;setBusy(true);setError('');setMessage('');try{await work();}catch(e){setError((e as Error).message);if(e instanceof ApiError&&e.status===401)setAuthRequired(true);}finally{working.current=false;setBusy(false);}}
  return <div className={s.page}><div className={s.bar}><h1>Your V Ads</h1><Link href="/v-ads">Watch V Ads</Link><button disabled={busy||loading} onClick={()=>void refresh()}>Refresh status</button></div>
    <p>Videos are published only after administrator approval. MP4, H.264/AAC, up to 60 seconds and 100 MB.</p>
    {Boolean(error)&&<p role="alert" className={s.error}>{error}</p>}{authRequired&&<Link href="/seller/login?next=%2Fseller%2Fv-ads">Sign in again</Link>}{Boolean(message)&&<p role="status">{message}</p>}
    {loading?<p role="status">Loading your advertiser account…</p>:data&&<>
      {!data.accounts.length?<form className={s.panel} onSubmit={event=>{event.preventDefault();void action(async()=>{await client.register(name,handle,description);await refresh();});}}><h2>Request advertiser account</h2><label>Advertiser name<input required minLength={2} maxLength={120} value={name} onChange={event=>setName(event.target.value)}/></label><label>Handle<input required minLength={3} maxLength={80} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={handle} onChange={event=>setHandle(event.target.value)}/></label><label>Description<textarea maxLength={2000} value={description} onChange={event=>setDescription(event.target.value)}/></label><button disabled={busy}>Request review</button></form>:<>
        {data.accounts.map(item=><section className={s.panel} key={item.id}><h2>{item.name}</h2><p>@{item.handle} · {item.status}</p><AdvertiserManagement key={item.review_token??item.id} account={item} onChanged={refresh}/>{data.accounts.length>1&&<button disabled={busy} onClick={()=>{setAccountId(item.id);setUploadId('');}}>{account?.id===item.id?'Selected advertiser':'Use this advertiser'}</button>}</section>)}
        {account?.status!=='APPROVED'?<p>An approved advertiser account is required to submit videos.</p>:!data.uploads_available?<p role="status">Video uploads and submissions are not available yet.</p>:<form className={s.panel} onSubmit={event=>{event.preventDefault();if(!uploadId)return;void action(async()=>{await client.submit(account.id,uploadId,title,videoDescription);setUploadId('');setTitle('');setVideoDescription('');setMessage('Video submitted. Status: PENDING.');await refresh();});}}>
          <h2>Submit video for review</h2><label>Choose MP4<input type="file" accept="video/mp4,.mp4" disabled={busy} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;void action(async()=>{validateVideoFile(file.name,file.size);const result=await api<{id:string}>('/v-ads/advertisers/'+encodeURIComponent(account.id)+'/uploads',{method:'POST',headers:{'Content-Type':'video/mp4'},body:file});setUploadId(result.id);setMessage('Upload validated. Add a title and submit for review.');});}}/></label>
          {data.uploads.filter(item=>item.advertiser_id===account.id&&!item.video_id).map(item=><button type="button" disabled={busy} key={item.id} onClick={()=>setUploadId(item.id)}>{uploadId===item.id?'Upload selected':'Use saved upload '+item.id.slice(0,8)}</button>)}
          {data.uploads.filter(item=>item.advertiser_id===account.id&&!item.video_id).map(item=><DiscardUpload key={'discard-'+item.id} id={item.id} onChanged={async()=>{if(uploadId===item.id)setUploadId('');await refresh();}}/>)}
          {Boolean(uploadId)&&<p>Validated upload selected.</p>}<label>Video title<input required minLength={3} maxLength={160} value={title} onChange={event=>setTitle(event.target.value)}/></label><label>Video description<textarea maxLength={2000} value={videoDescription} onChange={event=>setVideoDescription(event.target.value)}/></label><button disabled={busy||!uploadId||title.trim().length<3}>Submit for review</button>
        </form>}
      </>}
      <h2>Your videos</h2>{data.videos.map(video=><section className={s.panel} key={video.id}><h3>{video.title}</h3><p>{video.status}</p>{Boolean(video.review_reason)&&<p>{video.review_reason}</p>}<VideoManagement video={video} onChanged={refresh}/></section>)}{!data.videos.length&&<p>No submitted videos yet.</p>}
      {data.has_more&&<button disabled={busy} onClick={()=>void action(async()=>{const next=await client.workspace(data.page+1);setData(previous=>previous?{...next,videos:[...previous.videos,...next.videos.filter(item=>!previous.videos.some(old=>old.id===item.id))]}:next);})}>Load more videos</button>}
    </>}
    {data&&<VAdsPerformance/>}
  </div>;
}
