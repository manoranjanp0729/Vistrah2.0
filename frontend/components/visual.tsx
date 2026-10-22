'use client';
import {UiText,UiSpan} from "./localized-ui";
import Image from 'next/image';
import {useState} from 'react';
import {imageVariants,photos,type ImageEntry,type PhotoVariant} from '@/lib/imagery';

export function Visual({photo,variant='editorial',decorative=false,preload=false,className=''}:{
  photo:ImageEntry;variant?:PhotoVariant;decorative?:boolean;preload?:boolean;className?:string;
}) {
  const asset=photo.photo?photos[photo.photo]:null;
  const [failedSource,setFailedSource]=useState<string|null>(null);
  const failed=!asset||failedSource===asset.src;
  return <div className={`visual visual-${variant} ${className}`} data-photo={photo.photo??'missing'} data-image-id={photo.id}
    style={{aspectRatio:variant==='editorial'?photo.aspectRatio:imageVariants[variant].ratio}}>
    {failed?<UiSpan  className="visual-unavailable" role={decorative?undefined:'img'}
      aria-label={decorative?undefined:`${photo.alt}. Photograph unavailable.`}><UiText value={asset?'Photograph unavailable':'Photograph not yet available'}/></UiSpan>:
      <Image src={asset.src} alt={decorative?'':photo.alt} fill sizes={imageVariants[variant].sizes}
        preload={preload} loading={preload?undefined:'lazy'}
        style={{objectFit:asset.fit as 'cover'|'contain',objectPosition:photo.position}}
        onError={()=>setFailedSource(asset.src)}/>}
  </div>;
}

/** A compact contextual photograph keeps tables and workflow controls prominent. */
export function ContextVisual({photo,className='',caption}:{photo:ImageEntry;className?:string;caption?:string}) {
  return <figure className={`context-visual ${className}`}><Visual photo={photo} variant="compact"/>
    {caption&&<figcaption>{caption}</figcaption>}</figure>;
}
