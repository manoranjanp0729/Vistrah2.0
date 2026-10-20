import {describe,it,expect,vi} from 'vitest';
import {managementClient,adminVAdsClient,moderationInput,advanceView,type AdminAccount} from '../../shared/v-ads-management';
import type {Api,AdvertiserAccount,SellerVideo} from '../../shared/v-ads';
import {proxyVAdsPreview} from '../../admin/lib/v-ads-preview';
describe('Phase 3 management contracts and admin preview boundary',()=>{
 it('edits only profile copy using the server revision and withdraws with expected status',async()=>{
  const calls:{path:string;options?:RequestInit}[]=[];const api:Api=async<T>(path:string,options?:RequestInit)=>{calls.push({path,options});return {} as T;};
  const client=managementClient(api),account={id:'owner',review_token:'a'.repeat(64)} as AdvertiserAccount;
  await client.profile(account,' Updated name ',' Updated copy ');
  expect(JSON.parse(calls[0].options!.body as string)).toEqual({name:'Updated name',description:'Updated copy',expected_revision:'a'.repeat(64)});
  await client.withdraw({id:'video',status:'APPROVED'} as SellerVideo,' Clear removal reason ');
  expect(JSON.parse(calls[1].options!.body as string)).toEqual({expected_status:'APPROVED',reason:'Clear removal reason'});
  expect(()=>client.profile({id:'old-api'} as AdvertiserAccount,'Title','')).toThrow();
 });
 it('sends independent account-review revisions and restricts blank reasons',async()=>{
  const calls:RequestInit[]=[];const api:Api=async<T>(_path:string,options?:RequestInit)=>{calls.push(options!);return {} as T;};
  await adminVAdsClient(api).reviewAccount({id:'id',status:'PENDING',review_token:'b'.repeat(64)} as AdminAccount,'APPROVED',' Reviewed profile copy ');
  expect(JSON.parse(calls[0].body as string)).toEqual({status:'APPROVED',reason:'Reviewed profile copy',expected_revision:'b'.repeat(64)});
  expect(()=>moderationInput('APPROVED','  ')).toThrow();
 });
 it('qualifies progressing playback without counting pauses, seeks or backward loops',()=>{
  let watched=0;for(let i=0;i<6;i++)watched=advanceView(watched,.5,true);expect(watched).toBe(3);
  expect(advanceView(watched,10,true)).toBe(3);expect(advanceView(watched,.5,false)).toBe(3);expect(advanceView(watched,-10,true)).toBe(3);expect(advanceView(watched,0,true)).toBe(3);
 });
 it('rejects missing admin session before network access',async()=>{
  const fetcher=vi.fn();const response=await proxyVAdsPreview(new Request('http://admin.test/preview'),{apiUrl:'http://api.test',videoId:'video',fetcher});
  expect(response.status).toBe(401);expect(fetcher).not.toHaveBeenCalled();
 });
 it('rejects customer sessions without fetching private media',async()=>{
  const fetcher=vi.fn(async()=>Response.json({role:'CUSTOMER'}));
  const response=await proxyVAdsPreview(new Request('http://admin.test/preview'),{apiUrl:'http://api.test',videoId:'video',token:'synthetic',fetcher});
  expect(response.status).toBe(403);expect(fetcher).toHaveBeenCalledOnce();
 });
 it('streams authorized private ranges and does not forward caller credentials',async()=>{
  const fetcher=vi.fn(async(url:RequestInfo|URL,init?:RequestInit)=>{
   expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer admin-only');
   if(String(url).endsWith('/me'))return Response.json({role:'ADMIN'});
   expect(new Headers(init?.headers).get('Range')).toBe('bytes=0-2');
   return new Response(new Uint8Array([1,2,3]),{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes 0-2/10'}});
  });
  const response=await proxyVAdsPreview(new Request('http://admin.test/preview',{headers:{Range:'bytes=0-2',Authorization:'Bearer attacker'}}),{apiUrl:'http://api.test',videoId:'video',token:'admin-only',fetcher});
  expect(response.status).toBe(206);expect(response.headers.get('content-range')).toBe('bytes 0-2/10');expect(response.headers.get('cache-control')).toBe('private, no-store');expect((await response.arrayBuffer()).byteLength).toBe(3);
 });
 it('fails closed when administrator verification is unavailable',async()=>{
  const fetcher=vi.fn(async()=>{throw new Error('offline');});
  expect((await proxyVAdsPreview(new Request('http://admin.test/preview'),{apiUrl:'http://api.test',videoId:'video',token:'synthetic',fetcher})).status).toBe(503);
 });
});
