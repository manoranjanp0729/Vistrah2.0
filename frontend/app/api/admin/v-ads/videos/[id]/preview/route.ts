import {LEGACY_SELLER_SESSION_COOKIE,sessionCookie} from '../../../../../../../../shared/session-scope';
import {NextRequest,NextResponse} from 'next/server';
import {API_URL} from '@/lib/server';
import {proxyVAdsPreview} from '../../../../../../../../admin/lib/v-ads-preview';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const cookie=sessionCookie();
  const token=request.cookies.get(cookie)?.value||request.cookies.get(LEGACY_SELLER_SESSION_COOKIE)?.value;
  const response=await proxyVAdsPreview(request,{apiUrl:API_URL,videoId:(await params).id,token});
  const result=new NextResponse(response.body,{status:response.status,headers:response.headers});
  if(response.status===401){
    result.cookies.delete(cookie);
    if(request.cookies.get(LEGACY_SELLER_SESSION_COOKIE))result.cookies.delete(LEGACY_SELLER_SESSION_COOKIE);
  }
  return result;
}
