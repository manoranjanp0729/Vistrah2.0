'use client';
import {UiText,UiOl} from "./localized-ui";
import Link from 'next/link';
import {useState} from 'react';
import {useUser} from './customer';
import {SellerAuth} from './seller-auth';
import {Notice} from './ui';
import {api} from '@/lib/api';
import {useCommerceResource} from '@/lib/use-commerce-resource';
import {serviceJourneySteps} from '../../shared/seller-journey';
import {listingInput} from '../../shared/commerce';
import {addServiceUrl,businessInput,emptyBusiness,serviceListingForm,type ServiceSelection,type SellerBusiness} from '../../shared/service-listing';

export function AddService({selection,title,pathLabel}:{selection:ServiceSelection;title:string;pathLabel:string}){
  const {user,loading,error}=useUser(true,'seller');
  if(loading)return <p role="status"><UiText value={"Checking seller access..."}/></p>;
  if(error)return <Notice error message={error}/>;
  if(!user?.seller_enabled)return <SellerAuth nextPath={addServiceUrl(selection)}/>;
  return <ServiceForm key={user.id+':'+JSON.stringify(selection)} selection={selection} title={title} pathLabel={pathLabel}/>;
}
function ServiceForm({selection,title,pathLabel}:{selection:ServiceSelection;title:string;pathLabel:string}){
  const businesses=useCommerceResource<SellerBusiness[]>('/seller/businesses');
  const [business,setBusiness]=useState(''),[profile,setProfile]=useState(emptyBusiness),[created,setCreated]=useState<SellerBusiness|null>(null);
  const [form,setForm]=useState(()=>serviceListingForm(selection,title)),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState<{businessId:string;listingId:string}|null>(null);
  const selected=created?String(created.id):business;
  async function save(event:React.FormEvent){event.preventDefault();if(busy)return;setBusy(true);setError('');try{
    const payload=listingInput(form);
    let id=selected;
    if(!id||id==='new'){const row=await api<SellerBusiness>('/seller/businesses',{method:'POST',body:JSON.stringify(businessInput(profile))});setCreated(row);id=String(row.id);}
    const row=await api<{id:string}>('/seller/businesses/'+id+'/commerce-listings',{method:'POST',body:JSON.stringify(payload)});
    setSaved({businessId:id,listingId:row.id});
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  if(saved)return <div className="container page"><h1><UiText value={"Add your service"}/></h1><h2><UiText value={"Draft saved"}/></h2><Notice message="Your service is private. Review the saved details and select Submit for review when ready."/><UiOl  className="seller-journey" aria-label="Service publication steps">{serviceJourneySteps.map((step,index)=><li key={step} aria-current={index===1?'step':undefined}>{index+1}. {step}</li>)}</UiOl><Link className="button" href={'/seller/commerce/'+saved.businessId+'?focus='+saved.listingId}><UiText value={"Review and submit draft"}/></Link><p><UiText value={"Business verification and an independent admin approval are required before your service can go live."}/></p><Link href="/seller"><UiText value={"Seller dashboard"}/></Link></div>;
  return <div className="container page"><Link href={'/services?'+new URLSearchParams(selection)}><UiText value={"Back to listing type"}/></Link><h1><UiText value={"Add your service"}/></h1><p>{pathLabel}</p><UiOl  className="seller-journey" aria-label="Service publication steps">{serviceJourneySteps.map((step,index)=><li key={step} aria-current={index===0?'step':undefined}>{index+1}. {step}</li>)}</UiOl><p><UiText value={"Save a private draft, then submit it from your business page. An independent admin must approve it before customers can see it. New businesses also need verification and activation."}/></p>{error&&<Notice error message={error}/>}{businesses.loading?<p role="status"><UiText value={"Loading your businesses..."}/></p>:businesses.error?<><Notice error message={businesses.error.message}/><button className="button secondary" onClick={businesses.retry}><UiText value={"Try again"}/></button></>:<form className="form" onSubmit={save}><fieldset disabled={busy}><legend><UiText value={"Business & service details"}/></legend>{created?<p>{created.company} <UiText value={"- awaiting business verification"}/></p>:<label><UiText value={"Business"}/><select required value={business} onChange={e=>setBusiness(e.target.value)}><option value=""><UiText value={"Choose a business"}/></option>{businesses.data?.map(row=><option key={row.id} value={row.id}>{row.company||row.name} - {row.verification_status}</option>)}<option value="new"><UiText value={"Add a new business"}/></option></select></label>}{!created&&business==='new'&&(['name','company','phone','address','location'] as const).map(key=><label key={key}>{({name:'Contact name',company:'Business name',phone:'Business phone',address:'Business address',location:'Locality'})[key]}<input required value={profile[key]} maxLength={key==='address'?1000:key==='phone'?20:150} onChange={e=>setProfile(current=>({...current,[key]:e.target.value}))}/></label>)}<label><UiText value={"Service title"}/><input required minLength={2} maxLength={150} value={form.title} onChange={e=>setForm(current=>({...current,title:e.target.value}))}/></label><label><UiText value={"Description"}/><textarea required minLength={20} maxLength={6000} value={form.description} onChange={e=>setForm(current=>({...current,description:e.target.value}))}/></label><label><UiText value={"Price in rupees"}/><input required inputMode="decimal" value={form.price} onChange={e=>setForm(current=>({...current,price:e.target.value}))}/></label><button className="button" disabled={busy||!selected}><UiText value={busy?'Saving...':'Save service draft'}/></button></fieldset></form>}<p><Link href="/seller"><UiText value={"Seller dashboard"}/></Link></p></div>;
}
