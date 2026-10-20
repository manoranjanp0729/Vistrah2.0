'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,type RefObject} from 'react';
import {Heart,MessageCircle,Share2,Volume2,VolumeX,X} from 'lucide-react';
import {api,ApiError} from '@/lib/api';
import {useUser} from './customer';
import {mediaUrl,mergeReels,sharePath,vAdsClient,type Reel,type Comment,type AdvertiserProfile} from '../../shared/v-ads';
import s from './v-ads.module.css';
import {managementClient,advanceView} from '../../shared/v-ads-management';
const client=vAdsClient(api);
const management=managementClient(api);

export function VAdsReels({initialVideo}:{initialVideo?:string}) {
  const {user}=useUser();const root=useRef<HTMLDivElement>(null);
  const [items,setItems]=useState<Reel[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [version,setVersion]=useState(0),[page,setPage]=useState(1),[more,setMore]=useState(false),[paging,setPaging]=useState(false);
  const lock=useRef(false);
  useEffect(()=>{let alive=true;
    Promise.all([client.feed(),initialVideo?client.reel(initialVideo):Promise.resolve(null)]).then(([feed,selected])=>{
      if(alive){setItems(mergeReels(selected?[selected]:[],feed.items));setPage(1);setMore(feed.has_more);root.current?.scrollTo(0,0);}
    }).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};
  },[initialVideo,version]);
  async function loadMore(){if(lock.current||!more)return;lock.current=true;setPaging(true);try{const next=await client.feed(page+1);setItems(old=>mergeReels(old,next.items));setPage(next.page);setMore(next.has_more);setError('');}catch(e){setError((e as Error).message);}finally{lock.current=false;setPaging(false);}}
  return <div className={s.page}><div className={s.bar}><h1>V Ads</h1>{user?.seller_enabled&&<Link href="/seller/v-ads">Your V Ads</Link>}</div>
    {loading?<p className={s.status} role="status">Loading videos…</p>:!items.length?<div className={s.status}><p role="status">{error||'No approved videos yet.'}</p><button onClick={()=>setVersion(v=>v+1)}>Retry / refresh</button></div>:<>
      <div className={s.feed} ref={root} aria-label="V Ads videos" tabIndex={0} onScroll={event=>{const node=event.currentTarget;if(!error&&node.scrollHeight-node.scrollTop-node.clientHeight<node.clientHeight*.5)void loadMore();}}>
        {items.map(item=><ReelCard key={item.id+':'+(user?.id??'guest')} reel={item} root={root} authenticated={Boolean(user)}/>)}</div>
      {Boolean(error)&&<div role="alert" className={s.error}>{error} <button onClick={()=>void loadMore()}>Retry</button></div>}
      {more&&<button disabled={paging} onClick={()=>void loadMore()}>{paging?'Loading…':'Load more videos'}</button>}
    </>}
  </div>;
}

function ReelCard({reel,root,authenticated}:{reel:Reel;root:RefObject<HTMLDivElement|null>;authenticated:boolean}) {
  const card=useRef<HTMLElement>(null),video=useRef<HTMLVideoElement>(null);
  const [active,setActive]=useState(false),[visible,setVisible]=useState(()=>typeof document==='undefined'||document.visibilityState==='visible'),[paused,setPaused]=useState(false),[muted,setMuted]=useState(true);
  const [blocked,setBlocked]=useState(false),[playbackError,setPlaybackError]=useState('');
  const [liked,setLiked]=useState(false),[count,setCount]=useState(reel.likes_count),[engagementReady,setEngagementReady]=useState(false);
  const [commentCount,setCommentCount]=useState(reel.comments_count);
  const [open,setOpen]=useState(false),[comments,setComments]=useState<Comment[]>([]),[draft,setDraft]=useState('');
  const [commentPage,setCommentPage]=useState(1),[moreComments,setMoreComments]=useState(false),[commentsLoading,setCommentsLoading]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');const working=useRef(false);
  const [authRequired,setAuthRequired]=useState(false);
  const viewSent=useRef(false);
  useEffect(()=>{
    if(!authenticated||!active||!visible||paused||open||viewSent.current)return;
    let previous=video.current?.currentTime??0,watched=0;
    const timer=setInterval(()=>{const player=video.current;if(!player||viewSent.current)return;
      watched=advanceView(watched,player.currentTime-previous,!player.paused&&!player.ended);previous=player.currentTime;
      if(watched>=3){viewSent.current=true;void management.view(reel.id).catch(()=>{});}
    },500);
    return()=>clearInterval(timer);
  },[authenticated,active,visible,paused,open,reel.id]);
  let source='';try{source=mediaUrl(reel.video_url,'/api');}catch{/* Unsupported sources stay disabled. */}
  useEffect(()=>{
    const observer=new IntersectionObserver(entries=>setActive(entries[0].isIntersecting&&entries[0].intersectionRatio>=.6),{root:root.current,threshold:[0,.6]});
    if(card.current)observer.observe(card.current);return()=>observer.disconnect();
  },[root]);
  useEffect(()=>{const change=()=>setVisible(document.visibilityState==='visible');document.addEventListener('visibilitychange',change);return()=>document.removeEventListener('visibilitychange',change);},[]);
  useEffect(()=>{const player=video.current;if(!player)return;player.muted=muted;
    if(active&&visible&&!paused&&!open&&source)void player.play().then(()=>setBlocked(false)).catch(()=>setBlocked(true));else player.pause();
    return()=>player.pause();
  },[active,visible,paused,open,muted,source]);
  useEffect(()=>{let alive=true;if(active&&authenticated)client.engagement(reel.id).then(data=>{if(alive){setLiked(data.liked);setCount(data.likes_count);setEngagementReady(true);}}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[active,authenticated,reel.id]);
  useEffect(()=>{let alive=true;if(open){client.comments(reel.id).then(data=>{if(alive){setComments(data.items);setCommentPage(1);setMoreComments(data.items.length===20);}}).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setCommentsLoading(false);});}return()=>{alive=false;};},[open,reel.id]);
  async function action(work:()=>Promise<void>){if(working.current)return;working.current=true;setBusy(true);setError('');try{await work();}catch(e){setError((e as Error).message);if(e instanceof ApiError&&e.status===401)setAuthRequired(true);}finally{working.current=false;setBusy(false);}}
  function like(){if(!authenticated){setError('Sign in to like or comment.');return;}void action(async()=>{const current=engagementReady?{liked}:await client.engagement(reel.id);const result=await client.like(reel.id,!current.liked);setLiked(result.liked);setCount(result.likes_count);setEngagementReady(true);});}
  function post(){if(!authenticated){setError('Sign in to like or comment.');return;}if(!draft.trim())return;void action(async()=>{const result=await client.comment(reel.id,draft);setComments(old=>[result,...old]);setCommentCount(value=>value+1);setDraft('');});}
  async function share(){try{const url=window.location.origin+sharePath(reel.id);if(navigator.share)await navigator.share({title:reel.title,url});else if(navigator.clipboard){await navigator.clipboard.writeText(url);setError('Video link copied.');}else setError('Share this link: '+url);}catch(e){if((e as Error).name!=='AbortError')setError('Could not share this video.');}}
  async function more(){if(commentsLoading)return;setCommentsLoading(true);try{const next=await client.comments(reel.id,commentPage+1);setComments(old=>[...old,...next.items.filter(item=>!old.some(previous=>previous.id===item.id))]);setCommentPage(next.page);setMoreComments(next.items.length===20);}catch(e){setError((e as Error).message);}finally{setCommentsLoading(false);}}
  return <article className={s.reel} ref={card} aria-label={reel.title}>
    {source&&<video ref={video} className={s.video} src={source} playsInline loop muted={muted} preload={active?'auto':'metadata'} onError={()=>setPlaybackError('Video could not load. Check your connection and retry.')} onCanPlay={()=>setPlaybackError('')}/>}
    <button className={s.tap} aria-label={paused||blocked?'Play video':'Pause video'} onClick={()=>{if(blocked){void video.current?.play().then(()=>setBlocked(false)).catch(()=>setPlaybackError('Video could not start. Try again.'));setPaused(false);}else setPaused(value=>!value);}}>{paused||blocked?'▶':''}</button>
    <div className={s.actions}><button onClick={like} disabled={busy} aria-pressed={liked} aria-label={liked?'Unlike video':'Like video'}><Heart/>{count||'Like'}</button><button onClick={()=>{if(!open)setCommentsLoading(true);setOpen(value=>!value);}} aria-label="Open comments"><MessageCircle/>{commentCount||'Comment'}</button><button onClick={()=>void share()}><Share2/>Share</button><button onClick={()=>setMuted(value=>!value)} aria-label={muted?'Unmute video':'Mute video'}>{muted?<VolumeX/>:<Volume2/>}Sound</button></div>
    <div className={s.details}><Link href={'/v-ads/advertisers/'+encodeURIComponent(reel.advertiser.id)}>{reel.advertiser.name}</Link><h2>{reel.title}</h2><p>{reel.description}</p>{(!source||playbackError)&&<p role="alert">{playbackError||'This video has no supported playback source.'} <button onClick={()=>video.current?.load()}>Retry video</button></p>}{Boolean(error)&&!open&&<p role="status">{error} {(!authenticated||authRequired)&&<Link href="/login?next=%2Fv-ads">Sign in</Link>}</p>}</div>
    {open&&<section className={s.comments} aria-label="Comments"><div className={s.bar}><h3>Comments</h3><button onClick={()=>setOpen(false)} aria-label="Close comments"><X/></button></div><div className={s.commentList}>{commentsLoading&&<p role="status">Loading comments…</p>}{!commentsLoading&&!comments.length&&<p>Be the first to comment.</p>}{comments.map(comment=><p key={comment.id}>{comment.body}</p>)}{moreComments&&<button disabled={commentsLoading} onClick={()=>void more()}>More comments</button>}</div><form onSubmit={event=>{event.preventDefault();post();}}><input aria-label="Add a comment" placeholder="Add a comment..." value={draft} onChange={event=>setDraft(event.target.value)} maxLength={500}/><button disabled={busy||commentsLoading||!draft.trim()}>Post</button></form>{Boolean(error)&&<p role="status">{error}</p>}{(!authenticated||authRequired)&&<Link href="/login?next=%2Fv-ads">Sign in to like or comment</Link>}</section>}
  </article>;
}

export function VAdsAdvertiser({id}:{id:string}) {
  const [data,setData]=useState<AdvertiserProfile|null>(null),[error,setError]=useState(''),[version,setVersion]=useState(0);
  useEffect(()=>{let alive=true;client.profile(id).then(result=>{if(alive){setData(result);setError('');}}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[id,version]);
  return <div className={s.page}><Link href="/v-ads">Back to V Ads</Link>{error?<div role="alert">{error} <button onClick={()=>setVersion(v=>v+1)}>Retry</button></div>:!data?<p role="status">Loading advertiser…</p>:<><section className={s.panel}><h1>{data.name}</h1><p>@{data.handle}</p><p>{data.description}</p></section><h2>Videos</h2>{data.videos.map(video=><Link className={s.panel} key={video.id} href={sharePath(video.id)}>{video.title}</Link>)}{!data.videos.length&&<p>No approved videos yet.</p>}</>}</div>;
}
