import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const configure=createRequire(import.meta.url)('../app.config.js');

test('Android map activation fails closed and configures only restricted native key',()=>{
 const config={extra:{eas:{projectId:'fixture'}},plugins:['expo-router'],android:{package:'in.vistrah.app'}};
 const enabled=process.env.EXPO_PUBLIC_GOOGLE_MAPS_ENABLED,key=process.env.GOOGLE_MAPS_ANDROID_API_KEY;
 try{
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ENABLED='1';delete process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  assert.throws(()=>configure({config}),/GOOGLE_MAPS_ANDROID_API_KEY/);
  process.env.GOOGLE_MAPS_ANDROID_API_KEY='fixture-restricted-key';
  const result=configure({config});
  assert.deepEqual(result.plugins.find(p=>Array.isArray(p)&&p[0]==='react-native-maps'),['react-native-maps',{androidGoogleMapsApiKey:'fixture-restricted-key'}]);
  assert.equal(result.android.package,'in.vistrah.app');
  assert.equal(result.extra.eas.projectId,'fixture');
 }finally{
  if(enabled===undefined)delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_ENABLED;else process.env.EXPO_PUBLIC_GOOGLE_MAPS_ENABLED=enabled;
  if(key===undefined)delete process.env.GOOGLE_MAPS_ANDROID_API_KEY;else process.env.GOOGLE_MAPS_ANDROID_API_KEY=key;
 }
});
