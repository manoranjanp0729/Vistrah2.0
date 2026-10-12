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
  expect(response.headers.get('set-cookie')).toMatch(/HttpOnly/i);
  expect(response.headers.get('set-cookie')).toMatch(/Secure/i);
  expect(response.headers.get('set-cookie')).toMatch(/Path=\//);
});
it('phone forms retain current-cookie authentication and support Unicode job descriptions',async()=>{
  const upstream=vi.fn(async()=>new Response('{"status":"DRAFT"}',{status:201}));vi.stubGlobal('fetch',upstream);
  const body=JSON.stringify({title:'Job',description:'😀'.repeat(6000)});
  const request=new NextRequest('https://vistrah.in/api/seller/businesses/7/jobs',{method:'POST',headers:{origin:'https://vistrah.in',cookie:'vistrah_session=current-cookie',authorization:'Bearer ignored-client-header'},body});
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
