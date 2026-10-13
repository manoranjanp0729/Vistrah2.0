import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const configure=createRequire(import.meta.url)('../app.config.js');
test('website export keeps the local EAS linkage and native build configuration intact',()=>{
  const config={name:'VISTRAH',extra:{eas:{projectId:'local-linked-project'}},android:{package:'in.vistrah.app'},web:{favicon:'./assets/favicon.png'},plugins:['expo-router']};
  const previous=process.env.EXPO_PUBLIC_WEB_SESSION_MODE;
  try{
    delete process.env.EXPO_PUBLIC_WEB_SESSION_MODE;
    const native=configure({config});
    assert.equal(native.android.package,config.android.package);
    assert.deepEqual(native.extra,config.extra);
    assert.equal(native.icon,'./assets/brand/icon.png');
    assert.equal(native.userInterfaceStyle,'light');
    assert.equal(native.plugins[0],'expo-router');
    assert.equal(native.plugins[1][0],'expo-splash-screen');
    assert.deepEqual(config.plugins,['expo-router']);
    process.env.EXPO_PUBLIC_WEB_SESSION_MODE='cookie';
    const website=configure({config});
    assert.equal(website.experiments.baseUrl,'/app');
    assert.equal(website.web.output,'single');
    assert.deepEqual(website.extra,config.extra);
    assert.deepEqual(website.android,native.android);
    assert.equal(website.web.favicon,'./assets/brand/favicon.png');
    assert.equal(config.web.favicon,'./assets/favicon.png');
  }finally{if(previous===undefined)delete process.env.EXPO_PUBLIC_WEB_SESSION_MODE;else process.env.EXPO_PUBLIC_WEB_SESSION_MODE=previous;}
});
