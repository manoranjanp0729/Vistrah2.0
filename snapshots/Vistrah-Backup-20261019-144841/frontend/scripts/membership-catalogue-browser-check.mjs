// Isolated UI previews with intercepted GET responses; never connects to a database or submits payments.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {fileURLToPath,URL} from 'node:url';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
import process from 'node:process';
import console from 'node:console';
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
const root=fileURLToPath(new URL('../../',import.meta.url)),output=path.join(root,'artifacts/membership-catalogue');mkdirSync(output,{recursive:true});
const approved=JSON.parse(readFileSync(path.join(root,'shared/business-membership-catalogue.json'),'utf8'));
const terms={...approved,payment_mode:'SANDBOX',checkout_supported:true};
const user={id:999001,name:'Synthetic approved seller',email:'readonly-preview@example.com',phone:'',role:'CUSTOMER',seller_enabled:true};
const status={eligibility:'APPROVED_SELLER',active:false,status:'NONE',subscription_id:null,current_plan:null,billing_period:null,expires_at:null,automatic_renewal:false,non_renewing:false,job_credits:0,allowances:[],cycles:[],payments:[],requests:[],checkout_supported:true};
const servers=[],report={passed:false,checks:[],screenshots:[],runtimeErrors:[],mutationAttempts:[]};let browser,web;
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>{servers.push(server);resolve(server.address().port);}));
async function freePort(){const server=http.createServer();const port=await listen(server);await new Promise(resolve=>server.close(resolve));return port;}
const api=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');if(req.method!=='GET'){report.mutationAttempts.push(req.url);res.statusCode=405;}res.end(req.url==='/catalogue'?'[]':'{}');});
const expo=http.createServer((req,res)=>{const dir=path.join(output,'expo-web'),pathname=new URL(req.url,'http://localhost').pathname.replace(/^\/app(?=\/|$)/,'')||'/';let target=path.resolve(dir,'.'+decodeURIComponent(pathname));if(!target.startsWith(dir+path.sep)||!existsSync(target)||!path.extname(target))target=path.join(dir,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.webp':'image/webp','.png':'image/png','.ttf':'font/ttf','.css':'text/css','.json':'application/json','.ico':'image/x-icon'})[path.extname(target)]??'application/octet-stream');try{res.end(readFileSync(target));}catch{res.statusCode=404;res.end();}});
async function ready(url){for(let i=0;i<100;i++){try{if((await globalThis.fetch(url)).ok)return;}catch{/* Preview starting. */}if(web.exitCode!==null)throw Error('Preview exited');await setTimeout(200);}throw Error('Preview timed out');}
try{
 const apiPort=await listen(api),expoPort=await listen(expo),webPort=await freePort();
 web=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(webPort)],{cwd:path.join(root,'frontend'),env:{...process.env,API_URL:'http://127.0.0.1:'+apiPort,TEST_NEXT_DIST_DIR:'.next-membership-catalogue',NODE_ENV:'production'},stdio:['ignore','pipe','pipe']});let log='';web.stdout.on('data',d=>log+=d);web.stderr.on('data',d=>log+=d);web.on('exit',()=>writeFileSync(path.join(output,'web.log'),log));await ready('http://127.0.0.1:'+webPort+'/membership');
 browser=await chromium.launch({channel:'chrome',headless:true});
 for(const native of [false,true])for(const width of [390,1440])for(const scenario of ['available','404','offline','status-unavailable','payment-unavailable']){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>report.runtimeErrors.push(e.message));
  await context.route('**/api/**',async route=>{const request=route.request(),endpoint=new URL(request.url()).pathname.replace(/^\/api/,'');if(request.method()!=='GET'){report.mutationAttempts.push(endpoint);return route.abort();}const reply=(body,code=200)=>route.fulfill({status:code,contentType:'application/json',body:JSON.stringify(body)});
   if(endpoint==='/membership/plans'){if(scenario==='offline')return route.abort('failed');if(scenario==='404')return reply({detail:'Not Found'},404);return reply({...terms,checkout_supported:scenario!=='payment-unavailable'});}
   if(endpoint==='/me/business-membership')return scenario==='status-unavailable'?reply({detail:'Not Found'},404):reply(status);
   if(endpoint==='/me')return reply(user);if(endpoint==='/catalogue')return reply([]);return reply({location:null});
  });
  const base='http://127.0.0.1:'+(native?expoPort:webPort);await page.goto(base+(native?'/app':'')+'/membership');await expect(page.getByRole('heading',{name:'VISTRAH Business Membership',exact:true})).toBeVisible();if(native)await expect(page.getByText(/Opening your next possibilities/)).toBeHidden({timeout:15000});
  const panel=page.getByLabel('Selected membership plan',{exact:true});await expect(panel).toHaveCount(1);await expect(panel.getByText(/799.*month/)).toBeVisible();
  if(scenario==='404'){const file=(native?'expo':'website')+'-plus-'+width+'.png';await page.screenshot({path:path.join(output,file),fullPage:!native});report.screenshots.push(file);}
  for(const period of ['Monthly','Annual'])for(const plan of approved.plans){await page.getByRole('button',{name:period,exact:true}).click();await page.getByRole('button',{name:plan.name,exact:true}).click();await expect(panel.getByRole('heading',{name:plan.name,exact:true})).toBeVisible();const action=panel.getByRole('button').last();
   if(period==='Monthly'){await expect(panel.getByText(new RegExp((plan.periods.MONTHLY.amount/100).toLocaleString('en-IN')+'.*month'))).toBeVisible();for(const benefit of plan.benefits)await expect(panel.getByText(benefit.label,{exact:false}).first()).toBeVisible();if(scenario==='available')await expect(action).toBeEnabled();else await expect(action).toBeDisabled();}
   else{await expect(panel.getByText('Annual pricing coming soon.',{exact:true})).toBeVisible();await expect(action).toBeDisabled();}
   await expect(page).toHaveURL(base+(native?'/app':'')+'/membership');await expect(page.getByText('Not Found',{exact:true})).toHaveCount(0);assert(await page.locator('body').evaluate(n=>n.scrollWidth<=n.ownerDocument.defaultView.innerWidth+1));
  }
  report.checks.push(`${native?'Expo':'Next'} ${width}px ${scenario}: six selections, all approved benefits/prices, annual disabled, correct checkout availability, no raw API error or overflow`);await context.close();
 }
 assert.equal(report.mutationAttempts.length,0);assert.equal(report.runtimeErrors.length,0,JSON.stringify(report.runtimeErrors));report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1;}finally{if(browser)await browser.close();if(web)web.kill();for(const server of servers)server.close();writeFileSync(path.join(output,'browser-result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
