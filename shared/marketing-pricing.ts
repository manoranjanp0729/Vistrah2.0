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
   headline:VADS_FREE_FOREVER.headline,
   subheadline:VADS_FREE_FOREVER.subheadline,
   primaryCta:VADS_FREE_FOREVER.primaryCta,
   primaryHref:VADS_FREE_FOREVER.primaryHref,
   microcopy:VADS_FREE_FOREVER.microcopy,
   promoEnabled:true,
   freeTrialDays:0,
   anchorBadge:FREE_LISTING_ANCHOR.badge,
   anchorPriceLabel:FREE_LISTING_ANCHOR.priceLabel,
   anchorTitle:FREE_LISTING_ANCHOR.title,
   anchorSummary:FREE_LISTING_ANCHOR.summary,
   secondaryCtaLabel:FREE_LISTING_ANCHOR.secondaryLabel,
   secondaryCtaHref:FREE_LISTING_ANCHOR.secondaryHref,
   studioBoundary:VADS_FREE_FOREVER.studioBoundary,
  },
  vAdsTiers:VADS_RADIUS_OPTIONS.map(km=>{
   const t=VADS_RADIUS_TIERS[km];
   return {
    id:`v-ads-${km}km`,
    radiusKm:t.radiusKm,
    label:t.label,
    zoneLabel:t.zoneLabel,
    dailyPaise:0,
    monthlyPaise:0,
    gstLabel:'₹0 / Free Forever · Any radius on VISTRAH',
    freeTrialEnabled:true,
    freeTrialDays:0,
    promoBadge:'₹0 Free Forever',
    deliverables:[
     `₹0 / Free Forever — Free for any radius on VISTRAH (${km} km ${t.zoneLabel.toLowerCase()})`,
      'Free business listing across verified local categories + 9:16 V Ads Reels placement',
     'Direct Call, Website, Directions & live engagement metrics in Seller Studio',
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
  anchorPriceLabel:String(promoMeta.anchor_price_label??'₹0'),
  anchorTitle:String(promoMeta.anchor_title??fallback.promo.anchorTitle),
  anchorSummary:String(promoMeta.anchor_summary??fallback.promo.anchorSummary),
  secondaryCtaLabel:String(promoMeta.secondary_cta_label??fallback.promo.secondaryCtaLabel),
  secondaryCtaHref:String(promoMeta.secondary_cta_href??fallback.promo.secondaryCtaHref),
  studioBoundary:String(promoMeta.studio_boundary??fallback.promo.studioBoundary),
 }:fallback.promo;

 const vAdsTiers:HydratedVAdsTier[]=(data.v_ads_tiers?.length?data.v_ads_tiers.map(t=>{
  const m=(t.meta??{}) as Record<string,unknown>;
  const daily=t.price_paise??0;
  const monthly=t.monthly_price_paise??daily*30;
  const km=Number(m.radius_km??(parseInt(t.title,10)||5));
  return {
   id:t.id,
   radiusKm:km,
   label:t.title,
   zoneLabel:t.subtitle||'Local catchment',
   dailyPaise:daily,
   monthlyPaise:monthly,
   gstLabel:t.gst_label||'₹0 / Free Forever · Any radius on VISTRAH',
   freeTrialEnabled:Boolean(t.free_trial_enabled&&promo.promoEnabled),
   freeTrialDays:Number(t.free_trial_days??0),
   promoBadge:t.promo_badge||(daily===0?'₹0 Free Forever':''),
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
export type VAdsRadiusKm=2|5|10|25|50;
export type VAdsDurationDays=3|7|15|30;

export const VADS_FREE_FOREVER={
 headline:'List Your Business & Upload V Ads — 100% Free Forever',
 subheadline:'List your business across verified local categories across India and publish hyperlocal V Ads for any target radius inside VISTRAH at ₹0 forever. Pay only when you hire VISTRAH Ads & Marketing Studio or request custom Website & Automation solutions.',
 primaryCta:'Create & Upload Free V Ad',
 primaryHref:'/seller/v-ads',
 microcopy:'₹0 / Free Forever for Verified Business Listings & Self-Serve V Ads (any radius on VISTRAH) • Zero commission',
 studioBoundary:'Business listings across all VISTRAH service categories and self-serve V Ads creation/upload for any target radius inside VISTRAH are 100% Free Forever (₹0). Paid pricing applies strictly to optional done-for-you VISTRAH Ads & Marketing Studio campaigns/production and VISTRAH Tech Website & Business Automation solutions.',
} as const;

export const VADS_FREE_FIRST_MONTH=VADS_FREE_FOREVER;

export const FREE_LISTING_ANCHOR={
 priceLabel:'₹0',
 badge:'₹0 / FREE FOREVER · LISTING & ANY-RADIUS V ADS',
 title:'Free Forever: Business Listing + Any-Radius V Ads',
 summary:'List your business on VISTRAH and create & upload V Ads for any target radius across India at ₹0 forever. Done-for-you VISTRAH Ads & Marketing Studio and Website / Business Automation services are quoted transparently below.',
 primaryHref:'/seller/v-ads',
 primaryLabel:'Create & Upload Free V Ad',
 secondaryHref:'/seller/onboard',
 secondaryLabel:'List Business Free',
} as const;

export const VADS_RADIUS_OPTIONS:readonly VAdsRadiusKm[]=[2,5,10,25,50];
export const VADS_DURATION_OPTIONS:readonly VAdsDurationDays[]=[3,7,15,30];

export const VADS_RADIUS_TIERS:Record<VAdsRadiusKm,{radiusKm:VAdsRadiusKm;label:string;zoneLabel:string;dailyPaise:number;monthlyPaise:number;reachMinPerDay:number;reachMaxPerDay:number}>={
 2:{radiusKm:2,label:'2 km',zoneLabel:'Neighbourhood catchment',dailyPaise:0,monthlyPaise:0,reachMinPerDay:900,reachMaxPerDay:1800},
 5:{radiusKm:5,label:'5 km',zoneLabel:'Ward & locality cluster',dailyPaise:0,monthlyPaise:0,reachMinPerDay:2200,reachMaxPerDay:4500},
 10:{radiusKm:10,label:'10 km',zoneLabel:'Multi-zone corridor',dailyPaise:0,monthlyPaise:0,reachMinPerDay:5000,reachMaxPerDay:9800},
 25:{radiusKm:25,label:'25 km',zoneLabel:'City-wide metro reach',dailyPaise:0,monthlyPaise:0,reachMinPerDay:12000,reachMaxPerDay:24000},
 50:{radiusKm:50,label:'50 km+',zoneLabel:'District & regional reach',dailyPaise:0,monthlyPaise:0,reachMinPerDay:20000,reachMaxPerDay:45000},
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
  id:'creative',
  step:'01',
  title:'VISTRAH Ads & Marketing Studio',
  subtitle:'Custom commercial video ad production (Reels, Shorts, brand films), graphic & brochure/poster design, brand identity kits, and creator campaigns.',
  feeNote:'Creative production fee · On-site shoots, talent, travel & music licensing scoped separately',
  categoryIds:['branding','video','influencer'],
  defaultServiceId:'promotional-reel',
  defaultBrief:'Looking for custom commercial video ad production, graphic/brochure design, or brand creatives (deliverables, language, and timeline): ',
 },
 {
  id:'digital',
  step:'02',
  title:'Website & Digital Setup (VISTRAH Tech / Automation)',
  subtitle:'Custom business website design & launch, booking/e-commerce portals, business workflow automation, WhatsApp setup, SEO, and managed Meta/Google/social marketing campaigns.',
  feeNote:'One-time build or monthly agency fee · Domain, cloud & Meta/Google ad spend billed separately at actuals',
  categoryIds:['websites','digital','social','search'],
  defaultServiceId:'business-website',
  defaultBrief:'Looking for custom business website development, business workflow automation, or managed Meta/Google/social campaigns (city, goals, and timeline): ',
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
 if(service.id==='business-workflow-automation')return 'Custom automation scope · Third-party API & SaaS fees separate';
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
  free:'Every shop, clinic, salon, contractor, hospitality & local business across India',
  boosts:'Local businesses broadcasting 9:16 video ads across any radius inside VISTRAH',
  studio:'Businesses wanting done-for-you ad shoots, managed Meta/Google campaigns, custom websites, or automation',
 },
 {
  criteria:'Platform & radius fee',
  free:'₹0 / Free Forever (0% lead commission)',
  boosts:'₹0 / Free Forever — Free for any target radius on VISTRAH',
  studio:'Quoted per scope — Creatives from ₹499 · Websites from ₹4,999 · Retainers from ₹4,999/mo',
 },
 {
  criteria:'Per-radius charges',
  free:'₹0 for any locality coverage (5 km – 50 km+)',
  boosts:'₹0 forever across 2 km, 5 km, 10 km, 25 km, 50 km+ or any radius on VISTRAH',
  studio:'Scoped per agency deliverable, custom website/automation build, or outdoor/mobility inventory',
 },
 {
  criteria:'Geographic & channel reach',
  free:'Interactive nearby map + distance-sorted listings with Call, Website & Directions',
  boosts:'Hyperlocal V Ads 9:16 Reels & spatial discovery for any target radius inside VISTRAH',
  studio:'Custom Business Websites, Workflow Automation, Meta/Google/Social, Reels Shoots, Hoardings & Transit',
 },
 {
  criteria:'Creative & campaign execution',
  free:'3-minute self-serve onboarding (/seller/onboard)',
  boosts:'Self-serve upload, template creator & live analytics in V Ads Studio (/seller/v-ads)',
  studio:'Done-for-you VISTRAH Ads & Marketing Studio + VISTRAH Tech Website & Automation team',
 },
 {
  criteria:'Media spend & tax invoicing',
  free:'₹0 — No platform listing fee or hidden charges',
  boosts:'₹0 — No per-radius or monthly fee to upload & run V Ads inside VISTRAH',
  studio:'Transparent INR quotation; external Meta/Google ad spend at actuals + 18% GST tax invoice (ITC eligible)',
 },
] as const;

export const MERCHANT_PRICING_FAQS=[
 {
  question:'Are business listings and uploading V Ads really 100% free for any radius?',
  answer:'Yes! Listing your business across VISTRAH service categories (/seller/onboard) and creating/uploading self-serve V Ads for ANY target radius inside VISTRAH (/seller/v-ads) are ₹0 / Free Forever—with zero per-radius charges and zero lead commissions. All V Ads go through standard quality moderation before appearing live.',
 },
 {
  question:'What services are paid on VISTRAH?',
  answer:'Paid pricing applies only when you hire our done-for-you teams: (1) VISTRAH Ads & Marketing Studio for custom commercial video production (Reels, Shorts, brand films), graphic/brochure design, managed Meta/Google/social campaigns, outdoor hoardings, and transit branding; and (2) Website & Digital Setup (VISTRAH Tech / Automation) for custom business website design & launch and business workflow automation.',
 },
 {
  question:'How do I request a custom business website or workflow automation?',
  answer:'Select any Website Design & Development or Business Workflow Automation option on /pricing to request an itemised INR quote, or tap "Request website" from any listing card (/contact?intent=request-website) so our VISTRAH Tech team can scope your domain, design, WhatsApp enquiry flow, and automation setup.',
 },
 {
  question:'Can I change my V Ads target radius anytime without paying extra?',
  answer:'Yes. Inside V Ads Studio (/seller/v-ads), you can configure or update your geographic pin and target radius—whether 2 km neighbourhood reach, 10 km city corridor, 25 km metro reach, or wider—at ₹0 forever. Updated targeting revisions go live right after admin moderation review.',
 },
 {
  question:'Do paid Studio, Website, and Automation projects include GST tax invoices?',
  answer:'Yes. For any approved paid VISTRAH Ads & Marketing Studio campaign, creative shoot, custom website build, or workflow automation project, Vistrah India Pvt Limited issues an itemised INR tax invoice with 18% GST separated so GST-registered businesses can claim eligible B2B Input Tax Credit (ITC) using their 15-digit GSTIN.',
 },
] as const;
