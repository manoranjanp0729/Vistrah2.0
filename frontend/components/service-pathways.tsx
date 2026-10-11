'use client';
import {useRef,useState,useEffect} from 'react';
import {useSearchParams} from 'next/navigation';
import {ContextHelp} from './context-help';
import {ServiceAccessState} from './service-access';
import Link from 'next/link';
import {UsersRound,Compass,House,ArrowUpRight} from 'lucide-react';
import type {ServiceContext} from '@/lib/types';
import {servicePathways,serviceTab,serviceTabUrl,enquiryUrl,type ServiceTab} from '@/lib/service-pathways';
import {officialContact,emailHref} from '@/lib/contact';
import {SectionHeading,Notice} from './ui';
const icons={providers:UsersRound,recommendations:Compass,'in-house':House};
export function ServicePathways({context,accessStatus}:{context:ServiceContext;accessStatus:number}) {
  const query=useSearchParams();const selected=serviceTab(query.get('tab'),query.get('intent'));
  const [vertical,setVertical]=useState(false);
  useEffect(()=>{const media=window.matchMedia('(max-width:600px)');const update=()=>setVertical(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  const buttons=useRef<(HTMLButtonElement|null)[]>([]);const paths=servicePathways(context);
  const select=(tab:ServiceTab)=>window.history.replaceState(null,'',serviceTabUrl(context,tab));
  function navigate(event:React.KeyboardEvent<HTMLButtonElement>,index:number) {
    const next=event.key==='ArrowRight'||event.key==='ArrowDown'?(index+1)%3:event.key==='ArrowLeft'||event.key==='ArrowUp'?(index+2)%3:event.key==='Home'?0:event.key==='End'?2:-1;
    if(next<0)return;event.preventDefault();select(paths[next].id);buttons.current[next]?.focus();
  }
  return <section id="service-pathways" className="service-pathways" aria-label="Service options">
    <SectionHeading eyebrow="MEMBER SERVICE OPTIONS" title="Explore this service" description="Public catalogue browsing is open to everyone. These three service options require an eligible active membership. Sandbox access is development testing only."/>
    <div className="service-tablist" role="tablist" aria-orientation={vertical?'vertical':'horizontal'} aria-label={`${context.service.title} service options`}>
      {paths.map((path,index)=>{const Icon=icons[path.id];return <button key={path.id} ref={element=>{buttons.current[index]=element;}} type="button" role="tab" id={`service-${context.service.id}-tab-${path.id}`} aria-controls={`service-${context.service.id}-panel-${path.id}`} aria-selected={selected===path.id} tabIndex={selected===path.id?0:-1} onClick={()=>select(path.id)} onKeyDown={event=>navigate(event,index)}><Icon size={20} aria-hidden="true"/>{path.title}</button>;})}
    </div>
    {paths.map(path=><div key={path.id} role="tabpanel" id={`service-${context.service.id}-panel-${path.id}`} aria-labelledby={`service-${context.service.id}-tab-${path.id}`} hidden={selected!==path.id} tabIndex={0} className="service-tabpanel" data-pathway={path.id}>
      <h3>{path.title} <ContextHelp id={`pathway.${path.id}`}/></h3>
      {accessStatus===0?<><p>{path.description}</p>{path.id==='in-house'&&<p>You may save a delivery-options enquiry for VISTRAH to review. An enquiry does not confirm VISTRAH delivery or create a booking.</p>}<Link className="button secondary" href={path.href}>{path.action}<ArrowUpRight size={17} aria-hidden="true"/></Link>{path.id==='providers'&&<p className="service-secondary-contact"><Link href={enquiryUrl(context)}>Send a service enquiry</Link> if you need to discuss your requirements.</p>}</>:accessStatus===401||accessStatus===403?<ServiceAccessState status={accessStatus} next={serviceTabUrl(context,path.id)} embedded/>:<Notice error message="Unable to check service access. Reload this page to try again."/>}
    </div>)}
    <p className="service-secondary-contact">Questions about this service? <a href={emailHref(officialContact.email)!}>Email VISTRAH</a> <ContextHelp id="pathway.email"/>. Email opens your mail application; it does not save an enquiry in your account.</p>
  </section>;
}
