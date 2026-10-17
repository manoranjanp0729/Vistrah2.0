'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useUser} from './customer';
import {ProviderApplications} from './provider-onboarding';
import {Notice,EmptyState,ButtonLink} from './ui';
import {api} from '@/lib/api';
import type {User} from '@/lib/types';
import {BusinessPublicationEditor,type OwnedBusiness} from './publication';
import {SellerOwnershipClaims,AdminOwnershipClaimQueue} from './ownership-claims';
type Business=OwnedBusiness;

export function ProvideServiceLink(){const {user}=useUser();return <Link className="button secondary" href={user?.seller_enabled?'/seller':'/seller/login'}>Offer your expertise</Link>;}
export function SellerDashboard(){
  const {user,loading,error}=useUser();const [enabled,setEnabled]=useState(false);const [failure,setFailure]=useState('');const [busy,setBusy]=useState(false);
  async function enable(){setBusy(true);setFailure('');try{await api<User>('/auth/seller/enable',{method:'POST'});setEnabled(true);}catch(e){setFailure((e as Error).message);}finally{setBusy(false);}}
  if(loading)return <div className="container page" role="status">Loading seller access…</div>;
  if(error)return <div className="container page"><Notice error message={error}/></div>;
  if(!user)return <div className="container page"><h1>Seller access</h1><p>Customer and seller access share one VISTRAH identity. Customer membership is not required.</p><ButtonLink href="/seller/login">Login as seller</ButtonLink> <ButtonLink href="/seller/register">Sign up as seller</ButtonLink></div>;
  if(!user.seller_enabled&&!enabled)return <div className="container page"><h1>Use your account as a seller</h1><p>Keep your customer account, enquiries and history. Seller access does not approve a business or grant administrator privileges.</p>{failure&&<Notice error message={failure}/>}<button className="button" disabled={busy} onClick={enable}>Enable seller access</button></div>;
  return <SellerWorkspace/>;
}
function SellerWorkspace(){
  const [businesses,setBusinesses]=useState<Business[]>([]);const [error,setError]=useState('');
  useEffect(()=>{let alive=true;api<Business[]>('/seller/businesses').then(rows=>{if(alive)setBusinesses(rows);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[]);
  return <div className="container page"><h1>Seller Dashboard</h1><p>One account for customer and seller access. Seller onboarding does not require customer membership.</p><p>Use the existing provider application for business and per-service review. Manage business and existing listing drafts below. Add catalogue services through the existing per-service application review.</p>{error&&<Notice error message={error}/>}<ButtonLink href="/provide-service">Start a provider application</ButtonLink> <ButtonLink href="/account">Customer account</ButtonLink><section className="nested-section"><h2>Your businesses</h2>{businesses.length?businesses.map(b=><article className="help-card" key={b.id}><h3>{b.company}</h3><p>Business #{b.id} · {b.verification_status} · {b.active?'Active':'Inactive'}</p><p>Each service approval remains independent. Seller access does not grant customer access to protected provider information.</p><BusinessPublicationEditor business={b}/></article>):<EmptyState title="No explicitly owned business yet" description="New approved applications create an explicitly owned business. Existing unowned businesses require ownership review; previous applications and history remain available below."/>}</section><SellerOwnershipClaims/><ProviderApplications/></div>;
}export function AdminOwnershipClaims(){
  const {user,loading,error}=useUser();
  if(loading)return <div className="container page" role="status">Loading administrator access…</div>;
  if(error)return <div className="container page"><Notice error message={error}/></div>;
  if(!user)return <div className="container page"><ButtonLink href="/login?next=%2Fadmin%2Fownership-claims">Sign in</ButtonLink></div>;
  if(user.role!=='ADMIN')return <div className="container page"><EmptyState title="Administrator access required" description="Seller capability does not grant administrator access."/></div>;
  return <AdminOwnershipClaimQueue currentUserId={user.id}/>;
}
/** Seller-only catalogue expansion request. Email is used until a moderated request API exists. */
export function SellerCatalogueRequestCTA({level,parent}:{level:'category'|'subcategory'|'service';parent?:string}) {
  const {user,loading}=useUser();
  if(loading||!user?.seller_enabled)return null;
  const subject=`VISTRAH catalogue request: new ${level}`;
  const body=`Please review my request to add a new ${level} to the VISTRAH catalogue.\n\nExisting catalogue location: ${parent||'Top-level catalogue'}\nProposed name: \nDescription: \nBusiness name: \nRelated category/subcategory: \n\nI understand this requires VISTRAH admin approval.`;
  const mailto=`mailto:contact@vistrah.in?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return <section className="nested-section" aria-label={`Request new ${level}`}>
    <a href={mailto} className="help-card" style={{display:'flex',alignItems:'center',gap:20,textDecoration:'none',padding:'24px',border:'2px dashed currentColor',borderRadius:16}}>
      <span aria-hidden="true" style={{display:'grid',placeItems:'center',fontSize:48,fontWeight:700,lineHeight:1,width:76,height:76,flexShrink:0,borderRadius:18,background:'rgba(245,132,36,0.13)',color:'#d66b1c'}}>+</span>
      <span><strong style={{display:'block',fontSize:20}}>Request a new ${level}</strong><span style={{display:'block',marginTop:6}}>Can’t find what your business offers? Send a catalogue addition request for VISTRAH review.</span><small style={{display:'block',marginTop:8}}>Opens your email app; submission is not automatic.</small></span>
    </a>
  </section>;
}
