'use client';
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
  return <div className="container page replica-page"><h1>{copy.account.title}</h1>{loading?<p>{copy.common.loading}</p>:user?<div className="panel"><h2>{user.name}</h2><p>{user.email}</p><button className="button secondary" onClick={()=>void logout()}>{copy.account.signOut}</button></div>:<><p>{copy.account.intro}</p><Link className="button" href="/login">{copy.account.signIn}</Link></>}{(failure||error)&&<Notice error message={failure||error}/>}<div className="replica-actions"><Link href="/membership">{copy.account.membership}</Link><Link href="/provider">{copy.account.provider}</Link><Link href="/app/employer-jobs">{t('account.jobs')}</Link>{user&&<><Link href="/account/profile">{copy.account.profile}</Link><Link href="/account/requests">{copy.nav.requests}</Link><Link href="/account/payments">{copy.account.history}</Link><Link href="/account/finds">{copy.account.finds}</Link><Link href="/account/provider-applications">{copy.account.applications}</Link><Link href="/seller">{copy.account.seller}</Link></>}<Link href="/account/settings">{t('settings.title')}</Link><Link href="/discover-more">{copy.account.discovery}</Link></div></div>;
}
export function ReplicaRequests(){const {copy}=useLanguage();
  const {user,loading,error}=useUser();const [result,setResult]=useState<{userId:number;data?:RequestRecord[];error?:string}>();
  useEffect(()=>{let active=true;if(user)api<RequestRecord[]>('/me/requests').then(data=>{if(active)setResult({userId:user.id,data});}).catch(e=>{if(active)setResult({userId:user.id,error:e.message});});return()=>{active=false;};},[user]);
  const current=result?.userId===user?.id?result:undefined;
  return <div className="container page replica-page"><h1>{copy.requests.title}</h1>{loading?<p>{copy.common.loading}</p>:error?<Notice error message={error}/>:!user?<><p>{copy.requests.signIn}</p><Link className="button" href="/login?next=/account/requests">{copy.auth.signIn}</Link></>:current?.error?<Notice error message={current.error}/>:!current?.data?<p>{copy.common.loading}</p>:current.data.length?current.data.map(item=><article className="panel" key={item.id}><h2>{item.service_title}</h2><p className="small-label">{item.status.replaceAll('_',' ')}</p><p>{item.requirements}</p><small>{item.location} · {date(item.created_at)}</small></article>):<><p>{copy.requests.empty}</p><Link className="button" href="/services">{copy.requests.explore}</Link></>}</div>;
}
export function ReplicaProfile(){
  const {user,loading,error}=useUser();return <div className="container page replica-page">{loading?<p>{copy.common.loading}</p>:error?<Notice error message={error}/>:user?<ProfileForm key={user.id} user={user}/>:<><h1>{copy.profile.title}</h1><Link className="button" href="/login?next=/account/profile">{copy.auth.signIn}</Link></>}</div>;
}
function ProfileForm({user}:{user:User}){const {copy}=useLanguage();
 const [error,setError]=useState(''),[saved,setSaved]=useState(false),[busy,setBusy]=useState(false);
 async function save(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);setBusy(true);setSaved(false);setError('');try{await api('/me',{method:'PATCH',body:JSON.stringify({name:form.get('name'),phone:form.get('phone')})});setSaved(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <><h1>{copy.profile.title}</h1><p>{user.email}</p>{error&&<Notice error message={error}/>}<form className="form" onSubmit={save}><label>{copy.auth.name}<input name="name" defaultValue={user.name} minLength={2} maxLength={100} required/></label><label>{copy.profile.phone}<input name="phone" type="tel" defaultValue={user.phone} maxLength={20}/></label><button className="button" disabled={busy}>{busy?copy.profile.saving:copy.profile.save}</button></form>{saved&&<p role="status">{copy.profile.saved}</p>}</>;
}
export {BusinessMembershipPage as ReplicaMembership} from './business-membership';
export function ReplicaPayments(){const {copy}=useLanguage();
 const {user,loading,error}=useUser();const [result,setResult]=useState<{id:number;rows?:Payment[];error?:string}>();useEffect(()=>{let active=true;if(user)api<Payment[]>('/me/payments').then(rows=>{if(active)setResult({id:user.id,rows});}).catch(e=>{if(active)setResult({id:user.id,error:e.message});});return()=>{active=false;};},[user]);const current=result?.id===user?.id?result:undefined;
 return <div className="container page replica-page"><h1>{copy.account.history}</h1><p>Membership transactions in sandbox mode. Service purchases are not collected through this version.</p>{loading?<p>{copy.common.loading}</p>:error||current?.error?<Notice error message={error||current?.error||''}/>:!user?<Link className="button" href="/login">{copy.auth.signIn}</Link>:!current?.rows?<p>{copy.common.loading}</p>:current.rows.length?current.rows.map(payment=><article className="panel" key={payment.id}><h2>{payment.title||'Membership'}</h2><p>{money(payment.amount)} · {payment.status.replaceAll('_',' ')}</p><small>{date(payment.created_at)} · {payment.id}</small></article>):<p>No payments yet. Your membership transaction history will appear here.</p>}</div>;
}

