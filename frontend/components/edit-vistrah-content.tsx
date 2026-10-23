"use client";
import {HomepageVideoPlayer} from './homepage-video-player';
import {useEffect,useState,type ReactNode} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {api} from '../lib/api';
import {useLanguage} from './language-provider';
import {MarketplaceCategories} from './marketplace-categories';
import {AdsMarketing} from './ads-marketing';
import {translate} from '../../shared/i18n';
import type {LiveVistrahPage,PageSection} from '../../shared/edit-vistrah';
import {contentPageSlug,contentHref,contentImage,sectionCopy,featureEnabled} from '../../shared/edit-vistrah-content';
import styles from './edit-vistrah-content.module.css';

export function ContentSections({sections,editorialOnly=false}:{sections:PageSection[];editorialOnly?:boolean}){
 const {locale}=useLanguage();
 return <div className={styles.sections}>{sections.filter(section=>section.enabled&&(section.type!=='header'||!!section.content)).sort((a,b)=>a.order-b.order).map(section=>{
  const copy=sectionCopy(section,locale),href=contentHref(section.action_href);
  const images=section.images.filter(image=>contentImage(image.url));
  if(section.type==='search_bar'&&!editorialOnly)return <form className={styles.search} action="/services" key={section.id}><label>{copy.title}<input name="q" type="search" placeholder={copy.description}/></label><button className="button" type="submit">{copy.action||translate(locale,'common.search')}</button></form>;
  return <section className={`${styles.section} ${['hero_banner','editable_banner'].includes(section.type)?styles.banner:''}`} data-variation={section.variation} key={section.id}>
   <div><h2>{copy.title}</h2>{copy.description&&<p>{copy.description}</p>}</div>
   {!!images.length&&<div className={section.variation.includes('carousel')||section.variation.includes('horizontal')?styles.rail:styles.images}>{images.map((image,index)=><figure key={index}>{/* Admin URLs support uploaded data images and approved HTTPS media. */}<img src={image.url} alt={image.alt_text||image.title||''} loading="lazy"/>{image.title&&<figcaption>{image.title}</figcaption>}</figure>)}</div>}
   {!!section.video_urls?.length&&<HomepageVideoPlayer key={section.video_urls.join('|')} videos={section.video_urls.filter(url=>contentImage(url)).map((src,index)=>({id:section.id+'-'+index,src}))}/>}
  {section.type==='services_for_you'&&!editorialOnly&&<MarketplaceCategories compact/>}
  {section.type==='big_widget'&&!editorialOnly&&<AdsMarketing/>}
   {href&&copy.action&&featureEnabled(section,'show_direct_cta')&&<Link href={href} className="button">{copy.action}</Link>}
  </section>;
 })}</div>;
}

export function EditVistrahContent({children,slug:explicitSlug,required=false}:{children?:ReactNode;slug?:string;required?:boolean}){
 const pathname=usePathname(),query=useSearchParams();
 const {locale}=useLanguage();
 const slug=explicitSlug??contentPageSlug(pathname);
 const [result,setResult]=useState<{key:string|null;page?:LiveVistrahPage;error?:boolean}>({key:null});
 useEffect(()=>{
  if(!slug)return;
  let active=true;
  const load=()=>api<LiveVistrahPage>('/edit-vistrah/pages/'+encodeURIComponent(slug)).then(page=>{if(active)setResult({key:slug,page});}).catch(()=>{if(active)setResult({key:slug,error:true});});
  void load();const refresh=()=>{if(document.visibilityState==='visible')void load();};
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{active=false;window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[slug]);
 const page=result.key===slug?result.page:undefined;
 if(!page||page.path!==pathname||page.target_platform==='mobile')return <>{required?<div className="container" role="status">{result.key===slug?'This page is not published for the website.':translate(locale,'common.loading')}</div>:children}</>;
 // Native account, seller, catalogue and moderation journeys retain their functional screens.
 const replace=!['/services','/v-ads','/v-essentials'].includes(pathname)||required;
 const drilledServices=pathname==='/services'&&query.size>0;
 return <>{!drilledServices&&<div className="container"><ContentSections sections={page.sections} editorialOnly={!replace}/></div>}{!replace&&children}</>;
}
