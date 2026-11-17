export function authEndpoint(register:boolean,_seller=false){
  return register?'/auth/register':'/auth/login';
}
export type SafeAuthReturn='/services'|'/seller'|'/seller/onboard'|`/seller/onboard?${string}`|'/seller/v-ads'|'/employer-jobs'|'/provider-applications'|'/provider-applications/new'|`/seller/business/${number}`|`/seller/commerce/${number}`|`/seller/orders/${number}`|`/seller/add-service?${string}`;
export function sellerReturnDestination(allowReturn:boolean,next:unknown):SafeAuthReturn|null{
  if(!allowReturn)return null;
  if(next==='/services'||next==='/seller'||next==='/seller/onboard'||next==='/seller/v-ads'||next==='/employer-jobs'||next==='/provider-applications'||next==='/provider-applications/new')return next;
  if(typeof next!=='string'||next.includes('#'))return null;
  if(/^\/seller\/(?:business|commerce|orders)\/[1-9]\d*$/.test(next))return next as SafeAuthReturn;
  if(next.startsWith('/seller/onboard?')){
    const query=new URLSearchParams(next.slice('/seller/onboard?'.length));
    const keys=[...query.keys()];
    if(!keys.length||new Set(keys).size!==keys.length)return null;
    for(const key of keys){
      const val=query.get(key)??'';
      if((key==='category'||key==='type')&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(val)&&val.length<=100)continue;
      if(key==='business'&&/^[1-9]\d*$/.test(val))continue;
      return null;
    }
    return next as `/seller/onboard?${string}`;
  }
  if(!next.startsWith('/seller/add-service?'))return null;
  const query=new URLSearchParams(next.slice('/seller/add-service?'.length));
  const keys=[...query.keys()];
  if(keys.length!==3||!['category','subcategory','type'].every(key=>keys.includes(key)&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(query.get(key)??'')&&(query.get(key)?.length??101)<=100))return null;
  return next as `/seller/add-service?${string}`;
}
