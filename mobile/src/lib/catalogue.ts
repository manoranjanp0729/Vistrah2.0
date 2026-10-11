import type {Category,ServiceContext} from './types';
export type {Category,Service,ServiceContext,User,Membership,Provider,RequestRecord} from './types';
export function allServices(categories:Category[]):ServiceContext[] {
  return categories.flatMap(category=>[
    ...category.services.map(service=>({category,service})),
    ...category.subcategories.flatMap(subcategory=>subcategory.services.map(service=>({category,subcategory,service}))),
  ]);
}
export function filterServices(categories:Category[],query:string,slug?:string) {
  const needle=query.trim().toLocaleLowerCase();
  return allServices(categories).filter(({category,service,subcategory})=>(!slug||category.slug===slug)&&
    [service.title,service.description,category.title,subcategory?.title??''].join(' ').toLocaleLowerCase().includes(needle));
}
export function servicePath(context:ServiceContext) {
  return '/service/'+context.category.slug+'/'+(context.subcategory?context.subcategory.slug+'/':'')+'service/'+context.service.slug;
}
export const pathways=[
  {id:'providers',title:'Find Service Provider',copy:'Browse active, verified providers. Confirm scope and availability directly.'},
  {id:'recommendations',title:'VISTRAH Recommended',copy:'Save an enquiry for human review. No automated matching or guaranteed turnaround.'},
  {id:'in-house',title:'VISTRAH Services',copy:'No VISTRAH-managed offering is currently listed for this service. Enquire about delivery options.'},
] as const;
export type Intent=typeof pathways[number]['id'];
export function enquiryPrefix(intent:Intent) {
  return intent==='recommendations'?'[Recommendation assistance] ':intent==='in-house'?'[Delivery options enquiry] ':'';
}
