import {pagePhoto} from '@/lib/imagery';
import {ContextVisual} from '@/components/visual';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {API_URL} from '@/lib/server';
import {VacancyCard} from '@/components/vacancies';
import type {Vacancy} from '@/lib/discovery';
export const metadata={title:'Vacancy details | VISTRAH'};
export default async function Job({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;const response=await fetch(`${API_URL}/jobs/${encodeURIComponent(id)}`,{cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(response.status===404)notFound();if(!response.ok)return <div className="container section"><ContextVisual photo={pagePhoto('job-detail')}/><p>Vacancy data is temporarily unavailable.</p></div>;
  const vacancy:Vacancy=await response.json();
  return <div className="container section"><Link href="/jobs" className="text-link">← Public vacancies</Link><div className="image-heading jobs-heading"><ContextVisual photo={pagePhoto('job-detail')}/><div><h1>Vacancy details</h1><p>No signup required. Review the original source to confirm availability and eligibility. Remotive listings are delayed 24 hours.</p></div></div><VacancyCard vacancy={vacancy} full/></div>;
}
