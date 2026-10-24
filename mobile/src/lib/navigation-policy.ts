// Route params arrive as strings from links and may be numbers from card actions.
// Ignore internal routing metadata; preserve meaningful query values and ordering.
export function appRouteIdentity(name:string,params:Record<string,unknown>={}){
 if(name==='(tabs)')return 'main-tabs';
 const entries=Object.keys(params).sort().filter(key=>!key.startsWith('__')&&params[key]!==undefined&&params[key]!==null&&params[key]!=='').map(key=>[key,Array.isArray(params[key])?(params[key] as unknown[]).map(String):String(params[key])]);
 return JSON.stringify([name,entries]);
}

export function backFallback(pathname:string,params:Record<string,unknown>={}):string{
 const path=pathname.replace(/^\/app(?=\/|$)/,'')||'/';
 if(/^\/marketing-pricing\/.+/.test(path))return '/marketing-pricing';
 if(path==='/marketing-pricing'||path.startsWith('/marketing-services/'))return '/marketing-solutions';
 if(path.startsWith('/seller/')||path==='/seller'){
  if(path==='/seller/add-service'){
   const query=new URLSearchParams();
   for(const key of ['category','subcategory','type'])if(typeof params[key]==='string')query.set(key,params[key] as string);
   return '/services'+(query.size?'?'+query.toString():'');
  }
  return path==='/seller'?'/account':'/seller';
 }
 if(path.startsWith('/provider-applications/'))return '/provider-applications';
 if(path.startsWith('/finds/'))return '/finds';
 const service=path.match(/^\/(?:estimate|request)\/([^/]+)$/);
 if(service)return '/service/'+service[1];
 if(path.startsWith('/commerce/'))return '/commerce';
 if(path.startsWith('/service/')||path.startsWith('/category/'))return '/services';
 if(path==='/forgot-password'||path==='/reset-password')return '/auth';
 if(path==='/advertiser-profile')return '/v-ads';
 if(path==='/checkout')return '/membership';
 if(['/auth','/profile','/payments','/membership','/my-requests','/seller','/provider-applications','/finds'].includes(path))return '/account';
 return '/';
}
