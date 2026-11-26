import {HomepageConnect} from '@/components/homepage-connect';
import {connectCategorySlugs} from '../../../shared/homepage-connect';
import {MarketplaceCategories} from '@/components/marketplace-categories';
import {DiscoveryGuide} from '@/components/discovery-guide';
import {PublishedHomepage,type Homepage} from '@/components/published-homepage';
import Link from 'next/link';
import {T} from '@/components/language-provider';
import {HorizontalCarousel} from '@/components/horizontal-carousel';
import {ReferenceHeroCarousel} from '@/components/reference-hero-carousel';
import {AdsMarketing} from '@/components/ads-marketing';
import {Visual} from '@/components/visual';
import {photos} from '@/lib/imagery';
import {serverApi} from '@/lib/server';
import {allServices} from '@/lib/urls';
import type {Category} from '@/lib/types';
import {SectionHeading,ButtonLink,ServiceCard} from '@/components/ui';
export const dynamic='force-dynamic';
export default async function Home() {
  const [categories,homepage]=await Promise.all([serverApi<Category[]>('/catalogue'),serverApi<Homepage>('/homepage').catch(()=>null)]);
  const services=allServices(categories);
  const topServices=[...services].filter(item=>item.service.active&&item.category.slug!=='marketing').sort((a,b)=>Number(b.service.popular)-Number(a.service.popular));
  const shortcuts=topServices.filter(item=>item.category.slug!=='marketing').slice(0,10);
  const marketingSection=<AdsMarketing categories={categories}/>;
  if(homepage?.version&&homepage.layout.schema_version===1&&homepage.layout.sections.length)return <div className="reference-home"><section className="container reference-hero"><div><p className="reference-label"><T id="home.tagline"/></p><h1><T id="home.title"/></h1><p className="reference-lead"><T id="home.description"/></p></div><ReferenceHeroCarousel/></section><PublishedHomepage homepage={homepage} categories={categories}/><section className="container reference-section homepage-categories"><SectionHeading title={<T id="home.categories"/>} href="/services" label={<T id="home.viewAll"/>}/><MarketplaceCategories compact exclude={connectCategorySlugs}/></section>{marketingSection}<HomepageConnect/><div className="container reference-section"><DiscoveryGuide/><ButtonLink secondary href="/provider"><T id="home.provider"/></ButtonLink></div></div>;
  return <div className="reference-home">
    <section className="container reference-hero"><div><p className="reference-label"><T id="home.tagline"/></p><h1><T id="home.title"/></h1><p className="reference-lead"><T id="home.description"/></p></div><ReferenceHeroCarousel/></section>
    <section className="container reference-section homepage-categories"><SectionHeading title={<T id="home.categories"/>} href="/services" label={<T id="home.viewAll"/>}/><MarketplaceCategories compact exclude={connectCategorySlugs}/></section>
    {marketingSection}<HomepageConnect/>
    <section className="container reference-section"><p className="reference-label"><T id="home.quick"/></p><div className="reference-shortcuts"><HorizontalCarousel label="Quick access services">{shortcuts.map(context=><ServiceCard key={context.service.id} context={context}/>)}</HorizontalCarousel></div></section>
    <div className="container reference-section"><DiscoveryGuide/></div>
    <section className="container reference-section"><SectionHeading title={<T id="home.featured"/>}/><article className="reference-feature"><Visual photo={{id:'page/business-feature',kind:'photo',page:'home',subject:'Team collaboration',photo:'collaboration',alt:photos.collaboration.alt,aspectRatio:'3 / 2',position:photos.collaboration.position,surfaces:['home']}} variant="editorial" decorative/><div><span className="reference-badge"><T id="home.badge"/></span><h2><T id="home.business"/></h2><p><T id="home.businessDescription"/></p><Link className="button secondary" href="/provider"><T id="home.more"/></Link><small><T id="home.review"/></small></div></article></section><div className="container reference-section"><ButtonLink secondary href="/provider"><T id="home.provider"/></ButtonLink></div>

  </div>;
}

