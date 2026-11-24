import Link from 'next/link';
import {ArrowRight} from 'lucide-react';
import {FOR_BUSINESSES_HERO_BANNER} from '../../shared/hero-banners';
import styles from './reference-hero-carousel.module.css';

export function ReferenceHeroCarousel() {
  const banner = FOR_BUSINESSES_HERO_BANNER;

  return (
    <div
      className={`reference-hero-carousel ${styles.carouselCard}`}
      data-hero-banner="businesses"
    >
      <Link
        href={banner.storyPath}
        className={styles.slideLink}
        aria-label={`${banner.badge}: ${banner.title}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={banner.webImageSrc}
          alt={`${banner.badge} — ${banner.title}`}
          className={styles.bannerImg}
          loading="eager"
        />
      </Link>

      <div className={styles.controlBar}>
        <Link href={banner.storyPath} className={styles.cueLink}>
          <span>{banner.navTitle} · Open visual guide →</span>
        </Link>

        <div className={styles.rightControls}>
          <Link href={banner.primaryCta.webHref} className={styles.directPill}>
            <span>{banner.primaryCta.shortLabel}</span>
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
