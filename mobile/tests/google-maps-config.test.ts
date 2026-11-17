import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {GOOGLE_WORDMARK_PATHS,GOOGLE_WORDMARK_VIEWBOX,googleWordmarkDimensions} from '../../shared/google-attribution.ts';
const configure=createRequire(import.meta.url)('../app.config.js');

test('Android map activation fails closed and configures only restricted native key',()=>{
 const config={extra:{eas:{projectId:'fixture'}},plugins:['expo-router'],android:{package:'in.vistrah.app',config:{googleMaps:{apiKey:'${EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY}'}}}};
 const enabled=process.env.EXPO_PUBLIC_GOOGLE_MAPS_ENABLED,key=process.env.GOOGLE_MAPS_ANDROID_API_KEY,pubKey=process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY;
 try{
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ENABLED='1';delete process.env.GOOGLE_MAPS_ANDROID_API_KEY;delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY;
  assert.throws(()=>configure({config}),/GOOGLE_MAPS_ANDROID_API_KEY/);
  delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_ENABLED;
  const fallbackResult=configure({config});
  assert.equal(fallbackResult.android.config,undefined);
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY='fixture-expo-android-key';
  const result=configure({config});
  assert.deepEqual(result.plugins.find(p=>Array.isArray(p)&&p[0]==='react-native-maps'),['react-native-maps',{androidGoogleMapsApiKey:'fixture-expo-android-key'}]);
  assert.equal(result.android.config.googleMaps.apiKey,'fixture-expo-android-key');
  assert.equal(result.android.package,'in.vistrah.app');
  assert.equal(result.extra.eas.projectId,'fixture');
 }finally{
  if(enabled===undefined)delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_ENABLED;else process.env.EXPO_PUBLIC_GOOGLE_MAPS_ENABLED=enabled;
  if(key===undefined)delete process.env.GOOGLE_MAPS_ANDROID_API_KEY;else process.env.GOOGLE_MAPS_ANDROID_API_KEY=key;
  if(pubKey===undefined)delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY;else process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY=pubKey;
 }
});

test('Google Maps attribution assets, Powered by Google autocomplete footer, and unobstructed logo padding are enforced on mobile',()=>{
 assert.equal(GOOGLE_WORDMARK_VIEWBOX,'0 0 74 24');
 assert.equal(GOOGLE_WORDMARK_PATHS.length,6);
 assert.deepEqual(googleWordmarkDimensions(24),{width:74,height:24});
 const colorPng=readFileSync(new URL('../assets/google/google-wordmark-color.png',import.meta.url));
 const whitePng=readFileSync(new URL('../assets/google/google-wordmark-white.png',import.meta.url));
 assert.ok(colorPng.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])));
 assert.ok(whitePng.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])));
 const pickerSource=readFileSync(new URL('../src/components/map-first-location-picker.tsx',import.meta.url),'utf8');
 assert.ok(pickerSource.includes('<MobilePoweredByGoogle'));
 assert.ok(pickerSource.includes('bottom:38'));
 const mapSource=readFileSync(new URL('../src/components/vistrah-mobile-map.tsx',import.meta.url),'utf8');
 assert.ok(mapSource.includes('mapPadding='));
 assert.ok(mapSource.includes('<MobileGoogleLogoBadge'));
});
