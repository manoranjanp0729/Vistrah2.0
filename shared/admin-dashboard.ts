export type AdminItem = {slug:string; label:string; description:string};
export type AdminGroup = {title:string; collapsed:boolean; items:AdminItem[]};

// Shared task order for the independent admin website and native overview.
export const adminTaskGroups:AdminGroup[] = [
  {title:'Daily work',collapsed:false,items:[
    {slug:'requests',label:'Enquiries & estimates',description:'Review customer requests and move work forward.'},
    {slug:'commerce-orders',label:'Purchase orders',description:'Track purchases and fulfilment.'},
    {slug:'v-ads',label:'V Ads',description:'Review advertisers, videos and reports.'},
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
    {slug:'catalogue',label:'Service catalogue',description:'Manage categories and discoverable services.'},
    {slug:'homepage',label:'Homepage',description:'Edit and publish homepage content.'},
    {slug:'edit-vistrah',label:'Edit Vistrah',description:'Define sections, variations, features, and photos for all pages.'},
    {slug:'memberships',label:'Memberships & benefits',description:'Review subscriptions and benefit records.'},
    {slug:'offers',label:'Member offers',description:'Manage membership offers.'},
    {slug:'vistrah-services',label:'VISTRAH packages',description:'Manage platform service packages.'},
  ]},
  {title:'Advanced',collapsed:true,items:[
    {slug:'payments',label:'Payments',description:'Inspect sandbox transactions and ledgers.'},
    {slug:'audit',label:'Activity log',description:'Review administrative actions.'},
    {slug:'provider-requirements',label:'Application requirements',description:'Configure onboarding requirements.'},
    {slug:'job-sources',label:'Job sources',description:'Manage job acquisition sources.'},
    {slug:'workflows',label:'Workflow operations',description:'Inspect workflow execution.'},
  ]},
];

export type AdminOverview = {
  customers:number; requests:number; providers:number; services:number;
  new_requests:number; payments:number;
};
export const adminSummary = [
  {key:'requests',label:'Enquiries'},
  {key:'providers',label:'Providers'},
  {key:'services',label:'Services'},
] as const;
