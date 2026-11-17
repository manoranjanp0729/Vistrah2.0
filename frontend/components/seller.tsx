'use client';
import {UiText,UiElement,UiNav} from "./localized-ui";
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {useEffect,useState} from 'react';
import {notifyUserSession,useUser} from './customer';
import {Notice,EmptyState,ButtonLink} from './ui';
import {api} from '@/lib/api';
import {isSellerUser,type User} from '@/lib/types';
import {BusinessPublicationEditor,type OwnedBusiness} from './publication';
import {SellerOwnershipClaims,AdminOwnershipClaimQueue} from './ownership-claims';
import {SellerCommerce} from './commerce';
import {businessProgress} from '../../shared/seller-journey';
import {legalVersion,sellerLegalCopy} from '../../shared/legal';
import {SellerRecentListings} from './seller-recent-listings';
type Business=OwnedBusiness;

export function ProvideServiceLink(){const {user}=useUser();return <Link className="button secondary" href={user?'/seller/onboard':'/login?next=%2Fseller%2Fonboard'}><UiText value={"Offer your expertise"}/></Link>;}
export function SellerDashboard({businessId,listingsOnly=false}:{businessId?:number;listingsOnly?:boolean}={}){
  const {user,loading,error}=useUser();const [enabled,setEnabled]=useState(false);const [failure,setFailure]=useState('');const [busy,setBusy]=useState(false);
  const [termsAccepted,setTermsAccepted]=useState(false);const [marketingConsent,setMarketingConsent]=useState(false);
  const targetPath=businessId?'/seller/'+(listingsOnly?'commerce/':'business/')+businessId:'/seller/onboard';
  async function enable(){if(!termsAccepted){setFailure(sellerLegalCopy.required);return;}setBusy(true);setFailure('');try{const updated=await api<User>('/auth/seller/enable',{method:'POST',body:JSON.stringify({privacy_policy_version:legalVersion,marketing_consent:marketingConsent})});notifyUserSession?.(updated);setEnabled(true);}catch(e){setFailure((e as Error).message);}finally{setBusy(false);}}
  if(loading)return <div className="container page" role="status"><UiText value={"Loading seller access…"}/></div>;
  if(error)return <div className="container page"><Notice error message={error}/></div>;
  if(!user)redirect('/login?next='+encodeURIComponent(targetPath));
  if(!isSellerUser(user)&&!enabled){
    if(businessId===undefined)redirect('/seller/onboard');
    return <div className="container page"><h1><UiText value={"Complete Seller Onboarding / Register Business"}/></h1><p><UiText value={"Keep your customer account, enquiries and history. List your business in 3 easy steps or enable seller access to manage services, listings, and V Ads."}/></p>{failure&&<Notice error message={failure}/>}<div style={{display:'grid',gap:10,margin:'16px 0'}}><label className="checkbox-label" style={{alignItems:'flex-start'}}><input type="checkbox" checked={termsAccepted} disabled={busy} onChange={event=>setTermsAccepted(event.target.checked)} style={{flexShrink:0,padding:0,marginTop:4}}/><span><UiText value={"I accept the Seller Onboarding "}/><Link href="/terms" target="_blank" rel="noopener noreferrer"><UiText value={"Terms & Conditions"}/></Link>{', '}<Link href="/privacy" target="_blank" rel="noopener noreferrer"><UiText value={"Privacy Policy"}/></Link>{', '}<UiText value={"and "}/><Link href="/grievance-officer" target="_blank" rel="noopener noreferrer"><UiText value={"Grievance Redressal Policy"}/></Link><UiText value={" of Vistrah India Pvt Limited."}/></span></label><label className="checkbox-label" style={{alignItems:'flex-start'}}><input type="checkbox" checked={marketingConsent} disabled={busy} onChange={event=>setMarketingConsent(event.target.checked)} style={{flexShrink:0,padding:0,marginTop:4}}/><span>{sellerLegalCopy.marketing}</span></label></div><div className="replica-actions"><ButtonLink href="/seller/onboard"><UiText value={"List your business (3 easy steps)"}/></ButtonLink><button className="button secondary" disabled={busy||!termsAccepted} onClick={enable}><UiText value={busy?'Enabling…':'Complete seller onboarding'}/></button></div></div>;
  }
  return <SellerWorkspace businessId={businessId} listingsOnly={listingsOnly}/>;
}
function SellerWorkspace({businessId,listingsOnly}:{businessId?:number;listingsOnly:boolean}){
  const [businesses,setBusinesses]=useState<Business[]|null>(null);const [error,setError]=useState('');const [ownershipOpen,setOwnershipOpen]=useState(false);
  useEffect(()=>{let alive=true;api<Business[]>('/seller/businesses').then(rows=>{if(alive)setBusinesses(rows);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[]);
  if(businessId!==undefined){
    const business=businesses?.find(row=>row.id===businessId);
    return <div className="container page"><ButtonLink href="/seller" secondary><UiText value={"Seller dashboard"}/></ButtonLink><h1><UiText value={listingsOnly?'Your services & products':'Business details'}/></h1>{error?<Notice error message={error}/>:businesses===null?<p role="status"><UiText value={"Loading your business..."}/></p>:business?<><h2>{business.company||business.name}</h2><p><UiText value={businessProgress(business)}/></p>{listingsOnly?<SellerCommerce businessId={business.id}/>:<><ButtonLink href={'/seller/commerce/'+business.id}><UiText value={"Manage services & products"}/></ButtonLink><BusinessPublicationEditor business={business}/></>}</>:<UiElement as={EmptyState} title="Business unavailable" description="Choose a business you own from your seller dashboard."/>}</div>;
  }
  return <div className="container page"><h1><UiText value={"Seller dashboard"}/></h1><p><UiText value={"Manage your businesses, applications, service listings and job postings. Each business and service needs independent review."}/></p><div className="replica-actions"><ButtonLink href="/seller/onboard"><UiText value={"+ List your business (3 easy steps)"}/></ButtonLink><ButtonLink href="/services" secondary><UiText value={"Browse categories"}/></ButtonLink></div><p><UiText value={"Pick your business type in two taps, pin your location, and submit for quick review."}/></p><details className="seller-tools"><summary><UiText value={"Business tools & account"}/></summary><UiNav  aria-label="Seller tools" className="replica-actions"><ButtonLink href="/seller/v-ads" secondary><UiText value={"Your V Ads"}/></ButtonLink><ButtonLink href="/membership" secondary><UiText value={"Business membership & benefits"}/></ButtonLink><ButtonLink href="/account/provider-applications" secondary><UiText value={"Business & service applications"}/></ButtonLink><ButtonLink href="/app/employer-jobs" secondary><UiText value={"Employer job postings"}/></ButtonLink><Link className="button secondary" href="#ownership" onClick={()=>setOwnershipOpen(true)}><UiText value={"Legacy business ownership"}/></Link><ButtonLink href="/account/provider-applications#assigned-leads" secondary><UiText value={"Assigned enquiries"}/></ButtonLink><ButtonLink href="/commerce" secondary><UiText value={"Browse published offers"}/></ButtonLink><ButtonLink href="/account" secondary><UiText value={"Customer account"}/></ButtonLink></UiNav></details>{error&&<Notice error message={error}/>}<section className="nested-section"><h2><UiText value={"Your services & businesses"}/></h2>{businesses===null&&!error?<p role="status"><UiText value={"Loading your businesses..."}/></p>:businesses?.length?businesses.map(b=><article className="help-card" key={b.id}><h3>{b.company||b.name}</h3><p><UiText value={businessProgress(b)}/></p><SellerRecentListings businessId={b.id}/><ButtonLink href={'/seller/commerce/'+b.id} secondary><UiText value={"Manage services & products"}/></ButtonLink><ButtonLink href={'/seller/business/'+b.id} secondary><UiText value={"Business details"}/></ButtonLink></article>):!error&&<UiElement as={EmptyState} title="No owned business yet" description="List your business in 3 easy steps or request ownership of a legacy business." href="/seller/onboard" label="List your business"/>}</section><details id="ownership" className="nested-section" open={ownershipOpen} onToggle={event=>setOwnershipOpen(event.currentTarget.open)}><summary><UiText value={"Claim an existing business"}/></summary><SellerOwnershipClaims/></details></div>;

}export function AdminOwnershipClaims(){
  const {user,loading,error}=useUser();
  if(loading)return <div className="container page" role="status"><UiText value={"Loading administrator access…"}/></div>;
  if(error)return <div className="container page"><Notice error message={error}/></div>;
  if(!user)return <div className="container page"><ButtonLink href="/login?next=%2Fadmin%2Fownership-claims"><UiText value={"Sign in"}/></ButtonLink></div>;
  if(user.role!=='ADMIN')return <div className="container page"><UiElement as={EmptyState} title="Administrator access required" description="Seller capability does not grant administrator access."/></div>;
  return <AdminOwnershipClaimQueue currentUserId={user.id}/>;
}
