'use client';
import {useState} from 'react';
import Link from 'next/link';
import {money} from '@/lib/api';
import {membershipCopy,membershipTextKeys,planDetailText,selectedMembership,publicMembershipCatalogue,type PlanKey,type BillingPeriod} from '../../shared/business-membership';
import {useLanguage} from './language-provider';
import styles from './business-membership.module.css';

export function BusinessMembershipPage(){
 const {t}=useLanguage();
 const [planKey,setPlanKey]=useState<PlanKey>('PLUS'),[period,setPeriod]=useState<BillingPeriod>('MONTHLY');
 const selection=selectedMembership(publicMembershipCatalogue,planKey,period);
 return <div className={`container page ${styles.page}`}><p className={styles.eyebrow}>{t('business.grow')}</p><h1>{t('membership.title',{},membershipCopy.title)}</h1><p className={styles.muted}>{t('membership.intro',{},membershipCopy.intro)}</p>
 <div className={styles.toggle} role="group" aria-label={t('business.billing')}>{(['MONTHLY','ANNUAL'] as const).map(value=><button type="button" key={value} aria-pressed={period===value} onClick={()=>setPeriod(value)}>{value==='MONTHLY'?t('business.monthly'):t('business.yearly')}</button>)}</div>
 <div className={styles.toggle} role="group" aria-label={t('business.plan')}>{(['BASIC','PLUS','PREMIUM'] as const).map(value=><button type="button" key={value} aria-pressed={planKey===value} onClick={()=>setPlanKey(value)}>{value[0]+value.slice(1).toLowerCase()}</button>)}</div>
 <section className={styles.panel} aria-label={t('business.selected')} aria-live="polite"><h2>{selection.plan?.name}</h2><p className={styles.price}>{selection.billing?.amount!=null?`${money(selection.billing.amount)} / ${period==='MONTHLY'?t('business.month'):t('business.year')}`:t('business.annual')}</p>
 {period==='ANNUAL'&&<p className={styles.muted}>{t('business.annualReference')}</p>}
 {selection.plan?.sections?.map(section=><div className={styles.benefitSection} key={section.title}><h3>{section.title==='VISTRAH Ads & Marketing'?section.title:t(section.title==='Job Opportunities'?'business.jobsGroup':section.title==='Reporting'?'business.enquiriesGroup':'business.billingGroup')}</h3><ul>{section.items.map((item,index)=><li key={index}><span aria-hidden="true" className={item.included===true?styles.included:styles.neutral}>{item.included===true?'\u2713':'\u2013'}</span><span>{item.benefit?(()=>{const benefit=selection.plan!.benefits.find(value=>value.kind===item.benefit);return benefit?t('business.benefit.'+benefit.kind,benefit.kind==='SOCIAL_PAISE'?{amount:money(benefit.quantity)}:{quantity:benefit.quantity},planDetailText(selection.plan!,item)):'';})():t(membershipTextKeys[item.text??'']??'',{monthlyPrice:money(selection.plan!.periods.MONTHLY.amount??0)},planDetailText(selection.plan!,item))}</span></li>)}</ul></div>)}</section>
 <details className={styles.panel}><summary>{t('business.rulesTitle')}</summary><ul>{publicMembershipCatalogue.rules?.map(rule=><li key={rule}>{t(membershipTextKeys[rule],{},rule)}</li>)}</ul></details>
 <Link href="/services">{t('requests.explore')}</Link></div>;
}
