import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,expect,it,vi} from 'vitest';
const session=vi.hoisted(()=>({snapshot:{loading:false,error:'',user:null as null|{seller_enabled:boolean;isSeller?:boolean;roles?:string[];name?:string}}}));
vi.mock('@/components/customer',()=>({
  useUser:()=>session.snapshot,
  notifyUserSession:vi.fn(),
}));
vi.mock('@/components/ui',()=>({Notice:({message}:{message:string})=>React.createElement('p',{role:'alert'},message)}));
vi.mock('@/components/customer-location',()=>({useCustomerLocation:()=>({syncIdentity:vi.fn()})}));
vi.mock('next/navigation',()=>({
  usePathname:()=>'/services',
  useRouter:()=>({push:vi.fn(),refresh:vi.fn()}),
  redirect:(path:string)=>{throw new Error('REDIRECT:'+path);},
}));
import {SellerAuth,SellerEntry} from '../components/seller-auth';
const render=(props:{register?:boolean;nextPath?:string}={})=>renderToStaticMarkup(React.createElement(SellerAuth,props));
beforeEach(()=>{session.snapshot={loading:false,error:'',user:null};});

it('redirects unauthenticated visitors to unified login or register with /seller/onboard return path',()=>{
  expect(()=>render()).toThrow('REDIRECT:/login?next=%2Fseller%2Fonboard');
  expect(()=>render({register:true})).toThrow('REDIRECT:/register?next=%2Fseller%2Fonboard');
  expect(()=>render({nextPath:'/seller/v-ads'})).toThrow('REDIRECT:/login?next=%2Fseller%2Fv-ads');
});
it('waits for session restoration before showing onboarding or redirecting',()=>{
  session.snapshot={loading:true,error:'',user:{seller_enabled:true,isSeller:true}};
  expect(render()).toContain('role="status"');
});
it('grants immediate access when the unified session has seller capability and normalizes legacy /provide-service to /seller/onboard',()=>{
  session.snapshot.user={seller_enabled:true,isSeller:true,roles:['user','seller']};
  for(const register of [false,true]){
    expect(()=>render({register,nextPath:'/provide-service'})).toThrow('REDIRECT:/seller/onboard');
    expect(()=>render({register,nextPath:'/services'})).toThrow('REDIRECT:/services');
  }
});
it('redirects signed-in non-sellers directly to /seller/onboard instead of legacy setup tabs',()=>{
  session.snapshot.user={seller_enabled:false,isSeller:false,roles:['user']};
  expect(()=>render()).toThrow('REDIRECT:/seller/onboard');
  expect(()=>render({nextPath:'/seller/onboard?category=food-and-dining&type=restaurant'})).toThrow('REDIRECT:/seller/onboard?category=food-and-dining&type=restaurant');
});
it('retains the safe return-destination boundary for existing sessions',()=>{
  session.snapshot.user={seller_enabled:true,isSeller:true};
  for(const nextPath of ['/admin','https://example.test','//example.test'])expect(()=>render({nextPath})).toThrow('REDIRECT:/seller/onboard');
});
it('reports a session-check failure instead of redirecting to login',()=>{
  session.snapshot.error='Unable to check session';
  expect(render()).toContain('role="alert"');
});

it('shows a noninteractive seller greeting when signed in as seller',()=>{
  session.snapshot.user={seller_enabled:true,isSeller:true,name:'Sample Seller'};
  for(const secondary of [false,true]){
    const html=renderToStaticMarkup(React.createElement(SellerEntry,{secondary}));
    expect(html).toContain('Welcome, Sample Seller');
    expect(html).not.toContain('href=');
    expect(html).not.toContain('<button');
  }
});
it('routes guests to unified login with next=/seller/onboard and signed-in non-sellers directly to /seller/onboard',()=>{
  session.snapshot.user=null;
  const guestHtml=renderToStaticMarkup(React.createElement(SellerEntry));
  expect(guestHtml).toContain('Sign in to offer services');
  expect(guestHtml).toContain('/login?next=%2Fseller%2Fonboard');

  session.snapshot.user={seller_enabled:false,isSeller:false,name:'Customer'};
  const customerHtml=renderToStaticMarkup(React.createElement(SellerEntry));
  expect(customerHtml).toContain('List your business');
  expect(customerHtml).toContain('href="/seller/onboard"');
});
it('avoids showing sign-in while restoring the unified session',()=>{
  session.snapshot.loading=true;
  const html=renderToStaticMarkup(React.createElement(SellerEntry));
  expect(html).toContain('Checking account...');
});
it('removes duplicate seller logout from the footer',()=>{
  session.snapshot.user={seller_enabled:true,isSeller:true,name:'Sample Seller'};
  expect(renderToStaticMarkup(React.createElement(SellerEntry,{footer:true,secondary:true}))).toBe('');
});
