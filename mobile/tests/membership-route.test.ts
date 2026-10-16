import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {membershipRoute,websiteRoute} from '../src/lib/website-routes.ts';

test('local Expo normalizes website membership bookmarks without a cookie session',()=>{
 for(const path of ['/app/membership','/account/membership','/app/account/membership','/Membership','/membership/'])assert.equal(membershipRoute(path),'/membership',path);
 for(const path of ['/membership','/','/account','/services','/membership/offers','/me/business-membership'])assert.equal(membershipRoute(path),null,path);
 assert.equal(websiteRoute('/account/membership','',[]),'/membership');
 assert.equal(websiteRoute('/app/account/membership','',[]),'/membership');
});

test('membership is a default-exported root route registered outside the tabs',()=>{
 const source=readFileSync(new URL('../src/app/membership.tsx',import.meta.url),'utf8');
 const layout=readFileSync(new URL('../src/app/_layout.tsx',import.meta.url),'utf8');
 const fallback=readFileSync(new URL('../src/app/+not-found.tsx',import.meta.url),'utf8');
 assert.match(source,/export default function MembershipScreen/);
 assert.match(layout,/<Stack.Screen name="membership"/);
 assert.match(fallback,/membershipRoute\(usePathname\(\)\)/);
 assert.match(fallback,/destination\?<Redirect href=\{destination\}\/>:<Unmatched\/>/);
});

test('all membership entry buttons use the root route',()=>{
 const entries=['app/(tabs)/account.tsx','app/seller/index.tsx','components/ui.tsx','components/commerce-browser.tsx'];
 for(const file of entries){const source=readFileSync(new URL('../src/'+file,import.meta.url),'utf8');assert.match(source,/router\.push\([^)]*['"]\/membership['"]/,file);assert.doesNotMatch(source,/router\.push\([^)]*['"]\/(?:app\/|account\/|\(tabs\)\/)membership['"]/,file);}
});
