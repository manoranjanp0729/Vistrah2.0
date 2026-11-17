import {safeDestination} from './destinations';
import {resolveSelfOnboardingInitialSelection,selfOnboardingUrl} from '../../shared/self-onboarding';

function normalizeOnboardingTarget(destination:string):string{
  const url=new URL(destination,'https://vistrah.invalid');
  const path=url.pathname;
  if(path==='/provider'||path==='/provider/onboarding'||path==='/seller/new'){
    const cat=url.searchParams.get('category')??undefined;
    const type=url.searchParams.get('type')??url.searchParams.get('subcategory')??undefined;
    const business=url.searchParams.get('business')??undefined;
    const resolved=cat||type?resolveSelfOnboardingInitialSelection({category:cat,type}):undefined;
    return selfOnboardingUrl({
      category:resolved?.categorySlug??cat,
      type:resolved?.typeSlug??type,
      business,
    });
  }
  if(path==='/seller/add-service'){
    const cat=url.searchParams.get('category')??undefined;
    const sub=url.searchParams.get('subcategory')??undefined;
    const type=url.searchParams.get('type')??undefined;
    const resolved=resolveSelfOnboardingInitialSelection({category:cat,subcategory:sub,type});
    return selfOnboardingUrl({category:resolved.categorySlug,type:resolved.typeSlug??sub});
  }
  if(path==='/provide-service'){
    const application=url.searchParams.get('application');
    if(application&&/^[0-9a-f-]{36}$/.test(application))return destination;
    const business=url.searchParams.get('business')??undefined;
    return selfOnboardingUrl({business});
  }
  return destination;
}

/** Website sign-in stays in customer/seller journeys, regardless of account role. */
export function websiteLoginDestination(value:unknown,fallback='/account'):string{
  const destination=safeDestination(value,fallback);
  let current=destination;
  for(let depth=0;depth<4;depth++){
    const url=new URL(current,'https://vistrah.invalid');
    if(url.pathname==='/admin'||url.pathname.startsWith('/admin/'))return fallback;
    const next=url.searchParams.get('next');if(!next)break;current=next;
  }
  return normalizeOnboardingTarget(destination);
}

/** Lands new or incomplete sellers directly on /seller/onboard after Google or email sign-in. */
export function resolvePostLoginDestination(
  nextPath:unknown,
  user?:{seller_enabled?:boolean}|null,
  fallback='/account',
):string{
  const target=nextPath?websiteLoginDestination(nextPath,fallback):fallback;
  if(target==='/seller'&&!user?.seller_enabled)return '/seller/onboard';
  return target;
}
