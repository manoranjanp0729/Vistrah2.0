'use client';
import {useLanguage} from './language-provider';
import Image from 'next/image';
import Link from 'next/link';
import {marketingCopy} from '../../shared/ads-marketing';
import {marketingServicePages,marketingServiceHref} from '../../shared/marketing-services';
import {marketingVisuals} from '../../shared/marketing-visuals';
import styles from './ads-marketing.module.css';

export function AdsMarketing() {
 const {t,locale}=useLanguage();
  return (
    <section className={`container reference-section ${styles.section}`} aria-labelledby="ads-marketing-title">
      <p className={styles.eyebrow}>{t('business.grow')}</p>
      <div className="section-heading"><h2 id="ads-marketing-title">{marketingCopy.heading}</h2></div>
      <p className={styles.description}>{t('marketing.webIntro')}</p>
      <div className={styles.grid}>
        {marketingServicePages.map(card=>{
          const visual = marketingVisuals[card.key as keyof typeof marketingVisuals];
          const bg = visual?.paper || '#f7f5ff';
          const ink = visual?.ink || '#382448';
          const accent = visual?.accent || '#503fbd';
          return (
            <Link className={styles.card} key={card.key} href={marketingServiceHref(card.slug)} style={{backgroundColor: bg, borderColor: accent + '30', color: ink}}>
              <Image unoptimized src={`/images/ads-marketing/${card.photo}`} width={750} height={600} alt={card.title[locale]}/>
              <h3 style={{color: ink}}>{card.title[locale]}</h3>
              <span className={styles.arrow} style={{color: accent}} aria-hidden="true">{'\u2197'}</span>
            </Link>
          );
        })}
      </div>
      <Link className={`button light ${styles.cta}`} href="/marketing-solutions">{t('marketing.allSolutions')} <span aria-hidden="true">→</span></Link>
    </section>
  );
}
