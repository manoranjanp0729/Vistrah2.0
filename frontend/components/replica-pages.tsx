'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import copy from '@/lib/interface-copy.json';
import {api,money,date} from '@/lib/api';
import {safeDestination,destinationLink} from '@/lib/destinations';
import type {User,RequestRecord,Membership,Payment,Offer} from '@/lib/types';
import {useUser} from './customer';
import {useCustomerLocation} from './customer-location';
import {Notice} from './ui';
export function ReplicaAccount(){
  const {user,loading,error}=useUser();const router=useRouter();const location=useCustomerLocation();const [failure,setFailure]=useState('');
  async function logout(){try{await api('/auth/logout',{method:'POST'});location.syncIdentity(null);router.refresh();window.location.assign('/account');}catch(e){setFailure((e as Error).message);}}
  return <div className="container page replica-page"><h1>{copy.account.title}</h1>{loading?<p>{copy.common.loading}</p>:user?<div className="panel"><h2>{user.name}</h2><p>{user.email}</p><button className="button secondary" onClick={()=>void logout()}>{copy.account.signOut}</button></div>:<><p>{copy.account.intro}</p><Link className="button" href="/login">{copy.account.signIn}</Link></>}{(failure||error)&&<Notice error message={failure||error}/>}<div className="replica-actions"><Link href="/membership">{copy.account.membership}</Link><Link href="/provider">{copy.account.provider}</Link><Link href="/location">{copy.account.location}</Link>{user&&<><Link href="/account/profile">{copy.account.profile}</Link><Link href="/account/requests">{copy.nav.requests}</Link><Link href="/account/payments">{copy.account.history}</Link><Link href="/account/finds">{copy.account.finds}</Link><Link href="/account/provider-applications">{copy.account.applications}</Link><Link href="/seller">{copy.account.seller}</Link></>}<Link href="/discover-more">{copy.account.discovery}</Link>{user?.role==='ADMIN'&&<Link href="/admin">{copy.account.admin}</Link>}</div></div>;
}
export function ReplicaRequests(){
  const {user,loading,error}=useUser();const [result,setResult]=useState<{userId:number;data?:RequestRecord[];error?:string}>();
  useEffect(()=>{let active=true;if(user)api<RequestRecord[]>('/me/requests').then(data=>{if(active)setResult({userId:user.id,data});}).catch(e=>{if(active)setResult({userId:user.id,error:e.message});});return()=>{active=false;};},[user]);
  const current=result?.userId===user?.id?result:undefined;
  return <div className="container page replica-page"><h1>{copy.requests.title}</h1>{loading?<p>{copy.common.loading}</p>:error?<Notice error message={error}/>:!user?<><p>{copy.requests.signIn}</p><Link className="button" href="/login?next=/account/requests">{copy.auth.signIn}</Link></>:current?.error?<Notice error message={current.error}/>:!current?.data?<p>{copy.common.loading}</p>:current.data.length?current.data.map(item=><article className="panel" key={item.id}><h2>{item.service_title}</h2><p className="small-label">{item.status.replaceAll('_',' ')}</p><p>{item.requirements}</p><small>{item.location} · {date(item.created_at)}</small></article>):<><p>{copy.requests.empty}</p><Link className="button" href="/services">{copy.requests.explore}</Link></>}</div>;
}
export function ReplicaProfile(){
  const {user,loading,error}=useUser();return <div className="container page replica-page">{loading?<p>{copy.common.loading}</p>:error?<Notice error message={error}/>:user?<ProfileForm key={user.id} user={user}/>:<><h1>{copy.profile.title}</h1><Link className="button" href="/login?next=/account/profile">{copy.auth.signIn}</Link></>}</div>;
}
function ProfileForm({user}:{user:User}){
 const [error,setError]=useState(''),[saved,setSaved]=useState(false),[busy,setBusy]=useState(false);
 async function save(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);setBusy(true);setSaved(false);setError('');try{await api('/me',{method:'PATCH',body:JSON.stringify({name:form.get('name'),phone:form.get('phone')})});setSaved(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <><h1>{copy.profile.title}</h1><p>{user.email}</p>{error&&<Notice error message={error}/>}<form className="form" onSubmit={save}><label>{copy.auth.name}<input name="name" defaultValue={user.name} minLength={2} maxLength={100} required/></label><label>{copy.profile.phone}<input name="phone" type="tel" defaultValue={user.phone} maxLength={20}/></label><button className="button" disabled={busy}>{busy?copy.profile.saving:copy.profile.save}</button></form>{saved&&<p role="status">{copy.profile.saved}</p>}</>;
}
export function ReplicaMembership({nextPath}:{nextPath?:string}){
 const next=safeDestination(nextPath,'/account/membership');
 const {user}=useUser();const [plan,setPlan]=useState<{name:string;amount:number;days:number}>(),[status,setStatus]=useState<Membership>(),[offers,setOffers]=useState<Offer[]>(),[error,setError]=useState('');
 useEffect(()=>{let active=true;api<typeof plan>('/membership/plan').then(value=>{if(active)setPlan(value);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 useEffect(()=>{let active=true;if(user){api<Membership>('/me/membership').then(value=>{if(active)setStatus(value);}).catch(e=>{if(active)setError(e.message);});api<Offer[]>('/membership/offers').then(value=>{if(active)setOffers(value);}).catch(e=>{if(active)setError(e.message);});}return()=>{active=false;};},[user]);
 return <div className="container page replica-page"><h1>{copy.membership.title}</h1><p>{copy.membership.subtitle}</p><p>{copy.membership.intro}</p>{error&&<Notice error message={error}/>}<div className="panel">{plan?<><h2>{plan.name}</h2><strong className="replica-price">{money(plan.amount)}</strong><p>{plan.days} days · Sandbox example. No real money.</p></>:<p>{copy.common.loading}</p>}</div>{status&&<p>{status.active?'Active membership'+(status.expires_at?' · Until '+date(status.expires_at):''):'No eligible active membership'}</p>}<p>{copy.membership.notice}</p><Link className="button" href={user?destinationLink('/sandbox-checkout',next):destinationLink('/login',destinationLink('/membership',next))}>{user?copy.membership.checkout:copy.auth.signIn}</Link>{user&&<><h2>{copy.membership.offers}</h2>{offers?.length?offers.map(offer=><article className="panel" key={offer.id}><h3>{offer.title}</h3><p>{offer.terms}</p><small>{offer.scope} · Until {date(offer.ends_at)}</small></article>):<p>{copy.membership.emptyOffers}</p>}<Link className="button secondary" href="/account/payments">{copy.membership.history}</Link></>}</div>;
}
export function ReplicaPayments(){
 const {user,loading,error}=useUser();const [result,setResult]=useState<{id:number;rows?:Payment[];error?:string}>();useEffect(()=>{let active=true;if(user)api<Payment[]>('/me/payments').then(rows=>{if(active)setResult({id:user.id,rows});}).catch(e=>{if(active)setResult({id:user.id,error:e.message});});return()=>{active=false;};},[user]);const current=result?.id===user?.id?result:undefined;
 return <div className="container page replica-page"><h1>{copy.account.history}</h1><p>Membership transactions in sandbox mode. Service purchases are not collected through this version.</p>{loading?<p>{copy.common.loading}</p>:error||current?.error?<Notice error message={error||current?.error||''}/>:!user?<Link className="button" href="/login">{copy.auth.signIn}</Link>:!current?.rows?<p>{copy.common.loading}</p>:current.rows.length?current.rows.map(payment=><article className="panel" key={payment.id}><h2>{payment.title||'Membership'}</h2><p>{money(payment.amount)} · {payment.status.replaceAll('_',' ')}</p><small>{date(payment.created_at)} · {payment.id}</small></article>):<p>No payments yet. Your membership transaction history will appear here.</p>}</div>;
}
