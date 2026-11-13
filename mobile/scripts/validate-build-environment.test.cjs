const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateBuildEnvironment:validate}=require('./validate-build-environment.cjs');
const profiles=require('../eas.json').build;
const testEnv={EAS_BUILD_PROFILE:'preview',...profiles.preview.env};
const live={EAS_BUILD_PROFILE:'production',EXPO_PUBLIC_APP_ENV:'production',EXPO_PUBLIC_API_URL:'https://api.live.company.com',EXPO_PUBLIC_WEB_URL:'https://live.company.com',EXPO_PUBLIC_ADMIN_URL:'https://admin.live.company.com'};
test('development stays local; preview and AWS test profiles use test origins',()=>{
  validate({});validate({EAS_BUILD_PROFILE:'development',EXPO_PUBLIC_API_URL:'http://10.0.2.2:8100'});
  validate(testEnv);validate({...testEnv,EAS_BUILD_PROFILE:'aws-test',...profiles['aws-test'].env});
});
test('test builds reject laptop URLs, production origins and cookie transport',()=>{
  for(const url of ['http://localhost:8100','https://192.168.1.2','http://10.0.2.2:8100',live.EXPO_PUBLIC_API_URL])assert.throws(()=>validate({...testEnv,EXPO_PUBLIC_API_URL:url}));
  assert.throws(()=>validate({...testEnv,EXPO_PUBLIC_WEB_SESSION_MODE:'cookie'}));
});
test('store profile requires explicit separate public live endpoints',()=>{
  assert.equal(profiles.production.distribution,'store');validate(live);
  assert.throws(()=>validate({EAS_BUILD_PROFILE:'production',...profiles.production.env}));
  for(const key of ['API','WEB','ADMIN'])assert.throws(()=>validate({...live,[`EXPO_PUBLIC_${key}_URL`]:testEnv[`EXPO_PUBLIC_${key}_URL`]}));
  for(const url of ['https://127.0.0.1','https://[::1]','https://laptop.local','https://api.example','https://www.vistrah.in','https://user:secret@host.com','https://host.com/path'])assert.throws(()=>validate({...live,EXPO_PUBLIC_API_URL:url}));
});
test('profile/environment mismatch and unknown release profile fail closed',()=>{
  assert.throws(()=>validate({...live,EXPO_PUBLIC_APP_ENV:'testing'}));
  assert.throws(()=>validate({...live,EAS_BUILD_PROFILE:'other'}));
});
