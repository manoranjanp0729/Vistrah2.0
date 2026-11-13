'use client';
import {UiText} from "./localized-ui";
import {HomepageVideoPlayer} from './homepage-video-player';
import Link from 'next/link';
import {ArrowRight,Play} from 'lucide-react';
import {homepageVideoCopy as copy} from '../../shared/homepage-video';
import styles from './homepage-video.module.css';

export function HomepageVideo(){
 return <section className={`container ${styles.section}`} aria-labelledby="homepage-video-heading"><div className={styles.card}>
  <div className={styles.copy}><span className={styles.eyebrow}><Play size={12} aria-hidden="true"/><UiText value={copy.eyebrow}/></span><h2 id="homepage-video-heading"><UiText value={copy.title}/></h2><p><UiText value={copy.description}/></p><Link className={styles.action} href="/services"><UiText value={copy.action}/><ArrowRight size={17} aria-hidden="true"/></Link></div>
  <div className={styles.media}><HomepageVideoPlayer/></div></div>
 </section>;
}
