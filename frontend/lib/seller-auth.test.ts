import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,expect,it,vi} from 'vitest';
const session=vi.hoisted(()=>({snapshot:{loading:false,error:'',user:null as null|{seller_enabled:boolean;name?:string}}}));
vi.mock('@/components/customer',()=>({
  useUser:()=>session.snapshot,
  AuthForm:({seller,register}:{seller:boolean;register:boolean})=>React.createElement('div',{'data-seller':String(seller)},register?'seller-signup':'seller-login'),
}));
vi.mock('@/components/ui',()=>({Notice:({message}:{message:string})=>React.createElement('p',{role:'alert'},message)}));
vi.mock('@/components/customer-location',()=>({useCustomerLocation:()=>({syncIdentity:vi.fn()})}));
vi.mock('next/navigation',()=>({usePathname:()=>'/services',redirect:(path:string)=>{throw new Error('REDIRECT:'+path);}}));
import {SellerAuth,SellerEntry} from '../components/seller-auth';
const render=(props:{register?:boolean;nextPath?:string}={})=>renderToStaticMarkup(React.createElement(SellerAuth,props));
beforeEach(()=>{session.snapshot={loading:false,error:'',user:null};});

it('shows seller login or signup when there is no active session',()=>{
  expect(render()).toContain('seller-login');
  expect(render({register:true})).toContain('seller-signup');
  expect(render()).toContain('data-seller="true"');
});
it('waits for session restoration before showing a form or redirecting',()=>{
  session.snapshot={loading:true,error:'',user:{seller_enabled:true}};
  expect(render()).toContain('role="status"');
  expect(render()).not.toContain('seller-login');
});
it('reuses an active seller session for both login and signup return visits',()=>{
  session.snapshot.user={seller_enabled:true};
  for(const register of [false,true]){expect(()=>render({register,nextPath:'/provide-service'})).toThrow('REDIRECT:/provide-service');expect(()=>render({register,nextPath:'/services'})).toThrow('REDIRECT:/services');}
});
it('does not bypass seller login for an ordinary customer session',()=>{
  session.snapshot.user={seller_enabled:false};
  expect(render()).toContain('seller-login');
});
it('retains the safe return-destination boundary for existing sessions',()=>{
  session.snapshot.user={seller_enabled:true};
  for(const nextPath of ['/admin','https://example.test','//example.test'])expect(()=>render({nextPath})).toThrow('REDIRECT:/seller');
});
it('reports a session-check failure instead of presenting signup as a recovery action',()=>{
  session.snapshot.error='Unable to check session';
  expect(render()).toContain('role="alert"');
  expect(render()).not.toContain('seller-signup');
});

it('shows a noninteractive seller greeting at both entry placements',()=>{
  session.snapshot.user={seller_enabled:true,name:'Sample Seller'};
  for(const secondary of [false,true]){
    const html=renderToStaticMarkup(React.createElement(SellerEntry,{secondary}));
    expect(html).toContain('Welcome, Sample Seller');
    expect(html).not.toContain('href=');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('Login/Signup as seller');
  }
});
it('shows seller login for guests and ordinary customers',()=>{
  for(const user of [null,{seller_enabled:false,name:'Customer'}]){
    session.snapshot.user=user;
    const html=renderToStaticMarkup(React.createElement(SellerEntry));
    expect(html).toContain('Login/Signup as seller');
    expect(html).toContain('/seller/register?next=%2Fservices');
  }
});
it('avoids showing signup while restoring the seller session',()=>{
  session.snapshot.loading=true;
  const html=renderToStaticMarkup(React.createElement(SellerEntry));
  expect(html).toContain('Checking seller session...');
  expect(html).not.toContain('Login/Signup as seller');
});

it('shows logout in the footer only for a signed-in seller',()=>{
  session.snapshot.user={seller_enabled:true,name:'Sample Seller'};
  const html=renderToStaticMarkup(React.createElement(SellerEntry,{footer:true,secondary:true}));
  expect(html).toContain('Logout as seller');
  expect(html).toContain('<button');
  expect(html).not.toContain('Welcome,');
  session.snapshot.user=null;
  expect(renderToStaticMarkup(React.createElement(SellerEntry,{footer:true}))).not.toContain('Logout as seller');
});
