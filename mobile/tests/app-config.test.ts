import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const configure=createRequire(import.meta.url)('../app.config.js');
test('website export keeps the local EAS linkage and native build configuration intact',()=>{
  const config={name:'VISTRAH',extra:{eas:{projectId:'local-linked-project'}},android:{package:'in.vistrah.app'},web:{favicon:'./assets/favicon.png'}};
  const previous=process.env.EXPO_PUBLIC_WEB_SESSION_MODE;
  try{
    delete process.env.EXPO_PUBLIC_WEB_SESSION_MODE;
    assert.equal(configure({config}),config);
    process.env.EXPO_PUBLIC_WEB_SESSION_MODE='cookie';
    const website=configure({config});
    assert.equal(website.experiments.baseUrl,'/app');
    assert.equal(website.web.output,'single');
    assert.deepEqual(website.extra,config.extra);
    assert.deepEqual(website.android,config.android);
    assert.equal(website.web.favicon,config.web.favicon);
  }finally{if(previous===undefined)delete process.env.EXPO_PUBLIC_WEB_SESSION_MODE;else process.env.EXPO_PUBLIC_WEB_SESSION_MODE=previous;}
});
