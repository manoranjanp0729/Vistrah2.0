import {expect,it} from 'vitest';
import {apiSessionScope,sellerScreen,sessionCookie,UNIFIED_SESSION_COOKIE} from '../../shared/session-scope';
it('uses a single unified session scope and cookie across customer, seller, and V Ads endpoints',()=>{
 for(const path of ['/me','/me/location','/me/membership','/commerce/listings','/requests','/v-ads/reels/7/like','/seller/businesses','/auth/login','/provider-applications/7','/provider-leads','/me/business-membership','/membership/benefit-requests','/v-ads/me?page=1','/v-ads/seller/targeting/ad-1','/v-ads/videos/submit','/v-ads/uploads/7','/v-ads/analytics']){
  expect(apiSessionScope(path)).toBe('customer');
  expect(sessionCookie(apiSessionScope(path))).toBe(UNIFIED_SESSION_COOKIE);
 }
 expect(sellerScreen('/account')).toBe(false);expect(sellerScreen('/services')).toBe(false);
 expect(sellerScreen('/seller/commerce/7')).toBe(true);expect(sellerScreen('/account/provider-applications')).toBe(true);
});
