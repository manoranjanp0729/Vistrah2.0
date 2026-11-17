'use client';
import {UiText} from "./localized-ui";
import {redirect,usePathname,useRouter} from 'next/navigation';
import Link from 'next/link';
import {BriefcaseBusiness,ArrowRight} from 'lucide-react';
import {useState} from 'react';
import {notifyUserSession,useUser} from './customer';
import {Notice} from './ui';
import {api} from '@/lib/api';
import {isSellerUser,type User} from '@/lib/types';
import {websiteLoginDestination} from '@/lib/login-destination';
import {legalVersion,sellerLegalCopy} from '../../shared/legal';

export function SellerEntry({secondary=false,footer=false}:{secondary?:boolean;footer?:boolean}){
  const path=usePathname();
  if(footer)return null;
  return <SellerEntryState key={path} secondary={secondary}/>;
}
function SellerEntryState({secondary}:{secondary:boolean}){
  const {user,loading,error}=useUser(true);
  const className='button'+(secondary?' secondary':'');
  if(loading||error)return <button type="button" className={className} disabled><UiText value={loading?'Checking account...':'Seller access unavailable'}/></button>;
  const seller=isSellerUser(user);
  if(seller)return <span className={className} role="status" style={{cursor:'default',whiteSpace:'normal',textAlign:'center',maxWidth:'100%'}}><UiText value={"Welcome, "}/>{user!.name}</span>;
  if(user)return <Link className="button seller-sign-in" href="/seller"><span className="seller-sign-in-icon" aria-hidden="true"><BriefcaseBusiness size={18}/></span><span><UiText value={"Complete seller onboarding"}/></span><ArrowRight size={20} aria-hidden="true"/></Link>;
  return <Link className="button seller-sign-in" href="/login?next=%2Fservices"><span className="seller-sign-in-icon" aria-hidden="true"><BriefcaseBusiness size={18}/></span><span><UiText value={"Sign in to offer services"}/></span><ArrowRight size={20} aria-hidden="true"/></Link>;
}

export function SellerOnboardingPrompt({nextPath,onEnabled}:{nextPath?:string;onEnabled?:(user:User)=>void}){
  const router=useRouter();
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [termsAccepted,setTermsAccepted]=useState(false),[marketingConsent,setMarketingConsent]=useState(false);
  async function enable(){
    if(busy)return;
    if(!termsAccepted){setError(sellerLegalCopy.required);return;}
    setBusy(true);setError('');
    try{
      const updated=await api<User>('/auth/seller/enable',{method:'POST',body:JSON.stringify({privacy_policy_version:legalVersion,marketing_consent:marketingConsent})});
      notifyUserSession?.(updated);
      onEnabled?.(updated);
      if(nextPath){
        router.push(websiteLoginDestination(nextPath,'/seller'));
        router.refresh();
      }
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <div className="container page">
    <h1><UiText value={"Complete Seller Onboarding / Register Business"}/></h1>
    <p><UiText value={"Your account is signed in, and you do not have a seller profile enabled yet. Enable seller access or register your business to manage listings and V Ads."}/></p>
    {error&&<Notice error message={error}/>}
    <div style={{display:'grid',gap:10,margin:'16px 0'}}>
      <label className="checkbox-label" style={{alignItems:'flex-start'}}><input type="checkbox" checked={termsAccepted} disabled={busy} onChange={event=>setTermsAccepted(event.target.checked)} style={{flexShrink:0,padding:0,marginTop:4}}/><span><UiText value={"I accept the Seller Onboarding "}/><Link href="/terms" target="_blank" rel="noopener noreferrer"><UiText value={"Terms & Conditions"}/></Link>{', '}<Link href="/privacy" target="_blank" rel="noopener noreferrer"><UiText value={"Privacy Policy"}/></Link>{', '}<UiText value={"and "}/><Link href="/grievance-officer" target="_blank" rel="noopener noreferrer"><UiText value={"Grievance Redressal Policy"}/></Link><UiText value={" of Vistrah India Pvt Limited."}/></span></label>
      <label className="checkbox-label" style={{alignItems:'flex-start'}}><input type="checkbox" checked={marketingConsent} disabled={busy} onChange={event=>setMarketingConsent(event.target.checked)} style={{flexShrink:0,padding:0,marginTop:4}}/><span>{sellerLegalCopy.marketing}</span></label>
    </div>
    <div className="replica-actions">
      <Link className="button" href="/seller/onboard"><UiText value={"List your business (3-step self-onboarding)"}/></Link>
      <button type="button" className="button secondary" disabled={busy||!termsAccepted} onClick={()=>void enable()}><UiText value={busy?'Enabling seller access…':'Complete seller onboarding'}/></button>
      <Link className="button secondary" href="/provide-service"><UiText value={"Register business"}/></Link>
    </div>
  </div>;
}

export function SellerAuth({register=false,nextPath}:{register?:boolean;nextPath?:string}){
  const {user,loading,error}=useUser(true);
  const destination=websiteLoginDestination(nextPath,'/seller');
  if(loading)return <main className="container page" role="status"><UiText value={"Checking account…"}/></main>;
  if(error)return <main className="container page"><Notice error message={error}/></main>;
  if(!user)redirect(`/${register?'register':'login'}?next=${encodeURIComponent(destination)}`);
  if(isSellerUser(user))redirect(destination);
  return <SellerOnboardingPrompt nextPath={destination}/>;
}
