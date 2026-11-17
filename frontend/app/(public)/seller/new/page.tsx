import {redirect} from 'next/navigation';
import {resolveSelfOnboardingInitialSelection,selfOnboardingUrl} from '../../../../../shared/self-onboarding';

export default async function SellerNewRedirectPage({
  searchParams,
}:{
  searchParams:Promise<Record<string,string|string[]|undefined>>;
}){
  const params=await searchParams;
  const cat=typeof params.category==='string'?params.category:undefined;
  const type=typeof params.type==='string'?params.type:typeof params.subcategory==='string'?params.subcategory:undefined;
  const business=typeof params.business==='string'&&/^[1-9]\d*$/.test(params.business)?params.business:undefined;
  const resolved=cat||type?resolveSelfOnboardingInitialSelection({category:cat,type}):undefined;
  redirect(selfOnboardingUrl({category:resolved?.categorySlug,type:resolved?.typeSlug,business}));
}
