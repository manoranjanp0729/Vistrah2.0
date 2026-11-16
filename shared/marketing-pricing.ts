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
export type LivePricingSection={
 id:string;
 tab_group:string;
 step_label:string;
 title:string;
 subtitle:string;
 fee_note:string;
 promo_enabled:boolean;
 free_trial_days:number;
 promo_badge:string;
 cta_label:string;
 cta_href:string;
 meta:Record<string,unknown>;
 sort_order:number;
 active:boolean;
 revision:number;
 updated_at:string|null;
};

export type LivePricingItem={
 id:string;
 section_id:string;
 item_type:'v_ads_tier'|'studio_service'|'package'|'faq';
 title:string;
 subtitle:string;
 description:string;
 price_paise:number|null;
 monthly_price_paise:number|null;
 billing_interval:'day'|'month'|'one-time'|'quote'|'none';
 gst_label:string;
 free_trial_enabled:boolean;
 free_trial_days:number;
 promo_badge:string;
 deliverables:string[];
 meta:Record<string,unknown>;
 sort_order:number;
 active:boolean;
 revision:number;
 updated_at:string|null;
};

export type LivePricingFaq={
 id:string;
 question:string;
 answer:string;
 default_open:boolean;
};

export type LivePricingResponse={
 currency:string;
 notice:string;
 categories:{id:string;name:string;icon:string}[];
 promo:LivePricingSection|null;
 v_ads_tiers:LivePricingItem[];
 pillars:LivePricingSection[];
 services:(PricingService&{gst_label?:string;subtitle?:string})[];
 packages:(MarketingPackage&{gst_label?:string})[];
 faqs:LivePricingFaq[];
 sections:LivePricingSection[];
 items:LivePricingItem[];
};

export type AdminPricingResponse={
 currency:string;
 categories:{id:string;name:string;icon:string}[];
 sections:LivePricingSection[];
 items:LivePricingItem[];
};

export type HydratedVAdsTier={
 id:string;
 radiusKm:number;
 label:string;
 zoneLabel:string;
 dailyPaise:number;
 monthlyPaise:number;
 gstLabel:string;
 freeTrialEnabled:boolean;
 freeTrialDays:number;
 promoBadge:string;
 deliverables:string[];
 reachMinPerDay:number;
 reachMaxPerDay:number;
};

export type HydratedPricingState={
 catalogue:PricingCatalogue;
 serviceFeeLabels:Record<string,string>;
 promo:{
  headline:string;
  subheadline:string;
  primaryCta:string;
  primaryHref:string;
  microcopy:string;
  promoEnabled:boolean;
  freeTrialDays:number;
  anchorBadge:string;
  anchorPriceLabel:string;
  anchorTitle:string;
  anchorSummary:string;
  secondaryCtaLabel:string;
  secondaryCtaHref:string;
  studioBoundary:string;
 };
 vAdsTiers:HydratedVAdsTier[];
 pillars:StudioPillar[];
 faqs:{id:string;question:string;answer:string;defaultOpen:boolean}[];
};

export function defaultHydratedPricing():HydratedPricingState{
 return {
  catalogue:pricingCatalogue,
  serviceFeeLabels:{},
  promo:{
   headline:VADS_FREE_FIRST_MONTH.headline,
   subheadline:VADS_FREE_FIRST_MONTH.subheadline,
   primaryCta:VADS_FREE_FIRST_MONTH.primaryCta,
   primaryHref:VADS_FREE_FIRST_MONTH.primaryHref,
   microcopy:VADS_FREE_FIRST_MONTH.microcopy,
   promoEnabled:true,
   freeTrialDays:30,
   anchorBadge:FREE_LISTING_ANCHOR.badge,
   anchorPriceLabel:FREE_LISTING_ANCHOR.priceLabel,
   anchorTitle:'First 30 Days Free on V Ads',
   anchorSummary:FREE_LISTING_ANCHOR.summary,
   secondaryCtaLabel:FREE_LISTING_ANCHOR.secondaryLabel,
   secondaryCtaHref:FREE_LISTING_ANCHOR.secondaryHref,
   studioBoundary:VADS_FREE_FIRST_MONTH.studioBoundary,
  },
  vAdsTiers:VADS_RADIUS_OPTIONS.map(km=>{
   const t=VADS_RADIUS_TIERS[km];
   return {
    id:`v-ads-${km}km`,
    radiusKm:t.radiusKm,
    label:t.label,
    zoneLabel:t.zoneLabel,
    dailyPaise:t.dailyPaise,
    monthlyPaise:t.monthlyPaise,
    gstLabel:'₹0 Month 1 · +18% GST from Day 31',
    freeTrialEnabled:true,
    freeTrialDays:30,
    promoBadge:'₹0 First 30 Days',
    deliverables:[
     `₹0 — First 30 Days Free (${km} km ${t.zoneLabel.toLowerCase()})`,
     'Spatial Feed + V Ads 9:16 Reels placement',
     'Live views, likes & inquiries in Seller Studio; zero auto-charge on Day 31',
    ],
    reachMinPerDay:t.reachMinPerDay,
    reachMaxPerDay:t.reachMaxPerDay,
   };
  }),
  pillars:[...STUDIO_PILLARS],
  faqs:MERCHANT_PRICING_FAQS.map((f,i)=>({id:`faq-${i+1}`,question:f.question,answer:f.answer,defaultOpen:i===0})),
 };
}

export function hydrateLivePricing(data:LivePricingResponse):HydratedPricingState{
 const fallback=defaultHydratedPricing();
 const feeMap:Record<string,string>={};
 for(const s of data.services??[]){
  if(s.gst_label)feeMap[s.id]=s.gst_label;
  else if(s.subtitle)feeMap[s.id]=s.subtitle;
 }
 const promoSec=data.promo;
 const promoMeta=(promoSec?.meta??{}) as Record<string,unknown>;
 const promo=promoSec?{
  headline:promoSec.title||fallback.promo.headline,
  subheadline:promoSec.subtitle||fallback.promo.subheadline,
  primaryCta:promoSec.cta_label||fallback.promo.primaryCta,
  primaryHref:promoSec.cta_href||fallback.promo.primaryHref,
  microcopy:promoSec.fee_note||fallback.promo.microcopy,
  promoEnabled:Boolean(promoSec.promo_enabled),
  freeTrialDays:Number(promoSec.free_trial_days??0),
  anchorBadge:promoSec.promo_badge||fallback.promo.anchorBadge,
  anchorPriceLabel:String(promoMeta.anchor_price_label??(promoSec.promo_enabled?'₹0':'From ₹150/d')),
  anchorTitle:String(promoMeta.anchor_title??fallback.promo.anchorTitle),
  anchorSummary:String(promoMeta.anchor_summary??fallback.promo.anchorSummary),
  secondaryCtaLabel:String(promoMeta.secondary_cta_label??fallback.promo.secondaryCtaLabel),
  secondaryCtaHref:String(promoMeta.secondary_cta_href??fallback.promo.secondaryCtaHref),
  studioBoundary:String(promoMeta.studio_boundary??fallback.promo.studioBoundary),
 }:fallback.promo;

 const vAdsTiers:HydratedVAdsTier[]=(data.v_ads_tiers?.length?data.v_ads_tiers.map(t=>{
  const m=(t.meta??{}) as Record<string,unknown>;
  const daily=t.price_paise??15000;
  const monthly=t.monthly_price_paise??daily*30;
  const km=Number(m.radius_km??(parseInt(t.title,10)||5));
  return {
   id:t.id,
   radiusKm:km,
   label:t.title,
   zoneLabel:t.subtitle||'Local catchment',
   dailyPaise:daily,
   monthlyPaise:monthly,
   gstLabel:t.gst_label||'18% GST extra',
   freeTrialEnabled:Boolean(t.free_trial_enabled&&promo.promoEnabled),
   freeTrialDays:t.free_trial_enabled&&promo.promoEnabled?Number(t.free_trial_days||promo.freeTrialDays||30):0,
   promoBadge:t.promo_badge||(t.free_trial_enabled?'₹0 First 30 Days':''),
   deliverables:t.deliverables?.length?t.deliverables:[],
   reachMinPerDay:Number(m.reach_min_per_day??1000),
   reachMaxPerDay:Number(m.reach_max_per_day??2500),
  };
 }):fallback.vAdsTiers);

 const pillars:StudioPillar[]=(data.pillars?.length?data.pillars.map(p=>{
  const m=(p.meta??{}) as Record<string,unknown>;
  const rawKey=String(m.pillar_key??p.id.replace('pillar_',''));
  const pillarId=(['digital','creative','outdoor','mobility'].includes(rawKey)?rawKey:'digital') as StudioPillar['id'];
  return {
   id:pillarId,
   step:p.step_label||'01',
   title:p.title,
   subtitle:p.subtitle,
   feeNote:p.fee_note,
   categoryIds:Array.isArray(m.category_ids)?(m.category_ids as string[]):['digital'],
   defaultServiceId:String(m.default_service_id??'digital-campaign'),
   defaultBrief:String(m.default_brief??''),
  };
 }):fallback.pillars);

 const faqs=(data.faqs?.length?data.faqs.map((f,idx)=>({
  id:f.id,
  question:f.question,
  answer:f.answer,
  defaultOpen:f.default_open||(idx===0),
 })):fallback.faqs);

 return {
  catalogue:{
   version:pricingCatalogue.version,
   currency:data.currency||pricingCatalogue.currency,
   notice:data.notice||pricingCatalogue.notice,
   categories:data.categories?.length?data.categories:pricingCatalogue.categories,
   services:data.services?.length?data.services:pricingCatalogue.services,
   packages:data.packages?.length?data.packages:pricingCatalogue.packages,
  },
  serviceFeeLabels:feeMap,
  promo,
  vAdsTiers,
  pillars,
  faqs,
 };
}

export function computeTierBoostEstimate(tier:HydratedVAdsTier,days:number){
 const subtotalPaise=tier.dailyPaise*days;
 const gstPaise=Math.round(subtotalPaise*0.18);
 const totalWithGstPaise=subtotalPaise+gstPaise;
 const trialDays=tier.freeTrialEnabled?tier.freeTrialDays:0;
 const reachMin=tier.reachMinPerDay*days;
 const reachMax=tier.reachMaxPerDay*days;
 const firstMonthReachMin=tier.reachMinPerDay*(trialDays||30);
 const firstMonthReachMax=tier.reachMaxPerDay*(trialDays||30);
 return {
  radiusKm:tier.radiusKm,
  days,
  zoneLabel:tier.zoneLabel,
  freeTrialEnabled:tier.freeTrialEnabled,
  freeTrialDays:trialDays,
  promoBadge:tier.promoBadge,
  dueTodayPaise:tier.freeTrialEnabled?0:totalWithGstPaise,
  dailyPaise:tier.dailyPaise,
  monthlyPaise:tier.monthlyPaise,
  subtotalPaise,
  gstPaise,
  totalWithGstPaise,
  reachFormatted:`${inNumberFormat.format(reachMin)} – ${inNumberFormat.format(reachMax)}`,
  firstMonthReachFormatted:`${inNumberFormat.format(firstMonthReachMin)} – ${inNumberFormat.format(firstMonthReachMax)}`,
 };
}

export function marketingPricingClient(fetcher:<T>(path:string,options?:RequestInit)=>Promise<T>){return {livePricing:()=>fetcher<LivePricingResponse>('/pricing'),catalogue:()=>fetcher<PricingCatalogue>('/marketing-pricing/catalogue'),capabilities:()=>fetcher<PricingCapabilities>('/marketing-pricing/capabilities'),submit:(payload:ReturnType<typeof quotePayload>)=>fetcher<MarketingQuote>('/marketing-pricing/quotes',{method:'POST',body:JSON.stringify(payload)}),requests:()=>fetcher<{items:MarketingQuote[]}>('/marketing-pricing/quotes')};}

export type PricingIntent='boosts'|'studio';
export type VAdsRadiusKm=2|5|10|25;
export type VAdsDurationDays=3|7|15|30;

export const VADS_FREE_FIRST_MONTH={
 headline:'Launch V Ads Free for Your First Month',
 subheadline:'Run hyperlocal V Ads across your neighborhood at ₹0 for the first 30 days. Experience real customer inquiries before paying a rupee.',
 primaryCta:'Start Free First Month',
 primaryHref:'/seller/v-ads',
 microcopy:'₹0 due today • No upfront payment required • Transparent monthly rates from Day 31',
 studioBoundary:'The First 30 Days Free offer applies exclusively to self-serve spatial & 9:16 Reels V Ads. VISTRAH Ads & Marketing Studio retainers, creative/video production, outdoor signage, and mobility billboards are scoped and billed separately.',
} as const;

export const FREE_LISTING_ANCHOR={
 priceLabel:'₹0',
 badge:'FIRST 30 DAYS FREE · SELF-SERVE V ADS',
 title:'First Month Free on V Ads + 90-Day Free Basic Listing',
 summary:'Verified businesses get 30 days of hyperlocal V Ads visibility at ₹0 (zero auto-charge from Day 31), alongside 90 days of Basic Business Membership at ₹0 for eligible new service providers. Studio agency & outdoor services are quoted separately.',
 primaryHref:'/seller/v-ads',
 primaryLabel:'Start Free First Month',
 secondaryHref:'/provide-service',
 secondaryLabel:'Register Business Free',
} as const;

export const VADS_RADIUS_OPTIONS:readonly VAdsRadiusKm[]=[2,5,10,25];
export const VADS_DURATION_OPTIONS:readonly VAdsDurationDays[]=[3,7,15,30];

export const VADS_RADIUS_TIERS:Record<VAdsRadiusKm,{radiusKm:VAdsRadiusKm;label:string;zoneLabel:string;dailyPaise:number;monthlyPaise:number;reachMinPerDay:number;reachMaxPerDay:number}>={
 2:{radiusKm:2,label:'2 km',zoneLabel:'Neighbourhood catchment',dailyPaise:15000,monthlyPaise:450000,reachMinPerDay:900,reachMaxPerDay:1800},
 5:{radiusKm:5,label:'5 km',zoneLabel:'Ward & locality cluster',dailyPaise:25000,monthlyPaise:750000,reachMinPerDay:2200,reachMaxPerDay:4500},
 10:{radiusKm:10,label:'10 km',zoneLabel:'Multi-zone corridor',dailyPaise:45000,monthlyPaise:1350000,reachMinPerDay:5000,reachMaxPerDay:9800},
 25:{radiusKm:25,label:'25 km',zoneLabel:'City-wide metro reach',dailyPaise:80000,monthlyPaise:2400000,reachMinPerDay:12000,reachMaxPerDay:24000},
};

const inNumberFormat=new Intl.NumberFormat('en-IN');

export function estimateVAdsBoost(radiusKm:VAdsRadiusKm,days:VAdsDurationDays){
 const tier=VADS_RADIUS_TIERS[radiusKm];
 const subtotalPaise=tier.dailyPaise*days;
 const gstPaise=Math.round(subtotalPaise*0.18);
 const totalWithGstPaise=subtotalPaise+gstPaise;
 const monthlyGstPaise=Math.round(tier.monthlyPaise*0.18);
 const monthlyTotalWithGstPaise=tier.monthlyPaise+monthlyGstPaise;
 const reachMin=tier.reachMinPerDay*days;
 const reachMax=tier.reachMaxPerDay*days;
 const firstMonthReachMin=tier.reachMinPerDay*30;
 const firstMonthReachMax=tier.reachMaxPerDay*30;
 return {
  radiusKm,
  days,
  zoneLabel:tier.zoneLabel,
  firstMonthDuePaise:0,
  dailyPaise:tier.dailyPaise,
  monthlyPaise:tier.monthlyPaise,
  monthlyGstPaise,
  monthlyTotalWithGstPaise,
  subtotalPaise,
  gstPaise,
  totalWithGstPaise,
  reachMin,
  reachMax,
  reachFormatted:`${inNumberFormat.format(reachMin)} – ${inNumberFormat.format(reachMax)}`,
  firstMonthReachFormatted:`${inNumberFormat.format(firstMonthReachMin)} – ${inNumberFormat.format(firstMonthReachMax)}`,
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
  free:'New local providers establishing verified directory trust',
  boosts:'Neighbourhood shops, clinics, salons & restaurants testing local V Ads risk-free',
  studio:'Growing SMBs, multi-outlet brands & city-wide agency/outdoor launches',
 },
 {
  criteria:'Month 1 (Days 1–30) outlay',
  free:'₹0 (First 90 days Basic Membership free)',
  boosts:'₹0 — First 30 Days Free (₹0 due today, no upfront payment)',
  studio:'Quoted per scope — from ₹499 creative · ₹4,999/mo retainers · Custom OOH quotes',
 },
 {
  criteria:'Standard rate from Day 31+',
  free:'₹149/month Basic after Day 90 (no auto-renewal)',
  boosts:'₹4,500–₹24,000/mo (₹150–₹800/day by km radius) + 18% GST — only if you continue',
  studio:'Per approved Studio retainer or campaign quote + 18% GST (free-month offer excluded)',
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
  boosts:'Self-serve upload & live inquiry tracking in V Ads Seller Studio',
  studio:'Dedicated Vistrah creative, web, media-planning & fabrication Desk',
 },
 {
  criteria:'Media spend & tax invoicing',
  free:'No charge during 90-day promotional window',
  boosts:'₹0 for Month 1; 18% GST itemised (GSTIN ITC eligible) from Day 31 onward',
  studio:'Agency/production fee quoted upfront; ad spend at actuals + 18% GST tax invoice',
 },
] as const;

export const MERCHANT_PRICING_FAQS=[
 {
  question:'How does the Free First Month of V Ads work?',
  answer:'Verified businesses on VISTRAH receive their first 30 days of self-serve spatial V Ads and 9:16 Reels visibility at ₹0—with ₹0 due today and zero automatic billing lock-in. Configure your neighborhood km radius, publish moderated Reels, and track live reach, views, and customer inquiries inside V Ads Seller Studio. Standard transparent rates (plus 18% GST) apply only from Day 31 onward if you choose to continue. VISTRAH Ads & Marketing Studio agency retainers, creative shoots, outdoor hoardings, and mobility billboards are quoted separately.',
 },
 {
  question:'Do I receive a GST tax invoice for 18% Input Tax Credit (ITC) from Day 31?',
  answer:'Yes. Your first 30 days of self-serve V Ads are ₹0. For paid campaigns from Day 31 onward—or any approved Studio service—applicable 18% GST is itemised separately on tax invoices issued by Vistrah India Pvt Limited so GST-registered businesses can claim eligible B2B Input Tax Credit using their 15-digit GSTIN.',
 },
 {
  question:'How does the ₹0 90-day Free Basic Membership work alongside Free First Month V Ads?',
  answer:'Eligible new service providers get 90 days of Basic Business Membership at ₹0 (₹149/month afterward, no automatic renewal), which includes your verified business profile, spatial directory presence, 5 job-posting credits, and V Ads Seller Studio access—where you can immediately activate your ₹0 first 30 days of V Ads.',
 },
 {
  question:'Can I pause, adjust my km radius, or stop before Day 31?',
  answer:'Yes. In V Ads Seller Studio (/seller/v-ads), you can submit updated geo-pin and radius revisions (2 km to 25 km) or withdraw an active video anytime during or after your free 30-day period. Nothing is billed automatically when Day 30 ends.',
 },
 {
  question:'Does the Free First Month apply to VISTRAH Ads & Marketing Studio, websites, or hoardings?',
  answer:'No. The ₹0 First 30 Days offer applies strictly to self-serve V Ads on the VISTRAH platform. Managed agency retainers (from ₹4,999/month, excluding Google/Meta ad spend), website builds, video production, roadside hoardings, and auto/bus transit branding require separate custom quotations.',
 },
] as const;
