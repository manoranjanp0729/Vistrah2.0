import copy from './interface-copy.ts';
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
  {id:'providers',title:copy.service.providers,copy:copy.service.providersCopy},
  {id:'recommendations',title:copy.service.recommended,copy:copy.service.recommendedCopy},
  {id:'in-house',title:copy.service.inHouse,copy:copy.service.inHouseCopy},
] as const;
export type Intent=typeof pathways[number]['id'];
export function enquiryPrefix(intent:Intent) {
  return intent==='recommendations'?'[Recommendation assistance] ':intent==='in-house'?'[Delivery options enquiry] ':'';
}
