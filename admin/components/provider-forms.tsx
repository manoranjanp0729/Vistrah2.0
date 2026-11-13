'use client';
import {ContextHelp,HelpPair} from './context-help';
import {useId} from 'react';
import {matches,visibleAnswers,type Answers,type RequirementField,type Requirements,type FieldError,type Answer} from '@/lib/provider-requirements';

type Props={answers:Answers;onChange:(answers:Answers)=>void;disabled?:boolean;errors?:FieldError[];prefix?:string;conditionAnswers?:Answers;onUpload?:(field:string,file:File)=>Promise<void>};
export function RequirementForm({configuration,...props}:Props&{configuration:Requirements}){
  return <div className="provider-fields">{configuration.notes&&<p className="notice">{configuration.notes}</p>}{configuration.sections.map(section=><section className="provider-section" key={section.id}><h3>{section.title}</h3>{section.description&&<p>{section.description}</p>}<div className="form">{section.fields.map(field=><DynamicField key={field.id} field={field} {...props} conditionAnswers={visibleAnswers(configuration.sections.flatMap(s=>s.fields),props.answers)}/>)}</div></section>)}<fieldset className="provider-declarations"><legend>Declarations and consent <ContextHelp id="provider.declarations"/></legend>{configuration.declarations.map(d=><label className="checkbox-label" key={d.id}><input type="checkbox" checked={props.answers[d.id]===true} disabled={props.disabled} onChange={e=>props.onChange({...props.answers,[d.id]:e.target.checked})}/>{d.label}{d.required!==false?' (required)':''}</label>)}</fieldset></div>;
}
function DynamicField({field:f,answers,onChange,disabled=false,errors=[],prefix='',onUpload,conditionAnswers=answers}:Props&{field:RequirementField}){
  const id=useId();const value=answers[f.id];const path=prefix+f.id;
  if(!matches(f.visible_if,conditionAnswers))return null;
  const required=f.required||(f.required_if&&matches(f.required_if,conditionAnswers));
  const na=typeof value==='object'&&!Array.isArray(value)&&value?.not_applicable===true;
  const error=errors.find(e=>e.field===path)?.message;
  const set=(v:Answer)=>onChange({...answers,[f.id]:v});
  const attrs={id,disabled,'aria-invalid':!!error,'aria-describedby':error?id+'-error':undefined};
  const label=<label htmlFor={id}>{f.label}{required?<span> (required)</span>:<span> (optional)</span>}</label>;
  let input;
  if(na){input=<textarea {...attrs} aria-label={`Not applicable reason for ${f.label}`} value={String(value.reason??'')} minLength={5} maxLength={500} onChange={e=>set({not_applicable:true,reason:e.target.value})}/>;}
  else if(f.type==='repeatable'){
    const rows=Array.isArray(value)?value as Answers[]:[];
    input=<fieldset className="provider-repeatable" disabled={disabled}><legend>{f.label}</legend>{rows.map((row,i)=><div className="provider-group" key={i}>{f.children?.map(child=><DynamicField key={child.id} field={child} conditionAnswers={visibleAnswers(f.children??[],row)} answers={row} onChange={next=>set(rows.map((item,index)=>index===i?next:item))} disabled={disabled} errors={errors} prefix={`${path}.${i}.`}/>)}<button type="button" className="text-link" onClick={()=>set(rows.filter((_,index)=>index!==i))}>Remove entry {i+1}</button></div>)}<button type="button" className="button secondary" disabled={disabled||rows.length>=10} onClick={()=>set([...rows,{}])}>Add {f.label.toLowerCase()} entry</button></fieldset>;
  }else if(f.type==='file')input=<><input {...attrs} type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={disabled||!onUpload} onChange={e=>{const file=e.target.files?.[0];if(file&&onUpload)void onUpload(f.id,file);e.target.value='';}}/>{typeof value==='string'&&value&&<small role="status">Document attached · {value.slice(0,8)}</small>}<small>PDF, JPEG or PNG; maximum 2 MB. Remove unrelated personal information.</small></>;
  else if(f.type==='boolean')input=<select {...attrs} value={typeof value==='boolean'?String(value):''} onChange={e=>set(e.target.value===''?'':e.target.value==='true')}><option value="">Choose yes or no</option><option value="true">Yes</option><option value="false">No</option></select>;
  else if(f.type==='select'||f.type==='single_choice')input=<select {...attrs} value={String(value??'')} onChange={e=>set(e.target.value)}><option value="">Choose an option</option>{f.options?.map(o=><option key={o}>{o}</option>)}</select>;
  else if(f.type==='multi_select')input=<div id={id} className="provider-options" role="group" aria-label={f.label}>{f.options?.map(o=><label className="checkbox-label" key={o}><input type="checkbox" disabled={disabled} checked={Array.isArray(value)&&value.includes(o as never)} onChange={e=>{const values=Array.isArray(value)?value as string[]:[];set(e.target.checked?[...values,o]:values.filter(v=>v!==o));}}/>{o}</label>)}</div>;
  else if(f.type==='service_area')input=<textarea {...attrs} value={Array.isArray(value)?value.join('\n'):''} onChange={e=>set(e.target.value.split('\n'))} placeholder="One location per line"/>;
  else if(['textarea','address'].includes(f.type))input=<textarea {...attrs} rows={4} value={String(value??'')} maxLength={f.max_length??2000} onChange={e=>set(e.target.value)}/>;
  else input=<input {...attrs} type={f.type==='number'?'number':f.type==='date'?'date':f.format==='email'?'email':f.format==='phone'?'tel':'text'} value={typeof value==='string'||typeof value==='number'?value:''} min={f.minimum??undefined} max={f.maximum??undefined} step={f.type==='number'?'any':undefined} maxLength={f.max_length??2000} onChange={e=>set(f.type==='number'&&e.target.value!==''?Number(e.target.value):e.target.value)}/>;
  return <div className="provider-field"><span className="help-pair">{label}{f.type==='file'?<ContextHelp id="provider.upload"/>:f.basis?<ContextHelp id="provider.basis"/>:null}</span>{f.description&&<p>{f.description}</p>}{f.basis&&<small>{f.basis==='LEGAL'?'Established applicable requirement':f.basis==='CONDITIONAL'?'Depends on your circumstances':'Evidence for VISTRAH review'}</small>}{f.legal_basis&&<small>{f.legal_basis}</small>}{input}{f.help&&<small>{f.help}</small>}{f.allow_na&&<HelpPair id="provider.not-applicable"><label className="checkbox-label"><input type="checkbox" disabled={disabled} checked={na} onChange={e=>set(e.target.checked?{not_applicable:true,reason:''}:'')}/>Not applicable — {f.label}</label></HelpPair>}{error&&<p className="error" id={id+'-error'}>{error}</p>}</div>;
}

export async function downloadEvidence(applicationId:string,attachment:{id:string;filename:string}){
  const response=await fetch(`/api/provider-applications/${applicationId}/documents/${attachment.id}`,{cache:'no-store'});
  if(!response.ok)throw new Error('You do not have access to this document, or it is unavailable.');
  const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download=attachment.filename;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
}
