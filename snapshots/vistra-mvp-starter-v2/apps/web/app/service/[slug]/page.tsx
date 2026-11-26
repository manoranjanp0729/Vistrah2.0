 "use client";
import {useEffect,useState} from "react";
import {useParams,useRouter} from "next/navigation";

const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:8000/api/v1";

export default function ServicePage(){
 const {slug}=useParams<{slug:string}>(); const router=useRouter();
 const [services,setServices]=useState<any[]>([]); const [selected,setSelected]=useState<any|null>(null);
 const [fields,setFields]=useState<any[]>([]); const [values,setValues]=useState<Record<string,string>>({});
 const [submitted,setSubmitted]=useState<any|null>(null); const [loading,setLoading]=useState(false);
 useEffect(()=>{fetch(`${API}/categories/${slug}/services`).then(r=>r.json()).then(setServices)},[slug]);
 const choose=async(s:any)=>{setSelected(s); const r=await fetch(`${API}/services/${s.id}/requirements`); setFields(await r.json()); setValues({});};
 const submit=async(e:React.FormEvent)=>{e.preventDefault(); if(!selected)return; setLoading(true);
   const r=await fetch(`${API}/applications`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
     user_id:"local-demo-user",service_id:selected.id,requirement_data:values
   })});
   const data=await r.json(); setSubmitted(data); setLoading(false);
 };
 if(submitted) return <main className="container"><div className="top"><a href="/">← Home</a><div className="logo">VISTRA</div></div>
   <section className="hero"><h1>✓ Application Submitted</h1><p>Your request has been received by Vistra and our team can start working on it.</p>
   <div className="card"><h2>{submitted.application_number}</h2><p>Status: <strong>SUBMITTED</strong></p><p>{submitted.final_amount_paise ? `Amount: ₹${submitted.final_amount_paise/100}` : "Quotation: Vistra will review your requirement and provide a quote."}</p>
   <button className="pill" onClick={()=>router.push("/")}>Back to Home</button></div></section></main>;
 return <main className="container"><div className="top"><a href="/">← Back</a><div className="logo">VISTRA</div></div>
  {!selected ? <><h1>{slug.replaceAll("-"," ")}</h1><p className="muted">Choose what you need.</p><section className="grid">{services.map(s=>
    <article className="card" key={s.id} onClick={()=>choose(s)}><h2>{s.name}</h2><p className="muted">{s.description}</p><span className="pill">Continue →</span></article>)}</section></>
  : <><h1>{selected.name}</h1><p className="muted">Tell us what you need. Required fields are marked.</p>
    <form onSubmit={submit} className="card">
      {fields.map(f=><div key={f.field_key} style={{marginBottom:16}}><label><strong>{f.label}{f.required?" *":""}</strong><br/>
        {f.field_type==="select"?<select required={f.required} value={values[f.field_key]||""} onChange={e=>setValues({...values,[f.field_key]:e.target.value})} className="search"><option value="">Select</option>{(f.options_json||[]).map((o:string)=><option key={o}>{o}</option>)}</select>
        :f.field_type==="textarea"?<textarea required={f.required} value={values[f.field_key]||""} onChange={e=>setValues({...values,[f.field_key]:e.target.value})} className="search" rows={4}/>
        :<input required={f.required} value={values[f.field_key]||""} onChange={e=>setValues({...values,[f.field_key]:e.target.value})} className="search"/>}
      </label></div>)}
      <button disabled={loading} className="pill" type="submit">{loading?"Submitting...":"Continue →"}</button>
    </form></>}
 </main>;
}
