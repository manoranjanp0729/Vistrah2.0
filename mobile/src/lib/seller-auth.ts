export function authEndpoint(register:boolean,seller:boolean){
  return seller?(register?'/auth/seller/register':'/auth/seller/login'):(register?'/auth/register':'/auth/login');
}
export function sellerReturnDestination(seller:boolean,next:unknown):'/services'|'/provider-applications/new'|`/seller/add-service?${string}`|null{
  if(!seller)return null;
  if(next==='/services'||next==='/provider-applications/new')return next;
  if(typeof next!=='string'||!next.startsWith('/seller/add-service?')||next.includes('#'))return null;
  const query=new URLSearchParams(next.slice('/seller/add-service?'.length));
  const keys=[...query.keys()];
  if(keys.length!==3||!['category','subcategory','type'].every(key=>keys.includes(key)&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(query.get(key)??'')&&(query.get(key)?.length??101)<=100))return null;
  return next as `/seller/add-service?${string}`;
}
