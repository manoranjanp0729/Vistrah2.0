/** Disposable UI harness: synthetic HTTP API, separate Next process, no database. */
import http from 'node:http';
import process from 'node:process';
import console from 'node:console';
import {URL} from 'node:url';
import {setTimeout} from 'node:timers';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
const {fetch,AbortSignal}=globalThis;
const service={id:7,category_id:1,subcategory_id:null,slug:'repairs',title:'Repairs',description:'Synthetic general description',includes:['Synthetic scope'],image:'',active:true,popular:false};
const categories=[{id:1,slug:'construction',title:'Construction',description:'Synthetic catalogue',image:'',active:true,services:[service],subcategories:[]}];
const user={id:1,name:'Synthetic customer',email:'fixture@example.com',phone:'1234567890',role:'CUSTOMER'};
let active=false,payment=null;
const api=http.createServer(async(req,res)=>{
  const path=new URL(req.url,'http://fixture.invalid').pathname;
  const authenticated=req.headers.authorization==='Bearer synthetic-browser-session';
  let body='';for await(const chunk of req)body+=chunk;const input=body?JSON.parse(body):{};
  let data,status=200;
  if(path==='/catalogue')data=categories;
  else if(path==='/membership/plan')data={amount:12900,days:30};
  else if(path==='/auth/login'||path==='/auth/register')data={user,access_token:'synthetic-browser-session'};
  else if(!authenticated){status=401;data={detail:'Sign in required'};}
  else if(path==='/me')data=user;
  else if(path==='/me/membership')data={active,expires_at:null,records:[]};
  else if(path==='/me/payments')data=payment?[payment]:[];
  else if(path==='/payments/checkout'){payment={id:'synthetic-payment',amount:12900,currency:'INR',mode:'SANDBOX',status:'PENDING',created_at:new Date().toISOString()};data=payment;}
  else if(path==='/payments/synthetic-payment/simulate'){payment={...payment,status:input.outcome};data=payment;}
  else if(path.startsWith('/services/7/')){
    if(!active){status=403;data={detail:'Eligible membership required'};}
    else data=path.endsWith('member-information')?{notes:['Synthetic protected guide']}:[{id:1,slug:'synthetic-provider',company:'Isolated eligible provider',name:'Fixture',location:'Fixture locality',verification_status:'VERIFIED',address:'Synthetic'}];
  } else {status=404;data={detail:'Synthetic route unavailable'};}
  res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));
});
await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));
const portProbe=http.createServer();await new Promise(resolve=>portProbe.listen(0,'127.0.0.1',resolve));const port=portProbe.address().port;await new Promise(resolve=>portProbe.close(resolve));
const base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)],{cwd:process.cwd(),env:{...process.env,API_URL:`http://127.0.0.1:${api.address().port}`,ALLOWED_ORIGINS:base,COOKIE_SECURE:'false',NEXT_TELEMETRY_DISABLED:'1'},stdio:'ignore',windowsHide:true});
let browser,diagnosticPage;
try {
  let ready=false;
  for(let n=0;n<100;n++){try{const r=await fetch(`${base}/login`,{signal:AbortSignal.timeout(2000)});await r.arrayBuffer();if(r.ok){ready=true;break;}}catch{/* The isolated server is still starting. */}await new Promise(resolve=>setTimeout(resolve,500));}
  if(!ready)throw new Error('Isolated Next server did not become ready');
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext();const page=await context.newPage();diagnosticPage=page;
  const destination='/service/construction/service/repairs/companies';
  await page.goto(`${base}${destination}`);
  await expect(page.getByRole('heading',{name:'Sign in to continue'})).toBeVisible();
  await expect(page.getByText('Isolated eligible provider')).toHaveCount(0);
  await page.locator('main').getByRole('link',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Good to see you again.'})).toBeVisible();
  await page.locator('main').getByRole('link',{name:'Create an account',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Create your account'})).toBeVisible();
  expect(new URL(page.url()).searchParams.get('next')).toBe(destination);
  await page.locator('main').getByRole('link',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Good to see you again.'})).toBeVisible();
  expect(new URL(page.url()).searchParams.get('next')).toBe(destination);
  await page.getByLabel('Email address').fill('fixture@example.com');await page.getByLabel('Password',{exact:true}).fill('synthetic-private-test-passphrase');
  await page.waitForLoadState('networkidle');await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('link',{name:'Explore membership',exact:true})).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(destination);
  await page.getByRole('link',{name:'Explore membership',exact:true}).click();
  await page.getByRole('link',{name:'Try sandbox membership',exact:true}).click();
  expect(new URL(page.url()).searchParams.get('next')).toBe(destination);
  await page.getByRole('button',{name:'Create sandbox transaction'}).click();
  await expect(page.getByRole('button',{name:'Simulate successful payment'})).toBeVisible();
  await page.reload();await expect(page.getByRole('button',{name:'Simulate successful payment'})).toBeVisible();
  expect(new URL(page.url()).searchParams.get('next')).toBe(destination);
  await page.getByRole('button',{name:'Simulate successful payment'}).click();
  await page.getByRole('button',{name:'Check access and return'}).click();
  await expect(page.getByText('Access is not active.',{exact:false})).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/sandbox-checkout');
  active=true;
  await page.getByRole('button',{name:'Check access and return'}).click();
  await expect(page.getByRole('heading',{name:'Isolated eligible provider'})).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(destination);
  const other=await browser.newContext({viewport:{width:390,height:844}});const otherPage=await other.newPage();await otherPage.goto(`${base}${destination}`);
  await expect(otherPage.getByText('Isolated eligible provider')).toHaveCount(0);await expect(otherPage.getByRole('heading',{name:'Sign in to continue'})).toBeVisible();await other.close();
  active=false;
  await page.goto(`${base}/sandbox-checkout?next=${encodeURIComponent(destination)}&success=true`);
  await page.getByRole('button',{name:'Start a new test'}).click();await page.getByRole('button',{name:'Create sandbox transaction'}).click();
  await page.getByRole('button',{name:'Simulate failed payment'}).click();await expect(page.getByText('Test payment failed. Membership was not activated.')).toBeVisible();await expect(page.getByRole('button',{name:'Check access and return'})).toHaveCount(0);
  console.log('I1 isolated browser: anonymous/SSR privacy, login-register destination, inactive membership, pending refresh, backend-confirmed return, failed/forged-success flow: passed.');
} catch(error) {
  console.error(`I1 isolated browser failed: ${error.message.slice(0,1000)}`);if(diagnosticPage&&!diagnosticPage.isClosed())console.error('Synthetic diagnostic:',new URL(diagnosticPage.url()).pathname,await diagnosticPage.locator('.notice.error').allTextContents());process.exitCode=1;
} finally {
  await browser?.close();
  if(child.pid)await new Promise(resolve=>{const stop=spawn(join(process.env.SystemRoot||'C:\\Windows','System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});stop.on('exit',code=>{if(code!==0)child.kill();resolve();});stop.on('error',()=>{child.kill();resolve();});});
  api.closeAllConnections();
  await new Promise(resolve=>api.close(resolve));
}
