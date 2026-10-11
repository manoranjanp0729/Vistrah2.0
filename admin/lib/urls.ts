import type { Category, Service, Subcategory } from './types';
type Slug = Pick<Category,'slug'>;
export const urls = {
  category: (category:Slug) => `/service/${category.slug}`,
  subcategory: (category:Slug, subcategory:Slug) => `/service/${category.slug}/${subcategory.slug}`,
  service: (category:Slug, service:Slug, subcategory?:Slug) => `/service/${category.slug}/${subcategory ? `${subcategory.slug}/` : ''}service/${service.slug}`,
  request: (category:Slug, service:Slug, subcategory?:Slug) => subcategory ? `/service/${category.slug}/${subcategory.slug}/${service.slug}/request` : `/service/${category.slug}/service/${service.slug}/request`,
  providers: (category:Slug, subcategory:Slug|undefined, service:Slug) => subcategory ? `/service/${category.slug}/${subcategory.slug}/${service.slug}/companies` : `${urls.service(category,service)}/companies`,
  provider: (category:Slug, subcategory:Slug|undefined, service:Slug, provider:Slug) => `${urls.providers(category,subcategory,service)}/${provider.slug}`
};
export function allServices(categories:Category[]) {
  return categories.flatMap(category=>[
    ...category.services.map(service=>({category,service,subcategory:undefined as Subcategory|undefined})),
    ...category.subcategories.flatMap(subcategory=>subcategory.services.map(service=>({category,subcategory,service})))
  ]);
}
export type Resolution = {kind:'category';category:Category}|{kind:'subcategory';category:Category;subcategory:Subcategory}|{kind:'service'|'request'|'companies'|'provider';category:Category;subcategory?:Subcategory;service:Service;providerSlug?:string};
export function resolveRoute(categories:Category[], segments:string[]):Resolution|null {
  const category=categories.find(c=>c.slug===segments[0]);
  if(!category) return null;
  if(segments.length===1) return {kind:'category',category};
  if(segments[1]==='service') {
    const service=category.services.find(s=>s.slug===segments[2]);
    if(!service) return null;
    if(segments.length===3) return {kind:'service',category,service};
    if(segments.length===4&&segments[3]==='request') return {kind:'request',category,service};
    if(segments.length===4&&segments[3]==='companies') return {kind:'companies',category,service};
    if(segments.length===5&&segments[3]==='companies') return {kind:'provider',category,service,providerSlug:segments[4]};
    return null;
  }
  const subcategory=category.subcategories.find(s=>s.slug===segments[1]);
  if(!subcategory) return null;
  if(segments.length===2) return {kind:'subcategory',category,subcategory};
  if(segments[2]==='service'&&segments.length===4) {
    const service=subcategory.services.find(s=>s.slug===segments[3]);
    return service?{kind:'service',category,subcategory,service}:null;
  }
  const service=subcategory.services.find(s=>s.slug===segments[2]);
  if(!service) return null;
  if(segments.length===4&&segments[3]==='request') return {kind:'request',category,subcategory,service};
  if(segments.length===4&&segments[3]==='companies') return {kind:'companies',category,subcategory,service};
  if(segments.length===5&&segments[3]==='companies') return {kind:'provider',category,subcategory,service,providerSlug:segments[4]};
  return null;
}
