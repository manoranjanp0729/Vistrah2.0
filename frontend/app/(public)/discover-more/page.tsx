import {ButtonLink} from '@/components/ui';
import {HomeNearby,AffiliateBrands} from '@/components/home-discovery';
import {serverApi,protectedServerApi,ServerApiError} from '@/lib/server';
import {allServices} from '@/lib/urls';
import type {Category,Membership} from '@/lib/types';
export const dynamic='force-dynamic';
export default async function MoreDiscovery(){const categories=await serverApi<Category[]>('/catalogue');let accessStatus=0;try{const m=await protectedServerApi<Membership>('/me/membership');if(!m.active)accessStatus=403;}catch(e){accessStatus=e instanceof ServerApiError?e.status:503;}return <div className="replica-page"><h1 className="container">More discovery options</h1><div className="container"><ButtonLink href="/commerce">Products & service packages</ButtonLink></div><HomeNearby services={allServices(categories)} accessStatus={accessStatus}/><AffiliateBrands/></div>;}