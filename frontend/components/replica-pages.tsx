'use client';
import {UiText,UiNav} from "./localized-ui";
import {useLanguage} from './language-provider';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';

import {api,money,date} from '@/lib/api';
import type {User,RequestRecord,Payment} from '@/lib/types';
import {useUser} from './customer';
import {useCustomerLocation} from './customer-location';
import {Notice} from './ui';
export function ReplicaAccount(){
 const {copy,t}=useLanguage();
  const {user,loading,error}=useUser();const router=useRouter();const location=useCustomerLocation();const [failure,setFailure]=useState('');
  async function logout(){try{await api('/auth/logout',{method:'POST'});location.syncIdentity(null);router.refresh();window.location.assign('/account');}catch(e){setFailure((e as Error).message);}}
  const roleLabel=user?.role==='ADMIN'?'Administrator':user?.seller_enabled?'Seller & Customer':'Customer';
  return <div className="container page replica-page"><h1><UiText value={copy.account.title}/></h1>{loading?<p><UiText value={copy.common.loading}/></p>:user?<div className="panel"><h2>{user.name}</h2><p>{user.email} · <UiText value={roleLabel}/></p><button className="button secondary" onClick={()=>void logout()}><UiText value={copy.account.signOut}/></button></div>:<><p><UiText value={copy.account.intro}/></p><Link className="button" href="/login"><UiText value={copy.account.signIn}/></Link></>}{(failure||error)&&<Notice error message={failure||error}/>}<UiNav  aria-label="Account navigation" className="account-categories"><section className="account-category"><h2><UiText value={"My Account & Activity"}/></h2><p><UiText value={"Profile, requests, orders, membership and preferences"}/></p><div className="replica-actions">{user&&<><Link href="/account/profile"><UiText value={copy.account.profile}/></Link><Link href="/account/requests"><UiText value={copy.nav.requests}/></Link></>}<Link href="/commerce/cart">{t('account.cart')}</Link>{user&&<Link href="/commerce/orders">{t('account.orders')}</Link>}<Link href="/membership"><UiText value={copy.account.membership}/></Link>{user&&<Link href="/account/payments"><UiText value={copy.account.history}/></Link>}<Link href="/account/settings">{t('settings.title')}</Link></div></section><section className="account-category"><h2><UiText value={"Seller & Business Tools"}/></h2><p><UiText value={"Manage businesses, service listings, V Ads and job postings"}/></p><div className="replica-actions">{user&&<><Link href="/seller"><UiText value={copy.account.seller}/></Link><Link href="/seller/v-ads"><UiText value={"V Ads Studio"}/></Link><Link href="/services"><UiText value={"+ Add services"}/></Link></>}{!user&&<Link href="/seller/v-ads"><UiText value={"V Ads Studio"}/></Link>}<Link href="/app/employer-jobs">{t('account.jobs')}</Link></div></section>{user?.role==='ADMIN'&&<section className="account-category"><h2><UiText value={"Administration"}/></h2><p><UiText value={"Platform operations, approvals and oversight"}/></p><div className="replica-actions"><Link href="/admin"><UiText value={copy.account.admin}/></Link></div></section>}</UiNav></div>;
}
export function ReplicaRequests(){const {copy}=useLanguage();
  const {user,loading,error}=useUser();const [result,setResult]=useState<{userId:number;data?:RequestRecord[];error?:string}>();
  useEffect(()=>{let active=true;if(user)api<RequestRecord[]>('/me/requests').then(data=>{if(active)setResult({userId:user.id,data});}).catch(e=>{if(active)setResult({userId:user.id,error:e.message});});return()=>{active=false;};},[user]);
  const current=result?.userId===user?.id?result:undefined;
  return <div className="container page replica-page"><h1><UiText value={copy.requests.title}/></h1>{loading?<p><UiText value={copy.common.loading}/></p>:error?<Notice error message={error}/>:!user?<><p><UiText value={copy.requests.signIn}/></p><Link className="button" href="/login?next=/account/requests"><UiText value={copy.auth.signIn}/></Link></>:current?.error?<Notice error message={current.error}/>:!current?.data?<p><UiText value={copy.common.loading}/></p>:current.data.length?current.data.map(item=><article className="panel" key={item.id}><h2>{item.service_title}</h2><p className="small-label">{item.status.replaceAll('_',' ')}</p><p>{item.requirements}</p><small>{item.location} · {date(item.created_at)}</small></article>):<><p><UiText value={copy.requests.empty}/></p><Link className="button" href="/services"><UiText value={copy.requests.explore}/></Link></>}</div>;
}
export function ReplicaProfile(){const {copy}=useLanguage();
  const {user,loading,error}=useUser();return <div className="container page replica-page">{loading?<p><UiText value={copy.common.loading}/></p>:error?<Notice error message={error}/>:user?<ProfileForm key={user.id} user={user}/>:<><h1><UiText value={copy.profile.title}/></h1><Link className="button" href="/login?next=/account/profile"><UiText value={copy.auth.signIn}/></Link></>}</div>;
}
function ProfileForm({user}:{user:User}){const {copy}=useLanguage();
 const [error,setError]=useState(''),[saved,setSaved]=useState(false),[busy,setBusy]=useState(false);
 async function save(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);setBusy(true);setSaved(false);setError('');try{await api('/me',{method:'PATCH',body:JSON.stringify({name:form.get('name'),phone:form.get('phone')})});setSaved(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <><h1><UiText value={copy.profile.title}/></h1><p>{user.email}</p>{error&&<Notice error message={error}/>}<form className="form" onSubmit={save}><label><UiText value={copy.auth.name}/><input name="name" defaultValue={user.name} minLength={2} maxLength={100} required/></label><label><UiText value={copy.profile.phone}/><input name="phone" type="tel" defaultValue={user.phone} maxLength={20}/></label><button className="button" disabled={busy}>{busy?copy.profile.saving:copy.profile.save}</button></form>{saved&&<p role="status"><UiText value={copy.profile.saved}/></p>}</>;
}
export {BusinessMembershipPage as ReplicaMembership} from './business-membership';
export function ReplicaPayments(){const {copy}=useLanguage();
 const {user,loading,error}=useUser();const [result,setResult]=useState<{id:number;rows?:Payment[];error?:string}>();useEffect(()=>{let active=true;if(user)api<Payment[]>('/me/payments').then(rows=>{if(active)setResult({id:user.id,rows});}).catch(e=>{if(active)setResult({id:user.id,error:e.message});});return()=>{active=false;};},[user]);const current=result?.id===user?.id?result:undefined;
 return <div className="container page replica-page"><h1><UiText value={copy.account.history}/></h1><p><UiText value={"Membership transactions in sandbox mode. Service purchases are not collected through this version."}/></p>{loading?<p><UiText value={copy.common.loading}/></p>:error||current?.error?<Notice error message={error||current?.error||''}/>:!user?<Link className="button" href="/login"><UiText value={copy.auth.signIn}/></Link>:!current?.rows?<p><UiText value={copy.common.loading}/></p>:current.rows.length?current.rows.map(payment=><article className="panel" key={payment.id}><h2>{payment.title||'Membership'}</h2><p>{money(payment.amount)} · {payment.status.replaceAll('_',' ')}</p><small>{date(payment.created_at)} · {payment.id}</small></article>):<p><UiText value={"No payments yet. Your membership transaction history will appear here."}/></p>}</div>;
}

