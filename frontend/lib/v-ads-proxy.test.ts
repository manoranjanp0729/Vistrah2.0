import {describe,it,expect,vi} from 'vitest';
import {proxyVAds} from './v-ads-proxy';
const options={apiUrl:'http://isolated.test',token:'synthetic-session',allowedOrigins:['http://web.test'],path:['reels']};
describe('V Ads cookie and media streaming proxy',()=>{
 it('forwards ranges and streams partial media without exposing tokens',async()=>{
  const fetcher=vi.fn(async(_url:RequestInfo|URL,init?:RequestInit)=>{
   const headers=new Headers(init?.headers);expect(headers.get('Authorization')).toBe('Bearer synthetic-session');expect(headers.get('Range')).toBe('bytes=1-3');
   return new Response(new Uint8Array([1,2,3]),{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes 1-3/10','Accept-Ranges':'bytes'}});
  });
  const result=await proxyVAds(new Request('http://web.test/api/v-ads/media/id',{headers:{Range:'bytes=1-3',Authorization:'Bearer attacker'}}),{...options,path:['media','id'],fetcher});
  expect(result.status).toBe(206);expect(result.headers.get('content-range')).toBe('bytes 1-3/10');expect(await result.arrayBuffer()).toEqual(new Uint8Array([1,2,3]).buffer);expect(result.headers.get('Authorization')).toBeNull();
 });
 it('blocks cross-origin and unauthenticated writes before forwarding',async()=>{
  const fetcher=vi.fn();
  const request=(origin:string)=>new Request('http://web.test/api/v-ads/videos/submit',{method:'POST',headers:{Origin:origin},body:'{}'});
  expect((await proxyVAds(request('http://evil.test'),{...options,fetcher})).status).toBe(403);
  expect((await proxyVAds(request('http://web.test'),{...options,token:undefined,fetcher})).status).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
 });
 it('streams authenticated MP4 bytes with correct bounds',async()=>{
  const fetcher=vi.fn(async(_url:RequestInfo|URL,init?:RequestInit)=>{
   expect(new Headers(init?.headers).get('content-length')).toBe('4');
   expect(await new Response(init?.body).text()).toBe('mp4!');return Response.json({id:'owned'});
  });
  const request=new Request('http://web.test/api/v-ads/advertisers/id/uploads',{method:'POST',headers:{Origin:'http://web.test','Content-Type':'video/mp4','Content-Length':'4'},body:'mp4!'});
  expect((await proxyVAds(request,{...options,path:['advertisers','id','uploads'],fetcher})).status).toBe(200);
  expect(fetcher).toHaveBeenCalledOnce();
 });
 it('rejects oversized uploads and JSON before upstream access',async()=>{
  const fetcher=vi.fn();
  const large=new Request('http://web.test/api/v-ads/advertisers/id/uploads',{method:'POST',headers:{Origin:'http://web.test','Content-Type':'video/mp4','Content-Length':'104857601'},body:'x'});
  expect((await proxyVAds(large,{...options,path:['advertisers','id','uploads'],fetcher})).status).toBe(413);
  const json=new Request('http://web.test/api/v-ads/videos/submit',{method:'POST',headers:{Origin:'http://web.test'},body:'x'.repeat(20001)});
  expect((await proxyVAds(json,{...options,path:['videos','submit'],fetcher})).status).toBe(413);expect(fetcher).not.toHaveBeenCalled();
 });
 it('returns a recoverable unavailable state on network failure',async()=>{
  const fetcher=vi.fn(async()=>{throw new Error('offline');});
  expect((await proxyVAds(new Request('http://web.test/api/v-ads/reels'),{...options,fetcher})).status).toBe(503);
 });
});
