'use client';
import {useId,useRef,useState,useEffect,useLayoutEffect,useCallback} from 'react';
import type {ReactNode,FocusEvent} from 'react';
import {CircleHelp,X} from 'lucide-react';
import {helpContent,type HelpId} from '@/lib/help-content';

/** Read-only, non-modal popover: independent of its neighbouring control. */
export function ContextHelp({id}:{id:HelpId}) {
  const content=helpContent[id];const uid=useId();
  const trigger=useRef<HTMLButtonElement>(null);const panel=useRef<HTMLSpanElement>(null);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);const pinned=useRef(false);
  const dismissed=useRef(false);const restoringFocus=useRef(false);const [open,setOpen]=useState(false);
  const cancelTimer=useCallback(()=>{if(timer.current)clearTimeout(timer.current);},[]);
  const close=useCallback(()=>{cancelTimer();pinned.current=false;dismissed.current=true;setOpen(false);},[cancelTimer]);
  const reveal=()=>{cancelTimer();if(!dismissed.current)setOpen(true);};
  const contains=(node:Node|null)=>!!node&&(!!trigger.current?.contains(node)||!!panel.current?.contains(node));
  const delayClose=()=>{cancelTimer();if(!pinned.current)timer.current=setTimeout(()=>setOpen(false),300);};
  const blur=(event:FocusEvent)=>{if(!contains(event.relatedTarget)){close();}};
  const restoreFocus=()=>{if(document.activeElement!==trigger.current){restoringFocus.current=true;trigger.current?.focus();}};
  useLayoutEffect(()=>{
    if(!open)return;
    const el=panel.current;const button=trigger.current;if(!el||!button)return;
    // Native popovers enter the top layer, including above modal dialogs.
    el.showPopover();
    const position=()=>{
      const anchor=button.getBoundingClientRect();const rect=el.getBoundingClientRect();
      const viewport=window.visualViewport;
      const left=viewport?.offsetLeft??0;const top=viewport?.offsetTop??0;
      const width=viewport?.width??innerWidth;const height=viewport?.height??innerHeight;
      const x=Math.max(left+12,Math.min(anchor.left,left+width-rect.width-12));
      const below=anchor.bottom+8;const above=anchor.top-rect.height-8;
      const y=below+rect.height<=top+height-12?below:Math.max(top+12,above);
      el.style.left=x+'px';el.style.top=y+'px';
    };
    position();const observer=new ResizeObserver(position);observer.observe(el);
    window.addEventListener('resize',position);window.addEventListener('scroll',position,true);
    window.visualViewport?.addEventListener('resize',position);
    return()=>{observer.disconnect();el.hidePopover();window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true);window.visualViewport?.removeEventListener('resize',position);};
  },[open]);
  useEffect(()=>{
    if(!open)return;
    document.dispatchEvent(new CustomEvent('vistrah-help-open',{detail:uid}));
    const another=(event:Event)=>{if((event as CustomEvent<string>).detail!==uid)close();};
    const outside=(event:PointerEvent)=>{const node=event.target as Node;if(!trigger.current?.contains(node)&&!panel.current?.contains(node))close();};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();const inside=panel.current?.contains(document.activeElement);close();if(inside)restoreFocus();}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape,true);document.addEventListener('vistrah-help-open',another);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape,true);document.removeEventListener('vistrah-help-open',another);};
  },[open,close,uid]);
  useEffect(()=>()=>cancelTimer(),[cancelTimer]);
  return <span className="context-help" data-help-id={id}>
    <button ref={trigger} type="button" className="help-trigger" aria-label={`Help: ${content.title}`} aria-expanded={open} aria-controls={uid} aria-describedby={open?uid+'-description':undefined} aria-haspopup="dialog"
      onPointerEnter={event=>{if(event.pointerType!=='touch'){dismissed.current=false;reveal();}}}
      onPointerLeave={delayClose} onFocus={()=>{if(restoringFocus.current){restoringFocus.current=false;return;}dismissed.current=false;reveal();}} onBlur={blur}
      onClick={()=>{cancelTimer();if(pinned.current&&open)close();else{dismissed.current=false;pinned.current=true;setOpen(true);}}}><CircleHelp size={17} aria-hidden="true"/></button>
    <span ref={panel} id={uid} popover="manual" role="dialog" aria-modal="false" aria-labelledby={uid+'-title'} aria-describedby={uid+'-description'} className="help-popover"
      onPointerEnter={cancelTimer} onPointerLeave={delayClose} onFocus={cancelTimer} onBlur={blur}>
      <span className="help-heading"><strong id={uid+'-title'}>{content.title}</strong><button type="button" className="help-close" aria-label="Close help" onClick={()=>{close();restoreFocus();}}><X size={17} aria-hidden="true"/></button></span>
      <span className="help-description" id={uid+'-description'}>{content.description}</span>
      {content.example&&<span className="help-example"><strong>Example:</strong> {content.example}</span>}
      {content.link&&<a href={content.link.href}>{content.link.label}</a>}
    </span>
  </span>;
}
/** Use as a sibling wrapper; never place a help button inside a link or button. */
export function HelpPair({id,children,className=''}:{id:HelpId;children:ReactNode;className?:string}) {
  return <span className={`help-pair ${className}`}>{children}<ContextHelp id={id}/></span>;
}
