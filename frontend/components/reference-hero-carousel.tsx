'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';

const slides=[
 {step:'01 · DISCOVER',title:'Find the right services for your needs',description:'Explore services for home, work and business in one place.',action:'Explore services',href:'/services'},
 {step:'02 · CONNECT',title:'Find and connect with service providers',description:'Explore provider options and choose who to contact.',action:'Find a provider',href:'/services'},
 {step:'03 · PROVIDE',title:'Have a service to offer?',description:'Showcase your expertise and reach customers looking for your services.',action:'Provide a service',href:'/provider'},
 {step:'04 · PROMOTE',title:'Make your business more visible',description:'Discover VISTRAH Ads & Marketing for content and promotion.',action:'Explore Ads & Marketing',href:'/services'},
 {step:'05 · GROW',title:'More opportunities. One platform.',description:'Find services, offer expertise and explore ways to grow.',action:'Get started',href:'/services'},
] as const;
export function ReferenceHeroCarousel(){
 const track=useRef<HTMLDivElement>(null);const [playing,setPlaying]=useState(true);const [active,setActive]=useState(0);
 const go=(index:number)=>{const el=track.current;if(!el)return;const nodes=Array.from(el.children) as HTMLElement[];const next=nodes[index];if(next){el.scrollTo({left:next.offsetLeft-el.offsetLeft,behavior:'smooth'});setActive(index);}};
 useEffect(()=>{const el=track.current;if(!el||!playing)return;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');const timer=setInterval(()=>{if(document.hidden||reduced.matches||el.matches(':hover')||el.contains(document.activeElement))return;go((Math.round(el.scrollLeft/(el.clientWidth||1))+1)%slides.length);},4000);return()=>clearInterval(timer);},[playing]);
 return <div className="reference-hero-carousel" style={{position:'relative'}}>
  <div ref={track} className="reference-hero-track" aria-label="Five steps to use VISTRAH" tabIndex={0} onPointerDown={()=>setPlaying(false)} onScroll={event=>{const el=event.currentTarget;setActive(Math.min(4,Math.max(0,Math.round(el.scrollLeft/(el.clientWidth||1)))));}}>
   {slides.map((slide,index)=><div key={slide.step} className="reference-hero-slide" style={{position:'relative',overflow:'hidden',minWidth:'100%',boxSizing:'border-box',display:'flex',alignItems:'center',background:'#12344a',color:'#fff'}}>
    <div aria-hidden="true" style={{position:'absolute',right:0,top:0,bottom:0,width:'59%',backgroundImage:`linear-gradient(90deg,#12344a 0%,rgba(18,52,74,.04) 38%),url(/hero-journey/step-${index+1}.webp)`,backgroundSize:'cover',backgroundPosition:'center'}}/>
    <div style={{position:'relative',zIndex:2,maxWidth:'60%',paddingRight:8}}><p className="reference-label" style={{color:'#c5d9e6'}}>{slide.step}</p><h2 style={{color:'#fff'}}>{slide.title}</h2><p style={{color:'#e0e7ed'}}>{slide.description}</p><Link href={slide.href} style={{color:'#ffac38',fontWeight:700}}>{slide.action} →</Link></div>
   </div>)}
  </div>
  <div aria-label="Carousel navigation" style={{position:'absolute',bottom:11,left:0,right:0,display:'flex',justifyContent:'center',gap:8}}>{slides.map((slide,i)=><button key={slide.step} type="button" onClick={()=>{setPlaying(false);go(i);}} aria-label={`Show step ${i+1}`} aria-current={active===i?'step':undefined} style={{border:0,cursor:'pointer',height:8,width:active===i?24:8,borderRadius:9,background:active===i?'#ffad36':'#a4adb7',padding:0}}/>)}</div>
  <button type="button" className="reference-play" onClick={()=>setPlaying(value=>!value)} aria-label={playing?'Pause carousel':'Play carousel'}>{playing?'Pause':'Play'} carousel</button>
 </div>;
}
