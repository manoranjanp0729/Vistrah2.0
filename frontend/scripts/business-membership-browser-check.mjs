// Real API, source builds and synthetic identities in a brand-new disposable SQLite database.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {fileURLToPath,URL} from 'node:url';
import {Buffer} from 'node:buffer';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
import process from 'node:process';
import console from 'node:console';
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
const root=fileURLToPath(new URL('../../',import.meta.url)),output=path.join(root,'artifacts/business-membership');mkdirSync(output,{recursive:true});
const children=[],servers=[],errors=[],report={passed:false,checks:[],screenshots:[]};let browser,apiBase;
const python=path.join(root,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
const listen=server=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{servers.push(server);resolve(server.address().port);});});
async function port(){const s=http.createServer();const p=await listen(s);await new Promise(r=>s.close(r));return p;}
function launch(name,command,args,cwd,env){const child=spawn(command,args,{cwd,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});children.push(child);let log='';child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);child.on('exit',()=>writeFileSync(path.join(output,name+'.log'),log));return child;}
async function complete(child){await new Promise((resolve,reject)=>{child.once('exit',code=>code===0?resolve():reject(Error('Fixture process failed: '+code)));child.once('error',reject);});}
async function ready(url,child){for(let i=0;i<150;i++){try{if((await globalThis.fetch(url)).ok)return;}catch{/* Isolated process starting. */}if(child.exitCode!==null)throw Error('Preview exited: '+url);await setTimeout(200);}throw Error('Preview timed out: '+url);}
const expo=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){
   const token=/vistrah_session=([^;]+)/.exec(req.headers.cookie??'')?.[1];const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);
   const response=await globalThis.fetch(apiBase+url.pathname.slice(4)+url.search,{method:req.method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(!['GET','HEAD'].includes(req.method)?{body}:{}),redirect:'error'});
   res.statusCode=response.status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
   if(url.pathname==='/api/auth/login'&&response.ok){const data=await response.json();res.setHeader('Set-Cookie',`vistrah_session=${data.access_token}; HttpOnly; SameSite=Lax; Path=/`);res.end(JSON.stringify({user:data.user}));}else res.end(await response.text());return;
  }
  const dir=path.join(output,'expo-web'),pathname=decodeURIComponent(url.pathname.replace(/^\/app(?=\/|$)/,'')||'/');let target=path.resolve(dir,'.'+pathname);
  if(!target.startsWith(dir+path.sep)||!existsSync(target)||!path.extname(target))target=path.join(dir,'index.html');
  res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.webp':'image/webp','.png':'image/png','.ttf':'font/ttf','.json':'application/json','.css':'text/css','.ico':'image/x-icon'})[path.extname(target)]??'application/octet-stream');res.end(readFileSync(target));
 }catch{res.statusCode=502;res.end('{}');}
});
async function screenshot(page,name){const file=name+'.png';await page.screenshot({path:path.join(output,file),fullPage:true});report.screenshots.push(file);}
async function signIn(context,base,who){const response=await context.request.post(base+'/api/auth/login',{data:{email:who+'@membership.example.com',password:'preview-only-password'},headers:{origin:base}});assert(response.ok(),await response.text());}
async function membership(page,base,native){await page.goto(base+(native?'/app':'')+'/membership');await expect(page.getByText('VISTRAH Business Membership',{exact:true}).first()).toBeVisible();if(native)await expect(page.getByText(/Opening your next possibilities/)).toBeHidden({timeout:15000});}
try{
 const apiPort=await port();apiBase='http://127.0.0.1:'+apiPort;
 const db=path.join(output,'membership-preview-'+Date.now()+'.db').replaceAll('\\','/');const env={DATABASE_URL:'sqlite:///'+db,JWT_SECRET:'disposable-membership-browser-secret-not-production',APP_ENV:'development',VISTRAH_MEMBERSHIP_PREVIEW:'1',PYTHONPATH:'.'};
 await complete(launch('fixture',python,['tests/business_membership_preview.py'],path.join(root,'backend'),env));
 const backend=launch('api',python,['-m','uvicorn','app.main:app','--host','127.0.0.1','--port',String(apiPort)],path.join(root,'backend'),env);await ready(apiBase+'/health',backend);
 const webPort=await port(),adminPort=await port(),expoPort=await listen(expo);
 const web=launch('web',process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(webPort)],path.join(root,'frontend'),{API_URL:apiBase,TEST_NEXT_DIST_DIR:'.next-business-membership',NODE_ENV:'production',ALLOWED_ORIGINS:'http://127.0.0.1:'+webPort,COOKIE_SECURE:'false'});
 const admin=launch('admin',process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(adminPort)],path.join(root,'admin'),{API_URL:apiBase,TEST_NEXT_DIST_DIR:'.next-business-membership',NODE_ENV:'production',ALLOWED_ORIGINS:'http://127.0.0.1:'+adminPort,COOKIE_SECURE:'false'});
 const webBase='http://127.0.0.1:'+webPort,adminBase='http://127.0.0.1:'+adminPort;await Promise.all([ready(webBase+'/membership',web),ready(adminBase+'/admin/memberships',admin)]);
 try{browser=await chromium.launch({channel:'chrome',headless:true});}catch{browser=await chromium.launch({headless:true});}
 const catalogue=await (await globalThis.fetch(apiBase+'/membership/plans')).json();
 for(const native of [false,true])for(const width of [320,375,390,430,768,1440]){
  const base=native?'http://127.0.0.1:'+expoPort:webBase,client=native?'expo':'website';const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await membership(page,base,native);
  await expect(page.getByText(/799.*month/)).toBeVisible();
  if([390,1440].includes(width))await screenshot(page,client+'-membership-'+width);
  for(const period of ['Monthly','Annual']){await page.getByRole('button',{name:period,exact:true}).click();for(const plan of catalogue.plans){await page.getByRole('button',{name:plan.name,exact:true}).click();if(period==='Monthly')await expect(page.getByText(new RegExp((plan.periods.MONTHLY.amount/100).toLocaleString('en-IN')+'.*month'))).toBeVisible();else await expect(page.getByText('Annual pricing coming soon.',{exact:true})).toBeVisible();assert(await page.locator('body').evaluate(n=>n.scrollWidth<=n.ownerDocument.defaultView.innerWidth+1),'Horizontal overflow');}}
  report.checks.push(`${client} ${width}px: six toggle combinations, authoritative prices, annual unavailable, no overflow`);await context.close();
 }
 for(const native of [false,true]){
  const base=native?'http://127.0.0.1:'+expoPort:webBase,client=native?'expo':'website';const context=await browser.newContext({viewport:{width:390,height:900}});await signIn(context,base,native?'seller-mobile':'seller');const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await membership(page,base,native);await page.getByRole('button',{name:'Annual',exact:true}).click();await expect(page.getByRole('button',{name:'Annual pricing coming soon',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Monthly',exact:true}).click();await page.getByRole('button',{name:/Start (sandbox subscription|next sandbox billing cycle)/}).click();await expect(page.getByRole('button',{name:'Simulate successful payment',exact:true})).toBeVisible();await page.getByRole('button',{name:'Simulate successful payment',exact:true}).click();await expect(page.getByText(/available job credits/).first()).toContainText('15');
  if(!native){await page.getByLabel('Brief',{exact:true}).fill('Synthetic browser creative design request');await page.getByRole('button',{name:'Send fulfillment request',exact:true}).click();await expect(page.getByText(/Request sent for human fulfillment/)).toBeVisible();}
  await screenshot(page,client+'-active-membership-390');
  await page.getByRole('button',{name:'Mark non-renewal',exact:true}).click();await expect(page.getByText(/NON RENEWING/).filter({visible:true}).first()).toBeVisible();
  report.checks.push(`${client}: approved seller checkout, signed sandbox activation, annual disabled, current balances, non-renewal and history`);await context.close();
  const customerContext=await browser.newContext();await signIn(customerContext,base,'customer');const customer=await customerContext.newPage();await membership(customer,base,native);await expect(customer.getByRole(native?'button':'link',{name:'Complete seller approval',exact:true})).toBeVisible();await customerContext.close();
 }
 const adminContext=await browser.newContext({viewport:{width:1440,height:1000}});await signIn(adminContext,adminBase,'admin');const adminPage=await adminContext.newPage();adminPage.on('pageerror',e=>errors.push(e.message));await adminPage.goto(adminBase+'/admin/memberships');await expect(adminPage.getByRole('cell',{name:/seller@membership.example.com/})).toBeVisible();await adminPage.getByRole('button',{name:/Inspect account/}).first().click();await expect(adminPage.getByText('Audited job-credit adjustment',{exact:true})).toBeVisible();await adminPage.getByLabel('Quantity',{exact:true}).fill('2');await adminPage.getByLabel('Reason',{exact:true}).fill('Synthetic browser audited credit adjustment');await adminPage.getByRole('button',{name:'Record adjustment',exact:true}).click();await expect(adminPage.getByText(/17 job credits/)).toBeVisible();await adminPage.getByRole('textbox',{name:'Review / fulfillment note'}).fill('Synthetic browser human fulfillment review');await adminPage.getByRole('button',{name:'Start fulfillment',exact:true}).click();await expect(adminPage.getByRole('button',{name:'Confirm completed work',exact:true})).toBeVisible();await screenshot(adminPage,'admin-memberships-1440');await adminContext.close();
 report.checks.push('Admin: subscriber detail, payment/cycle references, allowances, ledger/audit, credit adjustment, explicit fulfillment transition');assert.equal(errors.length,0,JSON.stringify(errors));report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1;}finally{if(browser)await browser.close();for(const child of children)if(child.exitCode===null)child.kill();for(const server of servers)server.close();report.runtimeErrors=errors;writeFileSync(path.join(output,'browser-result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
