import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,expect,it,vi} from 'vitest';
import {listingProgress,businessProgress} from '../../shared/seller-journey';
import type {SellerListing} from '../../shared/commerce';
const resource=vi.hoisted(()=>({value:{loading:false,error:undefined,data:undefined,retry:()=>{}} as {loading:boolean;error?:Error;data?:{items:SellerListing[]};retry:()=>void}}));
vi.mock('@/lib/use-commerce-resource',()=>({useCommerceResource:()=>resource.value}));
import {SellerRecentListings} from '../components/seller-recent-listings';
const render=()=>renderToStaticMarkup(React.createElement(SellerRecentListings,{businessId:7}));
it('uses clear business verification labels',()=>{
  expect(businessProgress({verification_status:'PENDING',active:false})).toBe('Verification pending');
  expect(businessProgress({verification_status:'VERIFIED',active:true})).toBe('Verified business');
  expect(businessProgress({verification_status:'VERIFIED',active:false})).toBe('Business inactive');
  expect(businessProgress({verification_status:'REJECTED',active:false})).toBe('Verification declined');
});
beforeEach(()=>{resource.value={loading:false,retry:()=>{},data:{items:[]}};});
it('only describes eligible approved listings as live',()=>{
  const row={status:'APPROVED' as const,available:true,business_active:true,business_verification_status:'VERIFIED'};
  expect(listingProgress(row).label).toBe('Live');
  for(const change of [{available:false},{business_active:false},{business_verification_status:'PENDING'},{business_active:undefined}])expect(listingProgress({...row,...change}).label).toBe('Approved - hidden');
  for(const [status,label] of [['DRAFT','Draft'],['SUBMITTED','In review'],['REJECTED','Needs changes'],['ARCHIVED','Archived']] as const)expect(listingProgress({...row,status}).label).toBe(label);
});
it('surfaces review state and directs the seller to the selected listing',()=>{
  resource.value.data={items:[{id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',title:'Home repair',status:'SUBMITTED',available:true} as SellerListing]};
  const html=render();expect(html).toContain('In review');expect(html).toContain('/seller/commerce/7?focus=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');expect(html).not.toContain('Live');
});
it('distinguishes loading/failure from having no listings',()=>{
  expect(render()).toContain('No listings yet');
  resource.value={loading:true,retry:()=>{}};expect(render()).toContain('Loading recent listings');expect(render()).not.toContain('No listings yet');
  resource.value={loading:false,error:new Error('offline'),retry:()=>{}};expect(render()).toContain('Try again');expect(render()).not.toContain('No listings yet');
});
