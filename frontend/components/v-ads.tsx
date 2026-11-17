'use client';
import {UiText,UiDiv,UiButton,UiSection,UiInput} from "./localized-ui";
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState,type RefObject} from 'react';
import {Heart,Maximize,MessageCircle,Share2,Volume2,VolumeX,X,ShoppingBag,Briefcase,Truck,CheckCircle2,MapPin} from 'lucide-react';
import {api,ApiError} from '@/lib/api';
import {radii,requestGps,validPoint,type Point,type Radius} from '@/lib/location';
import {useUser} from './customer';
import {useOptionalCustomerLocation} from './customer-location';
import {PlaceAutocompleteInput,VistrahMap,googleMapsDirectionsHref,type VistrahMapMarker} from './vistrah-google-maps';
import {mediaUrl,mergeReels,sharePath,vAdsClient,parseAdDescription,type Reel,type Comment,type AdvertiserProfile,type FeedFilter} from '../../shared/v-ads';
import {listingPrice} from '../../shared/commerce';
import s from './v-ads.module.css';
import {managementClient,advanceView} from '../../shared/v-ads-management';
import {webVideoCoordinator} from '../lib/video-coordinator';
const client=vAdsClient(api);
const management=managementClient(api);

export function VAdsReels({initialVideo}:{initialVideo?:string}) {
  const {user}=useUser();const locationState=useOptionalCustomerLocation();const root=useRef<HTMLDivElement>(null);
  const activePoint=locationState?.active&&validPoint(locationState.active)?locationState.active:null;
  const activeLat=activePoint?.latitude,activeLon=activePoint?.longitude,activeRadius=locationState?.radius,locRev=locationState?.locationRevision??0;
  const [items,setItems]=useState<Reel[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [version,setVersion]=useState(0),[page,setPage]=useState(1),[more,setMore]=useState(false),[paging,setPaging]=useState(false);
  const [displayMode,setDisplayMode]=useState<'reels'|'map'>('reels');
  const [mapCenter,setMapCenter]=useState<Point>(()=>activePoint??{latitude:12.9716,longitude:77.5946});
  const [mapRadius,setMapRadius]=useState<Radius>(()=>locationState?.radius??10);
  const [mapLabel,setMapLabel]=useState<string>(()=>activePoint?.locality??'Bengaluru');
  const [gpsBusy,setGpsBusy]=useState(false);
  const lock=useRef(false);
  const effectiveFilterLat=displayMode==='map'?mapCenter.latitude:activeLat;
  const effectiveFilterLon=displayMode==='map'?mapCenter.longitude:activeLon;
  const effectiveFilterRadius=displayMode==='map'?mapRadius:activeRadius;
  useEffect(()=>{if(activePoint){setMapCenter({latitude:activePoint.latitude,longitude:activePoint.longitude});if(activePoint.locality)setMapLabel(activePoint.locality);}},[activePoint?.latitude,activePoint?.longitude,activePoint?.locality]);
  useEffect(()=>{let alive=true;
    const filter:FeedFilter|undefined=effectiveFilterLat!==undefined&&effectiveFilterLon!==undefined?{lat:effectiveFilterLat,lon:effectiveFilterLon,radius_km:effectiveFilterRadius}:undefined;
    Promise.all([filter?client.feed(1,filter):client.feed(),initialVideo?client.reel(initialVideo):Promise.resolve(null)]).then(([feed,selected])=>{
      if(alive){setItems(mergeReels(selected?[selected]:[],feed.items));setPage(1);setMore(feed.has_more);root.current?.scrollTo(0,0);}
    }).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};
  },[initialVideo,version,effectiveFilterLat,effectiveFilterLon,effectiveFilterRadius,locRev]);
  useEffect(()=>{
    const feed=root.current;if(!feed)return;
    const viewport=window.visualViewport;
    const fit=()=>{
      const height=feed.clientHeight;
      const index=height?Math.round(feed.scrollTop/height):0;
      const bottom=viewport?viewport.height+viewport.offsetTop:window.innerHeight;
      const available=Math.max(1,bottom-feed.getBoundingClientRect().top-12);
      const value=available+'px';
      if(feed.style.getPropertyValue('--feed-max-height')===value)return;
      feed.style.setProperty('--feed-max-height',value);
      // Keep the same reel aligned when browser chrome or orientation changes.
      feed.scrollTop=index*feed.clientHeight;
    };
    fit();
    const observer=new ResizeObserver(fit);
    if(feed.parentElement)observer.observe(feed.parentElement);
    window.addEventListener('resize',fit);
    viewport?.addEventListener('resize',fit);
    return()=>{observer.disconnect();window.removeEventListener('resize',fit);viewport?.removeEventListener('resize',fit);};
  },[loading,items.length]);
  async function loadMore(){if(lock.current||!more)return;lock.current=true;setPaging(true);try{const filter:FeedFilter|undefined=effectiveFilterLat!==undefined&&effectiveFilterLon!==undefined?{lat:effectiveFilterLat,lon:effectiveFilterLon,radius_km:effectiveFilterRadius}:undefined;const next=await client.feed(page+1,filter);setItems(old=>mergeReels(old,next.items));setPage(next.page);setMore(next.has_more);setError('');}catch(e){setError((e as Error).message);}finally{lock.current=false;setPaging(false);}}
  const reelMapMarkers=useMemo<VistrahMapMarker[]>(()=>items.filter(item=>item.area_coordinates&&validPoint(item.area_coordinates)).map(item=>({
    id:item.id,
    latitude:item.area_coordinates!.latitude,
    longitude:item.area_coordinates!.longitude,
    title:item.title,
    subtitle:`@${item.advertiser.handle} · ${item.advertiser.name}`,
    distanceKm:item.distance_km??null,
    badge:item.proximity==='local'?'Nearby V Ad':'Regional V Ad',
    actionLabel:'Watch Reel',
    onAction:()=>{
      setDisplayMode('reels');
      setTimeout(()=>{
        const idx=items.findIndex(r=>r.id===item.id);
        if(idx>=0&&root.current)root.current.scrollTo({top:idx*root.current.clientHeight,behavior:'smooth'});
      },60);
    },
  })),[items]);
  async function useMyLocationOnFeed(){
    setGpsBusy(true);setError('');
    try{
      const fix=await requestGps(navigator.geolocation);
      setMapCenter(fix.point);
      setMapLabel('Current GPS area');
    }catch(e){setError((e as Error).message);}
    finally{setGpsBusy(false);}
  }
  return <div className={s.page}><div className={`${s.bar} ${s.feedBar}`}><h1><UiText value={"V Ads"}/></h1><div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}><div role="group" aria-label="V Ads view mode" style={{display:'inline-flex',padding:3,borderRadius:9,border:'1px solid var(--hairline, var(--border))',gap:2}}><button type="button" className={displayMode==='reels'?'button':'button secondary'} style={{minHeight:32,padding:'4px 10px',fontSize:12}} aria-pressed={displayMode==='reels'} onClick={()=>setDisplayMode('reels')}><UiText value={"Reels"}/></button><button type="button" className={displayMode==='map'?'button':'button secondary'} style={{minHeight:32,padding:'4px 10px',fontSize:12}} aria-pressed={displayMode==='map'} onClick={()=>setDisplayMode('map')}><MapPin size={13} aria-hidden="true"/> <UiText value={"Map View"}/></button></div><Link href="/seller/v-ads?from=v-ads" className="button secondary"><UiText value={"V Ads Studio"}/></Link></div></div>
    {displayMode==='map'&&(
      <section aria-label="Nearby V Ads Map" style={{display:'grid',gap:12,padding:'12px 0'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr auto auto',gap:8,alignItems:'end'}}>
          <PlaceAutocompleteInput
            label="Explore hyperlocal V Ads near an area"
            placeholder="Search neighbourhood, landmark, or city"
            defaultValue={mapLabel}
            onSelectPlace={place=>{
              setMapCenter({latitude:place.latitude,longitude:place.longitude});
              setMapLabel(place.locality||place.formattedAddress);
            }}
          />
          <label style={{fontSize:12,fontWeight:600}}>
            <UiText value={"Radius"}/>
            <select value={mapRadius} onChange={e=>setMapRadius(Number(e.target.value) as Radius)} style={{display:'block',minHeight:42,marginTop:4,padding:'6px 10px',borderRadius:8,border:'1px solid var(--hairline, var(--border))'}}>
              {radii.map(r=><option key={r} value={r}>{r} km</option>)}
            </select>
          </label>
          <button type="button" className="button secondary" disabled={gpsBusy} onClick={()=>void useMyLocationOnFeed()} style={{minHeight:42}}>
            <UiText value={gpsBusy?'Locating…':'Use my location'}/>
          </button>
        </div>
        <VistrahMap
          center={mapCenter}
          radiusKm={mapRadius}
          markers={reelMapMarkers}
          editable
          height={380}
          onPinChange={point=>{setMapCenter(point);setMapLabel(`${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`);}}
          ariaLabel="Nearby V Ads Google Map"
        />
        <div style={{display:'grid',gap:8}} className="tabular-nums">
          <small style={{color:'var(--text-secondary)'}}>
            Showing {reelMapMarkers.length} geo-pinned V {reelMapMarkers.length===1?'Ad':'Ads'} around <strong>{mapLabel}</strong> ({mapRadius} km radius) · {items.length} total approved ads in feed.
          </small>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))',gap:10}}>
            {items.map((item,idx)=>(
              <article key={item.id} style={{padding:12,borderRadius:10,border:'1px solid var(--hairline, var(--border))',background:'var(--surface)',display:'grid',gap:6}}>
                <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'baseline'}}>
                  <strong style={{fontSize:14}}>{item.title}</strong>
                  {typeof item.distance_km==='number'&&<span style={{fontSize:12,fontWeight:600,color:'#0f172a'}}>{item.distance_km.toFixed(1)} km</span>}
                </div>
                <small style={{color:'var(--text-secondary)'}}>@{item.advertiser.handle} · {item.advertiser.name}</small>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
                  <button type="button" className="button secondary" style={{minHeight:32,padding:'4px 10px',fontSize:12}} onClick={()=>{
                    setDisplayMode('reels');
                    setTimeout(()=>{if(root.current)root.current.scrollTo({top:idx*root.current.clientHeight,behavior:'smooth'});},60);
                  }}><UiText value={"Watch Reel"}/></button>
                  {item.area_coordinates&&validPoint(item.area_coordinates)&&(
                    <a href={googleMapsDirectionsHref(item.area_coordinates.latitude,item.area_coordinates.longitude)} target="_blank" rel="noopener noreferrer" className="text-link" style={{fontSize:12,alignSelf:'center'}}>
                      <UiText value={"Open in Google Maps"}/>
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    )}
    {loading?<p className={s.status} role="status"><UiText value={"Loading videos…"}/></p>:!items.length?<div className={s.status}><p role="status">{error||'No approved local video ads in this view yet.'}</p><button className="button secondary" onClick={()=>setVersion(v=>v+1)}><UiText value={"Refresh feed"}/></button></div>:displayMode==='reels'?<>
      <UiDiv  className={s.feed} ref={root} aria-label="V Ads videos" tabIndex={0} onScroll={event=>{const node=event.currentTarget;if(!error&&node.scrollHeight-node.scrollTop-node.clientHeight<node.clientHeight*.5)void loadMore();}}>
        {items.map(item=><ReelCard key={item.id+':'+(user?.id??'guest')} reel={item} root={root} authenticated={Boolean(user)}/>)}</UiDiv>
      {Boolean(error)&&<div role="alert" className={s.error}><UiText value={error}/> <button className="button secondary" onClick={()=>void loadMore()}><UiText value={"Retry"}/></button></div>}
      {more&&<button className="button secondary" disabled={paging} onClick={()=>void loadMore()}><UiText value={paging?'Loading…':'Load more videos'}/></button>}
    </>:null}
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
            style={{background:'#e11d48',color:'#fff',minHeight:36,padding:'6px 14px',borderRadius:20,border:0,fontWeight:700,fontSize:13,fontVariantNumeric:'tabular-nums',display:'inline-flex',alignItems:'center',gap:6,cursor:'pointer'}}
          >
            <ShoppingBag size={14}/>
            <span><UiText value={"Explore Product"}/>{adMeta.product_price ? ` · ${adMeta.product_price}` : ''}</span>
          </button>
        ) : (
          <Link
            href={'/v-ads/advertisers/'+encodeURIComponent(reel.advertiser.id)}
            style={{background:'#503fbd',color:'#fff',minHeight:36,padding:'6px 14px',borderRadius:20,border:0,fontWeight:700,fontSize:13,display:'inline-flex',alignItems:'center',gap:6,textDecoration:'none'}}
          >
            <Briefcase size={14}/>
            <span><UiText value={"Explore Brand"}/></span>
          </Link>
        )}
        <Link
          href="/seller/v-ads?from=v-ads"
          style={{background:'rgba(255,255,255,0.22)',color:'#fff',minHeight:36,padding:'6px 12px',borderRadius:20,fontSize:12,fontWeight:600,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:4}}
        >
          <UiText value={"Studio"}/>
        </Link>
      </div>
    </div>
    {open&&<UiSection  className={s.comments} aria-label="Comments"><div className={s.bar}><h3><UiText value={"Comments"}/></h3><UiButton  onClick={()=>setOpen(false)} aria-label="Close comments"><X/></UiButton></div><div className={s.commentList}>{commentsLoading&&<p role="status"><UiText value={"Loading comments…"}/></p>}{!commentsLoading&&!comments.length&&<p><UiText value={"Be the first to comment."}/></p>}{comments.map(comment=><p key={comment.id}>{comment.body}</p>)}{moreComments&&<button disabled={commentsLoading} onClick={()=>void more()}><UiText value={"More comments"}/></button>}</div><form onSubmit={event=>{event.preventDefault();post();}}><UiInput  aria-label="Add a comment" placeholder="Add a comment..." value={draft} onChange={event=>setDraft(event.target.value)} maxLength={500}/><button disabled={busy||commentsLoading||!draft.trim()}><UiText value={"Post"}/></button></form>{Boolean(error)&&<p role="status"><UiText value={error}/></p>}{(!authenticated||authRequired)&&<Link href="/login?next=%2Fv-ads"><UiText value={"Sign in to like or comment"}/></Link>}</UiSection>}

    {/* Product Details Sheet for Web */}
    {productDetailsOpen && productMeta && (
      <div className={s.comments} style={{height:'70%',maxHeight:'520px',overflowY:'auto',background:'var(--surface,#171b25)',color:'var(--text,#fff)',borderTop:'1px solid var(--border)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingBottom:12,borderBottom:'1px solid var(--hairline,var(--border))'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <ShoppingBag size={16} color="#e11d48"/>
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

          <div style={{padding:'12px 0',borderTop:'1px solid var(--hairline,var(--border))',borderBottom:'1px solid var(--hairline,var(--border))',display:'grid',gap:4}}>
            <small style={{fontWeight:600,color:'var(--text-secondary)',textTransform:'uppercase',fontSize:11,letterSpacing:'0.04em'}}><UiText value={"Price Details"}/></small>
            <div style={{fontSize:20,fontWeight:700,color:'#e11d48',fontVariantNumeric:'tabular-nums',fontFeatureSettings:'"tnum" 1'}}>{productMeta.product_price || 'Available on enquiry / order'}</div>
          </div>

          <div style={{padding:'0 0 12px',borderBottom:'1px solid var(--hairline,var(--border))',display:'grid',gap:4}}>
            <div style={{display:'flex',alignItems:'center',gap:6,color:'var(--text-secondary)',fontWeight:600,fontSize:11,textTransform:'uppercase',letterSpacing:'0.04em'}}>
              <Truck size={13} color="#16a34a"/>
              <span><UiText value={"Delivery Options"}/></span>
            </div>
            <div style={{fontSize:13.5,fontWeight:500,lineHeight:1.5}}>{productMeta.delivery_info || 'Direct delivery & local pickup available from seller'}</div>
          </div>

          <div style={{padding:'0 0 12px',borderBottom:'1px solid var(--hairline,var(--border))',display:'grid',gap:4}}>
            <small style={{fontWeight:600,fontSize:11,textTransform:'uppercase',letterSpacing:'0.04em',color:'var(--text-secondary)'}}><UiText value={"Product & Demonstration Scope"}/></small>
            <div style={{fontSize:13,lineHeight:1.5}}>{cleanDescription || reel.title}</div>
          </div>

          {Boolean(productMeta.product_id) && (
            <Link
              href={'/commerce/'+encodeURIComponent(productMeta.product_id!)}
              style={{padding:'10px 16px',borderRadius:8,background:'#e11d48',color:'#fff',textAlign:'center',textDecoration:'none',fontWeight:600,fontSize:14}}
            >
              <UiText value={"View Full Product Page & Order"}/>
            </Link>
          )}

          <Link
            href={'/v-ads/advertisers/'+encodeURIComponent(reel.advertiser.id)}
            style={{padding:'10px 16px',borderRadius:8,background:'var(--surface-soft,rgba(255,255,255,0.06))',border:'1px solid var(--border)',color:'inherit',textAlign:'center',textDecoration:'none',fontWeight:600,fontSize:13}}
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
  return <div className={s.page}><Link href="/v-ads"><UiText value={"Back to V Ads"}/></Link>{error?<div role="alert"><UiText value={error}/> <button className="button secondary" onClick={()=>setVersion(v=>v+1)}><UiText value={"Retry"}/></button></div>:!data?<p role="status"><UiText value={"Loading advertiser…"}/></p>:<><section className={s.panel} style={{display:'grid',gap:8}}>
    <div style={{display:'flex',alignItems:'center',gap:12}}>
      <div style={{width:48,height:48,borderRadius:12,background:'#F9AA45',color:'#11243F',display:'grid',placeItems:'center',fontSize:22,fontWeight:700}}>V</div>
      <div>
        <h1 style={{margin:0,fontSize:22,fontWeight:600,letterSpacing:'-0.025em',display:'flex',alignItems:'center',gap:6}}>
          <span>{data.name}</span>
          <CheckCircle2 size={18} color="#16a34a"/>
        </h1>
        <p style={{margin:0,fontSize:13,color:'var(--text-secondary)'}}>@{data.handle}</p>
      </div>
    </div>
    {Boolean(data.description)&&<p style={{margin:0,fontSize:14,lineHeight:1.5}}>{data.description}</p>}
  </section>

  <h2><UiText value={"Products Available"}/></h2>
  {data.products && data.products.length > 0 ? (
    <div className={s.editorialList}>
      {data.products.map(product => (
        <div key={product.id} className={s.editorialRow}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
            <h3 style={{margin:0,fontSize:16,fontWeight:600,letterSpacing:'-0.015em'}}>{product.title}</h3>
            <span style={{fontSize:16,fontWeight:700,color:'#e11d48',fontVariantNumeric:'tabular-nums',fontFeatureSettings:'"tnum" 1'}}>{listingPrice(product.unit_price_paise)}</span>
          </div>
          {Boolean(product.description)&&<p style={{margin:0,fontSize:13,lineHeight:1.5,color:'var(--text-secondary)'}}>{product.description}</p>}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap',paddingTop:4}}>
            <div style={{display:'flex',alignItems:'center',gap:6,color:'#16a34a',fontSize:12,fontWeight:600,fontVariantNumeric:'tabular-nums',fontFeatureSettings:'"tnum" 1'}}>
              <Truck size={14}/>
              <span>
                {product.delivery_fee_paise != null
                  ? (product.delivery_fee_paise === 0 ? 'Free Delivery' : `Delivery: ${listingPrice(product.delivery_fee_paise)}`)
                  : 'Standard delivery options'}
              </span>
            </div>
            <Link href={'/commerce/'+encodeURIComponent(product.id)} style={{fontSize:13,fontWeight:600,color:'#503fbd'}}>
              <UiText value={"View details & order →"}/>
            </Link>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className={s.editorialList}>
      <div className={s.editorialRow}>
        <h3 style={{margin:0,fontSize:15,fontWeight:600}}><UiText value={"Verified Brand Catalog"}/></h3>
        <p style={{margin:0,fontSize:13,lineHeight:1.5,color:'var(--text-secondary)'}}>
          <UiText value={"Review published video demonstrations below or submit an enquiry for direct pricing and local fulfilment."}/>
        </p>
      </div>
    </div>
  )}

  <h2><UiText value={"Published Video Ads"}/></h2>
  {data.videos.length ? (
    <div className={s.editorialList}>
      {data.videos.map(video=><Link className={s.editorialRow} key={video.id} href={sharePath(video.id)}>
        <span style={{fontWeight:600,fontSize:15}}>{video.title}</span>
        <span style={{fontSize:13,color:'var(--text-secondary)'}}><UiText value={"Watch video ad →"}/></span>
      </Link>)}
    </div>
  ) : <p><UiText value={"No approved local video ads published yet."}/></p>}</>}</div>;
}
