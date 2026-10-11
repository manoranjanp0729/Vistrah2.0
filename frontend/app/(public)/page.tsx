import Link from 'next/link';
import {ArrowRight,BriefcaseBusiness,House,Calculator,Megaphone,Building2,Wallet,Compass} from 'lucide-react';
import {LocationChooser} from '@/components/customer-location';
import {ProvideServiceLink} from '@/components/seller';
import {Visual} from '@/components/visual';
import {pagePhoto} from '@/lib/imagery';
import {positioning} from '@/lib/positioning';
import {serverApi,protectedServerApi,ServerApiError} from '@/lib/server';
import {HomeNearby,AffiliateBrands} from '@/components/home-discovery';
import {allServices,urls} from '@/lib/urls';
import type {Category,Membership} from '@/lib/types';
import {SearchForm,SectionHeading,ServiceCard,ButtonLink,ContactBanner,EmptyState} from '@/components/ui';
export const dynamic='force-dynamic';
const shortcuts=[{title:'Jobs',href:'/jobs',icon:BriefcaseBusiness},{title:'Property',href:'/services?q=property',icon:House},{title:'Tax',href:'/services?q=tax',icon:Calculator},{title:'Marketing',href:'/services?q=marketing',icon:Megaphone}];
const categoryIcons:Record<string,typeof Building2>={'real-estate':Building2,'tax-compliance':Wallet,'jobs-careers':BriefcaseBusiness,marketing:Megaphone,'civil-construction':House};
const categoryPriority=(slug:string)=>slug==='real-estate'?0:slug==='tax-compliance'?1:2;
export default async function Home() {
  const categories=await serverApi<Category[]>('/catalogue');
  const services=allServices(categories);const popular=services.filter(s=>s.service.popular).slice(0,4);
  const displayCategories=[...categories].sort((a,b)=>categoryPriority(a.slug)-categoryPriority(b.slug));
  let accessStatus=0;
  try{const membership=await protectedServerApi<Membership>('/me/membership');if(membership.active!==true)accessStatus=403;}catch(error){accessStatus=error instanceof ServerApiError?error.status:503;}
  return <div className="reference-home">
    <section className="container reference-hero"><div><p className="reference-label">DISCOVER. CONNECT. GROW.</p><h1>Discover VISTRAH</h1><p className="reference-lead">Explore services, products, and opportunities in one place.</p><p className="reference-description">{positioning.description}</p><div className="button-row"><ButtonLink href="/services">Explore services</ButtonLink><ProvideServiceLink/></div><div className="seller-access-summary"><details id="seller-access-status"><summary>Provider access and review</summary><p>{positioning.sellerAccess}</p><Link className="text-link" href="/provide-service">Existing provider application</Link></details></div></div><div className="reference-art" role="img" aria-label="Abstract flowing layers in blue, turquoise and orange"><span/><span/><span/></div></section>
    <section className="container reference-discovery" aria-label="Search and location"><div className="discovery-bar"><LocationChooser/><SearchForm large/></div></section>
    <section className="container reference-section"><p className="reference-label">QUICK ACCESS</p><nav className="reference-shortcuts" aria-label="Quick access">{shortcuts.map(({title,href,icon:Icon})=><Link key={title} href={href}><Icon size={30} aria-hidden="true"/><span>{title}</span></Link>)}</nav></section>
    <section className="container reference-section"><SectionHeading title="Services for you" href="/services" label="View all"/>{categories.length?<div className="reference-categories">{displayCategories.map((category,index)=>{const Icon=categoryIcons[category.slug]??Compass;return <Link key={category.id} href={urls.category(category)} className={`reference-category reference-tone-${index%4}`}><Icon size={30} aria-hidden="true"/><h3>{category.title}</h3><p>{category.description}</p><span>Explore services <ArrowRight size={16}/></span></Link>;})}</div>:<EmptyState title="Our catalogue is being prepared" description="Email VISTRAH about the service you need." href="/call-vistrah" label="Contact VISTRAH"/>}</section>
    <section className="container reference-section"><SectionHeading title="Featured opportunities"/><article className="reference-feature"><Visual photo={pagePhoto('home')} variant="editorial" decorative/><div><span className="reference-badge">Featured</span><h2>Grow your business</h2><p>Connect with customers and present your services through VISTRAH.</p><Link className="text-link" href="/seller/register">Discover more <ArrowRight size={18}/></Link><small>Business ownership and service listings require review.</small></div></article></section>
    {popular.length>0&&<section className="container reference-section"><SectionHeading title="Popular services" href="/services" label="View all"/><div className="service-grid">{popular.map(context=><ServiceCard key={context.service.id} context={context}/>)}</div></section>}
    <HomeNearby services={services} accessStatus={accessStatus}/><AffiliateBrands/>
    <section className="container reference-section reference-membership"><div><p className="reference-label">SERVICE ACCESS FOR MEMBERS</p><h2>Your next step starts here.</h2><p>{positioning.access} Service costs are separate.</p></div><ButtonLink href="/membership">Explore membership</ButtonLink></section>
    <div className="container call-wrap"><ContactBanner/></div>
  </div>;
}

