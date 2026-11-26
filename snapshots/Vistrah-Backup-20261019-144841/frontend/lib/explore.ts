import type {Vacancy} from './discovery';

// Contract for future authorized, server-only category integrations. Registering
// an adapter does not enable it: permission and image rights must be reviewed.
export type ExternalListing={
  source:string;externalId:string;originalUrl:string;attribution:string;
  retrievedAt:string;publishedAt:string|null;updatedAt:string|null;
  title:string;description:string;location:string|null;
  image:null|{url:string;alt:string;rightsEvidence:string};
};
export type CategoryListingAdapter={
  id:string;categorySlug:string;enabled:boolean;
  permissionEvidence:string|null;attribution:string;
  // Implementations must normalize and deduplicate, bound I/O, retain provenance
  // and distinguish empty results from failures. Credentials stay on the server.
  read:()=>Promise<{items:ExternalListing[];status:'available'|'empty'|'unavailable';note:string}>;
};
export const categoryFeeds:Record<string,{kind:string;enabled:false;permissionEvidence:null}>={
  'real-estate':{kind:'properties for sale or rent',enabled:false,permissionEvidence:null},
  'civil-construction':{kind:'tenders, projects and contract opportunities',enabled:false,permissionEvidence:null},
  marketing:{kind:'marketing opportunities and external provider listings',enabled:false,permissionEvidence:null},
  'tax-compliance':{kind:'tax resources and external provider listings',enabled:false,permissionEvidence:null},
  'it-technology':{kind:'technology opportunities and resources',enabled:false,permissionEvidence:null},
  'business-services':{kind:'business opportunities and resources',enabled:false,permissionEvidence:null},
  'local-professional-services':{kind:'local opportunities and external provider listings',enabled:false,permissionEvidence:null}
};
export type PublicJobs={items:Vacancy[];total:number;note:string};
export type ExploreResult={status:'available'|'empty'|'unavailable';kind:string;vacancies:Vacancy[];total:number;note:string};

// Jobs use the existing read-only public API, never an acquisition operation.
// New categories stay disabled until an authorized adapter is implemented.
export async function exploreListings(categorySlug:string,readJobs:()=>Promise<PublicJobs>):Promise<ExploreResult> {
  if(categorySlug!=='jobs-careers') {
    const kind=categoryFeeds[categorySlug]?.kind||'opportunities and resources';
    return {status:'unavailable',kind,vacancies:[],total:0,note:`External ${kind} are not yet available. No authorized feed is connected for this category. You can browse registered providers for this service or send an enquiry about your requirements.`};
  }
  try {
    const jobs=await readJobs();
    return {status:jobs.items.length?'available':'empty',kind:'vacancies',vacancies:jobs.items.slice(0,3),total:jobs.total,note:jobs.note};
  } catch {
    return {status:'unavailable',kind:'vacancies',vacancies:[],total:0,note:'The vacancy cache is temporarily unavailable. Try the public jobs page again later; browsing this service does not trigger an external acquisition.'};
  }
}
