import {NextRequest,NextResponse} from 'next/server';
import {API_URL} from '@/lib/server';
export const dynamic='force-dynamic';
async function handle(request:NextRequest,{params}:{params:Promise<{path:string[]}>}) {
  const {path}=await params;
  if(path.some(p=>!p||p==='..'||p.includes('/')||p.includes('\\'))) return NextResponse.json({detail:'Invalid path'},{status:400});
  const endpoint=path.join('/');
  if(path[0]!=='admin'&&!['auth/login','auth/logout','me','health','catalogue'].includes(endpoint))return NextResponse.json({detail:'Not available in VISTRAH Admin'},{status:404});
  const mutation=!['GET','HEAD'].includes(request.method);
  if(mutation) {
    const origin=request.headers.get('origin');
    const allowed=(process.env.ALLOWED_ORIGINS||request.nextUrl.origin).split(',').map(value=>value.trim());
    if(!origin||!allowed.includes(origin)) return NextResponse.json({detail:'Request origin is not allowed'},{status:403});
  }
  const headers:Record<string,string>={'Content-Type':'application/json'};
  const token=request.cookies.get('vistrah_admin_session')?.value;
  if(token) headers.Authorization=`Bearer ${token}`;
  const signature=request.headers.get('x-signature');
  if(signature) headers['x-signature']=signature;
  try {
    if(path[0]==='admin'||endpoint==='catalogue'){
      if(!token)return NextResponse.json({detail:'Administrator sign-in required'},{status:401});
      const identity=await fetch(API_URL+'/me',{headers:{Authorization:`Bearer ${token}`},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
      if(!identity.ok)return NextResponse.json({detail:'Administrator sign-in required'},{status:identity.status===401?401:503});
      const user=await identity.json();if(user.role!=='ADMIN')return NextResponse.json({detail:'Administrator access required'},{status:403});
    }
    const body=mutation?await request.text():undefined;
    const providerPath=path[0].startsWith('provider-')||(path[0]==='admin'&&path[1]?.startsWith('provider-'));
    const claimEvidence=path[0]==='seller'&&path[1]==='ownership-claims'&&path.at(-1)==='evidence';
    const isEditVistrah=path[0]==='admin'&&path[1]==='edit-vistrah';
    const limit=providerPath&&(path.at(-1)==='documents'||path.at(-1)==='evidence')||claimEvidence?3000000:isEditVistrah?1000000:providerPath||path[0]==='finds'?128000:20000;
    if(body&&new TextEncoder().encode(body).length>limit) return NextResponse.json({detail:'Request too large'},{status:413});
    const response=await fetch(`${API_URL}/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`,{method:request.method,headers,body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
    const isAuth=path[0]==='auth'&&((path.length===2&&['register','login'].includes(path[1]))||(path.length===3&&path[1]==='seller'&&['register','login'].includes(path[2])));
    let result:NextResponse;
    if(isAuth&&response.ok) {
      const data=await response.json();
      if(data.user?.role!=='ADMIN')return NextResponse.json({detail:'Administrator access required'},{status:403});
      result=NextResponse.json({user:data.user},{status:response.status});
      result.cookies.set('vistrah_admin_session',data.access_token,{httpOnly:true,secure:process.env.COOKIE_SECURE==='true',sameSite:'lax',path:'/',maxAge:43200});
    } else {
      result=new NextResponse(await response.arrayBuffer(),{status:response.status,headers:{'Content-Type':response.headers.get('content-type')||'application/json'}});
      for(const header of ['Content-Disposition','Content-Security-Policy','X-Content-Type-Options']) {
        const value=response.headers.get(header);if(value)result.headers.set(header,value);
      }
    }
    if((path[0]==='auth'&&path[1]==='logout'&&response.ok)||response.status===401) result.cookies.delete('vistrah_admin_session');
    result.headers.set('Cache-Control','no-store');
    return result;
  } catch {
    return NextResponse.json({detail:'VISTRAH is temporarily unavailable. Please try again.'},{status:503});
  }
}
export {handle as GET,handle as POST,handle as PUT,handle as PATCH,handle as DELETE};

