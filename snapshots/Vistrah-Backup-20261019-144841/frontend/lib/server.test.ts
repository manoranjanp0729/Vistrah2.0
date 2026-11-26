import {beforeEach,it,expect,vi} from 'vitest';
const state=vi.hoisted(()=>({token:'synthetic-a'}));
vi.mock('server-only',()=>({}));
vi.mock('next/headers',()=>({cookies:async()=>({get:()=>state.token?{value:state.token}:undefined})}));
import {protectedServerApi,serverApi,ServerApiError} from './server';
beforeEach(()=>{vi.unstubAllGlobals();state.token='synthetic-a';});
it('forwards only current session and never stores/shares protected fetches',async()=>{
  const fetch=vi.fn(async(_url:string,options:RequestInit)=>new Response(JSON.stringify({owner:new Headers(options.headers).get('Authorization')})));
  vi.stubGlobal('fetch',fetch);
  expect(await protectedServerApi('/services/1/providers')).toEqual({owner:'Bearer synthetic-a'});
  state.token='synthetic-b';expect(await protectedServerApi('/services/1/providers')).toEqual({owner:'Bearer synthetic-b'});
  expect(fetch).toHaveBeenCalledTimes(2);
  for(const [,options] of fetch.mock.calls){expect(options.cache).toBe('no-store');expect(options.redirect).toBe('error');expect(new Headers(options.headers).has('Cookie')).toBe(false);}
});
it.each([401,403,404,503])('propagates safe status %s without backend data or session leakage',async status=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('private backend error',{status})));
  try{await protectedServerApi('/services/1/providers');expect.fail();}catch(e){expect(e).toBeInstanceOf(ServerApiError);expect((e as ServerApiError).status).toBe(status);expect((e as Error).message).not.toContain('private');}
});
it('does not send sessions to public fetches and rejects arbitrary authenticated targets',async()=>{
  const fetch=vi.fn(async()=>new Response('[]'));vi.stubGlobal('fetch',fetch);
  await serverApi('/catalogue');expect(fetch.mock.calls[0]).toHaveLength(2);
  expect((fetch.mock.calls[0] as unknown as [string,RequestInit])[1].headers).toBeUndefined();
  await expect(protectedServerApi('//evil')).rejects.toMatchObject({status:400});
  await expect(protectedServerApi('/services/1/providers/../../auth/login')).rejects.toMatchObject({status:400});
});
