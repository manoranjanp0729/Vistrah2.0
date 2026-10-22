'use client';
import {UiText,UiElement,UiNav} from "./localized-ui";
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useUser} from './customer';
import {Notice,EmptyState,ButtonLink} from './ui';
import {api} from '@/lib/api';
import type {User} from '@/lib/types';
import {BusinessPublicationEditor,type OwnedBusiness} from './publication';
import {SellerOwnershipClaims,AdminOwnershipClaimQueue} from './ownership-claims';
import {SellerCommerce} from './commerce';
import {businessProgress} from '../../shared/seller-journey';
import {SellerRecentListings} from './seller-recent-listings';
type Business=OwnedBusiness;

export function ProvideServiceLink(){const {user}=useUser(false,'seller');return <Link className="button secondary" href={user?.seller_enabled?'/seller':'/seller/login'}><UiText value={"Offer your expertise"}/></Link>;}
export function SellerDashboard({businessId,listingsOnly=false}:{businessId?:number;listingsOnly?:boolean}={}){
  const {user,loading,error}=useUser(false,'seller');const [enabled,setEnabled]=useState(false);const [failure,setFailure]=useState('');const [busy,setBusy]=useState(false);
  async function enable(){setBusy(true);setFailure('');try{await api<User>('/auth/seller/enable',{method:'POST'});setEnabled(true);}catch(e){setFailure((e as Error).message);}finally{setBusy(false);}}
  if(loading)return <div className="container page" role="status"><UiText value={"Loading seller access…"}/></div>;
  if(error)return <div className="container page"><Notice error message={error}/></div>;
  if(!user)return <div className="container page"><h1><UiText value={"Seller access"}/></h1><p><UiText value={"Sign in separately as a seller using your VISTRAH email and password. Your customer session stays independent. Customer membership is not required."}/></p><ButtonLink href={businessId?'/seller/login?next='+encodeURIComponent('/seller/'+(listingsOnly?'commerce/':'business/')+businessId):'/seller/login'}><UiText value={"Login as seller"}/></ButtonLink> <ButtonLink href={businessId?'/seller/register?next='+encodeURIComponent('/seller/'+(listingsOnly?'commerce/':'business/')+businessId):'/seller/register'}><UiText value={"Sign up as seller"}/></ButtonLink></div>;
  if(!user.seller_enabled&&!enabled)return <div className="container page"><h1><UiText value={"Use your account as a seller"}/></h1><p><UiText value={"Keep your customer account, enquiries and history. Seller access does not approve a business or grant administrator privileges."}/></p>{failure&&<Notice error message={failure}/>}<button className="button" disabled={busy} onClick={enable}><UiText value={"Enable seller access"}/></button></div>;
  return <SellerWorkspace businessId={businessId} listingsOnly={listingsOnly}/>;
}
function SellerWorkspace({businessId,listingsOnly}:{businessId?:number;listingsOnly:boolean}){
  const [businesses,setBusinesses]=useState<Business[]|null>(null);const [error,setError]=useState('');const [ownershipOpen,setOwnershipOpen]=useState(false);
  useEffect(()=>{let alive=true;api<Business[]>('/seller/businesses').then(rows=>{if(alive)setBusinesses(rows);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[]);
  if(businessId!==undefined){
    const business=businesses?.find(row=>row.id===businessId);
    return <div className="container page"><ButtonLink href="/seller" secondary><UiText value={"Seller dashboard"}/></ButtonLink><h1><UiText value={listingsOnly?'Your services & products':'Business details'}/></h1>{error?<Notice error message={error}/>:businesses===null?<p role="status"><UiText value={"Loading your business..."}/></p>:business?<><h2>{business.company||business.name}</h2><p><UiText value={businessProgress(business)}/></p>{listingsOnly?<SellerCommerce businessId={business.id}/>:<><ButtonLink href={'/seller/commerce/'+business.id}><UiText value={"Manage services & products"}/></ButtonLink><BusinessPublicationEditor business={business}/></>}</>:<UiElement as={EmptyState} title="Business unavailable" description="Choose a business you own from your seller dashboard."/>}</div>;
  }
  return <div className="container page"><h1><UiText value={"Seller dashboard"}/></h1><p><UiText value={"Manage your businesses, applications, service listings and job postings. Each business and service needs independent review."}/></p><ButtonLink href="/services"><UiText value={"+ Add service"}/></ButtonLink><p><UiText value={"Choose a Listing Type, save your draft, then submit it for review."}/></p><details className="seller-tools"><summary><UiText value={"Business tools & account"}/></summary><UiNav  aria-label="Seller tools" className="replica-actions"><ButtonLink href="/seller/v-ads" secondary><UiText value={"Your V Ads"}/></ButtonLink><ButtonLink href="/membership" secondary><UiText value={"Business membership & benefits"}/></ButtonLink><ButtonLink href="/account/provider-applications" secondary><UiText value={"Business & service applications"}/></ButtonLink><ButtonLink href="/app/employer-jobs" secondary><UiText value={"Employer job postings"}/></ButtonLink><Link className="button secondary" href="#ownership" onClick={()=>setOwnershipOpen(true)}><UiText value={"Legacy business ownership"}/></Link><ButtonLink href="/account/provider-applications#assigned-leads" secondary><UiText value={"Assigned enquiries"}/></ButtonLink><ButtonLink href="/commerce" secondary><UiText value={"Browse published offers"}/></ButtonLink><ButtonLink href="/account" secondary><UiText value={"Customer account"}/></ButtonLink></UiNav></details>{error&&<Notice error message={error}/>}<section className="nested-section"><h2><UiText value={"Your services & businesses"}/></h2>{businesses===null&&!error?<p role="status"><UiText value={"Loading your businesses..."}/></p>:businesses?.length?businesses.map(b=><article className="help-card" key={b.id}><h3>{b.company||b.name}</h3><p><UiText value={businessProgress(b)}/></p><SellerRecentListings businessId={b.id}/><ButtonLink href={'/seller/commerce/'+b.id} secondary><UiText value={"Manage services & products"}/></ButtonLink><ButtonLink href={'/seller/business/'+b.id} secondary><UiText value={"Business details"}/></ButtonLink></article>):!error&&<UiElement as={EmptyState} title="No owned business yet" description="Start a business application or request ownership of a legacy business."/>}</section><details id="ownership" className="nested-section" open={ownershipOpen} onToggle={event=>setOwnershipOpen(event.currentTarget.open)}><summary><UiText value={"Claim an existing business"}/></summary><SellerOwnershipClaims/></details></div>;

}export function AdminOwnershipClaims(){
  const {user,loading,error}=useUser();
  if(loading)return <div className="container page" role="status"><UiText value={"Loading administrator access…"}/></div>;
  if(error)return <div className="container page"><Notice error message={error}/></div>;
  if(!user)return <div className="container page"><ButtonLink href="/login?next=%2Fadmin%2Fownership-claims"><UiText value={"Sign in"}/></ButtonLink></div>;
  if(user.role!=='ADMIN')return <div className="container page"><UiElement as={EmptyState} title="Administrator access required" description="Seller capability does not grant administrator access."/></div>;
  return <AdminOwnershipClaimQueue currentUserId={user.id}/>;
}
