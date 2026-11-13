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
  return discoverableServices(categories).filter(({category,service,subcategory})=>(!slug||category.slug===slug)&&
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


// Find Jobs is a mobile discovery entry, not a backend enquiry service ID.
export function discoverableServices(categories:Category[]):ServiceContext[] {
  const services=allServices(categories);
  const category=categories.find(item=>item.slug==='jobs-careers'&&item.active);
  if(!category||services.some(item=>item.service.slug==='find-jobs'))return services;
  return [{category,service:{id:-1,category_id:category.id,subcategory_id:null,slug:'find-jobs',title:'Find Jobs',description:'Browse VISTRAH job postings and jobs from external sources.',includes:[],image:'',active:true,popular:false}},...services];
}
export function mobileServiceId(context:ServiceContext):string {
  return context.service.slug==='find-jobs'?'find-jobs':String(context.service.id);
}
