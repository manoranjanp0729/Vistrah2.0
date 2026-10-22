'use client';
import {UiText,UiDiv,UiButton,UiSection,UiInput} from "./localized-ui";
import Link from 'next/link';
import {useEffect,useRef,useState,type RefObject} from 'react';
import {Heart,Maximize,MessageCircle,Share2,Volume2,VolumeX,X,ShoppingBag,Briefcase,Truck,CheckCircle2} from 'lucide-react';
import {api,ApiError} from '@/lib/api';
import {useUser} from './customer';
import {mediaUrl,mergeReels,sharePath,vAdsClient,parseAdDescription,type Reel,type Comment,type AdvertiserProfile} from '../../shared/v-ads';
import {listingPrice} from '../../shared/commerce';
import s from './v-ads.module.css';
import {managementClient,advanceView} from '../../shared/v-ads-management';
import {webVideoCoordinator} from '../lib/video-coordinator';
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
  return <div className={s.page}><div className={s.bar}><h1><UiText value={"V Ads"}/></h1><Link href="/seller/v-ads?from=v-ads"><UiText value={"V Ads Studio"}/></Link></div>
    {loading?<p className={s.status} role="status"><UiText value={"Loading videos…"}/></p>:!items.length?<div className={s.status}><p role="status">{error||'No approved videos yet.'}</p><button onClick={()=>setVersion(v=>v+1)}><UiText value={"Retry / refresh"}/></button></div>:<>
      <UiDiv  className={s.feed} ref={root} aria-label="V Ads videos" tabIndex={0} onScroll={event=>{const node=event.currentTarget;if(!error&&node.scrollHeight-node.scrollTop-node.clientHeight<node.clientHeight*.5)void loadMore();}}>
        {items.map(item=><ReelCard key={item.id+':'+(user?.id??'guest')} reel={item} root={root} authenticated={Boolean(user)}/>)}</UiDiv>
      {Boolean(error)&&<div role="alert" className={s.error}><UiText value={error}/> <button onClick={()=>void loadMore()}><UiText value={"Retry"}/></button></div>}
      {more&&<button disabled={paging} onClick={()=>void loadMore()}><UiText value={paging?'Loading…':'Load more videos'}/></button>}
    </>}
  </div>;
}

function ReelCard({reel,root,authenticated}:{reel:Reel;root:RefObject<HTMLDivElement|null>;authenticated:boolean}) {
  const card=useRef<HTMLElement>(null),video=useRef<HTMLVideoElement>(null);
  const [active,setActive]=useState(false),[visible,setVisible]=useState(()=>typeof document==='undefined'||document.visibilityState==='visible'),[paused,setPaused]=useState(false),[muted,setMuted]=useState(false);
  const [blocked,setBlocked]=useState(false),[playbackError,setPlaybackError]=useState('');
  const [liked,setLiked]=useState(false),[count,setCount]=useState(reel.likes_count),[engagementReady,setEngagementReady]=useState(false);
  const [commentCount,setCommentCount]=useState(reel.comments_count);
  const [open,setOpen]=useState(false),[comments,setComments]=useState<Comment[]>([]),[draft,setDraft]=useState('');
  const [productDetailsOpen, setProductDetailsOpen] = useState(false);
  const { description: cleanDescription, meta: adMeta } = parseAdDescription(reel.description);
  const productMeta = adMeta.ad_type === 'PRODUCT' ? adMeta : undefined;
  const [commentPage,setCommentPage]=useState(1),[moreComments,setMoreComments]=useState(false),[commentsLoading,setCommentsLoading]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');const working=useRef(false);
  const [authRequired,setAuthRequired]=useState(false);
  const [progress,setProgress]=useState(0);
  const manualMute=useRef(false);
  const viewSent=useRef(false);

  useEffect(()=>{
    const unmuteOnInteraction=()=>{
      if(video.current&&video.current.muted&&!manualMute.current){
        video.current.muted=false;
        setMuted(false);
      }
    };
    window.addEventListener('click',unmuteOnInteraction,{once:true});
    window.addEventListener('touchstart',unmuteOnInteraction,{once:true});
    return()=>{
      window.removeEventListener('click',unmuteOnInteraction);
      window.removeEventListener('touchstart',unmuteOnInteraction);
    };
  },[]);

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
    const player=video.current;if(!player)return;
    webVideoCoordinator.register({
      id:reel.id,
      element:player,
      visibleArea:0,
      play:()=>{
        if(!paused&&!open&&source){
          player.muted=muted;
          void player.play().then(()=>setBlocked(false)).catch(()=>{
            if(!player.muted&&!manualMute.current){
              player.muted=true;
              setMuted(true);
              void player.play().then(()=>setBlocked(false)).catch(()=>setBlocked(true));
            }else setBlocked(true);
          });
        }
      },
      pause:()=>{
        player.pause();
      },
      isManuallyPaused:()=>paused||open
    });
    return()=>{
      webVideoCoordinator.unregister(reel.id);
    };
  },[reel.id,paused,open,source,muted]);

  useEffect(()=>{
    const observer=new IntersectionObserver(entries=>{
      const entry=entries[0];
      if(!entry){webVideoCoordinator.updateVisibleArea(reel.id,0);setActive(false);return;}
      const rect=entry.intersectionRect;
      const area=entry.isIntersecting&&rect?rect.width*rect.height:0;
      webVideoCoordinator.updateVisibleArea(reel.id,area);
      setActive(area>0);
    },{root:root.current,threshold:[0,.1,.25,.5,.6,.75,.9,1]});
    if(card.current)observer.observe(card.current);
    return()=>{
      observer.disconnect();
      webVideoCoordinator.updateVisibleArea(reel.id,0);
    };
  },[root,reel.id]);

  useEffect(()=>{const change=()=>setVisible(document.visibilityState==='visible');document.addEventListener('visibilitychange',change);return()=>document.removeEventListener('visibilitychange',change);},[]);

  useEffect(()=>{
    const player=video.current;if(!player)return;
    player.muted=muted;
    if(active&&visible&&!paused&&!open&&source){
      void player.play().then(()=>setBlocked(false)).catch(()=>{
        if(!player.muted&&!manualMute.current){
          player.muted=true;
          setMuted(true);
          void player.play().then(()=>setBlocked(false)).catch(()=>setBlocked(true));
        }else setBlocked(true);
      });
    }else player.pause();
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
    {source&&<video ref={video} className={s.video} src={source} playsInline loop muted={muted} preload={active?'auto':'metadata'} onTimeUpdate={()=>{if(video.current&&video.current.duration>0)setProgress((video.current.currentTime/video.current.duration)*100);}} onError={()=>setPlaybackError('Video could not load. Check your connection and retry.')} onCanPlay={()=>setPlaybackError('')}/>}
    <UiButton  className={s.tap} aria-label={paused||blocked?'Play video':'Pause video'} onClick={()=>{if(blocked){void video.current?.play().then(()=>setBlocked(false)).catch(()=>setPlaybackError('Video could not start. Try again.'));setPaused(false);}else setPaused(value=>!value);}}>{paused||blocked?'▶':''}</UiButton>
    <div className={s.actions}>
      <UiButton  onClick={like} disabled={busy} aria-pressed={liked} aria-label={liked?'Unlike video':'Like video'}><Heart/>{count||'Like'}</UiButton>
      <UiButton  onClick={()=>{if(!open)setCommentsLoading(true);setOpen(value=>!value);}} aria-label="Open comments"><MessageCircle/>{commentCount||'Comment'}</UiButton>
      <button onClick={()=>void share()}><Share2/><UiText value={"Share"}/></button>
      <UiButton  onClick={()=>{if(video.current){video.current.muted=!video.current.muted;manualMute.current=video.current.muted;setMuted(video.current.muted);}}} aria-label={muted?'Unmute video':'Mute video'}>{muted?<VolumeX/>:<Volume2/>}<UiText value={muted?"Muted":"Sound"}/></UiButton>
      <UiButton onClick={()=>{const element=video.current as (HTMLVideoElement&{webkitEnterFullscreen?:()=>void})|null;if(card.current?.requestFullscreen)void card.current.requestFullscreen().catch(()=>{});else element?.webkitEnterFullscreen?.();}} aria-label="Fullscreen"><Maximize/><UiText value={"Full"}/></UiButton>
    </div>
    <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:'rgba(255,255,255,0.25)',zIndex:3}}>
      <div style={{height:'100%',width:`${progress}%`,background:'var(--accent-orange,#f97316)'}}/>
    </div>
    <div className={s.details}>
      <Link href={'/v-ads/advertisers/'+encodeURIComponent(reel.advertiser.id)} style={{display:'inline-flex',alignItems:'center',gap:4}}>
        <span>{reel.advertiser.name}</span>
        <CheckCircle2 size={13} color="#16a34a"/>
      </Link>
      <h2>{reel.title}</h2>
      {Boolean(cleanDescription)&&<p>{cleanDescription}</p>}
      {(!source||playbackError)&&<p role="alert">{playbackError||'This video has no supported playback source.'} <button onClick={()=>video.current?.load()}><UiText value={"Retry video"}/></button></p>}
      {Boolean(error)&&!open&&<p role="status"><UiText value={error}/> {(!authenticated||authRequired)&&<Link href="/login?next=%2Fv-ads"><UiText value={"Sign in"}/></Link>}</p>}
      
      {/* Explore Product / Explore Brand Action Row */}
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginTop:4}}>
        {adMeta.ad_type === 'PRODUCT' ? (
          <button
            type="button"
            onClick={()=>{setOpen(false);setProductDetailsOpen(true);}}
            style={{background:'#e11d48',color:'#fff',padding:'6px 14px',borderRadius:20,border:0,fontWeight:700,fontSize:13,display:'inline-flex',alignItems:'center',gap:6,cursor:'pointer'}}
          >
            <ShoppingBag size={14}/>
            <span><UiText value={"Explore Product"}/>{adMeta.product_price ? ` · ${adMeta.product_price}` : ''}</span>
          </button>
        ) : (
          <Link
            href={'/v-ads/advertisers/'+encodeURIComponent(reel.advertiser.id)}
            style={{background:'#503fbd',color:'#fff',padding:'6px 14px',borderRadius:20,border:0,fontWeight:700,fontSize:13,display:'inline-flex',alignItems:'center',gap:6,textDecoration:'none'}}
          >
            <Briefcase size={14}/>
            <span><UiText value={"Explore Brand"}/></span>
          </Link>
        )}
        <Link
          href="/seller/v-ads?from=v-ads"
          style={{background:'rgba(255,255,255,0.22)',color:'#fff',padding:'6px 12px',borderRadius:20,fontSize:12,fontWeight:600,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:4}}
        >
          <UiText value={"Studio"}/>
        </Link>
      </div>
    </div>
    {open&&<UiSection  className={s.comments} aria-label="Comments"><div className={s.bar}><h3><UiText value={"Comments"}/></h3><UiButton  onClick={()=>setOpen(false)} aria-label="Close comments"><X/></UiButton></div><div className={s.commentList}>{commentsLoading&&<p role="status"><UiText value={"Loading comments…"}/></p>}{!commentsLoading&&!comments.length&&<p><UiText value={"Be the first to comment."}/></p>}{comments.map(comment=><p key={comment.id}>{comment.body}</p>)}{moreComments&&<button disabled={commentsLoading} onClick={()=>void more()}><UiText value={"More comments"}/></button>}</div><form onSubmit={event=>{event.preventDefault();post();}}><UiInput  aria-label="Add a comment" placeholder="Add a comment..." value={draft} onChange={event=>setDraft(event.target.value)} maxLength={500}/><button disabled={busy||commentsLoading||!draft.trim()}><UiText value={"Post"}/></button></form>{Boolean(error)&&<p role="status"><UiText value={error}/></p>}{(!authenticated||authRequired)&&<Link href="/login?next=%2Fv-ads"><UiText value={"Sign in to like or comment"}/></Link>}</UiSection>}

    {/* Product Details Sheet for Web */}
    {productDetailsOpen && productMeta && (
      <div className={s.comments} style={{height:'70%',maxHeight:'520px',overflowY:'auto',background:'var(--surface,#171b25)',color:'var(--text,#fff)',borderTop:'1px solid var(--border)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:30,height:30,borderRadius:15,background:'rgba(225,29,72,0.15)',color:'#e11d48',display:'grid',placeItems:'center'}}>
              <ShoppingBag size={16}/>
            </div>
            <h3 style={{margin:0,fontSize:16}}><UiText value={"Product Details"}/></h3>
          </div>
          <button type="button" onClick={()=>setProductDetailsOpen(false)} style={{background:'transparent',border:0,color:'inherit',cursor:'pointer'}}><X size={20}/></button>
        </div>

        <div style={{display:'grid',gap:12,paddingBottom:16}}>
          <div>
            <h2 style={{margin:'0 0 4px',fontSize:18}}>{productMeta.product_name || reel.title}</h2>
            <Link href={'/v-ads/advertisers/'+encodeURIComponent(reel.advertiser.id)} style={{fontSize:13,color:'#503fbd',fontWeight:600,display:'inline-flex',alignItems:'center',gap:4}}>
              <span>{reel.advertiser.name}</span>
              <CheckCircle2 size={13} color="#16a34a"/>
              <span style={{color:'var(--text-secondary)'}}>· <UiText value={"View Brand Channel"}/></span>
            </Link>
          </div>

          <div style={{padding:'12px',borderRadius:10,background:'rgba(225,29,72,0.08)',border:'1px solid rgba(225,29,72,0.3)',display:'grid',gap:2}}>
            <small style={{fontWeight:700,color:'#e11d48',textTransform:'uppercase',fontSize:10.5,letterSpacing:'0.5px'}}><UiText value={"Price Details"}/></small>
            <div style={{fontSize:20,fontWeight:800,color:'#e11d48'}}>{productMeta.product_price || 'Available on enquiry / order'}</div>
          </div>

          <div style={{padding:'12px',borderRadius:10,background:'rgba(22,163,74,0.08)',border:'1px solid rgba(22,163,74,0.3)',display:'grid',gap:2}}>
            <div style={{display:'flex',alignItems:'center',gap:6,color:'#16a34a',fontWeight:700,fontSize:10.5,textTransform:'uppercase',letterSpacing:'0.5px'}}>
              <Truck size={13}/>
              <span><UiText value={"Delivery Options"}/></span>
            </div>
            <div style={{fontSize:13.5,fontWeight:600}}>{productMeta.delivery_info || 'Direct delivery & local pickup available from seller'}</div>
          </div>

          <div style={{padding:'12px',borderRadius:10,background:'rgba(255,255,255,0.06)',border:'1px solid var(--border)',display:'grid',gap:4}}>
            <small style={{fontWeight:700,fontSize:11,textTransform:'uppercase',letterSpacing:'0.5px',color:'var(--text-secondary)'}}><UiText value={"Where Product is Used in this Ad"}/></small>
            <div style={{fontSize:13,lineHeight:1.5}}>{cleanDescription || reel.title}</div>
          </div>

          {Boolean(productMeta.product_id) && (
            <Link
              href={'/commerce/'+encodeURIComponent(productMeta.product_id!)}
              style={{padding:'10px 16px',borderRadius:10,background:'#e11d48',color:'#fff',textAlign:'center',textDecoration:'none',fontWeight:700,fontSize:14}}
            >
              <UiText value={"View Full Product Page & Order"}/>
            </Link>
          )}

          <Link
            href={'/v-ads/advertisers/'+encodeURIComponent(reel.advertiser.id)}
            style={{padding:'10px 16px',borderRadius:10,background:'var(--surface-soft,rgba(255,255,255,0.1))',border:'1px solid var(--border)',color:'inherit',textAlign:'center',textDecoration:'none',fontWeight:600,fontSize:13}}
          >
            <UiText value={"Explore Brand Channel & Available Products"}/>
          </Link>
        </div>
      </div>
    )}
  </article>;
}

export function VAdsAdvertiser({id}:{id:string}) {
  const [data,setData]=useState<AdvertiserProfile|null>(null),[error,setError]=useState(''),[version,setVersion]=useState(0);
  useEffect(()=>{let alive=true;client.profile(id).then(result=>{if(alive){setData(result);setError('');}}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[id,version]);
  return <div className={s.page}><Link href="/v-ads"><UiText value={"Back to V Ads"}/></Link>{error?<div role="alert"><UiText value={error}/> <button onClick={()=>setVersion(v=>v+1)}><UiText value={"Retry"}/></button></div>:!data?<p role="status"><UiText value={"Loading advertiser…"}/></p>:<><section className={s.panel} style={{display:'grid',gap:8}}>
    <div style={{display:'flex',alignItems:'center',gap:12}}>
      <div style={{width:52,height:52,borderRadius:26,background:'#F9AA45',color:'#11243F',display:'grid',placeItems:'center',fontSize:24,fontWeight:800}}>V</div>
      <div>
        <h1 style={{margin:0,fontSize:22,display:'flex',alignItems:'center',gap:6}}>
          <span>{data.name}</span>
          <CheckCircle2 size={18} color="#16a34a"/>
        </h1>
        <p style={{margin:0,fontSize:13,color:'var(--text-secondary)'}}>@{data.handle}</p>
      </div>
    </div>
    {Boolean(data.description)&&<p style={{margin:0,fontSize:14,lineHeight:1.6}}>{data.description}</p>}
  </section>

  <h2><UiText value={"Products Available"}/></h2>
  {data.products && data.products.length > 0 ? (
    <div style={{display:'grid',gap:12}}>
      {data.products.map(product => (
        <div key={product.id} className={s.panel} style={{display:'grid',gap:8}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
            <h3 style={{margin:0,fontSize:16}}>{product.title}</h3>
            <span style={{fontSize:16,fontWeight:800,color:'#e11d48'}}>{listingPrice(product.unit_price_paise)}</span>
          </div>
          {Boolean(product.description)&&<p style={{margin:0,fontSize:13,color:'var(--text-secondary)'}}>{product.description}</p>}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap',paddingTop:4}}>
            <div style={{display:'flex',alignItems:'center',gap:6,color:'#16a34a',fontSize:12,fontWeight:600}}>
              <Truck size={14}/>
              <span>
                {product.delivery_fee_paise != null
                  ? (product.delivery_fee_paise === 0 ? 'Free Delivery' : `Delivery: ${listingPrice(product.delivery_fee_paise)}`)
                  : 'Standard delivery options'}
              </span>
            </div>
            <Link href={'/commerce/'+encodeURIComponent(product.id)} style={{fontSize:12.5,fontWeight:700,color:'#503fbd'}}>
              <UiText value={"View details & order →"}/>
            </Link>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className={s.panel} style={{textAlign:'center',padding:24,gap:6}}>
      <ShoppingBag size={28} style={{margin:'0 auto',opacity:0.4}}/>
      <h3 style={{margin:0,fontSize:15}}><UiText value={"Brand Catalog & Offerings"}/></h3>
      <p style={{margin:0,fontSize:13,color:'var(--text-secondary)'}}>
        <UiText value={"Browse this brand's video demonstrations below or enquire directly to explore all available products and services."}/>
      </p>
    </div>
  )}

  <h2><UiText value={"Videos"}/></h2>
  {data.videos.map(video=><Link className={s.panel} key={video.id} href={sharePath(video.id)}>{video.title}</Link>)}
  {!data.videos.length&&<p><UiText value={"No approved videos yet."}/></p>}</>}</div>;
}
