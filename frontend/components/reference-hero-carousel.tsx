'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,BriefcaseBusiness,ChartNoAxesCombined,CheckCircle2,House,Megaphone,Search,ShieldCheck,Users,Wrench} from 'lucide-react';

const slides=[
  {step:'01 · DISCOVER',title:'Find the right services for your needs',description:'Explore services for home, work and business in one place.',action:'Explore services',href:'/services',icons:[House,Wrench,BriefcaseBusiness],labels:['Home','Repairs','Careers']},
  {step:'02 · CONNECT',title:'Find and connect with service providers',description:'Explore provider options and choose who to contact.',action:'Find a provider',href:'/services',icons:[Search,Users,CheckCircle2],labels:['Search','Providers','Connect']},
  {step:'03 · PROVIDE',title:'Have a service to offer?',description:'Showcase your expertise and reach customers looking for your services.',action:'Provide a service',href:'/provider',icons:[BriefcaseBusiness,ShieldCheck,Users],labels:['Create','Get reviewed','Reach people']},
  {step:'04 · PROMOTE',title:'Make your business more visible',description:'Discover VISTRAH Ads & Marketing services for content and promotion.',action:'Explore Ads & Marketing',href:'/services?category=marketing',icons:[Megaphone,ChartNoAxesCombined,Users],labels:['Promote','Create','Reach']},
  {step:'05 · GROW',title:'More opportunities. One platform.',description:'Find services, offer your expertise and explore ways to grow.',action:'Get started',href:'/services',icons:[Users,ChartNoAxesCombined,CheckCircle2],labels:['Connect','Grow','Move forward']},
] as const;
export function ReferenceHeroCarousel(){
  const track=useRef<HTMLDivElement>(null);
  const [playing,setPlaying]=useState(true);
  const [active,setActive]=useState(0);
  const go=(index:number)=>{const el=track.current;if(!el)return;const slides=Array.from(el.children) as HTMLElement[];const next=slides[index];if(next){el.scrollTo({left:next.offsetLeft-el.offsetLeft,behavior:'smooth'});setActive(index);}};
  useEffect(()=>{
    const el=track.current;if(!el||!playing)return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    const timer=setInterval(()=>{if(document.hidden||reduced.matches||el.matches(':hover')||el.contains(document.activeElement))return;go((Math.round(el.scrollLeft/(el.clientWidth||1))+1)%slides.length);},4000);
    return()=>clearInterval(timer);
  },[playing]);
  return <div className="reference-hero-carousel" style={{position:'relative'}}>
    <div ref={track} className="reference-hero-track" aria-label="Five steps to use VISTRAH" tabIndex={0} onPointerDown={()=>setPlaying(false)} onScroll={event=>{const el=event.currentTarget;setActive(Math.min(4,Math.max(0,Math.round(el.scrollLeft/(el.clientWidth||1)))));}}>
      {slides.map((slide,index)=><div key={slide.step} className={`reference-hero-slide reference-slide-tone-${index%2}`} style={{position:'relative',overflow:'hidden',minWidth:'100%',boxSizing:'border-box',display:'flex',alignItems:'center',background:'linear-gradient(120deg,#18394b,#17202e)',color:'#fff'}}>
        <div style={{position:'relative',zIndex:2,maxWidth:'61%',paddingRight:8}}>
          <p className="reference-label" style={{color:'#c5d9e6'}}>{slide.step}</p>
          <h2 style={{color:'#fff'}}>{slide.title}</h2>
          <p style={{color:'#e0e7ed'}}>{slide.description}</p>
          <Link href={slide.href} style={{color:'#ffac38',fontWeight:700,display:'inline-flex',alignItems:'center',gap:6}}>{slide.action}<ArrowRight size={16}/></Link>
        </div>
        <div aria-hidden="true" style={{position:'absolute',right:'3%',top:'12%',bottom:'17%',width:'37%',display:'flex',alignItems:'center',justifyContent:'center',gap:7}}>
          {slide.icons.map((Icon,i)=><div key={slide.labels[i]} style={{background:'rgba(255,255,255,.94)',borderRadius:16,color:'#173b54',padding:'12px 5px',width:'33%',display:'flex',flexDirection:'column',alignItems:'center',gap:6,transform:i===1?'translateY(-13px)':'translateY(10px)',boxShadow:'0 6px 20px rgba(0,0,0,.16)'}}><Icon size={25} color={i===1?'#ff902a':'#267ab8'}/><span style={{fontSize:9,fontWeight:700,textAlign:'center',lineHeight:1.3}}>{slide.labels[i]}</span></div>)}
        </div>
      </div>)}
    </div>
    <div aria-label="Carousel navigation" style={{position:'absolute',bottom:11,left:0,right:0,display:'flex',justifyContent:'center',gap:8}}>{slides.map((slide,i)=><button key={slide.step} type="button" onClick={()=>{setPlaying(false);go(i);}} aria-label={`Show step ${i+1}`} aria-current={active===i?'step':undefined} style={{border:0,cursor:'pointer',height:8,width:active===i?24:8,borderRadius:9,background:active===i?'#ffad36':'#a4adb7',padding:0}}/>)}</div>
    <button type="button" className="reference-play" onClick={()=>setPlaying(value=>!value)} aria-label={playing?'Pause carousel':'Play carousel'}>{playing?'Pause':'Play'} carousel</button>
  </div>;
}
