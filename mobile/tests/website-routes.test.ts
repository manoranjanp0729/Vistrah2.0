import {test} from 'node:test';
import assert from 'node:assert/strict';
import {websiteRoute,needsWebsiteCatalogue} from '../src/lib/website-routes.ts';
import type {Category} from '../src/lib/catalogue.ts';
const categories=[{id:1,slug:'jobs-careers',title:'Jobs & Careers',description:'',active:true,services:[{id:3,slug:'resume-building',title:'Resume Building'}],subcategories:[]}] as Category[];
test('website bookmarks reach native account and seller screens',()=>{
  assert.equal(websiteRoute('/app/account/profile','',categories),'/profile');
  assert.equal(websiteRoute('/seller/register','',categories),'/auth?mode=seller&register=1');
  assert.equal(websiteRoute('/provide-service','?business=7',categories),'/provider-applications/new?business=7');
  assert.equal(websiteRoute('/provide-service','?business=https://other.invalid',categories),'/provider-applications/new');
});
test('legacy category, service, enquiry and Find Jobs routes retain their destinations',()=>{
  assert.equal(websiteRoute('/service/jobs-careers','',categories),'/category/jobs-careers');
  assert.equal(websiteRoute('/service/jobs-careers/service/resume-building','',categories),'/service/3');
  assert.equal(websiteRoute('/service/jobs-careers/service/resume-building/request','?intent=in-house',categories),'/request/3?intent=in-house');
  assert.equal(websiteRoute('/service/jobs-careers/service/find-jobs','',categories),'/service/find-jobs');
  assert.equal(websiteRoute('/service/3','',categories),null);
  assert.equal(websiteRoute('/service/find-jobs','',categories),null);
  assert.equal(needsWebsiteCatalogue('/service/3'),false);
});
