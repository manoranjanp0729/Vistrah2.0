import {notFound} from 'next/navigation';
import {MarketingPricing} from '@/components/marketing-pricing';
import {pricingCatalogue} from '../../../../../shared/marketing-pricing';
export default async function PricingService({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{package?:string}>}){const {id}=await params;const query=await searchParams;if(!pricingCatalogue.services.some(service=>service.id===id))notFound();const pack=pricingCatalogue.packages.some(pack=>pack.id===query.package)?query.package:undefined;return <MarketingPricing key={id} serviceId={id} initialPackage={pack}/>;}
