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
  return <div className="container section"><div className="image-heading jobs-heading"><ContextVisual photo={pagePhoto('jobs')}/><div><p className="eyebrow">PUBLIC VACANCIES</p><h1>Explore source-listed jobs</h1><p>No account is needed to read listings or follow source links.</p></div></div><p>{data?.note||'Vacancy data is temporarily unavailable. Please try again.'}</p><form className="form vacancy-search" action="/jobs"><HelpPair id="jobs.search" className="help-field"><label>Search vacancies<input name="q" maxLength={150} defaultValue={q}/></label></HelpPair><button className="button">Search</button></form>{data&&!data.items.length&&<p>No cached listings match your search. A configured source acquisition supplies this page; no sample vacancies are shown.</p>}{data?.items.map(v=><VacancyCard key={v.id} vacancy={v}/>)}{data&&data.total>20&&<div className="pagination">{page>1&&<Link href={`/jobs?page=${page-1}&q=${encodeURIComponent(q)}`}>Previous vacancies</Link>}<span>Page {page} · {data.total} cached vacancies</span>{page*20<data.total&&<Link href={`/jobs?page=${page+1}&q=${encodeURIComponent(q)}`}>Next vacancies</Link>}</div>}</div>;
}
