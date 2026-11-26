"use client";

import { useEffect,useState } from "react";

const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:8000/api/v1";

function token(){
  if(typeof window==="undefined")return "";
  const keys=["access_token","token","vistrah_access_token","auth_token"];
  for(const key of keys){
    const v=localStorage.getItem(key);
    if(v&&v.split(".").length===3)return v;
  }
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(!key)continue;
    const v=localStorage.getItem(key);
    if(v&&v.split(".").length===3)return v;
  }
  return "";
}

async function api(path:string){
  const r=await fetch(`${API}${path}`,{headers:{Authorization:`Bearer ${token()}`}});
  if(!r.ok)throw new Error(await r.text()||`Request failed: ${r.status}`);
  return r.json();
}

function Table({rows,title}:{rows:any[];title:string}){
  const cols=rows?.length?Object.keys(rows[0]).slice(0,12):[];
  return <section style={{marginBottom:28}}>
    <h2 style={{fontSize:18,marginBottom:12}}>{title}</h2>
    {!rows?.length?<div className="empty">No records available</div>:
    <div className="table-wrap"><table><thead><tr>{cols.map(c=><th key={c}>{c.replaceAll("_"," ")}</th>)}</tr></thead>
    <tbody>{rows.map((r,i)=><tr key={r.id||i}>{cols.map(c=>{const value=r[c];const sensitive=/(pan|aadhaar|account_number|account_no|bank_account)/i.test(c)&&!/_masked$/i.test(c);const display=sensitive&&value?`••••${String(value).slice(-4)}`:typeof value==="object"?"Details available":String(value??"-");return <td key={c}>{display}</td>})}</tr>)}</tbody>
    </table></div>}
  </section>;
}

export default function Company(){
  const [data,setData]=useState<any>({});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  useEffect(()=>{(async()=>{
    try{
      const [profile,shareholders,banks,employees]=await Promise.all([
        api("/admin/company-profile"),
        api("/admin/company-shareholders"),
        api("/admin/company-bank-accounts"),
        api("/admin/company-employees")
      ]);
      setData({profile,shareholders,banks,employees});
    }catch(e:any){setError(e?.message||"Unable to load company data");}finally{setLoading(false);}
  })()},[]);
  const profile=Array.isArray(data.profile)?data.profile:data.profile?[data.profile]:[];
  return <div>
    <div className="page-heading"><div><h1>VISTRAH Company</h1><p>Company structure, ownership, banking and employee details.</p></div></div>
    {loading&&<div className="loading" role="status">Loading company records…</div>}
    {error&&<div className="error">{error}</div>}
    <Table title="Company Profile" rows={profile}/>
    <Table title="Founders & Shareholders" rows={data.shareholders||[]}/>
    <Table title="Bank Accounts" rows={data.banks||[]}/>
    <Table title="Employees" rows={data.employees||[]}/>
  </div>;
}
