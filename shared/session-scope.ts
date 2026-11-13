export type SessionScope='customer'|'seller';

// Public discovery/customer activity must never fall back to seller credentials.
export function apiSessionScope(path:string):SessionScope {
  const route=path.split('?')[0];
  return /^\/(?:seller(?:\/|$)|auth\/seller(?:\/|$)|provider-(?:applications|leads|catalogue-requests)(?:\/|$)|employer-jobs(?:\/|$)|me\/(?:business-membership|provider-applications|employer-jobs)(?:\/|$)|membership\/(?:subscriptions|benefit-requests)(?:\/|$)|v-ads\/(?:me|seller|advertisers|videos|uploads|analytics)(?:\/|$))/.test(route)?'seller':'customer';
}

export function sellerScreen(path:string):boolean {
  return /^\/(?:seller|provide-service|provider-applications|employer-jobs|membership)(?:\/|$)/.test(path)||path.startsWith('/account/provider-applications');
}

export const sessionCookie=(scope:SessionScope)=>scope==='seller'?'vistrah_seller_session':'vistrah_session';
