import source from './marketing-pricing.json';
export type PricingService={id:string;name:string;category_ids:string[];starting_price_paise:number|null;billing:'one-time'|'month';description:string;deliverables:string[];addons:string[];exclusions:string[];delivery_note:string|null;enabled:boolean;pricing_state:'PROPOSED'|'APPROVED';studio_related:boolean};
export type MarketingPackage={id:string;name:string;monthly_price_paise:number;features:string[];pricing_state:'PROPOSED'|'APPROVED';note:string};
export type PricingCatalogue={version:number;currency:string;notice:string;categories:{id:string;name:string;icon:string}[];services:PricingService[];packages:MarketingPackage[]};
export const pricingCatalogue=source as PricingCatalogue;
export const pricingHref=(id?:string)=>id?'/marketing-pricing/'+encodeURIComponent(id):'/marketing-pricing';
export function formatPricingMoney(paise:number){if(!Number.isSafeInteger(paise)||paise<0)throw new Error('Invalid price');return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:paise%100?2:0,maximumFractionDigits:2}).format(paise/100);}
export function servicePrice(service:PricingService){return service.starting_price_paise===null?'Quotation required':'From '+formatPricingMoney(service.starting_price_paise)+(service.billing==='month'?'/month':' / one-time');}
export function searchPricing(catalogue:PricingCatalogue,query:string,category='',billing='all'){
 const needle=query.trim().toLowerCase();
 return catalogue.services.filter(s=>s.enabled&&(!category||s.category_ids.includes(category))&&(billing==='all'||(billing==='quote'?s.starting_price_paise===null:s.billing===billing))&&[s.name,s.description,...s.category_ids.map(id=>catalogue.categories.find(c=>c.id===id)?.name??id)].join(' ').toLowerCase().includes(needle));
}
export function baseEstimate(service:PricingService,pack:MarketingPackage|undefined,months=1){
 if(!Number.isSafeInteger(months)||months<1||months>24)throw new Error('Use 1 to 24 months');
 if(service.starting_price_paise===null){if(pack)throw new Error('Media placement requires a separate quotation');return null;}
 return pack?pack.monthly_price_paise*months:service.starting_price_paise*(service.billing==='month'?months:1);
}
export type QuoteDraft={service_id:string;package_id:string;addons:string[];months:string;city:string;area:string;media_format:string;campaign_duration:string;quantity:string;budget:string;business_name:string;contact_name:string;email:string;phone:string;requirements:string};
export function emptyQuote(service_id:string):QuoteDraft{return {service_id,package_id:'',addons:[],months:'1',city:'',area:'',media_format:'',campaign_duration:'',quantity:'1',budget:'',business_name:'',contact_name:'',email:'',phone:'',requirements:''};}
export function quoteKey(){return 'marketing-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,14);}
export function quotePayload(draft:QuoteDraft,key:string){
 const months=Number(draft.months),quantity=Number(draft.quantity);
 if(!Number.isSafeInteger(months)||months<1||months>24)throw new Error('Use 1 to 24 months.');
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>100000)throw new Error('Use a whole quantity between 1 and 100,000.');
 if(draft.city.trim().length<2||draft.contact_name.trim().length<2||draft.business_name.trim().length<2)throw new Error('Enter your city, business and contact name.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()))throw new Error('Enter a valid email.');
 if(!/^\+?[\d\s-]{10,20}$/.test(draft.phone.trim()))throw new Error('Enter a valid contact phone.');
 if(draft.requirements.trim().length<20)throw new Error('Describe your requirements in at least 20 characters.');
 if(draft.budget&&!/^\d{1,9}(?:\.\d{1,2})?$/.test(draft.budget))throw new Error('Enter a valid budget with up to two decimal places.');
 return {service_id:draft.service_id,package_id:draft.package_id||null,addons:draft.addons,months,city:draft.city.trim(),area:draft.area.trim(),media_format:draft.media_format.trim(),campaign_duration:draft.campaign_duration.trim(),quantity,budget_paise:draft.budget?Math.round(Number(draft.budget)*100):null,business_name:draft.business_name.trim(),contact_name:draft.contact_name.trim(),email:draft.email.trim(),phone:draft.phone.trim(),requirements:draft.requirements.trim(),idempotency_key:key};
}
export type MarketingQuote={id:string;service_id:string;service_name:string;package_id:string|null;status:string;revision:number;estimate_paise:number|null;pricing_state:string;customer_note:string;created_at:string};
export type PricingCapabilities={quote_requests_available:boolean;message:string};
export function marketingPricingClient(fetcher:<T>(path:string,options?:RequestInit)=>Promise<T>){return {catalogue:()=>fetcher<PricingCatalogue>('/marketing-pricing/catalogue'),capabilities:()=>fetcher<PricingCapabilities>('/marketing-pricing/capabilities'),submit:(payload:ReturnType<typeof quotePayload>)=>fetcher<MarketingQuote>('/marketing-pricing/quotes',{method:'POST',body:JSON.stringify(payload)}),requests:()=>fetcher<{items:MarketingQuote[]}>('/marketing-pricing/quotes')};}
