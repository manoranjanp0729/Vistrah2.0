'use client';
import {ContextHelp,HelpPair} from './context-help';
import Link from 'next/link';
import {useState,useEffect,useCallback} from 'react';
import {Plus,Minus} from 'lucide-react';
import {AuthGate} from './customer';
import {RequirementForm,downloadEvidence} from './provider-forms';
import {Notice,Status,EmptyState,ButtonLink} from './ui';
import {api,ApiError,date} from '@/lib/api';
import {editable,onboardingUrl,type Answers,type ProviderApplication,type ApplicationSummary,type FieldError} from '@/lib/provider-requirements';
import {addCatalogueService,removeCatalogueService,type CatalogueSelection} from '@/lib/catalogue-selection';
import {catalogueKindLabel,type CatalogueRequest,type CatalogueRequestKind} from '@/lib/catalogue-requests';
import type {Category} from '@/lib/types';

export function ProviderOnboarding({categories,categoryId,applicationId,providerId}:{categories:Category[];categoryId?:number;applicationId?:string;providerId?:number}){
  const next=applicationId?`/provide-service?application=${encodeURIComponent(applicationId)}`:providerId?`/provide-service?business=${providerId}${categoryId?`&category=${categoryId}`:''}`:categoryId?onboardingUrl(categoryId):'/provide-service';
  return <AuthGate next={next}>{()=> <div className="container page"><OnboardingInner categories={categories} categoryId={categoryId} applicationId={applicationId} providerId={providerId}/></div>}</AuthGate>;
}
function OnboardingInner({categories,categoryId,applicationId,providerId}:{categories:Category[];categoryId?:number;applicationId?:string;providerId?:number}){
  const [selected,setSelected]=useState(categoryId??categories[0]?.id??0);const [subcategory,setSubcategory]=useState<number|null>(null);const [groups,setGroups]=useState<CatalogueSelection[]>([]);
  const [app,setApp]=useState<ProviderApplication|null>(null);const [common,setCommon]=useState<Answers>({});const [answers,setAnswers]=useState<Record<string,Answers>>({});
  const [batchApps,setBatchApps]=useState<ProviderApplication[]>([]);const [appIndex,setAppIndex]=useState(0);
  const [step,setStep]=useState(0);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [errors,setErrors]=useState<FieldError[]>([]);const [message,setMessage]=useState('');const [dirty,setDirty]=useState(false);const [ack,setAck]=useState(false);
  const [proposalKind,setProposalKind]=useState<CatalogueRequestKind>('SERVICE');const [proposalTitle,setProposalTitle]=useState('');const [proposalDescription,setProposalDescription]=useState('');
  const accept=useCallback((data:ProviderApplication)=>{setApp(data);setSelected(data.category_id);setSubcategory(null);setCommon(data.common);setAnswers(Object.fromEntries(data.services.map(s=>[s.service_id,s.answers])));setDirty(false);},[]);
  useEffect(()=>{let alive=true;if(applicationId)api<ProviderApplication>(`/provider-applications/${applicationId}`).then(data=>{if(alive){accept(data);setStep(editable(data.status)?1:3);}}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[applicationId,accept]);
  useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  function failure(e:unknown){setError((e as Error).message);setErrors(e instanceof ApiError?e.errors:[]);}
  function toggleService(serviceId:number){setGroups(previous=>{
    const group=previous.find(item=>item.category_id===selected&&item.subcategory_id===subcategory);
    return group?.service_ids.includes(serviceId)
      ?removeCatalogueService(previous,selected,subcategory,serviceId)
      :addCatalogueService(previous,selected,subcategory,serviceId);
  });}
  async function create(){setBusy(true);setError('');try{
    const data=await api<ProviderApplication[]>('/provider-applications/batch',{method:'POST',body:JSON.stringify({groups,...(providerId?{provider_id:providerId}:{})})});
    setBatchApps(data);setAppIndex(0);accept(data[0]);setStep(1);window.history.replaceState(null,'',`/provide-service?application=${data[0].id}`);
  }catch(e){failure(e);}finally{setBusy(false);}}
  async function save(){
    if(!app)return null;
    const data=await api<ProviderApplication>(`/provider-applications/${app.id}`,{method:'PUT',body:JSON.stringify({revision:app.revision,common,services:answers})});accept(data);return data;
  }
  async function saveDraft(){setBusy(true);setError('');setErrors([]);try{await save();setMessage('Draft saved. You can resume it from My provider applications.');}catch(e){failure(e);}finally{setBusy(false);}}
  async function changeServices(serviceIds:number[]){if(!app)return;setBusy(true);setError('');try{
    const updated=await api<ProviderApplication>(`/provider-applications/${app.id}/services`,{method:'PUT',body:JSON.stringify({revision:app.revision,service_ids:serviceIds})});
    accept(updated);setBatchApps(previous=>previous.map((item,index)=>index===appIndex?updated:item));
  }catch(e){failure(e);}finally{setBusy(false);}}
  async function submit(){setBusy(true);setError('');setErrors([]);try{
    const data=dirty?await save():app;if(!data)return;
    const result=await api<ProviderApplication>(`/provider-applications/${data.id}/submit`,{method:'POST',body:JSON.stringify({revision:data.revision,acknowledge_versions:ack})});
    const nextIndex=appIndex+1;
    if(nextIndex<batchApps.length){
      const next=batchApps[nextIndex];
      const carried=await api<ProviderApplication>(`/provider-applications/${next.id}`,{method:'PUT',body:JSON.stringify({revision:next.revision,common:result.common,services:Object.fromEntries(next.services.map(service=>[service.service_id,service.answers]))})});
      setBatchApps(previous=>previous.map((item,index)=>index===appIndex?result:index===nextIndex?carried:item));
      setAppIndex(nextIndex);accept(carried);setStep(1);window.history.replaceState(null,'',`/provide-service?application=${carried.id}`);setMessage(`Section ${appIndex+1} submitted. Continue with section ${nextIndex+1} of ${batchApps.length}.`);
    }else{
      setBatchApps(previous=>previous.map((item,index)=>index===appIndex?result:item));
      accept(result);setStep(3);setMessage('Application submitted for manual review. No service is listed until approved.');
    }
  }catch(e){failure(e);}finally{setBusy(false);}}
  async function submitCatalogueRequest(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError('');setMessage('');
    const data={kind:proposalKind,title:proposalTitle,description:proposalDescription,
      ...(proposalKind==='CATEGORY'?{}:{category_id:selected}),
      ...(proposalKind==='SERVICE'?{subcategory_id:subcategory}:{})};
    try{
      await api<CatalogueRequest>('/seller/catalogue-requests',{method:'POST',body:JSON.stringify(data)});
      setProposalTitle('');setProposalDescription('');setMessage('Catalogue request sent for administrator review. Approved entries remain hidden until separately activated.');
    }catch(e){failure(e);}finally{setBusy(false);}
  }
  async function upload(serviceId:number,field:string,file:File){
    if(!app)return;if(file.size>2*1024*1024){setError('Upload a PDF, JPEG or PNG of at most 2 MB.');return;}
    setBusy(true);setError('');try{
      const base64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('The file could not be read.'));reader.readAsDataURL(file);});
      const document=await api<ProviderApplication['documents'][number]>(`/provider-applications/${app.id}/documents`,{method:'POST',body:JSON.stringify({service_id:serviceId,field_id:field,filename:file.name,media_type:file.type,content_base64:base64})});
      setAnswers(previous=>({...previous,[serviceId]:{...previous[serviceId],[field]:document.id}}));setApp(previous=>previous?{...previous,documents:[...previous.documents,{...document,service_id:serviceId,field_id:field}]}:previous);setDirty(true);setMessage('Document uploaded privately. Save the draft to attach it to your answers.');
    }catch(e){failure(e);}finally{setBusy(false);}
  }
  async function adopt(serviceId:number,requirementId:number){
    if(!app)return;
    if(!window.confirm('Adopt the displayed new requirements version? Unchanged questions retain their answers. Changed questions and declarations need fresh answers; previous answers remain in private history.'))return;
    setBusy(true);setError('');try{const current=dirty?await save():app;if(!current)return;accept(await api<ProviderApplication>(`/provider-applications/${current.id}/services/${serviceId}/version`,{method:'POST',body:JSON.stringify({revision:current.revision,requirement_id:requirementId,acknowledge:true})}));setMessage('New version adopted. Review the service questions and declarations again.');}catch(e){failure(e);}finally{setBusy(false);}
  }
  const category=categories.find(c=>c.id===selected);const services=category?(subcategory===null?category.services:category.subcategories.find(s=>s.id===subcategory)?.services??[]):[];
  const allCategoryServices=category?[...category.services,...category.subcategories.flatMap(item=>item.services)]:[];
  const selectedCount=groups.reduce((count,group)=>count+group.service_ids.length,0);
  const canEdit=app&&editable(app.status);const commonFrozen=!!app?.services.some(s=>s.status==='APPROVED');
  return <div className="provider-onboarding"><p className="eyebrow">PROVIDE A SERVICE</p><h1>{app?'Your provider application':'Apply to provide services.'}</h1><p>Submit business details and service-specific evidence for manual review. Customer membership is not required. An application does not grant verification. Customer and seller access share one account; manage existing applications and explicit business ownership in Seller Dashboard.</p><Link className="text-link" href="/account/provider-applications">My provider applications</Link>{error&&<Notice error message={error}/>} {!!errors.length&&<ul className="provider-error-list" role="alert">{errors.map((e,i)=><li key={i}>{e.message}</li>)}</ul>}{message&&<Notice message={message}/>} {applicationId&&!app&&!error&&<p role="status">Loading your private application…</p>}
    {!app&&!applicationId&&<section className="provider-section form">
      <h2>Choose catalogue sections</h2><p>Select services from any category or subcategory. Your choices stay selected as you browse.</p>
      <fieldset className="catalogue-choice-field"><legend>1. Choose a category</legend><div className="catalogue-choice-grid">{categories.map(item=><button type="button" key={item.id} className={`catalogue-choice${item.id===selected?' selected':''}`} aria-pressed={item.id===selected} onClick={()=>{setSelected(item.id);setSubcategory(null);}}><span>{item.title}</span><span className="catalogue-choice-plus" aria-hidden="true">+</span></button>)}</div></fieldset>
      {!!category?.subcategories.length&&<fieldset className="catalogue-choice-field"><legend>2. Choose a subcategory</legend><div className="catalogue-choice-grid"><button type="button" className={`catalogue-choice${subcategory===null?' selected':''}`} aria-pressed={subcategory===null} onClick={()=>setSubcategory(null)}><span>Direct category services</span><span className="catalogue-choice-plus" aria-hidden="true">+</span></button>{category.subcategories.map(sub=><button type="button" key={sub.id} className={`catalogue-choice${subcategory===sub.id?' selected':''}`} aria-pressed={subcategory===sub.id} onClick={()=>setSubcategory(sub.id)}><span>{sub.title}</span><span className="catalogue-choice-plus" aria-hidden="true">+</span></button>)}</div></fieldset>}
      <fieldset className="catalogue-choice-field"><legend>3. Add services from {category?.title}{subcategory!==null?` · ${category?.subcategories.find(item=>item.id===subcategory)?.title??''}`:''}</legend><div className="catalogue-choice-grid">{services.map(service=>{
        const chosen=groups.some(group=>group.category_id===selected&&group.subcategory_id===subcategory&&group.service_ids.includes(service.id));
        return <button type="button" key={service.id} className={`catalogue-choice${chosen?' selected':''}`} aria-pressed={chosen} onClick={()=>toggleService(service.id)}><span>{service.title}</span><span className="catalogue-choice-plus" aria-hidden="true">{chosen?'−':'+'}</span></button>;
      })}</div>{!services.length&&<p>No services are listed in this section yet. Send a catalogue suggestion below.</p>}</fieldset>
      <section className="catalogue-selection" aria-labelledby="selected-services-title"><h3 id="selected-services-title">Selected services ({selectedCount})</h3>{groups.map(group=>{
        const groupCategory=categories.find(item=>item.id===group.category_id);
        const groupSubcategory=group.subcategory_id===null?null:groupCategory?.subcategories.find(item=>item.id===group.subcategory_id);
        const groupServices=group.service_ids.map(id=>[...groupCategory?.services??[],...groupCategory?.subcategories.flatMap(item=>item.services)??[]].find(service=>service.id===id)).filter((item):item is NonNullable<typeof item>=>!!item);
        return <div className="catalogue-selection-group" key={`${group.category_id}:${group.subcategory_id??'direct'}`}><h4>{groupCategory?.title}{groupSubcategory?` · ${groupSubcategory.title}`:' · Direct services'}</h4>{groupServices.map(service=><div className="catalogue-selection-item" key={service.id}><span>{service.title}</span><button type="button" className="icon-button" aria-label={`Remove ${service.title}`} onClick={()=>setGroups(previous=>removeCatalogueService(previous,group.category_id,group.subcategory_id,service.id))}><Minus size={20}/></button></div>)}</div>;
      })}{!selectedCount&&<p>No services selected yet.</p>}</section>
      <p>{providerId?`Business #${providerId}: each application will retain this explicit owner record. `:''}Applications for multiple sections are completed one after another. Each service receives an independent review and must be approved before it can be listed.</p>
      <button className="button" disabled={busy||!selectedCount} onClick={create}>{busy?'Creating application sections…':'Continue to business details'}</button>
      <section className="catalogue-request-form"><h3>Suggest a catalogue addition</h3><p>New entries are reviewed separately and remain hidden from customers until an administrator activates them. This does not approve your provider application.</p><form className="form" onSubmit={submitCatalogueRequest}>
        <label>Request type<select value={proposalKind} onChange={event=>setProposalKind(event.target.value as CatalogueRequestKind)}><option value="SERVICE">New service</option><option value="SUBCATEGORY">New subcategory</option><option value="CATEGORY">New category</option></select></label>
        {proposalKind!=='CATEGORY'&&<p>Parent category: {category?.title??'Select a category above'}</p>}
        {proposalKind==='SERVICE'&&subcategory!==null&&<p>Parent subcategory: {category?.subcategories.find(item=>item.id===subcategory)?.title}</p>}
        <label>Proposed {catalogueKindLabel(proposalKind).toLowerCase()}<input value={proposalTitle} onChange={event=>setProposalTitle(event.target.value)} minLength={2} maxLength={150} required/></label>
        <label>Why should this be added?<textarea value={proposalDescription} onChange={event=>setProposalDescription(event.target.value)} minLength={10} maxLength={2000} required/></label>
        <button className="button secondary" disabled={busy}>{busy?'Sending…':'Send for administrator review'}</button>
      </form></section><CatalogueRequestHistory/>
    </section>}
    {app&&<><div className="provider-reference"><strong>Application reference: {app.id}</strong><Status context="application" value={app.status}/><span>{dirty?'Unsaved answers — save your draft before leaving.':'Saved application'}</span></div><nav className="provider-steps" aria-label="Application steps">{['Business details','Service requirements','Review & submit'].map((label,i)=><button type="button" className={`button ${step===i+1?'':'secondary'}`} aria-current={step===i+1?'step':undefined} key={label} onClick={()=>setStep(i+1)}>{i+1}. {label}</button>)}</nav>
      {batchApps.length>1&&<p className="notice">Application section {appIndex+1} of {batchApps.length}. Submit each section to continue; shared business details carry forward.</p>}
      {canEdit&&<section className="catalogue-selection"><h2>Services in this application</h2><p>Add or remove services before submitting. Each service keeps its own requirements and review decision.</p>{app.services.map(service=><div className="catalogue-selection-item" key={service.service_id}><span>{service.title}</span><button type="button" className="icon-button" aria-label={`Remove ${service.title}`} disabled={busy||app.status!=='DRAFT'||app.services.length===1} onClick={()=>changeServices(app.services.filter(item=>item.service_id!==service.service_id).map(item=>item.service_id))}><Minus size={20}/></button></div>)}{app.status==='DRAFT'&&<div className="catalogue-choice-grid">{allCategoryServices.filter(service=>!app.services.some(item=>item.service_id===service.id)).map(service=><button type="button" key={service.id} className="catalogue-choice" disabled={busy} onClick={()=>changeServices([...app.services.map(item=>item.service_id),service.id])}><span>{service.title}</span><span className="catalogue-choice-plus" aria-hidden="true"><Plus size={20}/></span></button>)}</div>}</section>}
      {step===1&&<><h2>Common business information</h2>{commonFrozen&&<p className="notice">Approved services freeze shared business details. Ask the reviewer to reopen those services before changing them.</p>}<RequirementForm configuration={app.common_configuration} answers={common} onChange={value=>{setCommon(value);setDirty(true);}} disabled={!canEdit||busy||commonFrozen} errors={errors} prefix="common."/></>}
      {step===2&&app.services.map(s=>{const update=s.required_requirements??s.latest_requirements;return <section className="provider-service-form" key={s.service_id}><div className="row-between"><h2>{s.title}</h2><Status context="service" value={s.status}/></div><p>Requirements version {s.requirements.version} · effective {date(s.requirements.effective_at)}</p>{update&&update.id!==s.requirement_id&&<details className="notice"><summary>Version {update.version} is available{s.required_requirement_id?' and required by your reviewer':''}</summary><p>{update.change_note}</p><RequirementForm configuration={update.configuration} answers={{}} onChange={()=>{}} disabled/><HelpPair id="provider.adopt"><button className="button secondary" disabled={busy||!editable(s.status)} onClick={()=>adopt(s.service_id,update!.id)}>Adopt version {update.version}</button></HelpPair></details>}<RequirementForm configuration={s.requirements.configuration} answers={answers[s.service_id]??{}} onChange={value=>{setAnswers(previous=>({...previous,[s.service_id]:value}));setDirty(true);}} disabled={!canEdit||!editable(s.status)||busy} errors={errors} prefix={`${s.service_id}.`} onUpload={(field,file)=>upload(s.service_id,field,file)}/></section>;})}
      {step===3&&<section><h2>Review your application</h2><p>Check the business details, each service, declarations and uploaded evidence before submission. Approval is separate for each service.</p><RequirementForm configuration={app.common_configuration} answers={common} onChange={()=>{}} disabled/>{app.services.map(s=><details key={s.service_id}><summary>{s.title} · version {s.requirements.version} · {s.status.replaceAll('_',' ')}</summary><RequirementForm configuration={s.requirements.configuration} answers={answers[s.service_id]??{}} onChange={()=>{}} disabled/></details>)}{!!app.documents.length&&<section><h3>Private documents</h3>{app.documents.map(d=><p key={d.id}><button className="text-link" onClick={()=>downloadEvidence(app.id,d).catch(failure)}>{d.field_id.replaceAll('_',' ')} · {d.filename}</button></p>)}</section>}{app.services.some(s=>s.latest_requirements&&s.latest_requirements.id!==s.requirement_id)&&<label className="checkbox-label"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>I reviewed the newer configurations and choose to submit using the displayed pinned versions unless my reviewer requires an update.</label>}{canEdit&&<HelpPair id="provider.submit"><button className="button" disabled={busy} onClick={submit}>{busy?'Saving…':'Submit application for review'}</button></HelpPair>}</section>}
      {canEdit&&<div className="provider-actions"><HelpPair id="provider.save"><button className="button secondary" disabled={busy} onClick={saveDraft}>Save draft</button></HelpPair>{step<3&&<button className="button" disabled={busy} onClick={()=>setStep(step+1)}>Continue to {step===1?'service requirements':'review'}</button>}</div>}
      <section className="provider-history"><h2>Review and submission history <ContextHelp id="provider.history"/></h2>{app.history.map(e=><article key={e.id}><strong>{e.kind.replaceAll('_',' ')}{e.service_id?` · ${app.services.find(s=>s.service_id===e.service_id)?.title??'Service'}`:''}</strong><small>{date(e.created_at)} · account #{e.actor_id}</small>{e.reason&&<p>{e.reason}</p>}{['SUBMITTED','VERSION_ADOPTED'].includes(e.kind)&&<details><summary>Archived answers and version references</summary><pre>{JSON.stringify(e.details,null,2)}</pre></details>}</article>)}</section></>}
  </div>;
}

export function CatalogueRequestHistory(){
  const [rows,setRows]=useState<CatalogueRequest[]|null>(null);const [error,setError]=useState('');
  useEffect(()=>{let alive=true;api<CatalogueRequest[]>('/seller/catalogue-requests').then(data=>{if(alive)setRows(data);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[]);
  return <section className="catalogue-request-history"><h3>Catalogue request status</h3>{error&&<Notice error message={error} />}{rows===null?<p role="status">Loading catalogue requests…</p>:rows.length?rows.map(row=><article className="request-card" key={row.id}><Status context="application" value={row.status}/><h4>{catalogueKindLabel(row.kind)} · {row.title}</h4><p>{row.category_title}{row.subcategory_title?` · ${row.subcategory_title}`:''}</p><p>{row.description}</p>{row.review_note&&<p><strong>Administrator feedback:</strong> {row.review_note}</p>}{row.catalogue_id&&<p>Created inactive catalogue record #{row.catalogue_id}; it remains hidden until administrator activation.</p>}</article>):<p>No catalogue requests yet.</p>}</section>;
}

export function ProviderApplications(){
  const [rows,setRows]=useState<ApplicationSummary[]|null>(null);const [page,setPage]=useState(1);const [error,setError]=useState('');const [leads,setLeads]=useState<{id:number;service_title:string;requirements:string;location:string;phone:string;request_id:number}[]>([]);
  useEffect(()=>{let alive=true;Promise.all([api<ApplicationSummary[]>(`/provider-applications?page=${page}`),api<typeof leads>('/provider-leads')]).then(([apps,assigned])=>{if(alive){setRows(apps);setLeads(assigned);}}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[page]);
  return <><p className="eyebrow">YOUR PROVIDER SERVICES</p><h1>My provider applications <ContextHelp id="account.provider-applications"/></h1><ButtonLink href="/provide-service">Start a provider application</ButtonLink>{error&&<Notice error message={error}/>} {rows===null?<p role="status">Loading applications…</p>:rows.length?<div className="request-list">{rows.map(r=><article className="request-card" key={r.id}><Status context="application" value={r.status}/><h3>Application {r.id.slice(0,8)}</h3><p>Created {date(r.created_at)}</p><Link className="text-link" href={`/provide-service?application=${r.id}`}>{editable(r.status)?'Resume application':'View application and review history'}</Link></article>)}</div>:<EmptyState title="Share your expertise" description="Apply for one or more services. Public listing starts only after manual approval." href="/provide-service" label="Provide a service"/>}<div className="pagination"><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page}</span><button disabled={!rows||rows.length<30} onClick={()=>setPage(p=>p+1)}>Next</button></div><CatalogueRequestHistory/><h2>Assigned service leads <ContextHelp id="provider.lead"/></h2><p>Only currently approved and active services receive eligible assignments. No lead charges apply.</p>{leads.map(l=><article className="request-card" key={l.id}><h3>{l.service_title} · request #{l.request_id}</h3><p>{l.requirements}</p><p>{l.location} · {l.phone}</p></article>)}{!leads.length&&<p>No eligible leads assigned.</p>}</>;
}
