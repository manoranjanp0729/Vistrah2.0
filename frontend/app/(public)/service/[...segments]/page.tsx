import {notFound} from 'next/navigation';
import {serverApi,protectedServerApi,ServerApiError} from '@/lib/server';
import {resolveRoute} from '@/lib/urls';
import type {Category,Provider} from '@/lib/types';
import {CategoryPage,SubcategoryPage,ServicePage,ProviderDirectoryPage,ProviderDetailPage} from '@/components/catalogue-templates';
import {RequestForm} from '@/components/customer';
import {enquiryIntent} from '@/lib/service-pathways';
import {ServiceAccessState} from '@/components/service-access';
export const dynamic='force-dynamic';
export default async function CatalogueRoute({params,searchParams}:{params:Promise<{segments:string[]}>;searchParams:Promise<{intent?:string|string[]}>}) {
  const {segments}=await params;const categories=await serverApi<Category[]>('/catalogue');const route=resolveRoute(categories,segments);
  if(!route) notFound();
  if(route.kind==='category') return <CategoryPage category={route.category}/>;
  if(route.kind==='subcategory') return <SubcategoryPage category={route.category} subcategory={route.subcategory}/>;
  const context={category:route.category,subcategory:route.subcategory,service:route.service};
  const next=`/service/${segments.join('/')}`;
  const intent=enquiryIntent((await searchParams).intent);
  const destination=route.kind==='request'&&intent!=='enquiry'?`${next}?intent=${intent}`:next;
  let missing=false;let denied=0;let providers:Provider[]=[];let provider:Provider|undefined;
  try {
    if(route.kind==='request'||route.kind==='service'||route.kind==='companies'||route.kind==='provider') {
      const membership=await protectedServerApi<{active:boolean}>('/me/membership');
      if(membership.active!==true)denied=403;
    }
    if(!denied&&route.kind==='companies')providers=await protectedServerApi<Provider[]>(`/services/${route.service.id}/providers`);
    if(!denied&&route.kind==='provider')provider=await protectedServerApi<Provider>(`/services/${route.service.id}/providers/${route.providerSlug!}`);
  } catch(error) {
    if(error instanceof ServerApiError&&[401,403].includes(error.status)) {
      denied=error.status;
    }
    else if(route.kind==='service')denied=503;
    else if(error instanceof ServerApiError&&error.status===404)missing=true;
    else throw error;
  }
  if(route.kind==='service')return <ServicePage context={context} accessStatus={denied}/>;
  if(denied)return <ServiceAccessState status={denied} next={destination}/>;
  if(missing)notFound();
  if(route.kind==='request')return <RequestForm context={context} intent={intent}/>;
  if(route.kind==='companies')return <ProviderDirectoryPage context={context} providers={providers}/>;
  if(route.kind==='provider'&&provider)return <ProviderDetailPage context={context} provider={provider}/>;
  return <ServicePage context={context} accessStatus={denied}/>;
}
