import {test} from 'node:test';
import assert from 'node:assert/strict';
import {api,ApiError,onUnauthorized,setToken,getToken,validateBase} from '../src/lib/api.ts';
test('rejects insecure release URLs, embedded credentials and unsupported schemes',()=>{
  assert.throws(()=>validateBase('http://example.com',false));
  assert.throws(()=>validateBase('https://user:pass@example.com',true));
  assert.throws(()=>validateBase('file:///tmp/data',true));
  assert.throws(()=>validateBase('',true));
  assert.equal(validateBase('https://example.com/',false),'https://example.com');
});
test('uses bearer auth, reports backend gates and expires a rejected session',async()=>{
  Object.assign(globalThis,{__DEV__:true});
  process.env.EXPO_PUBLIC_API_URL='http://localhost:8100';
  const original=globalThis.fetch;let expired=0;
  try{
    setToken('test-session');onUnauthorized(()=>{expired++;setToken(null);});
    globalThis.fetch=async(url,options)=>{
      assert.equal(String(url),'http://localhost:8100/me');
      assert.equal((options?.headers as Record<string,string>).Authorization,'Bearer test-session');
      return new Response(JSON.stringify({detail:'Session expired'}),{status:401});
    };
    await assert.rejects(api('/me'),error=>error instanceof ApiError&&error.status===401);
    assert.equal(expired,1);
    await assert.rejects(api('//another-host/me'),error=>error instanceof ApiError&&error.status===0);
  }finally{globalThis.fetch=original;setToken(null);onUnauthorized(()=>{});}
});

test('customer and seller tokens, expiry and logout requests remain independent',async()=>{
  Object.assign(globalThis,{__DEV__:true});process.env.EXPO_PUBLIC_API_URL='http://localhost:8100';
  const original=globalThis.fetch;const seen:string[]=[];
  try{
    setToken('customer-token');setToken('seller-token','seller');
    onUnauthorized(()=>setToken(null,'seller'),'seller');
    globalThis.fetch=async(_url,options)=>{
      seen.push((options?.headers as Record<string,string>).Authorization);
      return new Response('{}',{status:seen.length===2?401:200});
    };
    await api('/me');
    await assert.rejects(api('/seller/businesses'),e=>e instanceof ApiError&&e.status===401);
    assert.equal(getToken(),'customer-token');assert.equal(getToken('seller'),null);
    setToken('seller-token','seller');
    await api('/auth/logout',{method:'POST'},{scope:'seller'});
    setToken(null,'seller');
    await api('/me');
    assert.deepEqual(seen,['Bearer customer-token','Bearer seller-token','Bearer seller-token','Bearer customer-token']);
  }finally{globalThis.fetch=original;setToken(null);setToken(null,'seller');onUnauthorized(()=>{},'seller');}
});
