import {maxVideoBytes} from '../../shared/v-ads';
type Options={apiUrl:string;token?:string;allowedOrigins:string[];path:string[];fetcher?:typeof fetch};
export async function proxyVAds(request:Request,options:Options):Promise<Response> {
  const {path,token}=options;
  const fail=(status:number,detail:string)=>Response.json({detail},{status,headers:{'Cache-Control':'no-store'}});
  if(path.some(part=>!part||!/^[a-zA-Z0-9-]+$/.test(part)))return fail(400,'Invalid V Ads path');
  const route=path.join('/');
  const upload=request.method==='POST'&&/^advertisers\/[a-zA-Z0-9-]+\/uploads$/.test(route);
  const mutation=!['GET','HEAD'].includes(request.method);
  if(mutation){
    if(!options.allowedOrigins.includes(request.headers.get('origin')??''))return fail(403,'Request origin is not allowed');
    if(!token)return fail(401,'Sign in to continue');
  }
  const headers=new Headers({'accept-encoding':'identity'});
  if(token)headers.set('Authorization','Bearer '+token);
  for(const name of ['range','if-range','x-user-latitude','x-user-longitude','x-user-radius-km']){const value=request.headers.get(name);if(value)headers.set(name,value);}
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),upload?90000:15000);
  try {
    let body:BodyInit|undefined;
    if(upload){
      if(request.headers.get('content-type')?.split(';')[0]!=='video/mp4')return fail(415,'Send a raw video/mp4 request body');
      const length=Number(request.headers.get('content-length'));
      if(!Number.isSafeInteger(length)||length<=0)return fail(411,'Content-Length is required');
      if(length>maxVideoBytes)return fail(413,'Video exceeds 100 MB');
      if(!request.body)return fail(400,'Video body is required');
      headers.set('Content-Type','video/mp4');headers.set('Content-Length',String(length));
      let received=0;
      body=request.body.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({
        transform(chunk,writer){received+=chunk.byteLength;if(received>length)throw new Error('Upload exceeds declared size');writer.enqueue(chunk);},
        flush(){if(received!==length)throw new Error('Upload length mismatch');}
      }));
    } else if(mutation){
      const reader=request.body?.getReader();let size=0;const chunks:Uint8Array[]=[];
      if(reader){try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>20000){await reader.cancel();return fail(413,'Request too large');}chunks.push(value);}}finally{reader.releaseLock();}}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
      body=bytes;headers.set('Content-Type','application/json');
    }
    const init:RequestInit & {duplex?:'half'}={method:request.method,headers,body,
      cache:'no-store',redirect:'error',signal:AbortSignal.any([controller.signal,request.signal]),...(upload?{duplex:'half'}:{})};
    const upstream=await (options.fetcher??fetch)(options.apiUrl.replace(/\/$/,'')+'/v-ads/'+path.map(encodeURIComponent).join('/')+new URL(request.url).search,init);
    const responseHeaders=new Headers({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
    for(const name of ['content-type','content-length','content-range','accept-ranges','etag','last-modified','content-disposition']){
      const value=upstream.headers.get(name);if(value)responseHeaders.set(name,value);
    }
    // Keep media as a stream, including partial responses. Never buffer 100 MB.
    return new Response(upstream.body,{status:upstream.status,headers:responseHeaders});
  } catch {return fail(503,'V Ads is unavailable. Check your connection and retry.');}
  finally {clearTimeout(timer);}
}
