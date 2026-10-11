import {ProviderOnboarding} from '@/components/provider-onboarding';
import {serverApi} from '@/lib/server';
import type {Category} from '@/lib/types';
export const metadata={title:'Provider application'};
export default async function ProvideService({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const params=await searchParams;const categories=await serverApi<Category[]>('/catalogue');
  const category=typeof params.category==='string'&&/^\d+$/.test(params.category)?Number(params.category):undefined;
  const application=typeof params.application==='string'&&/^[a-f0-9-]{36}$/.test(params.application)?params.application:undefined;
  const business=typeof params.business==='string'&&/^[1-9]\d*$/.test(params.business)?Number(params.business):undefined;
  return <ProviderOnboarding categories={categories} categoryId={category} applicationId={application} providerId={business}/>;
}
