import Link from 'next/link';
import {serverApi} from '@/lib/server';
import type {Category} from '@/lib/types';
export const dynamic='force-dynamic';
export const metadata={title:'Explore marketplace categories'};
type ListingType={slug:string;title:string;order:number};
type Subcategory={slug:string;title:string;order:number;listing_types:ListingType[]};
type MarketCategory={slug:string;title:string;order:number;subcategories:Subcategory[]};
type Taxonomy={version:number;categories:MarketCategory[]};
export default async function Services({searchParams}:{searchParams:Promise<{q?:string;category?:string;subcategory?:string}>}){
 const {q='',category='',subcategory=''}=await searchParams;
 const [taxonomy,live]=await Promise.all([
  serverApi<Taxonomy>('/marketplace/taxonomy'),
  serverApi<Category[]>('/catalogue')
 ]);
 const needle=q.trim().toLocaleLowerCase();
 const matches=taxonomy.categories.filter(cat=>(!category||cat.slug===category)&&(!needle||[cat.title,...cat.subcategories.flatMap(sub=>[sub.title,...sub.listing_types.map(type=>type.title)])].some(text=>text.toLocaleLowerCase().includes(needle))));
 const chosen=matches.find(cat=>cat.slug===category);
 const visible=chosen?[chosen]:matches;
 return <div className="container page replica-page">
  <h1>Explore VISTRAH marketplace</h1>
  <p>Browse 13 categories and their service types. These are classification options, not confirmed available listings.</p>
  <form className="form replica-search" action="/services">
   <label>Search categories and service types<input name="q" defaultValue={q} placeholder="What are you looking for?"/></label>
   <button className="button" type="submit">Search</button>
  </form>
  {category?<p><Link href="/services">All categories</Link></p>:null}
  {visible.map(cat=><section key={cat.slug} className="reference-section" aria-label={cat.title}>
   <h2><Link href={`/services?category=${encodeURIComponent(cat.slug)}`}>{cat.title}</Link></h2>
   {(!category||cat.slug!==category)?<p>{cat.subcategories.length} subcategories</p>:null}
   {category===cat.slug?<div>
    {cat.subcategories.filter(sub=>(!subcategory||sub.slug===subcategory)&&(!needle||[sub.title,...sub.listing_types.map(type=>type.title)].some(text=>text.toLocaleLowerCase().includes(needle)))).map(sub=><section key={sub.slug} className="reference-section">
     <h3><Link href={`/services?category=${encodeURIComponent(cat.slug)}&subcategory=${encodeURIComponent(sub.slug)}`}>{sub.title}</Link></h3>
     {subcategory===sub.slug?<ul>{sub.listing_types.filter(type=>!needle||type.title.toLocaleLowerCase().includes(needle)).map(type=><li key={type.slug}>{type.title}</li>)}</ul>:<p>{sub.listing_types.length} listing types</p>}
    </section>)}
   </div>:null}
  </section>)}
  {!visible.length?<p>No matching marketplace categories found.</p>:null}
  <section className="reference-section">
   <h2>Services currently available</h2>
   <p>Only approved, published services in the existing catalogue are available for booking or provider enquiries.</p>
   <ul>{live.filter(cat=>cat.active).map(cat=><li key={cat.id}><Link href={`/service/${encodeURIComponent(cat.slug)}`}>{cat.title}</Link></li>)}</ul>
   <p>{live.filter(cat=>cat.active).length} existing active catalogue categories. Existing links and listings are preserved.</p>
  </section>
 </div>;
}
