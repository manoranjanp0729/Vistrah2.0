'use client';
import {UiText,UiElement,UiNav} from "./localized-ui";
import {GoogleSignIn,type GoogleAuthGrant} from './google-sign-in';
import {disableGoogleAutoSelect} from '../../shared/google-web';
import {legalVersion,signupLegalCopy} from '../../shared/legal';
import {useLanguage} from './language-provider';
import {websiteLoginDestination} from '@/lib/login-destination';
import {accountHelp} from '@/lib/help-content';
import {ContextHelp,HelpPair} from './context-help';
import {ContextVisual} from './visual';
import {accountPhoto,pagePhoto} from '@/lib/imagery';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState,useEffect,useCallback} from 'react';
import {ArrowUpRight,LogOut,UserRound,ClipboardList,Crown,CreditCard,ShoppingBag,ArrowRight} from 'lucide-react';
import {api,ApiError,money,date} from '@/lib/api';
import {safeDestination,destinationLink} from '@/lib/destinations';
import {ServiceAccessState} from './service-access';
import {isSellerUser,type User,type ServiceContext,type RequestRecord,type Membership,type Payment,type Offer} from '@/lib/types';
import {Breadcrumbs,ButtonLink,EmptyState,Notice,Status} from './ui';
import {Finds} from './finds';
import {useCustomerLocation} from './customer-location';
import {AccountLocation} from './account-location';
import {ProviderApplications} from './provider-onboarding';
import {enquiryUrl,enquiryModes,type EnquiryIntent} from '@/lib/service-pathways';

const sessionListeners=new Set<(user:User|null)=>void>();
export function notifyUserSession(user:User|null){for(const listener of sessionListeners)listener(user);}

export function useUser(refreshOnFocus=false,_requestedScope?:'customer'|'seller') {
  const [user,setUser]=useState<User|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
  useEffect(()=>{let alive=true,request=0;
    const onSync=(next:User|null)=>{if(alive){setUser(next);setError('');setLoading(false);}};
    sessionListeners.add(onSync);
    const load=()=>{const current=++request;api<User>('/me').then(u=>{if(alive&&current===request){setUser(u);setError('');}}).catch(e=>{if(alive&&current===request){setUser(null);if(!(e instanceof ApiError)||e.status!==401)setError(e.message);else setError('');}}).finally(()=>{if(alive&&current===request)setLoading(false);});};
    const restore=()=>{setLoading(true);load();};load();
    if(refreshOnFocus){window.addEventListener('focus',restore);window.addEventListener('pageshow',restore);}
    return()=>{alive=false;sessionListeners.delete(onSync);if(refreshOnFocus){window.removeEventListener('focus',restore);window.removeEventListener('pageshow',restore);}};
  },[refreshOnFocus]);
  return {user,loading,error};
}
export function AuthGate({children,next='/account'}:{children:(user:User)=>React.ReactNode;next?:string}) {const {user,loading,error}=useUser();if(loading)return <div className="container page" role="status"><ContextVisual photo={pagePhoto('access')}/><UiText value={"Loading your account…"}/></div>;if(error)return <div className="container page"><ContextVisual photo={pagePhoto('access')}/><Notice error message={error}/></div>;if(!user)return <div className="container page"><ContextVisual photo={pagePhoto('access')} className="access-context"/><UiElement as={EmptyState} title="Sign in to your account" description="Sign in to manage your requests, membership, and seller tools." href={`/login?next=${encodeURIComponent(next)}`} label="Sign in"/><p className="center"><UiText value={"New to VISTRAH? "}/><Link className="text-link" href={`/register?next=${encodeURIComponent(next)}`}><UiText value={"Create an account"}/></Link></p></div>;return <>{children(user)}</>;}

export function AuthForm({register=false,nextPath}:{register?:boolean;seller?:boolean;nextPath?:string}) {const {copy}=useLanguage();
  const {syncIdentity}=useCustomerLocation();const router=useRouter();const next=websiteLoginDestination(nextPath,'/account');
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [legalAccepted,setLegalAccepted]=useState(false),[whatsappPromotions,setWhatsappPromotions]=useState(false);
  const [consentRegister,setConsentRegister]=useState(register);
  if(consentRegister!==register){setConsentRegister(register);setLegalAccepted(false);setWhatsappPromotions(false);}
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setError('');if(register&&!legalAccepted){setError(signupLegalCopy.required);return;}setBusy(true);const form=new FormData(event.currentTarget);
    try {const result=await api<{user:User}>(`/auth/${register?'register':'login'}`,{method:'POST',body:JSON.stringify({email:form.get('email'),password:form.get('password'),...(register?{name:form.get('name'),privacy_policy_version:legalVersion,marketing_consent:whatsappPromotions}: {})})});syncIdentity(result.user.id);notifyUserSession(result.user);const target=nextPath?next:'/account';router.push(target);router.refresh();} catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function submitGoogle(credential:string,grant?:GoogleAuthGrant) {
    setError('');
    if(!legalAccepted){setError(signupLegalCopy.required);return;}
    setBusy(true);
    try {
      const payload=grant?.accessToken
        ? {access_token:grant.accessToken,privacy_policy_version:grant.privacyPolicyVersion||legalVersion,marketing_consent:grant.marketingConsent??whatsappPromotions}
        : {credential:grant?.credential||credential,privacy_policy_version:grant?.privacyPolicyVersion||legalVersion,marketing_consent:grant?.marketingConsent??whatsappPromotions};
      const result=await api<{user:User}>('/auth/google',{method:'POST',body:JSON.stringify(payload)});
      syncIdentity(result.user.id);notifyUserSession(result.user);const target=nextPath?next:'/account';router.push(target);router.refresh();
    } catch(e){
      setError((e as Error).message);
    }finally{setBusy(false);}
  }
  return <div className="auth-page"><div className="auth-form-wrap" style={{width:'100%',maxWidth:400,marginInline:'auto'}}><h2><UiText value={register?copy.auth.register:copy.auth.welcome}/></h2><p><UiText value={copy.auth.intro}/></p>{error&&<Notice error message={error}/>}
    <GoogleSignIn
      disabled={busy}
      legalAccepted={legalAccepted}
      onLegalAcceptedChange={setLegalAccepted}
      marketingConsent={whatsappPromotions}
      onMarketingConsentChange={setWhatsappPromotions}
      onCredential={(credential,grant)=>void submitGoogle(credential,grant)}
    />
    <div style={{display:'flex',alignItems:'center',gap:12,margin:'12px 0',color:'var(--text-secondary,#6b7280)',fontSize:12}}><div style={{flex:1,height:1,backgroundColor:'var(--border,#e5e7eb)'}}/><span><UiText value={"or with email"}/></span><div style={{flex:1,height:1,backgroundColor:'var(--border,#e5e7eb)'}}/></div>
    <form onSubmit={submit} className="form">{register&&<label><UiText value={copy.auth.name}/><input name="name" autoComplete="name" minLength={2} maxLength={100} required/></label>}<label><UiText value={copy.auth.email}/><input type="email" name="email" autoComplete="email" maxLength={254} required/></label><HelpPair id="auth.password" className="help-field"><label><UiText value={copy.auth.password}/><input type="password" aria-label={copy.auth.password} name="password" autoComplete={register?'new-password':'current-password'} minLength={register?10:1} maxLength={128} required/>{register&&<small><UiText value={"Use at least 10 characters."}/></small>}</label></HelpPair><button className="button" type="submit" disabled={busy||(register&&!legalAccepted)}>{busy?copy.auth.wait:register?copy.auth.create:copy.auth.signIn}<ArrowUpRight size={17}/></button></form>{!register&&<p><Link className="text-link" href="/forgot-password"><UiText value={copy.auth.forgot}/></Link><ContextHelp id="auth.recovery"/></p>}<p><Link className="text-link" href={`/${register?'login':'register'}${nextPath?'?next='+encodeURIComponent(next):''}`}>{register?copy.auth.existing:copy.auth.new}<ArrowRight size={15}/></Link></p></div></div>;
}

export function RequestForm({context,intent='enquiry'}:{context:ServiceContext;intent?:EnquiryIntent}){return <AuthGate next={enquiryUrl(context,intent)}>{user=><RequestFormInner context={context} user={user} intent={intent}/>}</AuthGate>;}
function RequestFormInner({context,user,intent}:{context:ServiceContext;user:User;intent:EnquiryIntent}){const {copy,t}=useLanguage();
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false),[access,setAccess]=useState(0);
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);setBusy(true);setError('');try{await api('/requests',{method:'POST',body:JSON.stringify({service_id:context.service.id,requirements:enquiryModes[intent].prefix+String(form.get('requirements')||'').trim(),location:String(form.get('location')||'').trim(),phone:String(form.get('phone')||'').trim(),postal_code:form.get('postal_code')||null,service_address:form.get('share_address')==='on'?form.get('service_address')||null:null})});setSaved(true);}catch(e){if(e instanceof ApiError&&[401,403].includes(e.status))setAccess(e.status);else setError((e as Error).message);}finally{setBusy(false);}}
 if(access)return <ServiceAccessState status={access} next={enquiryUrl(context,intent)}/>;
 return <div className="container page replica-page">{saved?<><h1><UiText value={copy.requests.saved}/></h1><p><UiText value={copy.requests.savedDescription}/></p><ButtonLink href="/account/requests"><UiText value={copy.requests.view}/></ButtonLink></>:<><h1>{context.service.title}</h1><p><UiText value={intent==='recommendations'?t('requests.recommendationIntro'):intent==='in-house'?t('requests.deliveryIntro'):t('requests.enquiryIntro')}/>{' '}{t('requests.noBooking')}</p>{error&&<Notice error message={error}/>}<form className="form" onSubmit={submit}><label><UiText value={copy.requests.requirements}/><textarea name="requirements" minLength={20} maxLength={4900} required/></label><label><UiText value={copy.requests.city}/><input name="location" minLength={2} maxLength={200} required/></label><label><UiText value={copy.requests.pin}/><input name="postal_code" pattern="[0-9]{6}" maxLength={6}/></label><label className="checkbox-label"><input name="share_address" type="checkbox"/><UiText value={copy.requests.share}/></label><label><UiText value={copy.requests.address}/><textarea name="service_address" minLength={3} maxLength={1000}/></label><label><UiText value={copy.requests.phone}/><input name="phone" type="tel" defaultValue={user.phone} minLength={10} maxLength={20} pattern={'[+0-9\\s-]+'} required/></label><p><UiText value={copy.requests.privacy}/></p><button className="button" disabled={busy}>{busy?copy.profile.saving:copy.requests.save}</button></form></>}</div>;
}

const customerAccountLinks=[{slug:'',label:'Overview',icon:UserRound},{slug:'profile',label:'My profile',icon:UserRound},{slug:'requests',label:'My requests',icon:ClipboardList},{slug:'membership',label:'Membership',icon:Crown},{slug:'orders',label:'Service enquiry history',icon:ShoppingBag},{slug:'payments',label:'Payments',icon:CreditCard}];
const sellerAccountLinks:{slug:string;label:string;icon:typeof ClipboardList}[]=[];
const accountLinks=[...sellerAccountLinks,...customerAccountLinks];
export function Account({section='',workflowId}:{section?:string;workflowId?:string}) {return <AuthGate next={`/account${section?'/'+section:''}${workflowId?'/'+workflowId:''}`}>{user=><AccountInner user={user} section={section} workflowId={workflowId}/>}</AuthGate>;}
function AccountInner({user,section,workflowId}:{user:User;section:string;workflowId?:string}) {
  const {syncIdentity}=useCustomerLocation();const router=useRouter();const [error,setError]=useState('');
  async function logout(){try{await api('/auth/logout',{method:'POST'});disableGoogleAutoSelect();syncIdentity(null);notifyUserSession(null);router.push('/login');router.refresh();}catch(e){setError((e as Error).message);}}
  const isSeller=isSellerUser(user);
  const roleLabel=user.role==='ADMIN'?'Administrator':isSeller?'Customer & Seller':'Customer';
  return <div className="container page"><Breadcrumbs items={[{label:'My account',...(section?{href:'/account'}:{})},...(section?[{label:accountLinks.find(l=>l.slug===section)!.label}]:[])]}/><div className="account-layout"><aside className="account-sidebar"><div className="account-person"><div className="avatar">{user.name.slice(0,1)}</div><strong>{user.name}</strong><small>{user.email} · <UiText value={roleLabel}/></small>{isSeller&&user.sellerProfile?.company&&<small>{user.sellerProfile.company}</small>}</div><UiNav  aria-label="Account navigation"><small className="small-label"><UiText value={"MY ACCOUNT & ACTIVITY"}/></small>{customerAccountLinks.map(l=><HelpPair key={l.slug} id={accountHelp[l.slug]} className="help-nav-row"><Link href={`/account${l.slug?'/'+l.slug:''}`} className={section===l.slug?'active':''}><l.icon size={18}/><UiText value={l.label}/></Link></HelpPair>)}<Link href="/commerce/cart"><ShoppingBag size={18}/><UiText value={"Cart"}/></Link><Link href="/commerce/orders"><ShoppingBag size={18}/><UiText value={"Purchase orders"}/></Link><AccountLocation/><small className="small-label"><UiText value={"SELLER & BUSINESS TOOLS"}/></small><Link href="/seller"><ClipboardList size={18}/><UiText value={isSeller?"Seller dashboard":"Complete seller onboarding"}/></Link><Link href="/seller/v-ads"><ClipboardList size={18}/><UiText value={"V Ads Studio"}/></Link>{sellerAccountLinks.map(l=><HelpPair key={l.slug} id={accountHelp[l.slug]} className="help-nav-row"><Link href={`/account${l.slug?'/'+l.slug:''}`} className={section===l.slug?'active':''}><l.icon size={18}/><UiText value={l.label}/></Link></HelpPair>)}<Link href="/app/employer-jobs"><ClipboardList size={18}/><UiText value={"Employer job postings"}/></Link>{user.role==='ADMIN'&&<><small className="small-label">ADMINISTRATION</small><Link href="/admin"><Crown size={18}/><UiText value={"Admin dashboard"}/></Link></>}<button onClick={logout}><LogOut size={18}/><UiText value={"Sign out"}/></button></UiNav></aside><section className="account-content"><ContextVisual photo={accountPhoto(section)} className="account-context"/>{error&&<Notice error message={error}/>}{section==='provider-applications'?<ProviderApplications/>:section==='finds'?<Finds user={user} workflowId={workflowId}/>:<AccountSection key={section} section={section} user={user}/>}</section></div></div>;
}
function AccountSection({section,user}:{section:string;user:User}) {
  const [data,setData]=useState<unknown>(null);const [error,setError]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
  const load=useCallback(async()=>{try{const path=section==='membership'?'/me/membership':section==='requests'?'/me/requests':section==='orders'?'/me/orders':section==='payments'?'/me/payments':null;setData(path?await api(path):{});}catch(e){setError((e as Error).message);}},[section]);
  useEffect(()=>{void Promise.resolve().then(load);},[load]);
  async function save(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError('');setMessage('');const form=new FormData(event.currentTarget);try{await api('/me',{method:'PATCH',body:JSON.stringify({name:form.get('name'),phone:form.get('phone')})});setMessage('Your profile has been saved.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  if(error)return <Notice error message={error}/>;
  if(data===null)return <p role="status"><UiText value={"Loading your details…"}/></p>;
  if(section==='profile')return <><p className="eyebrow"><UiText value={"YOUR DETAILS"}/></p><h1><UiText value={"My profile"}/></h1>{message&&<Notice message={message}/>}<form className="form profile-form" onSubmit={save}><label><UiText value={"Name"}/><input name="name" defaultValue={user.name} minLength={2} maxLength={100} required/></label><label><UiText value={"Email"}/><input value={user.email} readOnly/><small><UiText value={"Your sign-in email cannot be changed here."}/></small></label><HelpPair id="account.profile" className="help-field"><label><UiText value={"Phone"}/><input name="phone" type="tel" defaultValue={user.phone} maxLength={20} pattern="[+0-9\s-]*"/></label></HelpPair><button className="button" disabled={busy}><UiText value={busy?'Saving…':'Save profile'}/></button></form><AccountDataPrivacyControls user={user}/></>;
  if(section==='membership')return <MembershipSection membership={data as Membership}/>;
  if(section==='requests'){const records=data as RequestRecord[];return <><p className="eyebrow"><UiText value={"YOUR NEXT STEPS"}/></p><h1><UiText value={"My requests "}/><ContextHelp id="account.requests"/></h1>{records.length?<div className="request-list">{records.map(r=><article className="request-card" key={r.id}><div className="row-between"><span className="small-label"><UiText value={"REQUEST #"}/>{r.id} · {date(r.created_at)}</span><Status context="request" value={r.status}/></div><h3>{r.service_title}</h3><p>{r.requirements}</p><small>{r.location} · {r.phone}</small></article>)}</div>:<UiElement as={EmptyState} title="No service enquiries yet" description="Explore a service and submit your requirements to get started." href="/services"/>}</>;}
  if(section==='orders'||section==='payments'){const records=data as Payment[];return <><p className="eyebrow"><UiText value={"YOUR HISTORY"}/></p><h1><UiText value={section==='orders'?'My orders':'My payments'}/></h1><p><UiText value={"Membership transactions in sandbox mode. Service purchases are not collected through this version."}/></p>{records.length?<div className="table-wrap"><table><thead><tr><th><UiText value={"Reference"}/></th><th><UiText value={"Amount"}/></th><th><UiText value={"Status"}/></th><th><UiText value={"Date"}/></th></tr></thead><tbody>{records.map(r=><tr key={r.id}><td><strong>{r.title||'Membership'}</strong><small>{r.id}</small><span className="small-label">SANDBOX</span></td><td>{money(r.amount)}</td><td><Status context="payment" value={r.status}/></td><td>{date(r.created_at)}</td></tr>)}</tbody></table></div>:<UiElement as={EmptyState} title={`No ${section} yet`} description="Your membership transaction history will appear here." href="/membership" label="Explore membership"/>}</>;}
  return <><p className="eyebrow"><UiText value={"YOUR VISTRAH"}/></p><h1><UiText value={"Hello, "}/>{user.name.split(' ')[0]}.</h1><p className="lead"><UiText value={"Manage your service enquiries and account."}/></p><div className="dashboard-links">{accountLinks.filter(l=>['requests','membership','profile'].includes(l.slug)).map(l=><Link href={`/account/${l.slug}`} key={l.slug}><l.icon size={25}/><h3><UiText value={l.label}/></h3><p><UiText value={l.slug==='requests'?'Follow your submitted requirements.':l.slug==='membership'?'See your status and member offers.':'Keep your contact details up to date.'}/></p><ArrowUpRight size={20}/></Link>)}</div><ButtonLink href="/services"><UiText value={"Explore services"}/></ButtonLink></>;
}
function MembershipSection({membership}:{membership:Membership}) {const [offers,setOffers]=useState<Offer[]|null>(null);const [error,setError]=useState('');useEffect(()=>{api<Offer[]>('/membership/offers').then(setOffers).catch(e=>setError(e.message));},[]);return <><p className="eyebrow"><UiText value={"YOUR SERVICE ACCESS"}/></p><h1><UiText value={"My membership "}/><ContextHelp id="account.membership"/></h1><div className="membership-status"><Status context="membership" value={membership.active?'ACTIVE':'INACTIVE'}/><h2><UiText value={membership.active?'You’re a VISTRAH member.':'No eligible membership is active.'}/></h2><p><UiText value={membership.active&&membership.expires_at?`Membership valid through ${date(membership.expires_at)}. Sandbox membership for testing.`:'Eligible membership is required for provider information and service enquiries. Sandbox access is for development testing only.'}/></p><ButtonLink href="/sandbox-checkout"><UiText value={membership.active?'Extend sandbox membership':'Try sandbox membership'}/></ButtonLink></div><h2><UiText value={"Current member offers"}/></h2>{error?<Notice error message={error}/>:offers===null?<p role="status"><UiText value={"Loading offers…"}/></p>:offers.length?<div className="offer-list">{offers.map(o=><div className="offer-card" key={o.id}><span className="small-label">{o.scope}<UiText value={o.target_id?` · RECORD #${o.target_id}`:''}/></span><h3>{o.title}</h3><strong><UiText value={o.type==='PERCENT'?`${o.value}%`:money(o.value)}/> <UiText value={"offer"}/></strong><p>{o.terms}</p><small><UiText value={"Valid until "}/>{date(o.ends_at)}</small></div>)}</div>:<UiElement as={EmptyState} title={membership.active?'No active offers at the moment':'Member offers are available after activation'} description="Service purchases are separate. Offers apply only to their listed scope and terms."/>}</>;}

export function Checkout({nextPath}:{nextPath?:string}){const next=safeDestination(nextPath,'/account/membership');return <AuthGate next={destinationLink('/sandbox-checkout',next)}>{()=> <CheckoutInner next={next}/>}</AuthGate>;}
function CheckoutInner({next}:{next:string}){const router=useRouter();const [plan,setPlan]=useState<{amount:number;days:number}|null>(null);const [payment,setPayment]=useState<Payment|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [access,setAccess]=useState(0);useEffect(()=>{api<{amount:number;days:number}>('/membership/plan').then(setPlan).catch(e=>setError(e.message));const id=sessionStorage.getItem('vistrah_checkout_payment');if(id)api<Payment[]>('/me/payments').then(rows=>{const saved=rows.find(p=>p.id===id);if(saved)setPayment(saved);else sessionStorage.removeItem('vistrah_checkout_payment');}).catch(e=>{if(e instanceof ApiError&&e.status===401)setAccess(401);else setError(e.message);});},[]);
  async function create(){setBusy(true);setError('');try{let key=sessionStorage.getItem('vistrah_checkout_key');if(!key){key=crypto.randomUUID();sessionStorage.setItem('vistrah_checkout_key',key);}const created=await api<Payment>('/payments/checkout',{method:'POST',body:JSON.stringify({idempotency_key:key})});setPayment(created);sessionStorage.setItem('vistrah_checkout_payment',created.id);}catch(e){if(e instanceof ApiError&&e.status===401)setAccess(401);else setError((e as Error).message);}finally{setBusy(false);}}
  async function simulate(outcome:string){setBusy(true);setError('');try{setPayment(await api<Payment>(`/payments/${payment!.id}/simulate`,{method:'POST',body:JSON.stringify({outcome})}));sessionStorage.removeItem('vistrah_checkout_key');}catch(e){if(e instanceof ApiError&&e.status===401)setAccess(401);else setError((e as Error).message);}finally{setBusy(false);}}
  async function resume(){setBusy(true);setError('');try{const membership=await api<Membership>('/me/membership');if(!membership.active){setError('Access is not active. Sandbox terms qualify only in development. Check your membership status before continuing.');return;}router.push(next);router.refresh();}catch(e){if(e instanceof ApiError&&e.status===401)setAccess(401);else setError((e as Error).message);}finally{setBusy(false);}}
  if(access)return <ServiceAccessState status={access} next={destinationLink('/sandbox-checkout',next)}/>;
  return <div className="container page"><Breadcrumbs items={[{label:'Membership',href:'/membership'},{label:'Sandbox checkout'}]}/><div className="checkout-card"><ContextVisual photo={pagePhoto('checkout')}/><p className="eyebrow"><UiText value={"SANDBOX · NO REAL MONEY"}/></p><h1><UiText value={"Try the membership journey."}/></h1><p><UiText value={"This checkout records a test transaction. No card, CVV, UPI PIN or bank information is collected."}/></p>{error&&<Notice error message={error}/>}<div className="checkout-summary"><span><UiText value={"VISTRAH Membership"}/></span><strong><UiText value={plan?money(plan.amount):'Loading…'}/></strong></div>{!payment?<HelpPair id="public.membership"><button className="button" disabled={busy||!plan} onClick={create}><UiText value={busy?'Creating transaction…':'Create sandbox transaction'}/><ArrowUpRight size={17}/></button></HelpPair>:<><div className="row-between"><span className="small-label">{payment.id}</span><Status context="payment" value={payment.status}/></div>{payment.status==='PENDING'?<><p><UiText value={"Choose a test outcome. The backend validates a signed sandbox event before updating the transaction."}/></p><div className="button-row"><HelpPair id="status.payment"><button className="button" disabled={busy} onClick={()=>simulate('SUCCEEDED')}><UiText value={busy?'Processing…':'Simulate successful payment'}/></button></HelpPair><HelpPair id="status.payment"><button className="button secondary" disabled={busy} onClick={()=>simulate('FAILED')}><UiText value={"Simulate failed payment"}/></button></HelpPair></div></>:<><Notice message={payment.status==='SUCCEEDED'?'Sandbox payment recorded. Check backend eligibility before returning; this does not confirm genuine paid membership.':payment.status==='REFUNDED'?'This sandbox payment was refunded.':'Test payment failed. Membership was not activated.'}/><ButtonLink href="/account/membership"><UiText value={"View membership"}/></ButtonLink>{payment.status==='SUCCEEDED'&&<button className="button" disabled={busy} onClick={resume}><UiText value={"Check access and return"}/></button>}<button className="button secondary" onClick={()=>{sessionStorage.removeItem('vistrah_checkout_key');sessionStorage.removeItem('vistrah_checkout_payment');setPayment(null);}}><UiText value={"Start a new test"}/></button></>}</>}</div></div>;
}

export function AccountDataPrivacyControls({user}:{user:User}){
  const {syncIdentity}=useCustomerLocation();
  const router=useRouter();
  const [exporting,setExporting]=useState(false);
  const [confirmOpen,setConfirmOpen]=useState(false);
  const [confirmText,setConfirmText]=useState('');
  const [deleting,setDeleting]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');

  async function downloadMyData(){
    if(exporting)return;
    setExporting(true);setError('');setMessage('');
    try{
      const payload=await api<Record<string,unknown>>('/account/export-data');
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement('a');
      anchor.href=url;
      anchor.download=`vistrah-data-export-${user.id}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage('Your personal and business profile export (JSON) has been downloaded.');
    }catch(e){
      setError((e as Error).message);
    }finally{
      setExporting(false);
    }
  }

  async function deleteAccount(){
    if(deleting||confirmText.trim()!=='DELETE')return;
    setDeleting(true);setError('');setMessage('');
    try{
      await api('/account',{method:'DELETE'});
      disableGoogleAutoSelect();
      syncIdentity(null);
      notifyUserSession(null);
      router.push('/login');
      router.refresh();
    }catch(e){
      setError((e as Error).message);
      setDeleting(false);
    }
  }

  return <section aria-labelledby="dpdp-controls-heading" style={{marginTop:32,paddingTop:24,borderTop:'1px solid var(--border,rgba(15,23,42,0.08))',display:'grid',gap:16}}>
    <div>
      <p className="eyebrow"><UiText value={"DATA PRIVACY & COMPLIANCE (DPDP ACT 2023)"}/></p>
      <h2 id="dpdp-controls-heading" style={{margin:'4px 0 8px',letterSpacing:'-0.025em'}}><UiText value={"Account Data & Privacy"}/></h2>
      <p style={{margin:0,lineHeight:1.5,color:'var(--text-secondary,#475569)'}}>
        <UiText value={"Manage your personal and seller profile data processed by Vistrah India Pvt Limited (vistrah.in). Export a machine-readable JSON archive or request account deletion and anonymization."}/>
      </p>
    </div>
    <small className="tabular-nums" style={{color:'var(--text-secondary,#64748b)',lineHeight:1.5}}>
      <UiText value={"Consent policy: "}/>{user.privacy_policy_version||legalVersion}
      {' · '}
      <UiText value={"Promotional updates: "}/>{user.marketing_consent?'Opted in':'Opted out'}
      {' · '}
      <Link href="/privacy" className="text-link"><UiText value={"Privacy Policy"}/></Link>
      {' · '}
      <Link href="/terms" className="text-link"><UiText value={"Terms & Conditions"}/></Link>
      {' · '}
      <Link href="/grievance-officer" className="text-link"><UiText value={"Grievance Officer (24h ack / 15-day SLA)"}/></Link>
    </small>
    {error&&<Notice error message={error}/>}
    {message&&<Notice message={message}/>}
    <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'center'}}>
      <button type="button" className="button secondary" disabled={exporting||deleting} onClick={()=>void downloadMyData()}>
        <UiText value={exporting?'Preparing export…':'Download My Data'}/>
      </button>
      {user.role!=='ADMIN'&&!confirmOpen&&(
        <button type="button" className="button secondary" style={{borderColor:'#dc2626',color:'#dc2626'}} disabled={exporting||deleting} onClick={()=>setConfirmOpen(true)}>
          <UiText value={"Delete Account"}/>
        </button>
      )}
    </div>
    {confirmOpen&&(
      <div role="region" aria-label="Confirm account deletion" style={{padding:16,borderRadius:12,border:'1px solid rgba(220,38,38,0.35)',display:'grid',gap:12}}>
        <strong style={{color:'#dc2626'}}><UiText value={"Permanent Account Deletion & Anonymization"}/></strong>
        <p style={{margin:0,fontSize:14,lineHeight:1.5}}>
          <UiText value={"This revokes all active sessions, anonymizes your personal identifiers, deactivates owned seller profiles, and unpublishes V Ads and commerce listings while retaining statutory non-personal audit logs. Type DELETE to confirm."}/>
        </p>
        <label style={{display:'grid',gap:6,maxWidth:280}}>
          <span style={{fontSize:13,fontWeight:600}}><UiText value={"Type DELETE to confirm"}/></span>
          <input value={confirmText} onChange={event=>setConfirmText(event.target.value)} placeholder="DELETE" autoComplete="off" disabled={deleting}/>
        </label>
        <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
          <button type="button" className="button" style={{background:'#dc2626',borderColor:'#dc2626',color:'#fff'}} disabled={deleting||confirmText.trim()!=='DELETE'} onClick={()=>void deleteAccount()}>
            <UiText value={deleting?'Deleting account…':'Confirm Delete Account'}/>
          </button>
          <button type="button" className="button secondary" disabled={deleting} onClick={()=>{setConfirmOpen(false);setConfirmText('');}}>
            <UiText value={"Cancel"}/>
          </button>
        </div>
      </div>
    )}
  </section>;
}

export function AccountPrivacySettingsSection(){
  const {user,loading}=useUser();
  if(loading)return null;
  if(!user)return <section style={{marginTop:32,paddingTop:24,borderTop:'1px solid var(--border,rgba(15,23,42,0.08))'}}>
    <h2><UiText value={"Account Data & Privacy"}/></h2>
    <p><UiText value={"Sign in to download your personal and seller data archive or request account deletion."}/>{' '}<Link className="text-link" href="/login?next=%2Faccount%2Fsettings"><UiText value={"Sign in"}/></Link></p>
    <p><Link className="text-link" href="/privacy"><UiText value={"Privacy Policy"}/></Link>{' · '}<Link className="text-link" href="/terms"><UiText value={"Terms & Conditions"}/></Link>{' · '}<Link className="text-link" href="/grievance-officer"><UiText value={"Grievance Officer"}/></Link></p>
  </section>;
  return <AccountDataPrivacyControls user={user}/>;
}


