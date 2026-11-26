'use client';
import {useLanguage} from './language-provider';
import {useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {ArrowUpRight} from 'lucide-react';
import type {CSSProperties} from 'react';
import {photoCardDesign as design} from '../../shared/photo-card-design';
import styles from './photo-card.module.css';

export type CardPhoto={src:string;alt:string}|null;
export function PhotoCard({title,meta,href,photo,kind,slug,imageId,description}:{title:string;meta:string;href:string;photo:CardPhoto;kind:'category'|'subcategory'|'type'|'service'|'result';slug:string;imageId?:string;description?:string}) {
  const {t}=useLanguage();
  const [failedSrc,setFailedSrc]=useState<string>();
  const visiblePhoto=photo?.src===failedSrc?null:photo;
  const discovery=kind!=='service';
  const sizing={flexBasis:design.width,'--card-width':`${design.width}px`,'--card-height':`${discovery?design.height-18:design.height}px`,'--image-height':`${design.imageHeight}px`,'--title-size':`${design.titleSize}px`,'--title-line':`${design.titleLineHeight}px`} as CSSProperties;
  return <Link href={href} className={`${styles.card} ${description?styles.feature:''}`} style={sizing} aria-label={title} title={title} data-photo-card={kind} data-marketplace-category={kind==='category'?slug:undefined} data-marketplace-subcategory={kind==='subcategory'?slug:undefined} data-marketplace-type={kind==='type'?slug:undefined} data-published-service={kind==='service'?slug:undefined} data-image-id={imageId}>
    <div className={styles.photo}>{visiblePhoto?<Image src={visiblePhoto.src} alt={visiblePhoto.alt} onError={()=>setFailedSrc(visiblePhoto.src)} fill sizes={description?'(max-width: 600px) 38vw, 280px':'134px'} style={{objectFit:'cover',objectPosition:'50% 50%'}}/>:<span>{t('common.photoUnavailable')}</span>}</div>
    <div className={styles.copy}><h3>{title}</h3>{description&&<p>{description}</p>}{!description&&!discovery&&<div className={styles.meta}><span>{meta==='Service'?t('common.service'):meta}</span><ArrowUpRight size={14} aria-hidden="true"/></div>}</div>
  </Link>;
}
