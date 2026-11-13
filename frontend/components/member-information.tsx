'use client';
import {UiText} from "./localized-ui";
import {useEffect,useState} from 'react';
import {officialContact,emailHref} from '@/lib/contact';
import {api,ApiError} from '@/lib/api';
import {ButtonLink,CheckList,Notice} from './ui';
import {destinationLink} from '@/lib/destinations';
export function MemberInformation({serviceId,next}:{serviceId:number;next:string}) {
  const [result,setResult]=useState<{serviceId:number;notes?:string[];restricted?:number;error?:string}>();
  const current=result?.serviceId===serviceId?result:undefined;
  const notes=current?.notes??null;const restricted=current?.restricted??0;const error=current?.error??'';
  useEffect(()=>{let active=true;api<{notes:string[]}>(`/services/${serviceId}/member-information`).then(data=>{if(active)setResult({serviceId,notes:data.notes});}).catch(e=>{if(!active)return;setResult(e instanceof ApiError&&[401,403].includes(e.status)?{serviceId,restricted:e.status}:{serviceId,error:e.message});});return()=>{active=false;};},[serviceId]);
  return <section className="member-information"><span className="small-label"><UiText value={"VISTRAH MEMBERS"}/></span><h2><UiText value={"Service preparation guide."}/></h2>{error?<Notice error message={error}/>:restricted?<><p><UiText value={restricted===401?'Sign in to access this service guide.':'Eligible membership is required. Sandbox access is for development only.'}/></p><ButtonLink secondary href={destinationLink(restricted===401?'/login':'/membership',next)}><UiText value={restricted===401?'Sign in':'Explore membership'}/></ButtonLink></>:notes===null?<p role="status"><UiText value={"Loading member information…"}/></p>:notes.length?<CheckList items={notes}/>:<p><UiText value={"A preparation guide has not yet been added for this service. Email "}/><a href={emailHref(officialContact.email)!}>{officialContact.email}</a> <UiText value={"for assistance."}/></p>}</section>;
}
