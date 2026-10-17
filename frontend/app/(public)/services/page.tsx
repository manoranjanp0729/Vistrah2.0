import {LocationChooser} from '@/components/customer-location';
import {SellerCatalogueRequestCTA} from '@/components/seller';
import {pagePhoto} from '@/lib/imagery';
import {ContextVisual} from '@/components/visual';
import {serverApi} from '@/lib/server';
import {allServices} from '@/lib/urls';
import type {Category} from '@/lib/types';
import {SearchForm,CategoryCard,ServiceCard,Breadcrumbs,EmptyState} from '@/components/ui';
export const dynamic='force-dynamic';
export const metadata={title:'Explore services'};
export default async function Services({searchParams}:{searchParams:Promise<{q?:string}>}) {
  const {q=''}=await searchParams;const categories=await serverApi<Category[]>('/catalogue');
  const terms=q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches=allServices(categories).filter(c=>terms.every(term=>`${c.service.title} ${c.service.description} ${c.category.title} ${c.subcategory?.title||''}`.toLowerCase().includes(term)));
  return <div className="container page"><Breadcrumbs items={[{label:'Services'}]}/><div className="page-heading image-heading"><ContextVisual photo={pagePhoto('services')}/><div><p className="eyebrow">BROWSE THE PUBLIC CATALOGUE</p><h1>Find services for your needs.</h1><p>Explore services for your home, career and business. Provider details and service enquiries require eligible membership.</p></div></div><div className="discovery-bar"><LocationChooser/><SearchForm initial={q}/></div>{q.trim()?<><div className="results-heading"><h2>Results for “{q}”</h2><span>{matches.length} {matches.length===1?'service':'services'}</span></div>{matches.length?<div className="service-grid">{matches.map(c=><ServiceCard key={c.service.id} context={c}/>)}</div>:<EmptyState title="No services found" description="Try a different search, or contact VISTRAH for assistance." href="/call-vistrah" label="Contact VISTRAH"/>}</>:categories.length?<div className="category-grid catalogue-grid scan-categories">{categories.filter(category=>category.slug!=='marketing').map((category,i)=><CategoryCard key={category.id} category={category} index={i} compact/>)}</div>:<EmptyState title="No services available yet" description="The catalogue is being prepared. Email us to discuss your requirements." href="/call-vistrah" label="Email VISTRAH"/>}<SellerCatalogueRequestCTA level="category"/></div>;
}
