import Link from 'next/link';
import {marketingCards,marketingCopy} from '../../../../shared/ads-marketing';
import {serverApi} from '@/lib/server';
import {allServices,urls} from '@/lib/urls';
import type {Category} from '@/lib/types';
export const dynamic='force-dynamic';
export default async function MarketingSolutions(){
  const categories=await serverApi<Category[]>('/catalogue');
  const services=allServices(categories).filter(item=>item.category.active&&item.category.slug==='marketing'&&item.service.active&&(!item.subcategory||item.subcategory.active));
  return <div className="container page"><Link href="/">Back to home</Link><p className="eyebrow">{marketingCopy.eyebrow}</p><h1>{marketingCopy.heading}</h1><p>{marketingCopy.description}</p>{marketingCards.map(card=><section key={card.key} id={card.key} style={{scrollMarginTop:100,marginBlock:28}}><h2>{card.title}</h2><p>{card.description}</p></section>)}<p>Explore the services below for details and enquiry options. These solution themes do not confirm a separately bookable service.</p><h2>All marketing services</h2><ul>{services.map(item=><li key={item.service.id}><Link href={urls.service(item.category,item.service,item.subcategory)}>{item.service.title}</Link></li>)}</ul>{!services.length&&<p>Marketing services are being prepared.</p>}</div>;
}
