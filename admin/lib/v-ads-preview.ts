type Options={apiUrl:string;token?:string;videoId:string;fetcher?:typeof fetch};
export async function proxyVAdsPreview(request:Request,options:Options){
 const fail=(status:number,detail:string)=>Response.json({detail},{status,headers:{'Cache-Control':'private, no-store'}});
 if(!options.token)return fail(401,'Administrator sign-in required');
 if(!/^[a-zA-Z0-9-]+$/.test(options.videoId))return fail(400,'Invalid video ID');
 const fetcher=options.fetcher??fetch;const headers=new Headers({Authorization:'Bearer '+options.token,'Accept-Encoding':'identity'});
 try{
  const identity=await fetcher(options.apiUrl+'/me',{headers,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!identity.ok)return fail(identity.status===401?401:503,'Administrator sign-in required');
  if((await identity.json()).role!=='ADMIN')return fail(403,'Administrator access required');
  for(const key of ['Range','If-Range']){const value=request.headers.get(key);if(value)headers.set(key,value);}
  const upstream=await fetcher(options.apiUrl+'/admin/v-ads/videos/'+encodeURIComponent(options.videoId)+'/preview',
   {headers,cache:'no-store',redirect:'error',signal:AbortSignal.any([request.signal,AbortSignal.timeout(15000)])});
  const output=new Headers({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
  for(const key of ['Content-Type','Content-Length','Content-Range','Accept-Ranges','ETag','Last-Modified']){
   const value=upstream.headers.get(key);if(value)output.set(key,value);
  }
  return new Response(upstream.body,{status:upstream.status,headers:output});
 }catch{return fail(503,'Private preview is unavailable. Please retry.');}
}
