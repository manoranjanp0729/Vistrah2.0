import {describe,it,expect} from 'vitest';
import {websiteLoginDestination,resolvePostLoginDestination} from './login-destination';

describe('website login boundaries & unified /seller/onboard redirects',()=>{
  it('preserves customer, member, seller, and existing application return journeys while normalizing legacy onboarding routes to /seller/onboard',()=>{
    for(const path of ['/account/requests','/seller','/seller/onboard','/seller/onboard?category=food-and-dining&type=restaurant','/provide-service?application=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','/membership?next=%2Faccount%2Frequests']){
      expect(websiteLoginDestination(path)).toBe(path);
    }
    expect(websiteLoginDestination('/provide-service')).toBe('/seller/onboard');
    expect(websiteLoginDestination('/provide-service?category=1&service=10')).toBe('/seller/onboard');
    expect(websiteLoginDestination('/provide-service?business=7')).toBe('/seller/onboard?business=7');
    expect(websiteLoginDestination('/provider')).toBe('/seller/onboard');
    expect(websiteLoginDestination('/provider/onboarding?category=food-and-dining&type=restaurant')).toBe('/seller/onboard?category=food-and-dining&type=restaurant');
    expect(websiteLoginDestination('/seller/new?business=5')).toBe('/seller/onboard?business=5');
    expect(websiteLoginDestination('/seller/add-service?category=food-and-dining&subcategory=restaurant&type=restaurant')).toBe('/seller/onboard?category=food-and-dining&type=restaurant');
  });

  it('lands new or incomplete sellers directly on /seller/onboard after Google or email sign-in',()=>{
    expect(resolvePostLoginDestination('/seller',{seller_enabled:false})).toBe('/seller/onboard');
    expect(resolvePostLoginDestination('/seller',null)).toBe('/seller/onboard');
    expect(resolvePostLoginDestination('/seller',{seller_enabled:true})).toBe('/seller');
    expect(resolvePostLoginDestination(undefined,{seller_enabled:false},'/account')).toBe('/account');
  });

  it('rejects direct and nested admin return targets',()=>{
    for(const path of ['/admin','/admin/requests','/membership?next=%2Fadmin','/sandbox-checkout?next=%2Fadmin%2Fpayments']){
      expect(websiteLoginDestination(path)).toBe('/account');
    }
  });

  it('rejects external, malformed and unknown targets',()=>{
    for(const path of ['https://example.com','//example.com','/unknown','/%2f/admin']){
      expect(websiteLoginDestination(path)).toBe('/account');
    }
    expect(websiteLoginDestination('/admin','/seller/onboard')).toBe('/seller/onboard');
  });
});
