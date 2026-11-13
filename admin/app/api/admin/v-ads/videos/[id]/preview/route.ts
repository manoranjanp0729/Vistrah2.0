import {NextRequest,NextResponse} from 'next/server';
import {API_URL} from '@/lib/server';
import {proxyVAdsPreview} from '@/lib/v-ads-preview';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const response=await proxyVAdsPreview(request,{apiUrl:API_URL,videoId:(await params).id,
  token:request.cookies.get('vistrah_admin_session')?.value});
 const result=new NextResponse(response.body,{status:response.status,headers:response.headers});
 if(response.status===401)result.cookies.delete('vistrah_admin_session');
 return result;
}
