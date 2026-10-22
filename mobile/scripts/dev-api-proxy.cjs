// Local Expo browser helper. Does not start or restart the normal API.
const http=require('node:http');
const {isIPv4}=require('node:net');
const proxyHost=process.env.VISTRAH_DEV_PROXY_HOST||'127.0.0.1';
const allowedClient=process.env.VISTRAH_DEV_PROXY_CLIENT;
const cleanIp=val=>(val||'').replace(/^::ffff:/,'');
const privateIPv4=value=>{const v=cleanIp(value);return isIPv4(v)&&(v==='127.0.0.1'||v.startsWith('10.')||v.startsWith('192.168.')||(/^172\.(1[6-9]|2[0-9]|3[01])\./).test(v));};
if(proxyHost!=='127.0.0.1'&&!privateIPv4(proxyHost))throw new Error('LAN development requires a private IPv4 bind address.');
const origins=new Set(['http://localhost:8081','http://127.0.0.1:8081','http://localhost:8082','http://127.0.0.1:8082']);
const apiPort=Number(process.env.VISTRAH_DEV_API_PORT||8100);
const proxyPort=Number(process.env.VISTRAH_DEV_PROXY_PORT||18100);
if(![apiPort,proxyPort].every(value=>Number.isInteger(value)&&value>0&&value<=65535))throw new Error('Invalid development port.');
const server=http.createServer((request,response)=>{
 const remote=cleanIp(request.socket.remoteAddress);
 const clientOk=allowedClient?remote===allowedClient:privateIPv4(remote);
 if(proxyHost!=='127.0.0.1'&&remote!==proxyHost&&!clientOk){response.writeHead(403);response.end();request.resume();return;}
 const origin=request.headers.origin;
 if(origin&&!origins.has(origin)){response.writeHead(403,{'Content-Type':'application/json'});response.end(JSON.stringify({detail:'This browser origin is not allowed by the local development helper.'}));request.resume();return;}
 const cors={'Vary':'Origin'};if(origin)cors['Access-Control-Allow-Origin']=origin;
 if(request.method==='OPTIONS'){response.writeHead(204,{...cors,'Access-Control-Allow-Methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'});response.end();return;}
 // Keep the destination fixed; never accept a URL supplied by the browser.
 if(!request.url.startsWith('/')||request.url.startsWith('//')){response.writeHead(400,cors);response.end();return;}
 const headers={...request.headers,host:`127.0.0.1:${apiPort}`};delete headers.origin;delete headers.cookie;
 const upstream=http.request({hostname:'127.0.0.1',port:apiPort,path:request.url,method:request.method,headers},result=>{
  const forwarded={...result.headers,...cors};for(const name of Object.keys(forwarded))if(name.startsWith('access-control-')||name==='set-cookie')delete forwarded[name];Object.assign(forwarded,cors);
  response.writeHead(result.statusCode||502,forwarded);result.pipe(response);
 });
 upstream.setTimeout(95000,()=>upstream.destroy(new Error('API timeout')));
 upstream.on('error',()=>{if(!response.headersSent){response.writeHead(502,{...cors,'Content-Type':'application/json'});response.end(JSON.stringify({detail:`The backend at http://127.0.0.1:${apiPort} is not reachable. Check Docker Desktop and API health.`}));}else response.destroy();});
 request.on('aborted',()=>upstream.destroy());response.on('close',()=>{if(!response.writableEnded)upstream.destroy();});request.pipe(upstream);
});
server.on('error',error=>{console.error(`Connection helper could not start: ${error.code||error.message}`);process.exitCode=1;});
server.listen(proxyPort,proxyHost,()=>console.log(`VISTRAH connection helper: http://${proxyHost}:${proxyPort} -> API ${apiPort}. Keep this window open. Expo 8081/8082 allowed.`));
