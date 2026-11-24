import {ContentSections} from '@/components/edit-vistrah-content';
import type {LiveVistrahPage} from '../../../shared/edit-vistrah';
import {HOMEPAGE_EXCLUDED_CATEGORY_SLUGS} from '../../../shared/vibe-finder';
import {HomepageVideo} from '@/components/homepage-video';
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
  const managed=await serverApi<LiveVistrahPage>('/edit-vistrah/pages/home').catch(()=>null);
  if(managed&&managed.target_platform!=='mobile')return <div className="container"><ContentSections sections={managed.sections}/></div>;
  const [categories,homepage]=await Promise.all([serverApi<Category[]>('/catalogue'),serverApi<Homepage>('/homepage').catch(()=>null)]);
  const services=allServices(categories);
  const topServices=[...services].filter(item=>item.service.active&&item.category.slug!=='marketing'&&item.category.slug!=='vibe-finder').sort((a,b)=>Number(b.service.popular)-Number(a.service.popular));
  const shortcuts=topServices.slice(0,10);
  const marketingSection=<AdsMarketing/>;
  const footerLeadIn=<section aria-label="Get started on VISTRAH" style={{background:'var(--surface-soft,#f8fafc)',borderTop:'1px solid var(--border,#e2e8f0)',paddingBlock:'48px'}}><div className="container" style={{display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:'24px'}}><div style={{display:'grid',gap:'6px',maxWidth:'620px'}}><p style={{margin:0,fontSize:'14px',fontWeight:500,color:'#ea580c'}}>Discover. Connect. Grow.</p><h2 style={{margin:0,fontSize:'clamp(1.375rem,2vw,1.75rem)',lineHeight:1.25}}>Find verified local businesses or list your shop for ₹0</h2><p style={{margin:0,fontSize:'14px',color:'var(--text-secondary,#475569)'}}>Direct phone, WhatsApp, and map directions with zero broker middlemen across India.</p></div><div className="button-row"><ButtonLink href="/seller/onboard">List Your Business Free</ButtonLink><ButtonLink secondary href="/services/nearby">Explore Nearby Services</ButtonLink></div></div></section>;
  if(homepage?.version&&homepage.layout.schema_version===1&&homepage.layout.sections.length)return <div className="reference-home"><section className="container reference-hero"><div><p className="reference-label"><T id="home.tagline"/></p><h1><T id="home.title"/></h1><p className="reference-lead"><T id="home.description"/></p></div><ReferenceHeroCarousel/></section><PublishedHomepage homepage={homepage} categories={categories}/><section className="container reference-section homepage-categories"><SectionHeading title={<T id="home.categories"/>} href="/services" label={<T id="home.viewAll"/>}/><MarketplaceCategories compact borderless exclude={HOMEPAGE_EXCLUDED_CATEGORY_SLUGS}/></section>{marketingSection}<HomepageVideo/><div className="container reference-section"><DiscoveryGuide/></div>{footerLeadIn}</div>;
  return <div className="reference-home">
    <section className="container reference-hero"><div><p className="reference-label"><T id="home.tagline"/></p><h1><T id="home.title"/></h1><p className="reference-lead"><T id="home.description"/></p></div><ReferenceHeroCarousel/></section>
    <section className="container reference-section homepage-categories"><SectionHeading title={<T id="home.categories"/>} href="/services" label={<T id="home.viewAll"/>}/><MarketplaceCategories compact borderless exclude={HOMEPAGE_EXCLUDED_CATEGORY_SLUGS}/></section>
    {marketingSection}<HomepageVideo/>
    <section className="container reference-section"><p className="reference-label"><T id="home.quick"/></p><div className="reference-shortcuts"><HorizontalCarousel label="Quick access services">{shortcuts.map(context=><ServiceCard key={context.service.id} context={context}/>)}</HorizontalCarousel></div></section>
    <div className="container reference-section"><DiscoveryGuide/></div>
    <section className="container reference-section"><SectionHeading title={<T id="home.featured"/>}/><article className="reference-feature"><Visual photo={{id:'page/business-feature',kind:'photo',page:'home',subject:'Team collaboration',photo:'collaboration',alt:photos.collaboration.alt,aspectRatio:'3 / 2',position:photos.collaboration.position,surfaces:['home']}} variant="editorial" decorative/><div><span className="reference-badge"><T id="home.badge"/></span><h2><T id="home.business"/></h2><p><T id="home.businessDescription"/></p><Link className="button light" href="/seller/onboard"><T id="home.more"/></Link><small><T id="home.review"/></small></div></article></section>
    {footerLeadIn}
  </div>;
}

