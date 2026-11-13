'use client';
import type {CSSProperties} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {ArrowLeft,ArrowRight,ArrowUpRight,Check,ChevronRight,Compass,Palette,Play,Send} from 'lucide-react';
import {useLanguage} from './language-provider';
import {getMarketingService,marketingServicePages,marketingPageLabels as labels,marketingServiceHref,marketingEnquiryHref} from '../../shared/marketing-services';
import styles from './marketing-service-landing.module.css';
import {themedMarketingVisuals} from '../../shared/marketing-visuals';
import {themeAppearance} from '../../shared/theme-appearance';
import {useTheme} from './theme-provider';

export function MarketingServiceOverview(){
 const {locale}=useLanguage();
 return <div className={styles.overview}>{marketingServicePages.map(page=><Link href={marketingServiceHref(page.slug)} key={page.slug} id={page.key} className={styles.overviewCard}><Image unoptimized src={`/images/ads-marketing/${page.photo}`} alt={page.title[locale]} width={700} height={440}/><div><h2>{page.title[locale]}</h2><p>{page.headline[locale]}</p><span>{labels.explore[locale]}<ArrowUpRight size={18}/></span></div></Link>)}</div>;
}

export function MarketingServiceLanding({slug}:{slug:string}){
 const {locale}=useLanguage();const {mode,accent}=useTheme();const page=getMarketingService(slug);
 if(!page)return null;
 const index=marketingServicePages.indexOf(page);const icons=[Compass,Palette,Play,Send];const visual=themedMarketingVisuals(page.key,themeAppearance(mode,accent).colors.accent);
 return <article className={`container ${styles.page}`} style={{'--service-accent':'var(--accent-orange)','--service-paper':visual.paper,'--service-wash':visual.wash,'--service-ink':visual.ink,'--service-dark':visual.dark} as CSSProperties}>
  <nav className={styles.trail} aria-label={page.title[locale]}><Link href="/marketing-solutions" className={styles.back}><ArrowLeft size={16}/>{labels.back[locale]}</Link><ChevronRight size={14} aria-hidden="true"/><span aria-current="page">{page.title[locale]}</span></nav>
  <section className={styles.hero}>
   <div className={styles.heroCopy}>
    <p className={styles.eyebrow}>VISTRAH ADS & MARKETING <span>0{index+1} / 04</span></p>
    <p className={styles.serviceName}>{page.title[locale]}</p>
    <h1>{page.headline[locale]}</h1>
    <p className={styles.intro}>{page.intro[locale]}</p>
    <div className={styles.actions}><a className={styles.primary} href={marketingEnquiryHref(page,locale)}>{labels.discuss[locale]}<ArrowUpRight size={18}/></a><a className={styles.secondary} href="#capabilities">{labels.explore[locale]}<ArrowRight size={17}/></a></div>
   </div>
   <div className={styles.visual}><div className={styles.photoFrame}><Image unoptimized src={`/images/ads-marketing/${page.photo}`} alt={page.title[locale]} fill priority sizes="(max-width: 800px) 100vw, 45vw"/></div><span className={styles.creativeMark} aria-hidden="true">{visual.mark}</span><div className={styles.visualCaption}><span>VISTRAH / {String(index+1).padStart(2,'0')}</span><strong>{page.concept[locale]}</strong></div></div>
  </section>
  <section id="capabilities" className={styles.section}>
   <p className={styles.kicker}>{page.title[locale]}</p><h2>{labels.capabilities[locale]}</h2>
   <div className={styles.capabilities}>{page.capabilities.map(([title,description],i)=>{const Icon=icons[i];return <div className={styles.capability} key={title.en}><div className={styles.cardTop}><Icon size={23}/><span>0{i+1}</span></div><h3>{title[locale]}</h3><p>{description[locale]}</p></div>;})}</div>
  </section>
  <section className={styles.delivery}><div><p className={styles.kicker}>VISTRAH × {String(index+1).padStart(2,'0')}</p><h2>{labels.includes[locale]}</h2><p className={styles.deliveryStatement}>{page.concept[locale]}</p></div><ul>{page.outputs.map(item=><li key={item.en}><Check size={20}/><span>{item[locale]}</span></li>)}</ul></section>
  <section className={styles.section}><h2>{labels.process[locale]}</h2><ol className={styles.process}>{labels.steps.map((step,i)=><li key={step.en}><span>0{i+1}</span><h3>{step[locale]}</h3><p>{labels.stepCopy[i][locale]}</p></li>)}</ol></section>
  <section className={styles.brief}><div><p className={styles.kicker}>{page.title[locale]}</p><h2>{labels.brief[locale]}</h2><ul>{page.brief.map(item=><li key={item.en}><Check size={17}/>{item[locale]}</li>)}</ul></div><div className={styles.contact}><a className={styles.primary} href={marketingEnquiryHref(page,locale)}>{labels.discuss[locale]}<ArrowUpRight size={18}/></a><p>{labels.note[locale]}</p></div></section>
  <section className={styles.section}><h2>{labels.related[locale]}</h2><div className={styles.related}>{marketingServicePages.filter(item=>item.slug!==slug).map(item=><Link key={item.slug} href={marketingServiceHref(item.slug)}><span>{item.title[locale]}</span><ArrowUpRight size={19}/></Link>)}</div></section>
 </article>;
}
