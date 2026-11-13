import {test} from 'node:test';
import assert from 'node:assert/strict';

test('deployed website uses same-origin cookies and never forwards native bearer tokens',async()=>{
  Object.assign(globalThis,{document:{},__DEV__:false});
  process.env.EXPO_PUBLIC_WEB_SESSION_MODE='cookie';
  process.env.EXPO_PUBLIC_API_URL='https://different-api.invalid';
  const {api,setToken,onUnauthorized,usesBrowserCookies}=await import('../src/lib/api.ts');
  assert.equal(usesBrowserCookies,true);
  const previous=globalThis.fetch;let expired=0;
  try{
    setToken('must-not-leave-the-browser');onUnauthorized(()=>{expired++;setToken(null);});
    globalThis.fetch=async(url,options)=>{
      assert.equal(url,'/api/me');
      assert.equal(options?.credentials,'same-origin');
      assert.equal((options?.headers as Record<string,string>).Authorization,undefined);
      return new Response(JSON.stringify({detail:'Session expired'}),{status:401});
    };
    await assert.rejects(api('/me'));
    assert.equal(expired,1);
  }finally{globalThis.fetch=previous;setToken(null);onUnauthorized(()=>{});delete (globalThis as {document?:unknown}).document;delete process.env.EXPO_PUBLIC_WEB_SESSION_MODE;}
});
