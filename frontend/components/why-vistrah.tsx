'use client';
import Link from 'next/link';
import {useEffect, useId, useState} from 'react';
import {ArrowRight, ChevronDown, X} from 'lucide-react';
import {WHY_VISTRAH_HEADER, WHY_VISTRAH_PILLARS} from '../../shared/why-vistrah';
import styles from './why-vistrah.module.css';

export function WhyVistrah({variant = 'full'}: {variant?: 'full' | 'strip'}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const isStrip = variant === 'strip';

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const content = (
    <div className={`${styles.frame} ${isStrip ? styles.stripFrame : ''}`}>
      <button
        type="button"
        className={styles.bannerButton}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(prev => !prev)}
      >
        <span className={styles.bannerLeft}>
          <span className={styles.badge}>
            <span className={styles.badgeDot} aria-hidden="true" />
            {WHY_VISTRAH_HEADER.badge}
          </span>
          <span className={styles.summaryText}>
            {isStrip ? (
              WHY_VISTRAH_HEADER.stripLine
            ) : (
              <>
                <strong className={styles.summaryLead}>Discover. Connect. Grow.</strong> — Direct
                verified businesses, zero broker spam &amp; 30 days V Ads at ₹0.
              </>
            )}
          </span>
        </span>

        <span className={styles.triggerPill}>
          {open ? (
            <>
              <span>Close</span>
              <X size={14} aria-hidden="true" />
            </>
          ) : (
            <>
              <span>See why</span>
              <ChevronDown size={14} aria-hidden="true" />
            </>
          )}
        </span>
      </button>

      {open && (
        <div id={panelId} className={styles.panel} role="region" aria-label="Why VISTRAH details">
          <div className={styles.panelHeader}>
            <div className={styles.panelCopy}>
              <p className={styles.eyebrow}>{WHY_VISTRAH_HEADER.eyebrow}</p>
              <h2 className={styles.headline}>{WHY_VISTRAH_HEADER.headline}</h2>
              <p className={styles.subheadline}>{WHY_VISTRAH_HEADER.subheadline}</p>
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              aria-label="Collapse Why VISTRAH details"
              onClick={() => setOpen(false)}
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>

          <div className={styles.pillars}>
            {WHY_VISTRAH_PILLARS.map(pillar => (
              <article key={pillar.num} className={styles.pillar}>
                <div className={styles.pillarIndexRow}>
                  {pillar.num} / {pillar.kicker}
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
              DPDP Act 2023 compliant · Verified business ownership · ₹0 due today
            </p>
            <div className={styles.ctaGroup}>
              <Link href={WHY_VISTRAH_HEADER.primaryCtaWebHref} className={styles.primaryCta}>
                <span>{WHY_VISTRAH_HEADER.primaryCtaLabel}</span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link href={WHY_VISTRAH_HEADER.secondaryCtaWebHref} className={styles.secondaryCta}>
                <span>{WHY_VISTRAH_HEADER.secondaryCtaLabel}</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isStrip) {
    return (
      <aside className={styles.stripSection} aria-label="Why VISTRAH trust strip">
        {content}
      </aside>
    );
  }

  return (
    <section className={`container ${styles.section}`} aria-label="Why VISTRAH">
      {content}
    </section>
  );
}
