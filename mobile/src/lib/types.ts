// API response contracts owned by the mobile client; keep aligned with FastAPI.
export type Service = {id:number; category_id:number; subcategory_id:number|null; slug:string; title:string; description:string; includes:string[]; image:string; active:boolean; popular:boolean};
export type Subcategory = {id:number; category_id:number; slug:string; title:string; description:string; active:boolean; services:Service[]};
export type Category = {id:number; slug:string; title:string; description:string; image:string; active:boolean; services:Service[]; subcategories:Subcategory[]};
export type User = {id:number; name:string; email:string; phone:string; role:'CUSTOMER'|'ADMIN';seller_enabled?:boolean};
export type ServiceContext = {category:Category; subcategory?:Subcategory; service:Service};
export type Provider = {id:number; slug:string; name:string; company:string; location:string; verification_status:string; email?:string; phone?:string; address:string;description?:string};
export type RequestRecord = {id:number; service_title:string; requirements:string; location:string; phone:string; status:string; created_at:string; customer?:string};
export type Payment = {id:string; amount:number; currency:string; status:string; mode:string; created_at:string; title?:string};
export type Membership = {active:boolean; expires_at:string|null; records:unknown[]};
export type Offer = {id:number; title:string; scope:string; target_id:number|null; target_title?:string; type:string; value:number; terms:string; starts_at:string; ends_at:string; active:boolean};


export type Provenance={source:string;source_record_id:string;source_url:string;attribution:string;retrieved_at:string};
export type Vacancy={id:string;source:string;source_record_id:string;title:string;employer:string|null;description:string;location:string|null;arrangement:string|null;employment_type:string|null;salary_min:number|null;salary_max:number|null;currency:string|null;salary_text:string|null;published_at:string|null;deadline:string|null;status:string;first_seen_at:string;last_checked_at:string;retrieved_at:string;provenance:Provenance[]};
