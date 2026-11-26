export type AdminItem = {slug:string; label:string; description:string};
export type AdminGroup = {title:string; collapsed:boolean; items:AdminItem[]};

export type AdminPrimaryDestination = {
  slug:string;
  href:string;
  label:string;
  eyebrow:string;
  description:string;
  matches:string[];
};

export const adminPrimaryDestinations:readonly AdminPrimaryDestination[] = [
  {
    slug:'',
    href:'/',
    label:'Overview',
    eyebrow:'Operations Overview',
    description:'Daily moderation queue and live marketplace pulse metrics.',
    matches:['','overview'],
  },
  {
    slug:'businesses',
    href:'/businesses',
    label:'Businesses',
    eyebrow:'Business Directory',
    description:'Directory listings, verification status tabs, and provider onboarding.',
    matches:['businesses','listings','providers','provider-applications','provider-services','ownership-claims','publication-drafts','commerce-listings'],
  },
  {
    slug:'v-ads',
    href:'/v-ads',
    label:'V Ads',
    eyebrow:'Visual Ad Moderation',
    description:'Review short-form video ads, advertiser channels, and local radius targeting.',
    matches:['v-ads','moderation'],
  },
  {
    slug:'users',
    href:'/users',
    label:'Users & Audits',
    eyebrow:'Accounts & Growth Pipeline',
    description:'Consumer accounts, Neighbourhood Recommendations, and Business Growth & Audit leads.',
    matches:['users','business-audit','requests','audit','employees'],
  },
];

// Shared task order for the independent admin website and native overview.
export const adminTaskGroups:AdminGroup[] = [
  {title:'Daily work',collapsed:false,items:[
    {slug:'business-audit',label:'Data Collection & Business Audit',description:'Multi-filter 10-sector business explorer, 7-pillar growth audit, and saved lead pipeline.'},
    {slug:'moderation',label:'V Ads & Sellers',description:'Review V Ads, spatial revisions, sellers, and user consent.'},
    {slug:'requests',label:'Enquiries & estimates',description:'Review customer requests and move work forward.'},
    {slug:'commerce-orders',label:'Purchase orders',description:'Track purchases and fulfilment.'},
    {slug:'v-ads',label:'V Ads queues',description:'Dedicated V Ads accounts, videos, geo-targeting, and analytics.'},
  ]},
  {title:'Approvals',collapsed:true,items:[
    {slug:'provider-applications',label:'Provider applications',description:'Review business and service onboarding.'},
    {slug:'ownership-claims',label:'Ownership claims',description:'Check evidence before granting business access.'},
    {slug:'publication-drafts',label:'Publication changes',description:'Review business and listing changes.'},
    {slug:'employer-jobs',label:'Job postings',description:'Review employer job postings.'},
    {slug:'commerce-listings',label:'Products & packages',description:'Review listings before publication.'},
    {slug:'provider-services',label:'Provider services',description:'Review provider service associations.'},
  ]},
  {title:'Manage',collapsed:false,items:[
    {slug:'providers',label:'Businesses & providers',description:'Manage business details and availability.'},
    {slug:'employees',label:'Employees & HR Letters',description:'Manage internal employee records, 2026 Wage Code CTC breakdown, and print-ready A4 HR letters.'},
    {slug:'catalogue',label:'Service catalogue',description:'Manage categories and discoverable services.'},
    {slug:'homepage',label:'Homepage',description:'Edit and publish homepage content.'},
    {slug:'edit-vistrah',label:'Edit Vistrah',description:'Define sections, variations, features, and photos for all pages.'},
    {slug:'pricing',label:'Pricing Editor',description:'Edit V Ads promos, self-serve rates, Studio pillars, and FAQs.'},
    {slug:'memberships',label:'Memberships & benefits',description:'Review subscriptions and benefit records.'},
    {slug:'offers',label:'Member offers',description:'Manage membership offers.'},
    {slug:'vistrah-services',label:'VISTRAH packages',description:'Manage platform service packages.'},
  ]},
  {title:'Advanced',collapsed:true,items:[
    {slug:'payments',label:'Payments',description:'Inspect sandbox transactions and ledgers.'},
    {slug:'audit',label:'Audit & Health',description:'Review immutable logs, DPDP compliance, and system health.'},
    {slug:'provider-requirements',label:'Application requirements',description:'Configure onboarding requirements.'},
    {slug:'job-sources',label:'Job sources',description:'Manage job acquisition sources.'},
    {slug:'workflows',label:'Workflow operations',description:'Inspect workflow execution.'},
  ]},
];

export type NeedsReviewItem = {
  id:string;
  label:string;
  detail:string;
  count:number;
  href:string;
};

export type AdminOverview = {
  customers:number; requests:number; providers:number; services:number;
  new_requests:number; payments:number;
  payment_mode?:string;
  system_status?:string;
  pending_v_ads?:number;
  pending_videos?:number;
  pending_targeting?:number;
  pending_advertisers?:number;
  active_sellers?:number;
  pending_sellers?:number;
  verified_users?:number;
  dpdp_consented_users?:number;
  anonymized_users?:number;
  audit_leads?:number;
  needs_review?:NeedsReviewItem[];
};
export const adminSummary = [
  {key:'requests',label:'Enquiries'},
  {key:'providers',label:'Providers'},
  {key:'services',label:'Services'},
] as const;
