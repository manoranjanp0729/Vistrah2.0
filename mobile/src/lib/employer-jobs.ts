export type JobDraft={title:string;description:string;location:string;arrangement:'REMOTE'|'HYBRID'|'ONSITE';employment_type:'FULL_TIME'|'PART_TIME'|'CONTRACT'|'INTERNSHIP'|'TEMPORARY';salary_text:string;application_url:string;deadline:string|null};
export type EmployerJob=JobDraft&{id:string;employer:string;status:'DRAFT'|'SUBMITTED'|'APPROVED'|'REJECTED'|'CLOSED';published_at:string|null};
export type OwnedJob=EmployerJob&{provider_id:number;actor_id:number;revision:number;review_note:string};
export type JobPage<T>={items:T[];total:number;page:number;page_size:number};
export const emptyJob:JobDraft={title:'',description:'',location:'',arrangement:'ONSITE',employment_type:'FULL_TIME',salary_text:'',application_url:'',deadline:null};
export function jobDraft(job:JobDraft):JobDraft {
  return {title:job.title,description:job.description,location:job.location,arrangement:job.arrangement,employment_type:job.employment_type,salary_text:job.salary_text,application_url:job.application_url,deadline:job.deadline||null};
}
export function applicationLink(value:string):string {
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password)throw new Error('The employer application link is unavailable.');
  return url.toString();
}
