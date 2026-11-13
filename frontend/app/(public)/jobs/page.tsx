import {UiText} from "../../../components/localized-ui";
import copy from '@/lib/interface-copy.json';
import {HelpPair} from '@/components/context-help';
import {pagePhoto} from '@/lib/imagery';
import {ContextVisual} from '@/components/visual';
import Link from 'next/link';
import {serverApi} from '@/lib/server';
import type {Vacancy} from '@/lib/discovery';
import {VacancyCard} from '@/components/vacancies';
export const metadata={title:'Public vacancies | VISTRAH'};
export default async function Jobs({searchParams}:{searchParams:Promise<{q?:string;page?:string}>}) {
  const params=await searchParams;const q=(params.q||'').slice(0,150);const page=Math.max(1,Math.min(10000,Number(params.page)||1));
  let data:{items:Vacancy[];total:number;note:string}|null;
  try{data=await serverApi(`/jobs?page=${page}&q=${encodeURIComponent(q)}`);}catch{data=null;}
  return <div className="container section"><div className="image-heading jobs-heading"><ContextVisual photo={pagePhoto('jobs')}/><div><p className="eyebrow"><UiText value={"PUBLIC VACANCIES"}/></p><h1><UiText value={copy.jobs.title}/></h1><p><UiText value={copy.jobs.intro}/></p></div></div><p>{data?.note||'Vacancy data is temporarily unavailable. Please try again.'}</p><form className="form vacancy-search" action="/jobs"><HelpPair id="jobs.search" className="help-field"><label><UiText value={"Search vacancies"}/><input name="q" maxLength={150} defaultValue={q}/></label></HelpPair><button className="button"><UiText value={"Search"}/></button></form>{data&&!data.items.length&&<p><UiText value={copy.jobs.empty}/></p>}{data?.items.map(v=><VacancyCard key={v.id} vacancy={v} full/>)}{data&&data.total>20&&<div className="pagination">{page>1&&<Link href={`/jobs?page=${page-1}&q=${encodeURIComponent(q)}`}><UiText value={copy.jobs.previous}/></Link>}<span><UiText value={"Page "}/>{page}</span>{page*20<data.total&&<Link href={`/jobs?page=${page+1}&q=${encodeURIComponent(q)}`}><UiText value={copy.jobs.next}/></Link>}</div>}</div>;
}

