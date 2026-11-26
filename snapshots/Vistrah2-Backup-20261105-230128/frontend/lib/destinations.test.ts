import {describe,it,expect} from 'vitest';
import {safeDestination,destinationLink} from './destinations';
describe('I1 safe return destinations',()=>{
  it('allows only the seller dashboard and admin claim queue, without widening unsafe queries',()=>{
    expect(safeDestination('/seller')).toBe('/seller');expect(safeDestination('/admin/ownership-claims')).toBe('/admin/ownership-claims');
    for(const path of ['/seller?owner=2','/seller/businesses/2','/seller/login','/seller//admin','/seller?next=https://evil.example'])expect(safeDestination(path)).toBe('/account');
  });
  it.each(['providers','recommendations','in-house'])('retains canonical service tab %s through auth and checkout',tab=>{
    for(const path of ['/service/jobs-careers/service/resume-building','/service/civil-construction/outdoor-lifestyle-design/service/glass-systems']){
      const next=`${path}?tab=${tab}`;expect(safeDestination(next)).toBe(next);
      for(const step of ['/login','/register','/membership','/sandbox-checkout'] as const)expect(new URL(destinationLink(step,next),'https://vistrah.invalid').searchParams.get('next')).toBe(next);
      expect(safeDestination(destinationLink('/sandbox-checkout',next))).toBe(destinationLink('/sandbox-checkout',next));
    }
  });
  it.each(['/service/a/service/b?tab=unknown','/service/a/service/b?tab=providers&tab=in-house','/service/a?tab=providers','/service/a/service/b/companies?tab=providers','/service/a/service/b/request?tab=in-house','/service/a/service/b?tab=%00','/service/a/service/b?tab=providers&success=true'])('rejects unsafe or misplaced tab context %s',path=>expect(safeDestination(path)).toBe('/account'));
  it.each(['/service/jobs-careers/service/resume-building/companies/provider','/service/civil-construction/outdoor-lifestyle-design/glass-systems/request?intent=recommendations','/account/finds','/provide-service?category=2','/admin/provider-requirements'])('retains permitted context %s',path=>expect(safeDestination(path)).toBe(path));
  it.each(['https://example.com','//example.com','/\\example.com','/service/a/../b','/service/a/%2e%2e/b','/service/%2f%2fevil','/service/a?success=true','/api/admin/overview','/login','/missing','/service/a\n','/service/a?intent=contact&intent=in-house','/service/a?intent=%00','/service/a?intent=%ZZ','/sandbox-checkout?next=https%3A%2F%2Fevil','/membership?next=%2Fsandbox-checkout','/service/a#secret'])('rejects malformed or unpermitted path %s',path=>expect(safeDestination(path)).toBe('/account'));
  it('retains service through auth, membership, checkout and refresh',()=>{
    const next='/service/civil-construction/outdoor-lifestyle-design/glass-systems/request?intent=recommendations';
    for(const step of ['/login','/register','/membership','/sandbox-checkout'] as const){const link=destinationLink(step,next);expect(new URL(link,'https://vistrah.invalid').searchParams.get('next')).toBe(next);}
    const checkout=destinationLink('/sandbox-checkout',next);expect(safeDestination(checkout)).toBe(checkout);
    expect(new URL(destinationLink('/login',checkout),'https://vistrah.invalid').searchParams.get('next')).toBe(checkout);
  });
});
