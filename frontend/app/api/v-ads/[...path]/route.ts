import {NextRequest,NextResponse} from 'next/server';
import {API_URL} from '@/lib/server';
import {proxyVAds} from '@/lib/v-ads-proxy';
export const dynamic='force-dynamic';
export const runtime='nodejs';
async function handle(request:NextRequest,{params}:{params:Promise<{path:string[]}>}) {
  const response=await proxyVAds(request,{apiUrl:API_URL,path:(await params).path,
    token:request.cookies.get('vistrah_session')?.value,
    allowedOrigins:(process.env.ALLOWED_ORIGINS||request.nextUrl.origin).split(',').map(value=>value.trim())});
  const result=new NextResponse(response.body,{status:response.status,headers:response.headers});
  if(response.status===401)result.cookies.delete('vistrah_session');
  return result;
}
export {handle as GET,handle as POST,handle as DELETE};
