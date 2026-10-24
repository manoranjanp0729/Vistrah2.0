import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {appRouteIdentity,backFallback} from '../src/lib/navigation-policy.ts';

const {StackRouter}=createRequire(import.meta.url)('../node_modules/expo-router/build/react-navigation/routers/StackRouter.js');
const names=['(tabs)','marketing-solutions','marketing-services/[slug]','marketing-pricing/index','marketing-pricing/[id]','service/[id]','request/[id]','seller/index','seller/commerce/[id]','auth','forgot-password','settings'];
function journey(){
 const stack=StackRouter({initialRouteName:'(tabs)'});
 const options={routeNames:names,routeParamList:{},routeGetIdList:Object.fromEntries(names.map(name=>[name,({params}:{params?:Record<string,unknown>})=>appRouteIdentity(name,params)]))};
 let state=stack.getInitialState(options);
 return {
  go:(name:string,params:Record<string,unknown>={},type='PUSH')=>{state=stack.getStateForAction(state,{type,payload:{name,params}},options);assert.ok(state);},
  back:()=>{state=stack.getStateForAction(state,{type:'GO_BACK'},options);assert.ok(state);},
  routes:()=>state.routes,
  current:()=>state.routes[state.index],
 };
}

test('repeated opens deduplicate all root screen types without conflating different IDs',()=>{
 const nav=journey();
 for(const name of names.slice(1)){
  nav.go(name,{id:7});const count=nav.routes().length;
  nav.go(name,{id:'7'});assert.equal(nav.routes().length,count,name);
 }
 nav.go('service/[id]',{id:8});assert.equal(nav.current().params.id,8);
 assert.equal(nav.routes().filter((route:{name:string})=>route.name==='service/[id]').length,2);
});

test('marketing/pricing returns pop the existing parent and forward opens once',()=>{
 const nav=journey();
 nav.go('marketing-solutions');nav.go('marketing-services/[slug]',{slug:'digital-marketing'});
 nav.go('marketing-pricing/index');nav.go('marketing-pricing/[id]',{id:'websites'});
 nav.go('marketing-pricing/index',{},'POP_TO');assert.equal(nav.routes().length,4);
 nav.go('marketing-solutions',{},'POP_TO');assert.equal(nav.routes().length,2);
 nav.go('marketing-pricing/index');nav.go('marketing-pricing/index');nav.back();
 assert.equal(nav.current().name,'marketing-solutions');
});

test('seller and recovery return actions do not leave duplicate parent screens',()=>{
 const nav=journey();
 nav.go('seller/index');nav.go('seller/commerce/[id]',{id:42});
 nav.go('seller/index',{},'POP_TO');assert.equal(nav.routes().length,2);
 nav.go('auth');nav.go('forgot-password');nav.go('auth',{},'POP_TO');
 nav.back();assert.equal(nav.current().name,'seller/index');
});

test('tabs keep one root identity while retaining destination params',()=>{
 const nav=journey();nav.go('service/[id]',{id:9});
 nav.go('(tabs)',{screen:'account'},'POP_TO');
 assert.equal(nav.routes().length,1);assert.equal(nav.current().params.screen,'account');
 assert.equal(appRouteIdentity('(tabs)',{screen:'services'}),appRouteIdentity('(tabs)',{screen:'account'}));
});

test('query identity preserves package, intent and auth return targets with stable param order',()=>{
 assert.equal(appRouteIdentity('detail',{id:1,package:'basic'}),appRouteIdentity('detail',{package:'basic',id:'1',__internal__PreviewKey:'x'}));
 for(const key of ['package','intent','next','focus'])assert.notEqual(appRouteIdentity('detail',{[key]:'first'}),appRouteIdentity('detail',{[key]:'second'}));
 assert.notEqual(appRouteIdentity('detail',{tag:['a','b']}),appRouteIdentity('detail',{tag:['b','a']}));
});

test('direct links have logical Back fallbacks across the app',()=>{
 const cases=[
  ['/app/marketing-pricing/websites','/marketing-pricing'],
  ['/marketing-pricing','/marketing-solutions'],
  ['/marketing-services/digital-marketing','/marketing-solutions'],
  ['/seller/commerce/42','/seller'],['/seller/orders/42','/seller'],
  ['/provider-applications/42','/provider-applications'],['/finds/42','/finds'],
  ['/request/42','/service/42'],['/estimate/42','/service/42'],
  ['/commerce/42','/commerce'],['/commerce/cart','/commerce'],
  ['/service/42','/services'],['/category/home','/services'],
  ['/profile','/account'],['/membership','/account'],['/checkout','/membership'],
  ['/forgot-password','/auth'],['/reset-password','/auth'],['/advertiser-profile','/v-ads'],
 ];
 for(const [path,parent] of cases)assert.equal(backFallback(path),parent,path);
 assert.equal(backFallback('/seller/add-service',{category:'pet-care',subcategory:'dog-care',type:'dog-walking'}),'/services?category=pet-care&subcategory=dog-care&type=dog-walking');
});
