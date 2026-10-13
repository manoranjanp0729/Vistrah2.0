import Link from 'next/link';
import {allServices,urls} from '@/lib/urls';
import type {Category,ServiceContext} from '@/lib/types';
import {servicePhoto} from '@/lib/imagery';
import {Visual} from './visual';
import {HorizontalCarousel} from './horizontal-carousel';
import {ServiceCard} from './ui';
export type Homepage={version:number|null;layout:{schema_version:1;sections:{id:string;template:'banner'|'service_grid'|'service_carousel';title:string;subtitle:string;size:'wide'|'square'|'compact';service_ids:number[]}[]}};
export function PublishedHomepage({homepage,categories}:{homepage:Homepage;categories:Category[]}){
 const lookup=new Map<number,ServiceContext>(allServices(categories).filter(c=>c.category.active&&c.service.active&&(!c.subcategory||c.subcategory.active)).map(c=>[c.service.id,c]));
 return <>{homepage.layout.sections.map(section=>{const contexts=section.service_ids.map(id=>lookup.get(id)).filter((c):c is ServiceContext=>!!c);if(!contexts.length)return null;return <section key={section.id} className="container reference-section"><h2>{section.title}</h2>{section.subtitle&&<p>{section.subtitle}</p>}{section.template==='banner'?contexts.map(c=><Link key={c.service.id} href={urls.service(c.category,c.service,c.subcategory)} className="service-card" style={{display:'block',maxWidth:section.size==='square'?560:undefined}}><Visual photo={{...servicePhoto(c),aspectRatio:section.size==='square'?'1 / 1':'16 / 9'}} variant="editorial"/><div><h3>{c.service.title}</h3><p>{c.service.description}</p><span className="card-link">Explore service →</span></div></Link>):section.template==='service_carousel'?<HorizontalCarousel label={section.title}>{contexts.map(c=><ServiceCard key={c.service.id} context={c}/>)}</HorizontalCarousel>:<div className="service-grid">{contexts.map(c=><ServiceCard key={c.service.id} context={c}/>)}</div>}</section>;})}</>;
}
