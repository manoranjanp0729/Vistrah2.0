export class ApiError extends Error { constructor(public status:number,message:string,public errors:{field:string;message:string}[]=[]) {super(message);} }
export async function api<T>(path:string, options:RequestInit={}):Promise<T> {
  const response=await fetch(`/api${path}`,{...options,headers:{'Content-Type':'application/json',...options.headers},cache:'no-store'});
  const data=await response.json().catch(()=>null);
  if(!response.ok) {
    const message=typeof data?.detail==='string'?data.detail:typeof data?.detail?.message==='string'?data.detail.message:Array.isArray(data?.detail)?data.detail.map((e:{msg:string})=>e.msg).join('. '):'Unable to complete this action. Please try again.';
    throw new ApiError(response.status,message,Array.isArray(data?.detail?.errors)?data.detail.errors:[]);
  }
  return data as T;
}
export const money=(amount:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(amount/100);
export const date=(value:string)=>new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeZone:'Asia/Kolkata'}).format(new Date(value));
