'use client';
import {useLanguage} from './language-provider';
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {photoCardDesign} from '../../shared/photo-card-design';
import styles from './photo-card.module.css';
export function PhotoCardRail({label,children,compact=false,discovery=false,labelKey}:{label:string;children:ReactNode;compact?:boolean;discovery?:boolean;labelKey?:string}) {
  const {t,locale}=useLanguage();const displayLabel=labelKey?t(labelKey):label;
  const id=useId(),track=useRef<HTMLDivElement>(null);
  const [edges,setEdges]=useState({previous:false,next:false});
  useEffect(()=>{
    const element=track.current;if(!element)return;
    const measure=()=>setEdges({previous:element.scrollLeft>1,next:element.scrollLeft+element.clientWidth<element.scrollWidth-1});
    const observer=new ResizeObserver(measure);observer.observe(element);for(const child of element.children)observer.observe(child);
    measure();element.addEventListener('scroll',measure,{passive:true});return()=>{observer.disconnect();element.removeEventListener('scroll',measure);};
  },[children]);
  function move(direction:number){const element=track.current;if(element)element.scrollBy({left:direction*element.clientWidth*.85,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  return <div className={`${styles.rail} ${compact?styles.compact:''}`} data-photo-rail={label}>{(!compact||edges.previous||edges.next)&&<div className={styles.controls}>{!compact&&<span>{t('discovery.swipe')}</span>}<div><button type="button" aria-label={t('discovery.previous',{name:displayLabel})} aria-controls={id} disabled={!edges.previous} onClick={()=>move(-1)}><ChevronLeft size={18}/></button><button type="button" aria-label={t('discovery.next',{name:displayLabel})} aria-controls={id} disabled={!edges.next} onClick={()=>move(1)}><ChevronRight size={18}/></button></div></div>}
    <div id={id} ref={track} className={styles.track} tabIndex={0} role="region" aria-label={displayLabel} style={{gridAutoColumns:photoCardDesign.width,gridTemplateRows:locale==='en'?`repeat(2,${discovery?photoCardDesign.height-18:photoCardDesign.height}px)`:`repeat(2,minmax(${discovery?photoCardDesign.height-18:photoCardDesign.height}px,auto))`,gap:photoCardDesign.gap}}>{children}</div>
  </div>;
}
