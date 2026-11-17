import {notFound,redirect} from 'next/navigation';
import {resolveMarketplaceSelection,legacyMarketplaceSelection} from '@/lib/marketplace-taxonomy';
import {serviceSelection} from '../../../../../shared/service-listing';
import {selfOnboardingUrl} from '../../../../../shared/self-onboarding';

export const metadata={title:'List your business'};

export default async function AddServicePage({
  searchParams,
}:{
  searchParams:Promise<Record<string,string|string[]|undefined>>;
}){
  const params=await searchParams;
  const selection=serviceSelection({
    category:typeof params.category==='string'?params.category:undefined,
    subcategory:typeof params.subcategory==='string'?params.subcategory:undefined,
    type:typeof params.type==='string'?params.type:undefined,
  });
  if(!selection)notFound();
  const resolved=resolveMarketplaceSelection(selection)
    ||(legacyMarketplaceSelection(selection)?resolveMarketplaceSelection(legacyMarketplaceSelection(selection)!):null);
  if(!resolved?.category||!resolved?.subcategory)notFound();
  redirect(
    selfOnboardingUrl({
      category:resolved.category.slug,
      subcategory:resolved.subcategory.slug,
      type:resolved.listingType?.slug??resolved.subcategory.slug,
    }),
  );
}
