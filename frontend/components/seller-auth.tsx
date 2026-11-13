'use client';
import {UiText} from "./localized-ui";
import {redirect,usePathname} from 'next/navigation';
import Link from 'next/link';
import {BriefcaseBusiness,ArrowRight} from 'lucide-react';
import {useState} from 'react';
import {AuthForm,useUser} from './customer';
import {Notice} from './ui';
import {api} from '@/lib/api';
import {websiteLoginDestination} from '@/lib/login-destination';

export function SellerEntry({secondary=false,footer=false}:{secondary?:boolean;footer?:boolean}){
  const path=usePathname();
  return <SellerEntryState key={path} secondary={secondary} footer={footer}/>;
}
function SellerEntryState({secondary,footer}:{secondary:boolean;footer:boolean}){
  const {user,loading,error}=useUser(true,'seller');
  const className='button'+(secondary?' secondary':'');
  if(loading||error)return <button type="button" className={className} disabled><UiText value={loading?'Checking seller session...':'Seller access unavailable'}/></button>;
  const seller=Boolean(user?.seller_enabled);
  if(seller&&footer)return <SellerLogout/>;
  if(seller)return <span className={className} role="status" style={{cursor:'default',whiteSpace:'normal',textAlign:'center',maxWidth:'100%'}}><UiText value={"Welcome, "}/>{user!.name}</span>;
  return <Link className="button seller-sign-in" href="/seller/register?next=%2Fservices"><span className="seller-sign-in-icon" aria-hidden="true"><BriefcaseBusiness size={18}/></span><span><UiText value={"Login/Signup as seller"}/></span><ArrowRight size={20} aria-hidden="true"/></Link>;
}

function SellerLogout(){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function logout(){if(busy)return;setBusy(true);setError('');try{
    await api('/auth/logout',{method:'POST',headers:{'X-Vistrah-Session':'seller'}});
    // Reload so every independent identity reader drops its previous seller state.
    window.location.assign('/services');
  }catch(error){setError((error as Error).message);setBusy(false);}}
  return <div>{error&&<Notice error message={error}/>}<button type="button" className="button secondary" disabled={busy} onClick={()=>void logout()}><UiText value={busy?'Logging out...':'Logout as seller'}/></button></div>;
}

export function SellerAuth({register=false,nextPath}:{register?:boolean;nextPath?:string}){
  const {user,loading,error}=useUser(true,'seller');
  if(loading)return <main className="container page" role="status"><UiText value={"Checking seller session…"}/></main>;
  if(error)return <main className="container page"><Notice error message={error}/></main>;
  if(user?.seller_enabled)redirect(websiteLoginDestination(nextPath,'/seller'));
  return <AuthForm seller register={register} nextPath={nextPath}/>;
}
