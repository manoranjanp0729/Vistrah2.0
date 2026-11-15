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

export type PricingIntent='boosts'|'studio';
export type VAdsRadiusKm=2|5|10|25;
export type VAdsDurationDays=3|7|15|30;

export const FREE_LISTING_ANCHOR={
 priceLabel:'₹0',
 badge:'FIRST 90 DAYS FREE · BASIC BUSINESS MEMBERSHIP',
 title:'Start with a ₹0 Verified Business Listing',
 summary:'Eligible new service providers receive 90 days of Basic Membership at ₹0 (₹149/month afterward, no automatic renewal)—including a verified business profile, spatial discovery, 5 job-posting credits, and V Ads Seller Studio access.',
 primaryHref:'/provide-service',
 primaryLabel:'Claim Free Listing',
 secondaryHref:'/membership',
 secondaryLabel:'Membership Rules',
} as const;

export const VADS_RADIUS_OPTIONS:readonly VAdsRadiusKm[]=[2,5,10,25];
export const VADS_DURATION_OPTIONS:readonly VAdsDurationDays[]=[3,7,15,30];

export const VADS_RADIUS_TIERS:Record<VAdsRadiusKm,{radiusKm:VAdsRadiusKm;label:string;zoneLabel:string;dailyPaise:number;reachMinPerDay:number;reachMaxPerDay:number}>={
 2:{radiusKm:2,label:'2 km',zoneLabel:'Neighbourhood catchment',dailyPaise:15000,reachMinPerDay:900,reachMaxPerDay:1800},
 5:{radiusKm:5,label:'5 km',zoneLabel:'Ward & locality cluster',dailyPaise:25000,reachMinPerDay:2200,reachMaxPerDay:4500},
 10:{radiusKm:10,label:'10 km',zoneLabel:'Multi-zone corridor',dailyPaise:45000,reachMinPerDay:5000,reachMaxPerDay:9800},
 25:{radiusKm:25,label:'25 km',zoneLabel:'City-wide metro reach',dailyPaise:80000,reachMinPerDay:12000,reachMaxPerDay:24000},
};

const inNumberFormat=new Intl.NumberFormat('en-IN');

export function estimateVAdsBoost(radiusKm:VAdsRadiusKm,days:VAdsDurationDays){
 const tier=VADS_RADIUS_TIERS[radiusKm];
 const subtotalPaise=tier.dailyPaise*days;
 const gstPaise=Math.round(subtotalPaise*0.18);
 const totalWithGstPaise=subtotalPaise+gstPaise;
 const reachMin=tier.reachMinPerDay*days;
 const reachMax=tier.reachMaxPerDay*days;
 return {
  radiusKm,
  days,
  zoneLabel:tier.zoneLabel,
  dailyPaise:tier.dailyPaise,
  subtotalPaise,
  gstPaise,
  totalWithGstPaise,
  reachMin,
  reachMax,
  reachFormatted:`${inNumberFormat.format(reachMin)} – ${inNumberFormat.format(reachMax)}`,
 };
}

export type StudioPillar={
 id:'digital'|'creative'|'outdoor'|'mobility';
 step:string;
 title:string;
 subtitle:string;
 feeNote:string;
 categoryIds:string[];
 defaultServiceId:string;
 defaultBrief:string;
};

export const STUDIO_PILLARS:readonly StudioPillar[]=[
 {
  id:'digital',
  step:'01',
  title:'Digital Marketing & Web',
  subtitle:'Business websites, e-commerce stores, Social Media Management, Local & Standard SEO, Google/Meta Ads, WhatsApp & Email campaigns.',
  feeNote:'Agency / build fee · Paid Google & Meta ad spend billed separately at actuals',
  categoryIds:['websites','digital','social','search','influencer'],
  defaultServiceId:'digital-campaign',
  defaultBrief:'Looking for a custom digital marketing & performance plan (target city, monthly ad spend cap, and lead goals): ',
 },
 {
  id:'creative',
  step:'02',
  title:'Branding, Creative & Video Production',
  subtitle:'Social media graphics, promotional posters, brand identity kits, 9:16 Promotional Reels, AI Video Ads, and UGC/studio video shoots.',
  feeNote:'Creative production fee · On-site shoots, talent, travel & music licensing scoped separately',
  categoryIds:['branding','video'],
  defaultServiceId:'promotional-reel',
  defaultBrief:'Looking for branding, campaign creatives, or 9:16 V Ads video production (deliverables, language, and timeline): ',
 },
 {
  id:'outdoor',
  step:'03',
  title:'Outdoor Advertising, Signage & Cinema',
  subtitle:'High-footfall roadside hoardings, bus shelters, digital outdoor screens (DOOH), retail storefront signage, and cinema placements.',
  feeNote:'Site-specific quotation · Printing, mounting & municipal permissions confirmed per location',
  categoryIds:['outdoor','screens','cinema'],
  defaultServiceId:'roadside-hoarding',
  defaultBrief:'Requesting outdoor hoarding, DOOH screen, or signage availability (preferred junctions, dimensions, and dates): ',
 },
 {
  id:'mobility',
  step:'04',
  title:'Mobility Billboard Advertising',
  subtitle:'Auto-rickshaw branding, bus panels, and route-mapped transit or fleet branding across commercial corridors and residential catchments.',
  feeNote:'Route & fleet quotation · Vehicle count, fabrication & corridor schedules confirmed per city',
  categoryIds:['mobility'],
  defaultServiceId:'auto-branding',
  defaultBrief:'Requesting mobility transit or fleet branding options (corridors/pin codes, vehicle count, and duration): ',
 },
];

export function serviceFeeClarity(service:PricingService):string{
 const primary=service.category_ids[0]??'';
 if(primary==='websites')return 'One-time build · Domain, hosting & gateway fees separate';
 if(primary==='digital'||primary==='social'||primary==='search')return 'Management fee · Ad media spend billed at actuals';
 if(primary==='influencer')return 'Campaign scope · Creator & media fees per approved brief';
 if(primary==='branding'||primary==='video')return 'Production fee · Shoots, talent & licensing separate';
 if(primary==='mobility')return 'Route & fleet quote · Fabrication & vehicle count separate';
 return 'Site inventory quote · Printing, mounting & permits separate';
}

export const PRICING_COMPARISON_ROWS=[
 {
  criteria:'Best suited for',
  free:'New local providers establishing verified trust',
  boosts:'Hyperlocal shops, clinics, salons & restaurants driving nearby walk-ins',
  studio:'Growing SMBs, multi-outlet brands & city-wide launches',
 },
 {
  criteria:'Indicative starting outlay',
  free:'₹0 for first 90 days (₹149/mo Basic after)',
  boosts:'From ₹150/day (2 km) to ₹800/day (25 km) + 18% GST',
  studio:'From ₹499 creative · ₹4,999/mo retainers · Custom OOH/transit quotes',
 },
 {
  criteria:'Geographic & channel reach',
  free:'Standard VISTRAH spatial search & service directory',
  boosts:'2 km – 25 km geo-targeted spatial feed & V Ads 9:16 Reels',
  studio:'Web, Search, Meta/Google, Hoardings, DOOH, Cinema & Transit fleets',
 },
 {
  criteria:'Creative & campaign execution',
  free:'Self-managed business profile & service listings',
  boosts:'Upload your own 9:16 Reel in V Ads Seller Studio',
  studio:'Dedicated Vistrah creative, web, media-planning & fabrication Desk',
 },
 {
  criteria:'Media spend & third-party costs',
  free:'None required',
  boosts:'Transparent daily rate × duration; no external agency retainer',
  studio:'Agency/production fee quoted upfront; ad spend & site media at actuals',
 },
 {
  criteria:'Tax invoicing & compliance',
  free:'No charge during 90-day promotional window',
  boosts:'18% GST itemised; ad & geo-radius moderated before going live',
  studio:'18% GST B2B tax invoice (GSTIN ITC eligible) upon commercial sign-off',
 },
] as const;

export const MERCHANT_PRICING_FAQS=[
 {
  question:'Do I receive a GST tax invoice for 18% Input Tax Credit (ITC)?',
  answer:'Yes. Applicable 18% GST is itemised separately on tax invoices issued by Vistrah Groups Pvt Ltd. GST-registered Indian businesses can provide their 15-digit GSTIN at billing confirmation to claim eligible B2B Input Tax Credit.',
 },
 {
  question:'How does upgrading from the ₹0 90-day Free Basic Membership work?',
  answer:'Eligible new service providers receive 90 days of Basic Membership at ₹0 (₹149/month afterward, with zero automatic renewal). You can keep Basic, upgrade to Plus (₹799/mo) or Premium (₹1,899/mo) for monthly creative/social allowances, or request standalone V Ads boosts and Studio services anytime.',
 },
 {
  question:'Can I pause, adjust my km radius, or extend a V Ads Reels boost?',
  answer:'Yes. In V Ads Seller Studio (/seller/v-ads), you can submit updated geo-pin and radius revisions (from 2 km neighbourhood catchments up to 25 km+ city corridors) or withdraw a video at any time. Targeting and creative updates undergo moderation review before republication.',
 },
 {
  question:'Are Google or Meta ad budgets included in Digital Marketing monthly retainers?',
  answer:'No. Monthly retainers (starting at ₹4,999/month) cover campaign strategy, setup, creative coordination, optimisation, and reporting. Actual media spend paid to Google, Meta, or creator partners is billed transparently at actuals within your approved budget cap.',
 },
 {
  question:'How are Outdoor Hoardings, Digital Screens, and Mobility Billboards priced?',
  answer:'Outdoor and transit rates vary by city corridor, board dimensions, lighting, fleet count, printing/mounting, and municipal permissions. Submit a Custom Media Plan brief with your target city, preferred junctions or routes, and dates—we return an itemised availability quotation before any commitment.',
 },
] as const;
