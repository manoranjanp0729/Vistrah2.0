import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allServices,filterServices,enquiryPrefix,servicePath,discoverableServices,mobileServiceId} from '../src/lib/catalogue.ts';
const service={id:10,category_id:1,subcategory_id:null,slug:'tax-return',title:'Tax return',description:'Personal filing',includes:[],image:'',active:true,popular:false};
const categories=[{id:1,slug:'finance',title:'Finance',description:'',image:'',active:true,services:[service],subcategories:[{id:2,category_id:1,slug:'business',title:'Business',description:'',active:true,services:[{...service,id:11,subcategory_id:2,slug:'company-tax',title:'Company tax'}]}]}];
test('discovers nested services and builds existing website routes',()=>{
  assert.equal(allServices(categories).length,2);
  assert.equal(filterServices(categories,'  TAX ').length,2);
  assert.equal(filterServices(categories,'tax','other').length,0);
  assert.equal(servicePath(allServices(categories)[1]),'/service/finance/business/service/company-tax');
});
test('preserves the recommendation and delivery enquiry intent',()=>{
  assert.equal(enquiryPrefix('providers'),'');
  assert.equal(enquiryPrefix('recommendations'),'[Recommendation assistance] ');
  assert.equal(enquiryPrefix('in-house'),'[Delivery options enquiry] ');
});


test('Find Jobs appears under active Jobs & Careers and routes to its own detail page',()=>{
  const jobs={...categories[0],slug:'jobs-careers',title:'Jobs & Careers',subcategories:[]};
  const rows=filterServices([jobs],'find jobs','jobs-careers');
  assert.equal(rows.length,1);
  assert.equal(rows[0].service.title,'Find Jobs');
  assert.equal(mobileServiceId(rows[0]),'find-jobs');
  assert.equal(mobileServiceId(allServices([jobs])[0]),'10');
  assert.equal(allServices([jobs]).length,1);
  assert.equal(discoverableServices([{...jobs,active:false}]).length,1);
  assert.equal(filterServices([jobs],'find jobs','finance').length,0);
  assert.equal(discoverableServices([{...jobs,services:[{...service,slug:'find-jobs'}]}]).length,1);
});
