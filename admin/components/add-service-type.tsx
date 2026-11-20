'use client';
import {useState} from 'react';
import {api} from '@/lib/api';
import {FLAGSHIP_SECTORS} from '../../shared/flagship-sectors';

export function AddServiceType() {
  const [open,setOpen]=useState(false),[category,setCategory]=useState<string>(FLAGSHIP_SECTORS[0].slug),[title,setTitle]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  return <section><button className="button secondary" type="button" onClick={()=>setOpen(v=>!v)}>Other / Add New Listing Type</button>{open&&<form className="form" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{await api('/admin/provider-onboarding/service-types',{method:'POST',body:JSON.stringify({category,title})});window.location.reload();}catch(error){setMessage((error as Error).message);}finally{setBusy(false);}}}><label>Main category<select value={category} onChange={e=>setCategory(e.target.value)}>{FLAGSHIP_SECTORS.map(c=><option key={c.slug} value={c.slug}>{c.title}</option>)}</select></label><label>New direct service type<input value={title} onChange={e=>setTitle(e.target.value)} minLength={2} maxLength={100} required/></label><p>Publish a service type directly under this category. Business listings still require their own review.</p><button disabled={busy} className="button">Add service type</button>{message&&<p role="alert">{message}</p>}</form>}</section>;
}
