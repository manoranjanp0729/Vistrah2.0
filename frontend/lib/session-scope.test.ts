import {expect,it} from 'vitest';
import {apiSessionScope,sellerScreen} from '../../shared/session-scope';
it('keeps customer activity separate from seller ownership and media management',()=>{
 for(const path of ['/me','/me/location','/me/membership','/commerce/listings','/requests','/v-ads/reels/7/like'])expect(apiSessionScope(path)).toBe('customer');
 for(const path of ['/seller/businesses','/auth/seller/login','/provider-applications/7','/provider-leads','/me/business-membership','/membership/benefit-requests','/v-ads/me?page=1','/v-ads/seller/targeting/ad-1','/v-ads/videos/submit','/v-ads/uploads/7','/v-ads/analytics'])expect(apiSessionScope(path)).toBe('seller');
 expect(sellerScreen('/account')).toBe(false);expect(sellerScreen('/services')).toBe(false);
 expect(sellerScreen('/seller/commerce/7')).toBe(true);expect(sellerScreen('/account/provider-applications')).toBe(true);
});
