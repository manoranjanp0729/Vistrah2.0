import type {ServiceContext} from './types';
import {urls} from './urls';
import {officialContact} from './contact';

export const serviceTabs=['providers','recommendations','in-house'] as const;
export type ServiceTab=typeof serviceTabs[number];
export function serviceTab(value:unknown,intent?:unknown):ServiceTab {
  if(typeof value==='string'&&serviceTabs.includes(value as ServiceTab))return value as ServiceTab;
  return intent==='recommendations'||intent==='in-house'?intent:'providers';
}
export function serviceTabUrl(context:ServiceContext,tab:ServiceTab) {
  return `${urls.service(context.category,context.service,context.subcategory)}?tab=${tab}`;
}

export type EnquiryIntent='enquiry'|'contact'|'recommendations'|'in-house';
export const enquiryModes:Record<EnquiryIntent,{message:string;prefix:string}>={
  enquiry:{message:'Send a service-specific enquiry. It is saved in your account for VISTRAH to review; this form does not send an email.',prefix:''},
  contact:{message:`Live chat is not available. Leave your requirements here for VISTRAH to review, or email VISTRAH at ${officialContact.email}.`,prefix:'[Contact enquiry] '},
  recommendations:{message:'Ask VISTRAH to help choose suitable services or providers based on your requirements. This is a request for a human review, not an automated recommendation.',prefix:'[Recommendation assistance] '},
  'in-house':{message:'No explicitly classified VISTRAH in-house offering is currently listed for this service. Ask about delivery options; submitting this enquiry does not confirm VISTRAH delivery.',prefix:'[Delivery options enquiry] '}
};
export function enquiryIntent(value:unknown):EnquiryIntent {
  return typeof value==='string' && Object.hasOwn(enquiryModes,value)?value as EnquiryIntent:'enquiry';
}
export function enquiryUrl(context:ServiceContext,intent:EnquiryIntent='enquiry') {
  const path=urls.request(context.category,context.service,context.subcategory);
  return intent==='enquiry'?path:`${path}?intent=${intent}`;
}
export function servicePathways(context:ServiceContext) {
  return [
    {id:'providers',title:'Find Service Provider',description:'Browse active, verified registered providers associated with this service. Confirm scope and availability directly.',action:'Browse providers',href:urls.providers(context.category,context.subcategory,context.service)},
    {id:'recommendations',title:'VISTRAH Recommended',description:'Submit a saved enquiry for human review and track it in your account. No automated matching, instant shortlist or guaranteed turnaround.',action:'Request human review',href:enquiryUrl(context,'recommendations')},
    {id:'in-house',title:'VISTRAH Services',description:'No VISTRAH-managed offering available for this service.',action:'Enquire about delivery options',href:enquiryUrl(context,'in-house')}
  ] as const;
}
