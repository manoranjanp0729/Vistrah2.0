import {safeDestination} from './destinations';
/** Website sign-in stays in customer/seller journeys, regardless of account role. */
export function websiteLoginDestination(value:unknown,fallback='/account'):string{
 const destination=safeDestination(value,fallback);
 let current=destination;
 for(let depth=0;depth<4;depth++){
  const url=new URL(current,'https://vistrah.invalid');
  if(url.pathname==='/admin'||url.pathname.startsWith('/admin/'))return fallback;
  const next=url.searchParams.get('next');if(!next)break;current=next;
 }
 return destination;
}
