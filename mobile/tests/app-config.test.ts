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
    assert(native.plugins.includes('expo-video'));
    assert.deepEqual(native.plugins.find(plugin=>Array.isArray(plugin)&&plugin[0]==='expo-splash-screen'),['expo-splash-screen',{image:'./assets/brand/lockup-light.png',imageWidth:240,resizeMode:'contain',backgroundColor:'#f7f7f8'}]);
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

test('OTA uses existing project, native fingerprint compatibility and background launch checks',()=>{
 const config={extra:{eas:{projectId:'fixture-project'}},plugins:['expo-router'],android:{package:'in.vistrah.app'}};
 const result=configure({config});
 assert.equal(result.updates.url,'https://u.expo.dev/fixture-project');
 assert.equal(result.updates.checkAutomatically,'ON_LOAD');
 assert.equal(result.updates.fallbackToCacheTimeout,0);
 assert.deepEqual(result.runtimeVersion,{policy:'fingerprint'});
 assert.deepEqual(result.extra,config.extra);
 assert.equal(result.android.package,'in.vistrah.app');
 assert.equal('updates' in config,false);
 assert.throws(()=>configure({config:{plugins:[]}}),/existing EAS project linkage/);
});

test('OTA channels separate AWS test and store builds without changing endpoints',()=>{
 const eas=createRequire(import.meta.url)('../eas.json');
 assert.equal(eas.build['aws-test'].channel,'aws-test');
 assert.equal(eas.build.preview.channel,'preview');
 assert.equal(eas.build.production.channel,'production');
 assert.equal(eas.build['aws-test'].environment,'preview');
 assert.equal(eas.build.production.environment,'production');
 assert.equal(eas.build['aws-test'].env.EXPO_PUBLIC_API_URL,'https://api.vistrah.in');
 assert.equal(eas.build.production.env.EXPO_PUBLIC_API_URL,undefined);
});
