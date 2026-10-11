import type {ServiceContext} from '@/lib/types';
import {exploreListings,type PublicJobs} from '@/lib/explore';
import {serverApi} from '@/lib/server';
import {urls} from '@/lib/urls';
import {SectionHeading,EmptyState} from './ui';
import {VacancyCard} from './vacancies';

export async function ServiceExplore({context}:{context:ServiceContext}) {
  const result=await exploreListings(context.category.slug,()=>serverApi<PublicJobs>('/jobs?page=1'));
  return <section className="service-explore" id="explore-listings" aria-labelledby="explore-title" data-feed-status={result.status}>
    <div id="explore-title"><SectionHeading eyebrow="EXTERNAL LISTINGS" title={`Explore ${context.category.title}`} description={`Source-listed ${result.kind}, separate from registered providers and VISTRAH delivery.`} href={context.category.slug==='jobs-careers'?'/jobs':undefined} label="Browse all public vacancies"/></div>
    {result.vacancies.length>0?<><p className="notice">{result.note} These are public source listings, not personalized recommendations. Confirm eligibility and current availability with the source.</p><div className="explore-vacancies">{result.vacancies.map(vacancy=><VacancyCard key={vacancy.id} vacancy={vacancy}/>)}</div><p className="secondary-copy">Showing {result.vacancies.length} of {result.total} cached vacancies. Publication and retrieval times are shown separately; listing images are not supplied by these sources.</p></>:<EmptyState title={result.status==='empty'?'No cached vacancies yet':'External listings are not available'} description={result.status==='empty'?'No source listings are currently cached. Check the public jobs page later, or share your requirements with VISTRAH.':result.note} href={context.category.slug==='jobs-careers'?'/jobs':urls.providers(context.category,context.subcategory,context.service)} label={context.category.slug==='jobs-careers'?'View public jobs':'Browse registered providers'}/>}
  </section>;
}
