'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowRight,BriefcaseBusiness,Compass,Users} from 'lucide-react';
import copy from '@/lib/interface-copy.json';
import styles from './discovery-guide.module.css';

const shortcuts={jobs:{href:'/app/service/find-jobs',Icon:BriefcaseBusiness},discovery:{href:'/discover-more',Icon:Compass},employer:{href:'/app/employer-jobs',Icon:Users}};
export function DiscoveryGuide(){
  const [journey,setJourney]=useState<'customer'|'provider'>('customer');
  const content=copy.engagement;
  const selected=content[journey];
  return <section className={styles.guide} aria-label="Explore VISTRAH guidance">
    <details><summary style={{cursor:"pointer",fontSize:"1.35rem",fontWeight:700,padding:"12px 0"}}>{content.title}</summary><div><p>{content.intro}</p>
    <div className={styles.choices} role="group" aria-label="Choose your starting point">
      {(['customer','provider'] as const).map(value=><button key={value} type="button" aria-pressed={journey===value} onClick={()=>setJourney(value)} className={journey===value?styles.selected:undefined}>{value==='customer'?content.customerLabel:content.providerLabel}</button>)}
    </div>
    <div className={styles.journey} aria-live="polite">
      <p className={styles.eyebrow}>{selected.eyebrow}</p><h3>{selected.title}</h3><p>{selected.description}</p>
      <ol className={styles.steps}>{selected.steps.map((step,index)=><li key={step.title}><span aria-hidden="true">0{index+1}</span><div><h4>{step.title}</h4><p>{step.description}</p></div></li>)}</ol>
      <Link className="button" href={journey==='customer'?'/services':'/provider'}>{selected.action}<ArrowRight size={18} aria-hidden="true"/></Link><p className={styles.note}>{selected.note}</p>
    </div>
    </div></details><details><summary style={{cursor:"pointer",fontSize:"1.35rem",fontWeight:700,padding:"12px 0"}}>{content.shortcutsTitle}</summary><div className={styles.shortcuts}>{content.shortcuts.map(item=>{const target=shortcuts[item.key as keyof typeof shortcuts];return <Link key={item.key} href={target.href} className={styles.shortcut}><target.Icon size={24} aria-hidden="true"/><h4>{item.title}</h4><p>{item.description}</p><span>{item.action}<ArrowRight size={16} aria-hidden="true"/></span></Link>;})}</div>
    </details><details><summary style={{cursor:"pointer",fontSize:"1.35rem",fontWeight:700,padding:"12px 0"}}>{content.faqTitle}</summary><div className={styles.faq}>{content.faq.map(item=><details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>
    </details></section>;
}
