import {redirect} from 'next/navigation';
import {ProviderOnboarding} from '@/components/provider-onboarding';
import {serverApi} from '@/lib/server';
import type {Category} from '@/lib/types';
import {resolveSelfOnboardingInitialSelection,selfOnboardingUrl} from '../../../../shared/self-onboarding';

export const metadata={title:'Provider application'};

export default async function ProvideService({
  searchParams,
}:{
  searchParams:Promise<Record<string,string|string[]|undefined>>;
}){
  const params=await searchParams;
  const application=typeof params.application==='string'&&/^[a-f0-9-]{36}$/.test(params.application)?params.application:undefined;
  const business=typeof params.business==='string'&&/^[1-9]\d*$/.test(params.business)?Number(params.business):undefined;
  if(!application){
    const slugCat=typeof params.category==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.category)&&!/^\d+$/.test(params.category)?params.category:undefined;
    const slugType=typeof params.type==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.type)?params.type:undefined;
    const resolved=slugCat||slugType?resolveSelfOnboardingInitialSelection({category:slugCat,type:slugType}):undefined;
    redirect(selfOnboardingUrl({category:resolved?.categorySlug,type:resolved?.typeSlug,business}));
  }
  const categories=await serverApi<Category[]>('/catalogue');
  return <ProviderOnboarding categories={categories} applicationId={application} providerId={business}/>;
}
