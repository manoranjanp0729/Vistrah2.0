import Image from 'next/image';
import {T} from '@/components/language-provider';
import Link from 'next/link';
import {marketingCards,marketingCopy} from '../../../../shared/ads-marketing';
import {serverApi} from '@/lib/server';
import {allServices,urls} from '@/lib/urls';
import type {Category} from '@/lib/types';
export const dynamic='force-dynamic';
export default async function MarketingSolutions(){
  const categories=await serverApi<Category[]>('/catalogue');
  const services=allServices(categories).filter(item=>item.category.active&&item.category.slug==='marketing'&&item.service.active&&(!item.subcategory||item.subcategory.active));
  return <div className="container page"><Link href="/">Back to home</Link><section aria-label={marketingCopy.heading} style={{background:'linear-gradient(135deg,#283db6,#7741c4 52%,#b63b8d)',borderRadius:26,padding:'clamp(18px,4vw,36px)',color:'#fff',display:'grid',gap:16}}><h1 style={{margin:0,width:'100%',maxWidth:520}}><Image unoptimized src="/branding/ads-marketing/primary-transparent.png" alt={marketingCopy.heading} width={1998} height={787} style={{display:'block',width:'100%',height:'auto',objectFit:'contain'}}/></h1><p style={{margin:0,maxWidth:620,lineHeight:1.6,color:'#eee4ff'}}><T id="marketing.homeCopy"/></p><Link href="#marketing-services" style={{justifySelf:'start',background:'#fff',color:'#55328b',borderRadius:14,padding:'12px 16px',fontWeight:700}}><T id="marketing.started"/> &rarr;</Link></section>{marketingCards.map(card=><section key={card.key} id={card.key} style={{scrollMarginTop:100,marginBlock:28}}><h2>{card.title}</h2><p>{card.description}</p></section>)}<p>Explore the services below for details and enquiry options. These solution themes do not confirm a separately bookable service.</p><h2 id="marketing-services" style={{scrollMarginTop:100}}>All marketing services</h2><ul>{services.map(item=><li key={item.service.id}><Link href={urls.service(item.category,item.service,item.subcategory)}>{item.service.title}</Link></li>)}</ul>{!services.length&&<p>Marketing services are being prepared.</p>}</div>;
}
