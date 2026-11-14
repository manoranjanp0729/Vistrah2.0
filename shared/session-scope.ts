export type SessionScope='customer'|'seller';

export const UNIFIED_SESSION_COOKIE='vistrah_session';
export const LEGACY_SELLER_SESSION_COOKIE='vistrah_seller_session';

// Unified authentication: customer, seller, and V Ads endpoints share one primary user session.
export function apiSessionScope(_path:string):SessionScope {
  return 'customer';
}

export function sellerScreen(path:string):boolean {
  return /^\/(?:seller|provide-service|provider-applications|employer-jobs|membership)(?:\/|$)/.test(path)||path.startsWith('/account/provider-applications');
}

export const sessionCookie=(_scope?:SessionScope)=>UNIFIED_SESSION_COOKIE;
