import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,expect,it,vi} from 'vitest';
const session=vi.hoisted(()=>({user:null as null|{seller_enabled:boolean},loading:false,error:''}));
vi.mock('@/components/customer',()=>({useUser:()=>session}));
vi.mock('@/components/publication',()=>({BusinessPublicationEditor:()=>React.createElement('p',null,'Private publication editor')}));
vi.mock('@/components/commerce',()=>({SellerCommerce:()=>React.createElement('p',null,'Private listing editor')}));
vi.mock('@/components/ownership-claims',()=>({SellerOwnershipClaims:()=>null,AdminOwnershipClaimQueue:()=>null}));
vi.mock('@/components/ui',()=>({
  ButtonLink:({href,children}:{href:string;children:React.ReactNode})=>React.createElement('a',{href},children),
  Notice:({message}:{message:string})=>React.createElement('p',null,message),
  EmptyState:({title}:{title:string})=>React.createElement('p',null,title),
}));
vi.mock('next/navigation',()=>({notFound:()=>{throw new Error('NOT_FOUND');}}));
import {SellerDashboard} from '../components/seller';
import SellerBusinessPage from '../app/(public)/seller/business/[id]/page';
import SellerListingsPage from '../app/(public)/seller/commerce/[id]/page';
import {websiteLoginDestination} from './login-destination';
beforeEach(()=>{session.user=null;session.loading=false;session.error='';});
it('connects the seller dashboard to applications, assigned enquiries and public offers',()=>{
  session.user={seller_enabled:true};
  const html=renderToStaticMarkup(React.createElement(SellerDashboard));
  for(const href of ['/services','/seller/v-ads','/account/provider-applications','/account/provider-applications#assigned-leads','/commerce','/app/employer-jobs'])expect(html).toContain('href="'+href+'"');
  expect(html).not.toContain('Private listing editor');
  expect(html).toContain('Loading your businesses');
});
it('preserves the selected business through seller login without exposing private editors',()=>{
  const html=renderToStaticMarkup(React.createElement(()=>SellerDashboard({businessId:7})));
  expect(html).toContain('/seller/login?next=%2Fseller%2Fbusiness%2F7');
  expect(html).not.toContain('Private publication editor');
  expect(websiteLoginDestination('/seller/business/7')).toBe('/seller/business/7');
});
it('rejects malformed business routes',async()=>{
  for(const id of ['0','-1','1.5','invalid','9007199254740992'])await expect(SellerBusinessPage({params:Promise.resolve({id})})).rejects.toThrow('NOT_FOUND');
  expect((await SellerBusinessPage({params:Promise.resolve({id:'7'})})).props.businessId).toBe(7);
  await expect(SellerListingsPage({params:Promise.resolve({id:'0'})})).rejects.toThrow('NOT_FOUND');
  const listings=await SellerListingsPage({params:Promise.resolve({id:'7'})});
  expect(listings.props.listingsOnly).toBe(true);
  expect(websiteLoginDestination('/seller/commerce/7?focus=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')).toBe('/seller/commerce/7?focus=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  expect(websiteLoginDestination('/seller/commerce/7?focus=invalid')).toBe('/account');
});
it('allows purchase return paths while rejecting unknown routes and injected queries',()=>{
  for(const path of ['/commerce','/commerce/cart','/commerce/orders','/seller/v-ads'])expect(websiteLoginDestination(path)).toBe(path);
  for(const path of ['/seller/business/7?owner=other','/commerce/private','/commerce?redirect=https://example.com'])expect(websiteLoginDestination(path)).toBe('/account');
});
