'use client';
import {AdminRecord} from './admin-record';
import {useEffect,useState} from 'react';
import {api} from '@/lib/api';
type Job={id:string;provider_id:number;actor_id:number;title:string;employer:string;description:string;location:string;arrangement:string;employment_type:string;salary_text:string;application_url:string;deadline:string|null;status:string;revision:number;review_note:string};
type Page={items:Job[];total:number;page_size:number};
export function EmployerJobReviews(){
  const [status,setStatus]=useState('SUBMITTED'),[page,setPage]=useState(1),[snapshot,setSnapshot]=useState<{key:string;data?:Page;error?:string}>({key:''}),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[version,setVersion]=useState(0),[reasons,setReasons]=useState<Record<string,string>>({});
  const key=status+'|'+page+'|'+version;
  const result=snapshot.key===key?snapshot.data:null;
  const loading=snapshot.key!==key;
  const loadError=snapshot.key===key?snapshot.error:'';
  useEffect(()=>{
    const controller=new AbortController();
    api<Page>('/admin/employer-jobs?page='+page+'&status='+status,{signal:controller.signal})
      .then(data=>{if(!controller.signal.aborted)setSnapshot({key,data});})
      .catch(e=>{if(!controller.signal.aborted)setSnapshot({key,error:e.message});});
    return()=>controller.abort();
  },[key,page,status]);
  async function review(job:Job,decision:'APPROVED'|'REJECTED'){
    const reason=(reasons[job.id]??'').trim();if(reason.length<10){setError('Enter a review reason of at least 10 characters.');return;}
    setBusy(true);setError('');setNotice('');try{await api('/admin/employer-jobs/'+job.id+'/review',{method:'POST',body:JSON.stringify({revision:job.revision,status:decision,reason})});setNotice(decision==='APPROVED'?'Job approved and published.':'Job rejected. The employer can edit and resubmit.');setReasons(current=>{const next={...current};delete next[job.id];return next;});}catch(e){setError((e as Error).message);}finally{setBusy(false);setVersion(value=>value+1);}
  }
  return <section><p>Review employer identity, role details, deadline and the application destination before publishing. Employers cannot approve their own postings.</p>
    <label>Status <select value={status} disabled={busy} onChange={e=>{setStatus(e.target.value);setPage(1);setNotice('');setError('');}}>{['SUBMITTED','APPROVED','REJECTED','DRAFT','CLOSED'].map(value=><option key={value}>{value}</option>)}</select></label>
    {(error||loadError)&&<p role="alert" className="notice error">{error||loadError}</p>}{notice&&<p role="status" className="notice">{notice}</p>}
    {loading?<p role="status">Loading job postings…</p>:result?.items.length?result.items.map(job=><AdminRecord key={job.id} title={<>{job.title}</>} meta={job.status}><p><strong>{job.employer}</strong> · {job.location} · {job.arrangement} · {job.employment_type.replaceAll('_',' ')}</p><p>Status: {job.status} · Revision: {job.revision}</p><p>{job.salary_text||'Salary not supplied'} · Deadline: {job.deadline||'Not supplied'}</p><p style={{whiteSpace:'pre-wrap'}}>{job.description}</p><p>Application destination: <a href={job.application_url} target="_blank" rel="noopener noreferrer">{job.application_url}</a></p>{job.review_note&&<p>Previous review: {job.review_note}</p>}
      {job.status==='SUBMITTED'&&<><label htmlFor={'reason-'+job.id}>Review reason</label><textarea id={'reason-'+job.id} minLength={10} maxLength={2000} disabled={busy} value={reasons[job.id]??''} onChange={e=>setReasons(current=>({...current,[job.id]:e.target.value}))} style={{display:'block',width:'100%',minHeight:90,margin:'8px 0'}}/><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button className="button" disabled={busy} onClick={()=>void review(job,'APPROVED')}>Approve and publish</button><button className="button secondary" disabled={busy} onClick={()=>void review(job,'REJECTED')}>Reject</button></div></>}
    </AdminRecord>):!loadError&&<p>No {status.toLowerCase()} job postings.</p>}
    {loadError&&!result&&<button className="button secondary" disabled={busy} onClick={()=>{setError('');setVersion(value=>value+1);}}>Try again</button>}
    <div style={{display:'flex',gap:12,alignItems:'center',marginTop:20}}>{page>1&&<button className="button secondary" disabled={busy||loading} onClick={()=>setPage(value=>value-1)}>Previous</button>}<span>Page {page}</span>{page*(result?.page_size??20)<(result?.total??0)&&<button className="button secondary" disabled={busy||loading} onClick={()=>setPage(value=>value+1)}>Next</button>}</div>
  </section>;
}
