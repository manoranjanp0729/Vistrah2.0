'use client';
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';

/** Native touch/keyboard scrolling; controls reflect actual overflow. */
export function HorizontalCarousel({label,children}:{label:string;children:ReactNode}){
  const id=useId(),track=useRef<HTMLDivElement>(null);
  const [edges,setEdges]=useState({previous:false,next:false});
  useEffect(()=>{
    const element=track.current;if(!element)return;
    const measure=()=>setEdges({previous:element.scrollLeft>1,next:element.scrollLeft+element.clientWidth<element.scrollWidth-1});
    measure();element.addEventListener('scroll',measure,{passive:true});
    const observer=new ResizeObserver(measure);observer.observe(element);
    for(const child of element.children)observer.observe(child);
    return()=>{element.removeEventListener('scroll',measure);observer.disconnect();};
  },[children]);
  function move(direction:number){const element=track.current;if(element)element.scrollBy({left:direction*element.clientWidth*.85,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  return <div className="horizontal-carousel"><div className="carousel-controls"><button type="button" className="icon-button" aria-label={`Previous ${label}`} aria-controls={id} disabled={!edges.previous} onClick={()=>move(-1)}><ChevronLeft/></button><button type="button" className="icon-button" aria-label={`Next ${label}`} aria-controls={id} disabled={!edges.next} onClick={()=>move(1)}><ChevronRight/></button></div><div ref={track} id={id} className="carousel-track" role="region" aria-label={label} tabIndex={0}>{children}</div></div>;
}
