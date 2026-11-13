'use client';
import {UiText,UiVideo,UiButton,UiInput} from "./localized-ui";
import {useEffect,useRef,useState} from 'react';
import {Maximize,Pause,Play,Volume2,VolumeX} from 'lucide-react';
import styles from './homepage-video.module.css';
import {homepageVideos,nextHomepageVideo} from '../../shared/homepage-video';
import {webVideoCoordinator} from '../lib/video-coordinator';

export function HomepageVideoPlayer({videos=homepageVideos}:{videos?:readonly {id:string;src:string}[]}={}){
 const [index,setIndex]=useState(0);const current=videos[index]??videos[0];
 const video=useRef<HTMLVideoElement>(null),frame=useRef<HTMLDivElement>(null);
 const [visible,setVisible]=useState(true),[playing,setPlaying]=useState(false),[muted,setMuted]=useState(false),[failed,setFailed]=useState(false),[time,setTime]=useState(0),[duration,setDuration]=useState(0),[focused,setFocused]=useState(false);
 const manualMute=useRef(false);

 useEffect(()=>{if(!visible||!playing||focused)return;const timer=setTimeout(()=>setVisible(false),1000);return()=>clearTimeout(timer);},[visible,playing,focused]);

 useEffect(()=>{
  const unmuteOnInteraction=()=>{
   const element=video.current;
   if(element&&element.muted&&!manualMute.current){
    element.muted=false;
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
  const element=video.current;if(!element)return;
  const id='homepage-video-'+(current?.id||'0');
  const play=()=>{
   if(document.hidden||element.dataset.paused==='true')return;
   element.muted=muted;
   element.play().catch(()=>{
    if(!element.muted&&!manualMute.current){
     element.muted=true;
     setMuted(true);
     void element.play().catch(()=>setVisible(true));
    }else setVisible(true);
   });
  };

  webVideoCoordinator.register({
   id,
   visibleArea:0,
   play:()=>{
    if(element.dataset.paused!=='true')play();
   },
   pause:()=>{
    element.pause();
   },
   isManuallyPaused:()=>element.dataset.paused==='true'
  });

  const observer=new IntersectionObserver(entries=>{
   const entry=entries[0];
   if(!entry){webVideoCoordinator.updateVisibleArea(id,0);return;}
   const rect=entry.intersectionRect;
   const area=entry.isIntersecting&&rect?rect.width*rect.height:0;
   webVideoCoordinator.updateVisibleArea(id,area);
  },{threshold:[0,.1,.25,.5,.75,1]});

  observer.observe(element);
  const visibility=()=>{if(document.hidden)element.pause();else if(element.dataset.paused!=='true')play();};
  document.addEventListener('visibilitychange',visibility);
  return()=>{
   element.pause();
   observer.disconnect();
   webVideoCoordinator.unregister(id);
   document.removeEventListener('visibilitychange',visibility);
  };
 },[current?.src,muted]);

 const toggle=()=>{
  const element=video.current;if(!element)return;
  if(element.paused){
   element.dataset.paused='false';
   element.muted=muted;
   void element.play().catch(()=>setVisible(true));
  }else{
   element.dataset.paused='true';
   element.pause();
  }
  setVisible(true);
 };

 return <><div ref={frame} className={styles.player} onTouchStart={()=>setVisible(true)} onPointerDown={()=>setVisible(true)} onFocusCapture={event=>{if((event.target as HTMLElement).matches(':focus-visible'))setFocused(true);setVisible(true);}} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false);}}>
  <UiVideo ref={video} src={current?.src} loop={videos.length===1} autoPlay playsInline preload="metadata" aria-label="VISTRAH homepage video" onPlay={()=>setPlaying(true)} onPause={()=>{setPlaying(false);setVisible(true);}} onEnded={()=>{setTime(0);setDuration(0);setFailed(false);setIndex(value=>nextHomepageVideo(value,videos.length));}} onVolumeChange={()=>setMuted(video.current?.muted??false)} onLoadedMetadata={()=>setDuration(video.current?.duration??0)} onTimeUpdate={()=>setTime(video.current?.currentTime??0)} onError={()=>setFailed(true)}/>
  <UiButton type="button" className={styles.reveal} aria-label="Show video controls" onClick={()=>setVisible(true)}/>
  {visible&&<div className={styles.controls}>
   <UiButton type="button" aria-label={playing?'Pause video':'Play video'} onClick={toggle}>{playing?<Pause size={20}/>:<Play size={20}/>}</UiButton>
   <UiButton type="button" aria-label={muted?'Unmute video':'Mute video'} onClick={()=>{if(video.current){video.current.muted=!video.current.muted;manualMute.current=video.current.muted;}setVisible(true);}}>{muted?<VolumeX size={20}/>:<Volume2 size={20}/>}</UiButton>
   <UiInput aria-label="Video position" type="range" min={0} max={Number.isFinite(duration)?duration:0} step="0.1" value={time} onChange={event=>{if(video.current)video.current.currentTime=Number(event.target.value);setVisible(true);}}/>
   <UiButton type="button" aria-label="Fullscreen video" onClick={()=>{const element=video.current as (HTMLVideoElement&{webkitEnterFullscreen?:()=>void})|null;if(frame.current?.requestFullscreen)void frame.current.requestFullscreen().catch(()=>{});else element?.webkitEnterFullscreen?.();}}><Maximize size={20}/></UiButton>
  </div>}
 </div>{failed&&<p className={styles.error} role="status"><UiText value={"Video could not load. "}/><a href={current?.src}><UiText value={"Open the video"}/></a></p>}</>;
}
