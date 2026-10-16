'use client';
import {useLanguage} from './language-provider';
import Image from 'next/image';
import Link from 'next/link';
import {marketingCards,marketingCopy} from '../../shared/ads-marketing';
import {allServices,urls} from '@/lib/urls';
import type {Category} from '@/lib/types';
import styles from './ads-marketing.module.css';
export function AdsMarketing({categories}:{categories:Category[]}) {
 const {t}=useLanguage();
  const services=allServices(categories).filter(item=>item.category.active&&item.category.slug==='marketing'&&item.service.active&&(!item.subcategory||item.subcategory.active));
  return <section className={`container reference-section ${styles.section}`} aria-labelledby="ads-marketing-title"><p className={styles.eyebrow}>{t('business.grow')}</p><div className="section-heading"><h2 id="ads-marketing-title">{marketingCopy.heading}</h2></div><p className={styles.description}>{t('marketing.webIntro')}</p><div className={styles.grid}>{marketingCards.map((card,index)=>{const match=services.find(item=>item.service.slug===card.serviceSlug);return <Link className={styles.card} key={card.key} href={match?urls.service(match.category,match.service,match.subcategory):`/marketing-solutions#${card.key}`}><Image unoptimized src={`/images/ads-marketing/${card.key}.webp`} width={750} height={600} alt={card.alt}/><h3>{t(['marketing.performance','marketing.creative','marketing.video','marketing.social'][index])}</h3><span className={styles.arrow} aria-hidden="true">↗</span></Link>;})}</div><Link className={`button ${styles.cta}`} href="/marketing-solutions">{t('marketing.allSolutions')} <span aria-hidden="true">→</span></Link></section>;
}
