import {describe,it,expect} from 'vitest';
import {websiteLoginDestination} from './login-destination';
describe('website login boundaries',()=>{
 it('preserves customer, member and seller return journeys',()=>{for(const path of ['/account/requests','/seller','/provide-service?category=1&service=10','/membership?next=%2Faccount%2Frequests'])expect(websiteLoginDestination(path)).toBe(path);});
 it('rejects direct and nested admin return targets',()=>{for(const path of ['/admin','/admin/requests','/membership?next=%2Fadmin','/sandbox-checkout?next=%2Fadmin%2Fpayments'])expect(websiteLoginDestination(path)).toBe('/account');});
 it('rejects external, malformed and unknown targets',()=>{for(const path of ['https://example.com','//example.com','/unknown','/%2f/admin'])expect(websiteLoginDestination(path)).toBe('/account');expect(websiteLoginDestination('/admin','/seller')).toBe('/seller');});
});
