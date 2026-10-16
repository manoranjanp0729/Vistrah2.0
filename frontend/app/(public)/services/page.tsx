import {T} from '@/components/language-provider';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {MarketplaceBrowser} from '@/components/marketplace-browser';
import {PhotoCard} from '@/components/photo-card';
import {PhotoCardRail} from '@/components/photo-card-rail';
import {servicePhoto,photos} from '@/lib/imagery';
import {serverApi} from '@/lib/server';
import {allServices,urls} from '@/lib/urls';
import {resolveMarketplaceSelection,type MarketplaceSelection} from '@/lib/marketplace-taxonomy';
import styles from '@/components/marketplace.module.css';
import type {Category} from '@/lib/types';

export const dynamic='force-dynamic';
export const metadata={title:'Service categories'};
export default async function Services({searchParams}:{searchParams:Promise<MarketplaceSelection>}) {
  const params=await searchParams;
  const {q=''}=params;
  const selection=resolveMarketplaceSelection(params);
  if(!selection)notFound();
  const needle=q.trim().toLocaleLowerCase();
  const showPublished=!selection.category||Boolean(needle);
  const categories=showPublished?await serverApi<Category[]>('/catalogue').catch(()=>null):null;
  const services=allServices(categories??[]).filter(({category,subcategory,service})=>
    category.active&&service.active&&(!subcategory||subcategory.active)&&
    [service.title,service.description,category.title,category.description,subcategory?.title??''].join(' ').toLocaleLowerCase().includes(needle));
  return <div className={`container ${styles.servicesPage}`}>
    <MarketplaceBrowser selection={selection} query={q}/>
    <section id="published-services" className={styles.published} aria-label="Service catalogue"><h2>{showPublished?<T id="nav.services"/>:<T id="discovery.looking"/>}</h2>
      <p><T id="discovery.catalogueIntro"/></p>
      {!showPublished?<Link href="/services#published-services" className={styles.backLink}><T id="common.exploreServices"/> &rarr;</Link>:categories===null?<p><T id="discovery.temporarilyUnavailable"/></p>:services.length?<PhotoCardRail label="Services" labelKey="nav.services">{services.map(context=>{const image=servicePhoto(context);return <PhotoCard key={context.service.id} kind="service" slug={String(context.service.id)} imageId={image.id} title={context.service.title} meta="Service" href={urls.service(context.category,context.service,context.subcategory)} photo={image.photo?{src:photos[image.photo].src,alt:image.alt}:null}/>;})}</PhotoCardRail>:<p><T id="catalogue.noServices"/></p>}
    </section>
  </div>;
}
