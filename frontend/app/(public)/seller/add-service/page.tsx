import {notFound} from 'next/navigation';
import {AddService} from '@/components/add-service';
import {resolveMarketplaceSelection} from '@/lib/marketplace-taxonomy';
import {serviceSelection} from '../../../../../shared/service-listing';
export const metadata={title:'Add your service'};
export default async function AddServicePage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const params=await searchParams;
  const selection=serviceSelection({category:typeof params.category==='string'?params.category:undefined,subcategory:typeof params.subcategory==='string'?params.subcategory:undefined,type:typeof params.type==='string'?params.type:undefined});
  const resolved=selection&&resolveMarketplaceSelection(selection);
  if(!selection||!resolved?.listingType)notFound();
  return <AddService selection={selection} title={resolved.listingType.title} pathLabel={[resolved.category!.title,resolved.subcategory!.title,resolved.listingType.title].join(' / ')}/>;
}
