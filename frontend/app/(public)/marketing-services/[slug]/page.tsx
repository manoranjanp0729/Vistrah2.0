import {notFound} from 'next/navigation';
import {getMarketingService} from '../../../../../shared/marketing-services';
import {MarketingServiceLanding} from '@/components/marketing-service-landing';

export default async function MarketingServicePage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(!getMarketingService(slug))notFound();
 return <MarketingServiceLanding slug={slug}/>;
}
