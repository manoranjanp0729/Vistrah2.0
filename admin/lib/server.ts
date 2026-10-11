import 'server-only';
import {cookies} from 'next/headers';
export const API_URL=process.env.API_URL||'http://127.0.0.1:8000';
export class ServerApiError extends Error {
  constructor(public status:number){super('Unable to load this information. Please try again.');}
}
export async function protectedServerApi<T>(path:string):Promise<T> {
  if(!/^\/(?:services\/[1-9]\d*\/(?:providers(?:\/[a-z0-9-]+)?|member-information)|me\/membership)$/.test(path))throw new ServerApiError(400);
  const token=(await cookies()).get('vistrah_admin_session')?.value;
  const response=await fetch(`${API_URL}${path}`,{headers:token?{Authorization:`Bearer ${token}`}:{},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new ServerApiError(response.status);
  return response.json();
}
export async function serverApi<T>(path:string):Promise<T> {
  const response=await fetch(`${API_URL}${path}`,{cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok) throw new Error(`Catalogue API unavailable (${response.status}). Please try again.`);
  return response.json();
}

