import {test} from 'node:test';
import assert from 'node:assert/strict';
import {websiteRoute,needsWebsiteCatalogue} from '../src/lib/website-routes.ts';
import type {Category} from '../src/lib/catalogue.ts';
const categories=[{id:1,slug:'jobs-careers',title:'Jobs & Careers',description:'',active:true,services:[{id:3,slug:'resume-building',title:'Resume Building'}],subcategories:[]}] as Category[];

test('website bookmarks reach native account and unified /seller/onboard screens',()=>{
  assert.equal(websiteRoute('/app/account/profile','',categories),'/profile');
  assert.equal(websiteRoute('/seller/register','',categories),'/auth?register=1&next=%2Fseller%2Fonboard');
  assert.equal(websiteRoute('/provide-service','?business=7',categories),'/seller/onboard?business=7');
  assert.equal(websiteRoute('/provide-service','?category=food-and-dining&type=restaurant',categories),'/seller/onboard?category=food-and-dining&type=restaurant');
  assert.equal(websiteRoute('/provide-service','?application=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',categories),'/provider-applications/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  assert.equal(websiteRoute('/provide-service','?business=https://other.invalid',categories),'/seller/onboard');
  assert.equal(websiteRoute('/provider','',categories),'/seller/onboard');
  assert.equal(websiteRoute('/provider/onboarding','?category=vehicles&type=driving-school',categories),'/seller/onboard?category=vehicles&type=driving-school');
  assert.equal(websiteRoute('/seller/new','?business=4',categories),'/seller/onboard?business=4');
});

test('seller login and signup retain /seller/onboard and service-selector destinations on phone web',()=>{
  assert.equal(websiteRoute('/seller/register','?next=%2Fservices',categories),'/auth?register=1&next=%2Fservices');
  assert.equal(websiteRoute('/seller/login','?next=%2Fservices',categories),'/auth?next=%2Fservices');
  assert.equal(websiteRoute('/seller/login','?next=%2Fprovide-service',categories),'/auth?next=%2Fseller%2Fonboard');
  assert.equal(websiteRoute('/seller/register','?next=%2Fprovide-service',categories),'/auth?register=1&next=%2Fseller%2Fonboard');
  assert.equal(websiteRoute('/seller/login','?next=%2Fseller%2Fonboard%3Fcategory%3Dfood-and-dining%26type%3Drestaurant',categories),'/auth?next=%2Fseller%2Fonboard%3Fcategory%3Dfood-and-dining%26type%3Drestaurant');
  assert.equal(websiteRoute('/seller/login','?next=https://other.invalid',categories),'/auth?next=%2Fseller%2Fonboard');
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
