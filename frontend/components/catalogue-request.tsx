'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {api} from '@/lib/api';
import {useUser} from './customer';

type Level='category'|'subcategory'|'service';
type Entry={id:string;level:Level;parent:string;title:string;description:string;business_name:string;status:string;review_note:string;created_at:string};
export function SellerCatalogueRequestCTA({level,parent}:{level:Level;parent?:string}) {
  const {user,loading}=useUser();
  if(loading||!user?.seller_enabled)return null;
  const href=`/seller/catalogue-request?level=${encodeURIComponent(level)}&parent=${encodeURIComponent(parent||'')}`;
  return <section className="nested-section" aria-label={`Request new ${level}`}>
    <Link href={href} className="help-card" style={{display:'flex',alignItems:'center',gap:20,textDecoration:'none',padding:24,border:'2px dashed currentColor',borderRadius:16}}>
      <span aria-hidden="true" style={{display:'grid',placeItems:'center',fontSize:48,fontWeight:700,width:76,height:76,flexShrink:0,borderRadius:18,background:'rgba(245,132,36,0.13)',color:'#d66b1c'}}>+</span>
      <span><strong style={{display:'block',fontSize:20}}>Request a new {level}</strong><span style={{display:'block',marginTop:6}}>Not listed? Submit an addition for VISTRAH admin review.</span></span>
    </Link>
  </section>;
}
export function CatalogueRequestForm({level,parent}:{level:Level;parent:string}) {
  const {user,loading}=useUser();const [title,setTitle]=useState('');const [description,setDescription]=useState('');const [business,setBusiness]=useState('');const [parentValue,setParentValue]=useState(parent);const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [done,setDone]=useState(false);
  if(loading)return <p role="status">Checking seller access…</p>;
  if(!user?.seller_enabled)return <p>Seller access is required. <Link href="/seller/login">Sign in as seller</Link>.</p>;
  if(done)return <div role="status" className="notice"><h2>Request submitted</h2><p>Your request is pending VISTRAH review. Nothing has been published to the catalogue.</p><Link href="/seller">Return to seller dashboard</Link></div>;
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setSaving(true);setError('');try{await api('/seller/catalogue-requests',{method:'POST',body:JSON.stringify({level,parent:parentValue,title,description,business_name:business})});setDone(true);}catch(e){setError((e as Error).message);}finally{setSaving(false);}}
  return <form onSubmit={submit} className="form provider-section" style={{maxWidth:640}}>
    <p>Request a new {level}. VISTRAH reviews every request before it can be added to the catalogue.</p>
    {level!=='category'&&<label>Parent category / subcategory<input required maxLength={300} value={parentValue} onChange={e=>setParentValue(e.target.value)}/></label>}
    <label>Requested {level} name<input required minLength={3} maxLength={150} value={title} onChange={e=>setTitle(e.target.value)}/></label>
    <label>Description<textarea required minLength={10} maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)}/></label>
    <label>Business name<input required minLength={2} maxLength={150} value={business} onChange={e=>setBusiness(e.target.value)}/></label>
    {error&&<p role="alert" className="notice">{error}</p>}
    <button type="submit" className="button" disabled={saving}>{saving?'Submitting…':'Submit for admin review'}</button>
  </form>;
}
export function MyCatalogueRequests(){
  const [rows,setRows]=useState<Entry[]>([]);const [error,setError]=useState('');
  useEffect(()=>{api<Entry[]>('/seller/catalogue-requests').then(setRows).catch(e=>setError(e.message));},[]);
  return <section className="nested-section"><h2>Catalogue requests</h2>{error&&<p role="alert">{error}</p>}
    <Link className="button secondary" href="/seller/catalogue-request">Request a new category</Link>
    {rows.map(row=><article className="help-card" key={row.id}><strong>{row.title}</strong><p>{row.level} · {row.status}</p>{row.review_note&&<p>Admin feedback: {row.review_note}</p>}</article>)}
  </section>;
}
export function AdminCatalogueRequests(){
  const {user,loading}=useUser();const [rows,setRows]=useState<Entry[]>([]);const [error,setError]=useState('');const [working,setWorking]=useState('');const [notes,setNotes]=useState<Record<string,string>>({});
  useEffect(()=>{if(user?.role==='ADMIN')api<Entry[]>('/admin/catalogue-requests').then(setRows).catch(e=>setError(e.message));},[user]);
  if(loading)return <p role="status">Checking admin access…</p>;
  if(user?.role!=='ADMIN')return <p>Administrator access required.</p>;
  async function review(id:string,decision:'APPROVED'|'REJECTED'){setWorking(id);setError('');try{const changed=await api<Entry>(`/admin/catalogue-requests/${id}/review`,{method:'POST',body:JSON.stringify({decision,note:notes[id]||''})});setRows(old=>old.map(row=>row.id===id?changed:row));}catch(e){setError((e as Error).message);}finally{setWorking('');}}
  return <section><h1>Catalogue requests</h1><p>Approval is an editorial decision only. Catalogue publication remains a separate admin action.</p>{error&&<p role="alert">{error}</p>}
    {rows.map(row=><article className="help-card" key={row.id}><h2>{row.title}</h2><p>{row.level} · {row.parent||'Top level'} · {row.status}</p><p>{row.description}</p><p>Business: {row.business_name}</p>{row.status==='PENDING'?<><label>Review note<textarea value={notes[row.id]||''} maxLength={2000} onChange={e=>setNotes(old=>({...old,[row.id]:e.target.value}))}/></label><div className="button-row"><button className="button" disabled={working===row.id||(notes[row.id]||'').trim().length<5} onClick={()=>review(row.id,'APPROVED')}>Approve request</button><button className="button secondary" disabled={working===row.id||(notes[row.id]||'').trim().length<5} onClick={()=>review(row.id,'REJECTED')}>Reject request</button></div></>:<p>Review: {row.review_note}</p>}</article>)}
    {!rows.length&&!error&&<p>No requests found.</p>}
  </section>;
}
