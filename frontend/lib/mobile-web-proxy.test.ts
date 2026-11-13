import {beforeEach,it,expect,vi} from 'vitest';
import {NextRequest} from 'next/server';
vi.mock('@/lib/server',()=>({API_URL:'https://fixture-api.invalid'}));
import {POST} from '../app/api/[...path]/route';
beforeEach(()=>{vi.unstubAllGlobals();process.env.ALLOWED_ORIGINS='https://vistrah.in';process.env.COOKIE_SECURE='true';});
const params=(path:string[])=>({params:Promise.resolve({path})});
it('browser login returns user and HttpOnly cookie without a JavaScript token',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({user:{id:7},access_token:'fixture-private-session'}))));
  const request=new NextRequest('https://vistrah.in/api/auth/seller/login',{method:'POST',headers:{origin:'https://vistrah.in'},body:'{}'});
  const response=await POST(request,params(['auth','seller','login']));
  expect(await response.json()).toEqual({user:{id:7}});
  expect(response.cookies.get('vistrah_seller_session')?.value).toBe('fixture-private-session');
  expect(response.cookies.get('vistrah_session')).toBeUndefined();
  expect(response.headers.get('set-cookie')).toMatch(/HttpOnly/i);
  expect(response.headers.get('set-cookie')).toMatch(/Secure/i);
  expect(response.headers.get('set-cookie')).toMatch(/Path=\//);
});
it('phone forms retain current-cookie authentication and support Unicode job descriptions',async()=>{
  const upstream=vi.fn(async()=>new Response('{"status":"DRAFT"}',{status:201}));vi.stubGlobal('fetch',upstream);
  const body=JSON.stringify({title:'Job',description:'😀'.repeat(6000)});
  const request=new NextRequest('https://vistrah.in/api/seller/businesses/7/jobs',{method:'POST',headers:{origin:'https://vistrah.in',cookie:'vistrah_session=customer-cookie; vistrah_seller_session=current-cookie',authorization:'Bearer ignored-client-header'},body});
  const response=await POST(request,params(['seller','businesses','7','jobs']));
  expect(response.status).toBe(201);
  expect(upstream).toHaveBeenCalledWith('https://fixture-api.invalid/seller/businesses/7/jobs',expect.objectContaining({body,headers:expect.objectContaining({Authorization:'Bearer current-cookie'})}));
});
it('cross-origin browser writes are rejected before the backend',async()=>{
  const upstream=vi.fn();vi.stubGlobal('fetch',upstream);
  const request=new NextRequest('https://vistrah.in/api/requests',{method:'POST',headers:{origin:'https://other.invalid'},body:'{}'});
  expect((await POST(request,params(['requests']))).status).toBe(403);expect(upstream).not.toHaveBeenCalled();
});
it('extended mobile forms keep the backend-sized body cap',async()=>{
  const upstream=vi.fn();vi.stubGlobal('fetch',upstream);
  const request=new NextRequest('https://vistrah.in/api/seller/businesses/7/jobs',{method:'POST',headers:{origin:'https://vistrah.in'},body:'a'.repeat(128001)});
  expect((await POST(request,params(['seller','businesses','7','jobs']))).status).toBe(413);expect(upstream).not.toHaveBeenCalled();
});
it.each(['network','upstream'])('browser logout clears its cookie when %s revocation fails',async failure=>{
  vi.stubGlobal('fetch',vi.fn(async()=>{if(failure==='network')throw new Error('Unavailable');return new Response('{"detail":"Unavailable"}',{status:503});}));
  const request=new NextRequest('https://vistrah.in/api/auth/logout',{method:'POST',headers:{origin:'https://vistrah.in',cookie:'vistrah_session=old-session'}});
  const response=await POST(request,params(['auth','logout']));
  expect(response.status).toBe(503);
  expect(response.cookies.get('vistrah_session')?.value).toBe('');
});

it.each(['customer','seller'] as const)('logout revokes only the %s session and preserves the other cookie',async scope=>{
  const upstream=vi.fn(async()=>new Response('{"message":"Signed out"}'));vi.stubGlobal('fetch',upstream);
  const request=new NextRequest('https://vistrah.in/api/auth/logout',{method:'POST',headers:{origin:'https://vistrah.in',cookie:'vistrah_session=customer-token; vistrah_seller_session=seller-token','x-vistrah-session':scope}});
  const response=await POST(request,params(['auth','logout']));
  expect(upstream).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({headers:expect.objectContaining({Authorization:'Bearer '+scope+'-token'})}));
  expect(response.cookies.get(scope==='seller'?'vistrah_seller_session':'vistrah_session')?.value).toBe('');
  expect(response.cookies.get(scope==='seller'?'vistrah_session':'vistrah_seller_session')).toBeUndefined();
});
it('seller identity never falls back to an existing customer cookie',async()=>{
  const upstream=vi.fn(async()=>new Response('{"detail":"Sign in"}',{status:401}));vi.stubGlobal('fetch',upstream);
  const request=new NextRequest('https://vistrah.in/api/me',{headers:{cookie:'vistrah_session=customer-token','x-vistrah-session':'seller'}});
  const response=await POST(request,params(['me']));
  expect(upstream).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({headers:{'Content-Type':'application/json'}}));
  expect(response.cookies.get('vistrah_seller_session')?.value).toBe('');
  expect(response.cookies.get('vistrah_session')).toBeUndefined();
});

it.each(['customer','seller'] as const)('restores the %s identity from its own cookie',async scope=>{
  const upstream=vi.fn(async()=>new Response('{"id":7}'));vi.stubGlobal('fetch',upstream);
  const request=new NextRequest('https://vistrah.in/api/me',{headers:{cookie:'vistrah_session=customer-token; vistrah_seller_session=seller-token','x-vistrah-session':scope}});
  await POST(request,params(['me']));
  expect(upstream).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({headers:expect.objectContaining({Authorization:'Bearer '+scope+'-token'})}));
});
it.each(['network','upstream'])('seller logout preserves customer cookie when %s revocation fails',async failure=>{
  vi.stubGlobal('fetch',vi.fn(async()=>{if(failure==='network')throw new Error('Unavailable');return new Response('{}',{status:503});}));
  const request=new NextRequest('https://vistrah.in/api/auth/logout',{method:'POST',headers:{origin:'https://vistrah.in','x-vistrah-session':'seller',cookie:'vistrah_session=customer-token; vistrah_seller_session=seller-token'}});
  const response=await POST(request,params(['auth','logout']));
  expect(response.cookies.get('vistrah_seller_session')?.value).toBe('');
  expect(response.cookies.get('vistrah_session')).toBeUndefined();
});
