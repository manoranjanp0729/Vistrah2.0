import React from 'react';
import {beforeEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({publicFetch:vi.fn(),protectedFetch:vi.fn()}));
vi.mock('@/lib/server',()=>({serverApi:mocks.publicFetch,protectedServerApi:mocks.protectedFetch,ServerApiError:class extends Error {constructor(public status:number){super('Protected fetch failed');}}}));
vi.mock('@/lib/urls',async()=>await import('./urls'));
vi.mock('@/lib/service-pathways',async()=>await import('./service-pathways'));
vi.mock('@/components/catalogue-templates',()=>({CategoryPage:()=>null,SubcategoryPage:()=>null,ServicePage:()=>null,ProviderDirectoryPage:()=>null,ProviderDetailPage:()=>null}));
vi.mock('@/components/customer',()=>({RequestForm:()=>null}));
vi.mock('@/components/service-access',()=>({ServiceAccessState:()=>null}));
vi.mock('next/navigation',()=>({notFound:()=>{throw new Error('NOT_FOUND');}}));
import Page from '../app/(public)/service/[...segments]/page';
import {ServerApiError} from '@/lib/server';
import {ServiceAccessState} from '@/components/service-access';
import {ProviderDirectoryPage,ProviderDetailPage,ServicePage} from '@/components/catalogue-templates';
import {RequestForm} from '@/components/customer';
const service={id:7,slug:'repairs',title:'Repairs'};
const catalogue=[{slug:'construction',services:[service],subcategories:[{slug:'homes',services:[service]}]}];
const page=(segments:string[],intent?:string)=>Page({params:Promise.resolve({segments}),searchParams:Promise.resolve({intent})});
beforeEach(()=>{vi.stubGlobal('React',React);mocks.publicFetch.mockReset().mockResolvedValue(catalogue);mocks.protectedFetch.mockReset();});
it.each([['construction','service','repairs','companies'],['construction','homes','repairs','companies']])('uses authenticated fetching for directory including legacy URL %s',async(...segments)=>{
  const providers=[{slug:'synthetic',email:'fixture@example.com'}];mocks.protectedFetch.mockResolvedValueOnce({active:true}).mockResolvedValue(providers);
  const result=await page(segments);expect(result.type).toBe(ProviderDirectoryPage);expect(result.props.providers).toEqual(providers);expect(mocks.protectedFetch).toHaveBeenCalledWith('/services/7/providers');
});
it('fetches protected provider detail',async()=>{
  mocks.protectedFetch.mockResolvedValueOnce({active:true}).mockResolvedValue({slug:'synthetic'});
  const result=await page(['construction','service','repairs','companies','synthetic']);expect(result.type).toBe(ProviderDetailPage);expect(mocks.protectedFetch).toHaveBeenCalledWith('/services/7/providers/synthetic');
});
it.each([401,403])('returns an access state without listing data for HTTP %s',async status=>{
  mocks.protectedFetch.mockRejectedValue(new ServerApiError(status));
  const result=await page(['construction','homes','repairs','companies']);expect(result.type).toBe(ServiceAccessState);expect(result.props).toEqual({status,next:'/service/construction/homes/repairs/companies'});
  expect(mocks.protectedFetch).not.toHaveBeenCalledWith('/services/7/providers');
});
it.each([false,true])('checks backend eligibility before rendering enquiry, active=%s',async active=>{
  mocks.protectedFetch.mockResolvedValue({active});
  const result=await page(['construction','homes','repairs','request'],'recommendations');expect(result.type).toBe(active?RequestForm:ServiceAccessState);expect(mocks.protectedFetch).toHaveBeenCalledWith('/me/membership');
  if(!active)expect(result.props.next).toBe('/service/construction/homes/repairs/request?intent=recommendations');
});
it('preserves enquiry intent after session expiry',async()=>{
  mocks.protectedFetch.mockRejectedValue(new ServerApiError(401));const result=await page(['construction','service','repairs','request'],'in-house');expect(result.props.next).toBe('/service/construction/service/repairs/request?intent=in-house');
});
it('keeps general descriptions public and backend failures truthful',async()=>{
  mocks.protectedFetch.mockRejectedValue(new ServerApiError(401));
  const publicPage=await page(['construction','service','repairs']);expect(publicPage.type).toBe(ServicePage);expect(publicPage.props.accessStatus).toBe(401);expect(mocks.protectedFetch).toHaveBeenCalledWith('/me/membership');
  mocks.protectedFetch.mockRejectedValue(new ServerApiError(503));await expect(page(['construction','service','repairs','companies'])).rejects.toMatchObject({status:503});
  mocks.protectedFetch.mockResolvedValueOnce({active:true}).mockRejectedValue(new ServerApiError(404));await expect(page(['construction','service','repairs','companies','missing'])).rejects.toThrow('NOT_FOUND');
});
it.each([false,true])('gates all tab operations from backend eligibility while keeping public catalogue visible, active=%s',async active=>{
  mocks.protectedFetch.mockResolvedValue({active});
  const result=await page(['construction','service','repairs']);expect(result.type).toBe(ServicePage);expect(result.props.accessStatus).toBe(active?0:403);expect(mocks.protectedFetch).toHaveBeenCalledTimes(1);expect(mocks.protectedFetch).not.toHaveBeenCalledWith('/services/7/providers');
});
it.each([404,502,503])('fails closed for tab operations on membership-service error %s without hiding public descriptions',async status=>{
  mocks.protectedFetch.mockRejectedValue(new ServerApiError(status));const result=await page(['construction','service','repairs']);expect(result.type).toBe(ServicePage);expect(result.props.accessStatus).toBe(503);
});
it.each([undefined,null,'true',1])('does not treat malformed membership active=%s as eligible',async active=>{
  mocks.protectedFetch.mockResolvedValue({active});const result=await page(['construction','service','repairs']);expect(result.props.accessStatus).toBe(403);
});
it.each([false,undefined,null,'true',1])('does not request provider data without explicit backend membership, active=%s',async active=>{
  for(const suffix of [['companies'],['companies','synthetic']]){
    mocks.protectedFetch.mockReset().mockResolvedValueOnce({active}).mockResolvedValue([{company:'Must never be requested'}]);
    const result=await page(['construction','service','repairs',...suffix]);
    expect(result.type).toBe(ServiceAccessState);expect(result.props.status).toBe(403);
    expect(mocks.protectedFetch).toHaveBeenCalledTimes(1);expect(mocks.protectedFetch).toHaveBeenCalledWith('/me/membership');
  }
});
