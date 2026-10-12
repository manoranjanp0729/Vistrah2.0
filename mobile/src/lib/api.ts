export class ApiError extends Error {
  status:number;
  errors:{field:string;message:string}[];
  constructor(status:number,message:string,errors:{field:string;message:string}[]=[]){super(message);this.status=status;this.errors=errors;}
}
export function validateBase(value:string,development:boolean) {
  if(!value)throw new ApiError(0,'Set EXPO_PUBLIC_API_URL in mobile/.env to your reachable VISTRAH API.');
  let url:URL;try{url=new URL(value);}catch{throw new ApiError(0,'The configured API URL is invalid.');}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||
    (!development&&url.protocol!=='https:'))throw new ApiError(0,'Use a valid HTTPS API URL. HTTP is allowed only in development.');
  return value.replace(/\/$/,'');
}
let token:string|null=null;
let unauthorized:()=>void=()=>{};
export function setToken(value:string|null){token=value;}
export function onUnauthorized(handler:()=>void){unauthorized=handler;}
export async function api<T>(path:string,options:RequestInit={}):Promise<T> {
  if(!path.startsWith('/')||path.startsWith('//')||path.includes('..')||path.includes('\\'))throw new ApiError(0,'Invalid API path.');
  const base=validateBase(process.env.EXPO_PUBLIC_API_URL??'',__DEV__);
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
  const session=token;
  try {
    const response=await fetch(base+path,{...options,signal:controller.signal,redirect:'error',
      headers:{'Content-Type':'application/json',...options.headers,...(session?{Authorization:'Bearer '+session}:{})}});
    const data=await response.json().catch(()=>null);
    if(!response.ok){
      if(response.status===401&&session&&token===session)unauthorized();
      const detail=data?.detail;
      const message=typeof detail==='string'?detail:typeof detail?.message==='string'?detail.message:
        Array.isArray(detail)?detail.map((item:{msg:string})=>item.msg).join('. '):'This service is unavailable. Please try again.';
      throw new ApiError(response.status,message,Array.isArray(detail?.errors)?detail.errors:[]);
    }
    return data as T;
  }catch(error){
    if(error instanceof ApiError)throw error;
    throw new ApiError(0,'Could not reach VISTRAH. Check your connection and API configuration, then retry.');
  }finally{clearTimeout(timer);}
}

