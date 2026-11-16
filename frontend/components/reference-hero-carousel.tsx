'use client';
import Link from 'next/link';
import {useCallback, useEffect, useId, useRef, useState} from 'react';
import {ArrowRight, X} from 'lucide-react';
import {HERO_BANNERS, type HeroBannerSlide} from '../../shared/hero-banners';
import styles from './reference-hero-carousel.module.css';

export function ReferenceHeroCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const [selectedSlide, setSelectedSlide] = useState<HeroBannerSlide | null>(null);
  const modalTitleId = useId();

  const go = useCallback((index: number) => {
    const el = trackRef.current;
    if (!el) return;
    const nodes = Array.from(el.children) as HTMLElement[];
    const next = nodes[index];
    if (next) {
      el.scrollTo({left: next.offsetLeft - el.offsetLeft, behavior: 'smooth'});
      setActive(index);
    }
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || !playing || hovered || focused || selectedSlide !== null) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const timer = window.setInterval(() => {
      if (document.hidden || reduced.matches) return;
      const currentIdx = Math.round(el.scrollLeft / (el.clientWidth || 1));
      go((currentIdx + 1) % HERO_BANNERS.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [playing, hovered, focused, selectedSlide, go]);

  useEffect(() => {
    if (!selectedSlide) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedSlide(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedSlide]);

  const currentBanner = HERO_BANNERS[active] ?? HERO_BANNERS[0];

  return (
    <>
      <div
        className={`reference-hero-carousel ${styles.carouselCard}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={event => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setFocused(false);
          }
        }}
      >
        <div
          ref={trackRef}
          className={styles.track}
          aria-label="VISTRAH featured journeys"
          onScroll={event => {
            const el = event.currentTarget;
            const idx = Math.round(el.scrollLeft / (el.clientWidth || 1));
            setActive(Math.min(HERO_BANNERS.length - 1, Math.max(0, idx)));
          }}
        >
          {HERO_BANNERS.map(slide => (
            <button
              key={slide.key}
              type="button"
              className={styles.slideButton}
              aria-haspopup="dialog"
              aria-label={`${slide.badge}: ${slide.title}. Tap banner to see details`}
              onClick={() => setSelectedSlide(slide)}
            >
              <img
                src={slide.webImageSrc}
                alt={`${slide.badge} — ${slide.title}`}
                className={styles.bannerImg}
                loading={slide.stepNumber === '01' ? 'eager' : 'lazy'}
              />
            </button>
          ))}
        </div>

        <div className={styles.controlBar}>
          <button
            type="button"
            className={styles.cueButton}
            aria-haspopup="dialog"
            onClick={() => setSelectedSlide(currentBanner)}
          >
            <span className={styles.stepCount}>{currentBanner.stepNumber} / 05</span>
            <span>Tap banner to see details →</span>
          </button>

          <div className={styles.dots} role="group" aria-label="Carousel slide selector">
            {HERO_BANNERS.map((slide, i) => (
              <button
                key={slide.key}
                type="button"
                className={`${styles.dot} ${active === i ? styles.dotActive : ''}`}
                aria-label={`Show banner ${i + 1}: ${slide.badge}`}
                aria-current={active === i ? 'step' : undefined}
                onClick={() => go(i)}
              />
            ))}
          </div>

          <div className={styles.rightControls}>
            <Link href={currentBanner.primaryCta.webHref} className={styles.directPill}>
              <span>{currentBanner.primaryCta.shortLabel}</span>
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
            <button
              type="button"
              className={styles.playBtn}
              onClick={() => setPlaying(v => !v)}
              aria-label={playing ? 'Pause carousel' : 'Play carousel'}
            >
              {playing ? 'Pause' : 'Play'}
            </button>
          </div>
        </div>
      </div>

      {selectedSlide && (
        <div
          className={styles.backdrop}
          onClick={event => {
            if (event.target === event.currentTarget) setSelectedSlide(null);
          }}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
          >
            <header className={styles.modalHeader}>
              <div>
                <p className={styles.modalEyebrow}>
                  {selectedSlide.stepNumber} / {selectedSlide.badge}
                </p>
                <h2 id={modalTitleId} className={styles.modalTitle}>
                  {selectedSlide.title}
                </h2>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                aria-label="Close banner details"
                onClick={() => setSelectedSlide(null)}
              >
                <X size={17} aria-hidden="true" />
              </button>
            </header>

            <div className={styles.modalBody}>
              <p className={styles.modalSummary}>{selectedSlide.summary}</p>

              <div className={styles.pillarList}>
                {selectedSlide.pillars.map(pillar => (
                  <div key={pillar.num} className={styles.pillarRow}>
                    <div className={styles.pillarRowTop}>
                      <h3 className={styles.pillarHeading}>
                        <span className={styles.pillarNum}>{pillar.num} /</span>
                        {pillar.title}
                      </h3>
                      {pillar.priceTag && (
                        <span className={styles.priceChip}>{pillar.priceTag}</span>
                      )}
                    </div>
                    <p className={styles.pillarDetail}>{pillar.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <footer className={styles.modalFooter}>
              <p className={styles.pricingNote}>{selectedSlide.pricingNote}</p>
              <div className={styles.modalCtas}>
                <Link
                  href={selectedSlide.primaryCta.webHref}
                  className={styles.primaryCta}
                  onClick={() => setSelectedSlide(null)}
                >
                  <span>{selectedSlide.primaryCta.label}</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
                {selectedSlide.secondaryCta && (
                  <Link
                    href={selectedSlide.secondaryCta.webHref}
                    className={styles.secondaryCta}
                    onClick={() => setSelectedSlide(null)}
                  >
                    <span>{selectedSlide.secondaryCta.label}</span>
                  </Link>
                )}
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
