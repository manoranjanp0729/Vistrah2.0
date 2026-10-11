'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
export function ReferenceHeroCarousel({children}:{children:ReactNode}){
  const track=useRef<HTMLDivElement>(null);const [playing,setPlaying]=useState(true);
  useEffect(()=>{
    const element=track.current;if(!element||!playing)return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    const timer=setInterval(()=>{
      if(document.hidden||reduced.matches||element.matches(':hover')||element.contains(document.activeElement))return;
      const slides=Array.from(element.children) as HTMLElement[];if(slides.length<2)return;
      const index=Math.round(element.scrollLeft/element.clientWidth);const next=slides[(index+1)%slides.length];
      element.scrollTo({left:next.offsetLeft-element.offsetLeft,behavior:'smooth'});
    },4000);
    return()=>clearInterval(timer);
  },[playing]);
  return <div className="reference-hero-carousel"><div ref={track} className="reference-hero-track" aria-label="Featured services" tabIndex={0} onPointerDown={()=>setPlaying(false)}>{children}</div><button type="button" className="reference-play" onClick={()=>setPlaying(value=>!value)} aria-label={playing?'Pause featured services':'Play featured services'}>{playing?'Pause':'Play'} carousel</button></div>;
}
