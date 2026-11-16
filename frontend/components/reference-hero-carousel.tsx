'use client';
import Link from 'next/link';
import {useCallback, useEffect, useRef, useState} from 'react';
import {ArrowRight} from 'lucide-react';
import {HERO_BANNERS} from '../../shared/hero-banners';
import styles from './reference-hero-carousel.module.css';

export function ReferenceHeroCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);

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
    if (!el || !playing || hovered || focused) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const timer = window.setInterval(() => {
      if (document.hidden || reduced.matches) return;
      const currentIdx = Math.round(el.scrollLeft / (el.clientWidth || 1));
      go((currentIdx + 1) % HERO_BANNERS.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [playing, hovered, focused, go]);

  const currentBanner = HERO_BANNERS[active] ?? HERO_BANNERS[0];

  return (
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
          <Link
            key={slide.key}
            href={slide.storyPath}
            className={styles.slideLink}
            aria-label={`${slide.badge}: ${slide.title}`}
          >
            <img
              src={slide.webImageSrc}
              alt={`${slide.badge} — ${slide.title}`}
              className={styles.bannerImg}
              loading={slide.stepNumber === '01' ? 'eager' : 'lazy'}
            />
          </Link>
        ))}
      </div>

      <div className={styles.controlBar}>
        <Link href={currentBanner.storyPath} className={styles.cueLink}>
          <span className={styles.stepCount}>{currentBanner.stepNumber} / 05</span>
          <span>{currentBanner.navTitle} · Open visual guide →</span>
        </Link>

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
          <Link href={currentBanner.storyPath} className={styles.directPill}>
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
  );
}
