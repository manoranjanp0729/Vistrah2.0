import Link from 'next/link';
import copy from '@/lib/interface-copy.json';
import {HorizontalCarousel} from '@/components/horizontal-carousel';
import {ReferenceHeroCarousel} from '@/components/reference-hero-carousel';
import {BriefcaseBusiness,House,Megaphone,Building2,Wallet,Compass} from 'lucide-react';
import {Visual} from '@/components/visual';
import {photos,categoryPhoto} from '@/lib/imagery';
import {serverApi} from '@/lib/server';
import {allServices,urls} from '@/lib/urls';
import type {Category} from '@/lib/types';
import {SectionHeading,ButtonLink,EmptyState} from '@/components/ui';
export const dynamic='force-dynamic';
const categoryIcons:Record<string,typeof Building2>={'real-estate':Building2,'tax-compliance':Wallet,'jobs-careers':BriefcaseBusiness,marketing:Megaphone,'civil-construction':House};
const categoryPriority=(slug:string)=>slug==='real-estate'?0:slug==='tax-compliance'?1:2;
export default async function Home() {
  const categories=await serverApi<Category[]>('/catalogue');
  const services=allServices(categories);
  const topServices=[...services].filter(item=>item.service.active).sort((a,b)=>Number(b.service.popular)-Number(a.service.popular));
  const shortcuts=[...topServices].sort((a,b)=>Number(b.service.slug==='digital-marketing')-Number(a.service.slug==='digital-marketing')).slice(0,10);
  const displayCategories=[...categories].sort((a,b)=>categoryPriority(a.slug)-categoryPriority(b.slug));
  return <div className="reference-home">
    <section className="container reference-hero"><div><p className="reference-label">{copy.home.tagline}</p><h1>{copy.home.title}</h1><p className="reference-lead">{copy.home.description}</p></div><ReferenceHeroCarousel>{topServices.slice(0,5).map((context,index)=><Link href={urls.service(context.category,context.service,context.subcategory)} key={context.service.id} className={`reference-hero-slide reference-slide-tone-${index%2}`}><div><p className="reference-label">{context.category.title}</p><h2>{context.service.title}</h2><p>{context.service.description}</p><span>{copy.catalogue.explore}</span></div></Link>)}</ReferenceHeroCarousel></section>
    <section className="container reference-section"><p className="reference-label">{copy.home.quick}</p><div className="reference-shortcuts"><HorizontalCarousel label="Quick access services">{shortcuts.map(context=>{const Icon=context.service.slug==='digital-marketing'?Megaphone:context.category.slug==='real-estate'?House:context.category.slug==='tax-compliance'?Wallet:BriefcaseBusiness;return <Link key={context.service.id} href={urls.service(context.category,context.service,context.subcategory)}><Icon size={24} aria-hidden="true"/><span>{context.service.title}</span></Link>;})}</HorizontalCarousel></div></section>
    <section className="container reference-section"><SectionHeading title={copy.home.categories} href="/services" label={copy.home.viewAll}/>{categories.length?<div className="reference-categories">{displayCategories.map(category=>{const Icon=categoryIcons[category.slug]??Compass;return <Link key={category.id} href={urls.category(category)} className="reference-category"><Visual photo={categoryPhoto(category)} variant="card" decorative/><Icon size={22} aria-hidden="true"/><h3>{category.title}</h3></Link>;})}</div>:<EmptyState title="Our catalogue is being prepared" description="Email VISTRAH about the service you need." href="/call-vistrah" label="Contact VISTRAH"/>}</section>
    <section className="container reference-section"><SectionHeading title={copy.home.featured}/><article className="reference-feature"><Visual photo={{id:'page/business-feature',kind:'photo',page:'home',subject:'Team collaboration',photo:'collaboration',alt:photos.collaboration.alt,aspectRatio:'3 / 2',position:photos.collaboration.position,surfaces:['home']}} variant="editorial" decorative/><div><span className="reference-badge">{copy.home.badge}</span><h2>{copy.home.business}</h2><p>{copy.home.businessDescription}</p><Link className="button secondary" href="/provider">{copy.home.more}</Link><small>{copy.home.review}</small></div></article></section><div className="container reference-section"><ButtonLink secondary href="/provider">{copy.home.provider}</ButtonLink></div>

  </div>;
}

