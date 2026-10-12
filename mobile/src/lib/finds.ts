export type Listing={title:string;company:string;location:string;arrangement:'ONSITE'|'HYBRID'|'REMOTE';source_url:string;description:string;currency:string};
export type JobInputs={candidate_name:string;resume_text:string;target_titles:string[];skills:string[];experience_years:number|null;locations:string[];arrangements:string[];salary_expectation:number|null;salary_currency:string;search_preferences:string;listings:Listing[];source_permission:boolean};
export type DiscoveryInputs=JobInputs&{sources:string[];result_limit:number;max_pages:number};
export type RunSummary={id:string;request_id:number;template_id:string;status:string;updated_at:string;completed_actions:number;total_actions:number};
export type Template={id:string;name:string;description:string};
export type FindRequest={id:number;service_title:string;templates:Template[];workflows:RunSummary[]};
export type FindAction={id:string;definition_id:string;name:string;description:string;status:string;error:string|null;retry_eligible:boolean;missing_inputs:string[];approval:{id:string;status:string;scope:unknown}|null;result:unknown};
export type Run=RunSummary&{inputs:JobInputs|DiscoveryInputs;actions:FindAction[];missing_inputs:string[];applications:{id:number;source_url:string;status:string}[];events:{id:number;kind:string;created_at:string}[]};
export const newInputs:JobInputs={candidate_name:'',resume_text:'',target_titles:[],skills:[],experience_years:null,locations:[],arrangements:[],salary_expectation:null,salary_currency:'INR',search_preferences:'',listings:[],source_permission:false};
export const newListing:Listing={title:'',company:'',location:'',arrangement:'ONSITE',source_url:'',description:'',currency:'INR'};
export function lines(value:string){return value.split('\n').map(line=>line.trim()).filter(Boolean);}
export function preparedInputs<T extends JobInputs|DiscoveryInputs>(value:T):T {
  return {...value,target_titles:lines(value.target_titles.join('\n')),skills:lines(value.skills.join('\n')),locations:lines(value.locations.join('\n'))};
}
export function discoveredJobs(result:unknown):{id:string;title:string}[]{
  if(!result||typeof result!=='object'||!('matches' in result)||!Array.isArray(result.matches))return [];
  return result.matches.flatMap(item=>item&&typeof item==='object'&&'listing' in item&&item.listing&&typeof item.listing==='object'&&typeof item.listing.id==='string'&&typeof item.listing.title==='string'?[{id:item.listing.id,title:item.listing.title}]:[]);
}
export function normalizedJobs(result:unknown):{source_url:string;title:string}[]{
  if(!result||typeof result!=='object'||!('listings' in result)||!Array.isArray(result.listings))return [];
  return result.listings.flatMap(item=>item&&typeof item==='object'&&typeof item.source_url==='string'&&typeof item.title==='string'?[{source_url:item.source_url,title:item.title}]:[]);
}
