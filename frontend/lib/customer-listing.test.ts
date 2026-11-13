import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,expect,it,vi} from 'vitest';
import {ApiError} from './api';
import {marketplaceUrl} from '../../shared/marketplace';
import {listingEnquiryHref} from '../../shared/customer-listing';
import {websiteLoginDestination} from './login-destination';
const resource=vi.hoisted(()=>({value:{loading:false,retry:()=>{},data:{items:[],total:0,page:1,page_size:20}} as {loading:boolean;retry:()=>void;error?:Error;data?:{items:unknown[];total:number;page:number;page_size:number}}}));
vi.mock('@/lib/use-commerce-resource',()=>({useCommerceResource:()=>resource.value}));
vi.mock('@/components/ui',()=>({ButtonLink:({href,children}:{href:string;children:React.ReactNode})=>React.createElement('a',{href},children)}));
import {ClassifiedServices} from '../components/customer-listing-results';
const selection={category:'food-and-dining',subcategory:'restaurants-and-dining',type:'restaurants'};
const render=()=>renderToStaticMarkup(React.createElement(ClassifiedServices,{selection}));
beforeEach(()=>{resource.value={loading:false,retry:()=>{},data:{items:[],total:0,page:1,page_size:20}};});
it('gives an actionable empty state with related options and no pointless pagination',()=>{
  const html=render();expect(html).toContain('No offers to choose from yet');expect(html).toContain('Explore related options');expect(html).toContain('/services?category=food-and-dining&amp;subcategory=restaurants-and-dining');expect(html).not.toContain('Service offer pages');
});
it('distinguishes a loading or unavailable API from having no offers',()=>{
  resource.value={loading:true,retry:()=>{}};expect(render()).toContain('Finding available options');expect(render()).not.toContain('No offers');
  resource.value={loading:false,retry:()=>{},error:new ApiError(503,'Backend unavailable')};expect(render()).toContain('Try again');expect(render()).not.toContain('No offers');
});
it('preserves the selected listing type through sign-in and membership links',()=>{
  const next=marketplaceUrl(selection);
  for(const [status,path,label] of [[401,'/login','Sign in and continue'],[403,'/membership','View membership']] as const){
    resource.value={loading:false,retry:()=>{},error:new ApiError(status,'Access required')};
    expect(render()).toContain(path+'?next='+encodeURIComponent(next));expect(render()).toContain(label);expect(render()).not.toContain('No offers');
  }
  expect(websiteLoginDestination(next)).toBe(next);
  expect(websiteLoginDestination('/membership?next='+encodeURIComponent(next))).toBe('/membership?next='+encodeURIComponent(next));
  for(const path of ['/services?type=restaurants','/services?category=food&type=restaurants','/services?category=food&next=https://example.com','/services?category=food&category=other'])expect(websiteLoginDestination(path)).toBe('/account');
});
it('routes real offers to their details without promising booking or showing one-page controls',()=>{
  resource.value.data={items:[{id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',title:'Dinner package',business:'Synthetic restaurant',description:'A complete reviewed offer description.',unit_price_paise:12345}],total:1,page:1,page_size:20};
  const html=render();expect(html).toContain('Dinner package');expect(html).toContain('Synthetic restaurant');expect(html).toContain('/commerce/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');expect(html).toContain('View service &amp; next steps');expect(html).not.toContain('Book now');expect(html).not.toContain('Service offer pages');
});
it('prefills only the public selection in an email draft without sending anything',()=>{
  const href=listingEnquiryHref('Repairs + care & more','Home / Repairs');
  expect(href).toMatch(/^mailto:info@vistrah\.in\?/);
  const params=new URLSearchParams(href.split('?')[1]);expect(params.get('subject')).toBe('Service enquiry: Repairs + care & more');expect(params.get('body')).toContain('Preferred location (optional):');expect(params.get('body')).toContain('Home / Repairs');expect(href).not.toContain('+');
});
