'use client';
import Link from 'next/link';
import type {Category} from '@/lib/types';

type Props={
  categories:Category[];
  selected:number;
  onCategory:(id:number)=>void;
  subcategory:number|null;
  onSubcategory:(id:number|null)=>void;
  ids:number[];
  onServices:(ids:number[])=>void;
};
const cardStyle={display:'flex' as const,alignItems:'center' as const,justifyContent:'space-between' as const,gap:12,padding:'16px',textAlign:'left' as const,borderRadius:14,border:'1px solid var(--border, #cbd5e1)',background:'transparent',cursor:'pointer',minHeight:76,width:'100%'};
const layoutStyle={display:'grid' as const,gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',gap:12};
export function SellerCataloguePicker({categories,selected,onCategory,subcategory,onSubcategory,ids,onServices}:Props){
  const category=categories.find(c=>c.id===selected);
  const active=category?(subcategory===null?category.services:category.subcategories.find(s=>s.id===subcategory)?.services??[]):[];
  const parent=category?.title??'';
  const serviceParent=parent+(subcategory===null?'':` / ${category?.subcategories.find(s=>s.id===subcategory)?.title??''}`);
  const allServices=categories.flatMap(c=>[...c.services.map(service=>({service,category:c.title,section:'Direct services'})),...c.subcategories.flatMap(sub=>sub.services.map(service=>({service,category:c.title,section:sub.title})))]);
  const selectedServices=ids.map(id=>allServices.find(row=>row.service.id===id)).filter((row):row is NonNullable<typeof row>=>Boolean(row));
  return <div className="nested-section" aria-label="Seller catalogue selection">
    <h2>1. Choose a category</h2>
    <div style={layoutStyle}>{categories.map(c=><button key={c.id} type="button" aria-pressed={selected===c.id} onClick={()=>onCategory(c.id)} style={{...cardStyle,border: selected===c.id?'2px solid #e87824':cardStyle.border}}>
      <span><strong>{c.title}</strong><small style={{display:'block',marginTop:5}}>{c.subcategories.length} subcategories</small></span><span aria-hidden="true">{selected===c.id?'✓':'›'}</span>
    </button>)}
      <Link className="button secondary" style={{...cardStyle,justifyContent:'center',border:'2px dashed #e87824'}} href="/seller/catalogue-request?level=category"><span aria-hidden="true" style={{fontSize:30}}>+</span> Request category</Link>
    </div>
    {category&&<><h2>2. Choose a subcategory</h2><div style={layoutStyle}>
      <button type="button" aria-pressed={subcategory===null} style={{...cardStyle,border:subcategory===null?'2px solid #e87824':cardStyle.border}} onClick={()=>onSubcategory(null)}><strong>Direct category services</strong><span aria-hidden="true">{subcategory===null?'✓':'›'}</span></button>
      {category.subcategories.map(sub=><button type="button" key={sub.id} aria-pressed={subcategory===sub.id} style={{...cardStyle,border:subcategory===sub.id?'2px solid #e87824':cardStyle.border}} onClick={()=>onSubcategory(sub.id)}><strong>{sub.title}</strong><span aria-hidden="true">{subcategory===sub.id?'✓':'›'}</span></button>)}
      <Link className="button secondary" style={{...cardStyle,justifyContent:'center',border:'2px dashed #e87824'}} href={`/seller/catalogue-request?level=subcategory&parent=${encodeURIComponent(parent)}`}><span aria-hidden="true" style={{fontSize:30}}>+</span> Request subcategory</Link>
    </div></>}
    {category&&<><h2>3. Select services</h2><p>Choose one or more services. Each selected service will be reviewed individually.</p>
      <div style={layoutStyle}>{active.map(s=><label key={s.id} style={{...cardStyle,border:ids.includes(s.id)?'2px solid #e87824':cardStyle.border,cursor:'pointer'}}>
        <input aria-label={s.title} type="checkbox" checked={ids.includes(s.id)} onChange={e=>onServices(e.target.checked?[...ids,s.id]:ids.filter(id=>id!==s.id))}/>
        <strong style={{flex:1}}>{s.title}</strong><span aria-hidden="true">{ids.includes(s.id)?'✓':'+'}</span>
      </label>)}
      <Link className="button secondary" style={{...cardStyle,justifyContent:'center',border:'2px dashed #e87824'}} href={`/seller/catalogue-request?level=service&parent=${encodeURIComponent(serviceParent)}`}><span aria-hidden="true" style={{fontSize:30}}>+</span> Request service</Link></div>
      {!active.length&&<p className="secondary-copy">No services in this section yet. Request a service above.</p>}
      <div role="status" aria-live="polite"><strong>{ids.length} {ids.length===1?'service':'services'} selected across the catalogue</strong></div>
      {selectedServices.length>0&&<section className="nested-section" aria-label="Your selected services"><h3>Your selections</h3><ul>{selectedServices.map(row=><li key={row.service.id}><strong>{row.service.title}</strong> — {row.category} / {row.section} <button type="button" className="button secondary" style={{marginLeft:12}} onClick={()=>onServices(ids.filter(id=>id!==row.service.id))} aria-label={`Remove ${row.service.title}`}>Remove</button></li>)}</ul><button className="button secondary" type="button" onClick={()=>onServices([])}>Clear all selections</button></section>}
    </>}
  </div>;
}
