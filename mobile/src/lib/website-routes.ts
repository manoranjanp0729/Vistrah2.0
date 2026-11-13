import {sellerReturnDestination} from './seller-auth.ts';
import {discoverableServices,mobileServiceId,type Category} from './catalogue.ts';

// Local Expo serves /membership; the hosted phone website adds /app itself.
// Accept old website bookmarks without enabling cookie authentication locally.
export function membershipRoute(pathname:string):'/membership'|null {
  if(pathname==='/membership')return null;
  return /^\/(?:app\/)?(?:account\/)?membership\/?$/i.test(pathname)?'/membership':null;
}

// Translate existing website bookmarks into the shared mobile screen routes.
export function websiteRoute(pathname:string,search:string,categories:Category[]):string|null {
  const path=pathname.replace(/^\/app(?=\/|$)/,'')||'/';
  const query=new URLSearchParams(search);
  const sellerNext=sellerReturnDestination(true,query.get('next'));
  if((path==='/seller/login'||path==='/seller/register')&&sellerNext?.startsWith('/seller/add-service?'))return '/auth?mode=seller'+(path==='/seller/register'?'&register=1':'')+'&next='+encodeURIComponent(sellerNext);
  if((path==='/seller/login'||path==='/seller/register')&&query.get('next')==='/services')return '/auth?mode=seller'+(path==='/seller/register'?'&register=1':'')+'&next=%2Fservices';
  if((path==='/seller/login'||path==='/seller/register')&&query.get('next')==='/provide-service')return '/auth?mode=seller'+(path==='/seller/register'?'&register=1':'')+'&next=%2Fprovider-applications%2Fnew';
  const aliases:Record<string,string>={
    '/login':'/auth','/register':'/auth?register=1',
    '/seller/login':'/auth?mode=seller','/seller/register':'/auth?mode=seller&register=1',
    '/account/profile':'/profile','/account/requests':'/my-requests','/account/payments':'/payments',
    '/account/orders':'/payments','/account/membership':'/membership','/account/settings':'/settings',
    '/account/provider-applications':'/provider-applications','/account/finds':'/finds',
    '/sandbox-checkout':'/checkout',
  };
  if(aliases[path])return aliases[path];
  if(/^\/account\/finds\/[0-9a-f-]{36}$/.test(path))return path.replace('/account','');
  if(path==='/provide-service'){
    const id=query.get('application');
    if(id&&/^[0-9a-f-]{36}$/.test(id))return '/provider-applications/'+id;
    const selection=new URLSearchParams();
    for(const key of ['business','category','service']){const value=query.get(key);if(value&&/^[1-9]\d*$/.test(value))selection.set(key,value);}
    return '/provider-applications/new'+(selection.size?'?'+selection.toString():'');
  }
  if(!path.startsWith('/service/')||/^\/service\/(\d+|find-jobs)$/.test(path))return null;
  const parts=path.split('/').filter(Boolean);
  const category=categories.find(item=>item.slug===parts[1]);
  if(!category)return null;
  if(parts.length===2)return '/category/'+category.slug;
  const contexts=discoverableServices([category]);
  const service=contexts.find(item=>parts.includes(item.service.slug));
  if(!service)return '/category/'+category.slug;
  if(parts.at(-1)==='request'){
    const intent=query.get('intent');
    return '/request/'+service.service.id+(['recommendations','in-house'].includes(intent??'')?'?intent='+intent:'');
  }
  return '/service/'+mobileServiceId(service);
}

export function needsWebsiteCatalogue(path:string){
  return path.startsWith('/service/')&&!/^\/service\/(\d+|find-jobs)$/.test(path);
}
