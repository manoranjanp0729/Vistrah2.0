import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import {WHY_VISTRAH_HEADER, WHY_VISTRAH_PILLARS} from '../../shared/why-vistrah';
import styles from './why-vistrah.module.css';

export function WhyVistrah({variant = 'full'}: {variant?: 'full' | 'strip'}) {
  if (variant === 'strip') {
    return (
      <aside className={styles.strip} aria-label="Why VISTRAH trust guarantees">
        <div className={styles.stripTop}>
          <span className={styles.stripEyebrow}>{WHY_VISTRAH_HEADER.eyebrow}</span>
          <Link href={WHY_VISTRAH_HEADER.secondaryCtaWebHref} className={styles.stripCta}>
            {WHY_VISTRAH_HEADER.secondaryCtaLabel} →
          </Link>
        </div>
        <div className={styles.stripGrid}>
          {WHY_VISTRAH_PILLARS.map(pillar => (
            <div key={pillar.num} className={styles.stripCell}>
              <span className={styles.stripNum}>{pillar.num} /</span>
              <span>
                <strong className={styles.stripTitle}>{pillar.title}:</strong> {pillar.stripSummary}
              </span>
            </div>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <section className={`container ${styles.section}`} aria-labelledby="why-vistrah-heading">
      <div className={styles.frame}>
        <div className={styles.header}>
          <div className={styles.headerCopy}>
            <p className={styles.eyebrow}>{WHY_VISTRAH_HEADER.eyebrow}</p>
            <h2 id="why-vistrah-heading" className={styles.headline}>
              {WHY_VISTRAH_HEADER.headline}
            </h2>
            <p className={styles.subheadline}>{WHY_VISTRAH_HEADER.subheadline}</p>
          </div>
          <div className={styles.anchorChip}>
            <span className={styles.anchorDot} aria-hidden="true" />
            <span>Zero Lead Resale · 2–25 km Live Feed</span>
          </div>
        </div>

        <div className={styles.pillars}>
          {WHY_VISTRAH_PILLARS.map(pillar => (
            <article key={pillar.num} className={styles.pillar}>
              <div className={styles.pillarIndexRow}>
                <span className={styles.pillarNum}>{pillar.num} /</span>
                <span>{pillar.kicker}</span>
              </div>
              <h3 className={styles.pillarTitle}>
                <span className={styles.pillarNum}>{pillar.num} /</span> {pillar.title}
              </h3>
              <p className={styles.pillarBody}>
                {pillar.body}
                {pillar.highlight ? (
                  <>
                    <strong>{pillar.highlight}</strong> for businesses.
                  </>
                ) : null}
              </p>
            </article>
          ))}
        </div>

        <div className={styles.footerBar}>
          <p className={styles.footerNote}>
            DPDP Act 2023 compliant · Verified business ownership · ₹0 due today for 30-day V Ads trial
          </p>
          <div className={styles.ctaGroup}>
            <Link href={WHY_VISTRAH_HEADER.primaryCtaWebHref} className={styles.primaryCta}>
              <span>{WHY_VISTRAH_HEADER.primaryCtaLabel}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href={WHY_VISTRAH_HEADER.secondaryCtaWebHref} className={styles.secondaryCta}>
              <span>{WHY_VISTRAH_HEADER.secondaryCtaLabel}</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
