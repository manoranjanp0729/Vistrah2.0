"use client";

import { useEffect, useState } from "react";

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
  const r=await fetch(`${API}${path}`,{
    headers:{Authorization:`Bearer ${token()}`}
  });
  if(!r.ok)throw new Error(await r.text()||`Request failed: ${r.status}`);
  return r.json();
}

function Table({rows,title}:{rows:any[];title:string}){
  const cols=rows?.length?Object.keys(rows[0]).slice(0,10):[];
  return <section style={{marginBottom:28}}>
    <h2 style={{fontSize:18,marginBottom:12}}>{title}</h2>
    {!rows?.length?<div className="empty">No records available</div>:
    <div className="table-wrap"><table><thead><tr>{cols.map(c=><th key={c}>{c.replaceAll("_"," ")}</th>)}</tr></thead>
    <tbody>{rows.map((r,i)=><tr key={r.id||i}>{cols.map(c=>{const value=r[c];const amount=/(amount|total|fee|tax|net)/i.test(c)&&typeof value==="number";const date=/(created_at|updated_at|paid_at|settled_at)/i.test(c)&&value;const display=amount?`₹${(value/100).toLocaleString("en-IN")}`:date?new Date(value).toLocaleString("en-IN"):typeof value==="object"?"Details available":String(value??"-");return <td key={c}>{display}</td>})}</tr>)}</tbody>
    </table></div>}
  </section>;
}

export default function Payments(){
  const [data,setData]=useState<any>({});
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  useEffect(()=>{(async()=>{
    try{
      const [transactions,refunds,settlements]=await Promise.all([
        api("/admin/payments"),
        api("/admin/payment-refunds"),
        api("/admin/payment-settlements")
      ]);
      setData({transactions,refunds,settlements});
    }catch(e:any){setError(e?.message||"Unable to load payment data");}finally{setLoading(false);}
  })()},[]);
  return <div>
    <div className="page-heading"><div><h1>Payments</h1><p>View VISTRAH payment transactions, refunds and settlements.</p></div></div>
    {loading&&<div className="loading" role="status">Loading payment records…</div>}
    {error&&<div className="error">{error}</div>}
    <Table title="Payment Transactions" rows={data.transactions||[]}/>
    <Table title="Refunds" rows={data.refunds||[]}/>
    <Table title="Settlements" rows={data.settlements||[]}/>
  </div>;
}
