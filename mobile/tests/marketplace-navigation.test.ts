import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {servicesNavigationAction,servicesSelectionKey} from '../src/lib/marketplace-navigation.ts';
import type {MarketplaceSelection} from '../../shared/marketplace.ts';

// Exercise the installed Expo stack router, including its route identity/pop behavior.
const {StackRouter}=createRequire(import.meta.url)('../node_modules/expo-router/build/react-navigation/routers/StackRouter.js');
const category={category:'pet-care'};
const subcategory={...category,subcategory:'dog-care'};
const listing={...subcategory,type:'dog-walking'};
function journey(initial:MarketplaceSelection={}){
 const stack=StackRouter({initialRouteName:'index'});
 const options={routeNames:['index'],routeParamList:{},routeGetIdList:{index:({params}:{params:Record<string,unknown>})=>servicesSelectionKey(params)}};
 let state=stack.getInitialState(options);
 state={...state,routes:[{...state.routes[0],params:initial}]};
 function open(target:MarketplaceSelection){
  const current=state.routes[state.index].params??{};
  const action=servicesNavigationAction(current,target);
  if(action!=='none')state=stack.getStateForAction(state,{type:action==='dismissTo'?'POP_TO':'PUSH',payload:{name:'index',params:target}},options);
 }
 return {open,back:()=>{state=stack.getStateForAction(state,{type:'GO_BACK'},options);},routes:()=>state.routes.map((route:{params:MarketplaceSelection})=>route.params),current:()=>state.routes[state.index].params};
}

test('each discovery level has its own identity; irrelevant params do not create duplicates',()=>{
 assert.equal(servicesSelectionKey({}),servicesSelectionKey({category:undefined,ignored:'value'}));
 assert.equal(new Set([{},category,subcategory,listing].map(servicesSelectionKey)).size,4);
 assert.notEqual(servicesSelectionKey(category),servicesSelectionKey({...category,q:'walking'}));
});

test('up/back controls pop to existing ancestors instead of pushing repeated pages',()=>{
 const nav=journey();
 nav.open(category);nav.open(subcategory);nav.open(listing);
 assert.equal(nav.routes().length,4);
 nav.open(subcategory);assert.deepEqual(nav.routes(),[{},category,subcategory]);
 nav.open(category);assert.deepEqual(nav.routes(),[{},category]);
 nav.open({});assert.deepEqual(nav.routes(),[{}]);
});

test('forward after going up and repeated taps keep a single copy of each step',()=>{
 const nav=journey();
 nav.open(category);nav.open(category);nav.open(subcategory);nav.open(listing);
 nav.open(category);nav.open(subcategory);nav.open(listing);nav.open(listing);
 assert.deepEqual(nav.routes(),[{},category,subcategory,listing]);
 nav.back();assert.deepEqual(nav.current(),subcategory);
 nav.back();assert.deepEqual(nav.current(),category);
});

test('direct-link ancestors replace the current step when no earlier ancestor exists',()=>{
 const nav=journey(listing);
 nav.open(subcategory);assert.deepEqual(nav.routes(),[subcategory]);
 nav.open(category);nav.open({});assert.deepEqual(nav.routes(),[{}]);
});

test('switching branches stays forward navigation; returning to root clears search',()=>{
 assert.equal(servicesNavigationAction(subcategory,{category:'home-care'}),'push');
 const nav=journey({q:'walking'});
 nav.open(listing);nav.open({});assert.deepEqual(nav.current(),{});
 assert.equal(servicesNavigationAction({q:'walking'},{}),'dismissTo');
});
