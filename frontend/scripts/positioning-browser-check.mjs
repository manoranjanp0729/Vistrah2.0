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
let active=false,payment=null,requests=[];
const api=http.createServer(async(req,res)=>{
  const path=new URL(req.url,'http://fixture.invalid').pathname;
  const administrator=req.headers.authorization==='Bearer synthetic-admin-session';
  const authenticated=administrator||req.headers.authorization==='Bearer synthetic-browser-session';
  let body='';for await(const chunk of req)body+=chunk;const input=body?JSON.parse(body):{};
  let data,status=200;
  if(path==='/catalogue')data=categories;
  else if(path==='/membership/plan')data={amount:12900,days:30};
  else if(path==='/auth/login'||path==='/auth/register')data={user,access_token:'synthetic-browser-session'};
  else if(path==='/jobs')data={items:[],total:0,note:'Synthetic source-listed vacancies'};
  else if(!authenticated){status=401;data={detail:'Sign in required'};}
  else if(path==='/me')data=administrator?{...user,role:'ADMIN'}:user;
  else if(path==='/admin/catalogue')data=categories;
  else if(path==='/admin/overview')data={customers:1,requests:0,providers:0,services:1,payments:0};
  else if(path==='/me/requests')data=requests;
  else if(['/me/orders','/provider-applications','/provider-leads','/finds/requests','/finds/actions','/membership/offers'].includes(path))data=[];
  else if(path==='/me/membership')data={active,expires_at:null,records:[]};
  else if(path==='/me/payments')data=payment?[payment]:[];
  else if(path==='/payments/checkout'){payment={id:'synthetic-payment',amount:12900,currency:'INR',mode:'SANDBOX',status:'PENDING',created_at:new Date().toISOString()};data=payment;}
  else if(path==='/payments/synthetic-payment/simulate'){payment={...payment,status:input.outcome};data=payment;}
  else if(path==='/requests'){
    if(!active){status=403;data={detail:'Eligible membership required'};}
    else{status=201;data={id:42,service_id:7,service_title:'Repairs',status:'SUBMITTED',created_at:new Date().toISOString(),...input};requests.push(data);}
  }
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
let browser;let stage='startup';
try {
  let ready=false;
  for(let n=0;n<100;n++){try{const r=await fetch(`${base}/login`,{signal:AbortSignal.timeout(2000)});await r.arrayBuffer();if(r.ok){ready=true;break;}}catch{/* The isolated server is still starting. */}await new Promise(resolve=>setTimeout(resolve,500));}
  if(!ready)throw new Error('Isolated Next server did not become ready');
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    const context=await browser.newContext({viewport});const page=await context.newPage();
    stage='homepage';await page.goto(base);
    await expect(page).toHaveTitle('VISTRAH — Get services. Offer services.');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content',/customers seeking services with sellers providing services/);
    await expect(page.getByRole('heading',{name:/Get a service.*Provide a service/})).toBeVisible();
    await expect(page.locator('.hero-description')).toHaveText('VISTRAH brings customers and service providers together. Explore services for your needs, or register as a seller to list and manage your offerings.');
    await expect(page.locator('.brand span').first()).toHaveText('Get services. Offer services.');
    const seller=page.getByRole('link',{name:'Provide a service',exact:true});await expect(seller).toHaveAttribute('href','/seller/login');
    await seller.focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(base+'/seller/login');await page.goto(base);
    await expect(page.locator('#seller-access-status')).toContainText('Customer membership is not required');
    expect(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth+1)).toBe(true);
    if(viewport.width<500){await page.getByRole('button',{name:'Open menu',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('navigation',{name:'Mobile navigation'})).toBeVisible();await page.getByRole('button',{name:'Close menu',exact:true}).click();}
    stage='catalogue keyboard entry';await page.getByRole('link',{name:'Find a service',exact:true}).focus();await page.keyboard.press('Enter');
    await expect(page.getByRole('heading',{name:'Find services for your needs.'})).toBeVisible();expect(new URL(page.url()).pathname).toBe('/services');
    stage='service search';await page.getByRole('textbox',{name:'What service are you looking for?'}).fill('repairs');await page.getByRole('textbox',{name:'What service are you looking for?'}).press('Enter');
    await expect(page.getByRole('heading',{name:'Repairs',exact:true})).toBeVisible();expect(new URL(page.url()).searchParams.get('q')).toBe('repairs');
    stage='service result';await page.getByRole('link',{name:/Construction Repairs/}).click();
    await expect(page.getByRole('tab')).toHaveText(['Find Service Provider','VISTRAH Recommended','VISTRAH Services']);await page.getByRole('tab',{name:'VISTRAH Recommended',exact:true}).click();
    stage='service help';const recommendedHelp=page.locator('[data-help-id="pathway.recommendations"]');await recommendedHelp.getByRole('button',{name:'Help: VISTRAH Recommended'}).focus();await expect(recommendedHelp.getByRole('dialog')).toBeVisible();await expect(recommendedHelp.getByRole('dialog')).toContainText('No automated matching, instant shortlist or guaranteed turnaround');await page.keyboard.press('Escape');await expect(recommendedHelp.getByRole('dialog')).toBeHidden();
    await page.getByRole('tab',{name:'VISTRAH Services',exact:true}).click();const managedHelp=page.locator('[data-help-id="pathway.in-house"]');await managedHelp.getByRole('button',{name:'Help: VISTRAH Services'}).click();await expect(managedHelp.getByRole('dialog')).toContainText('No confirmed managed offering');await managedHelp.getByRole('button',{name:'Close help'}).click();await expect(managedHelp.getByRole('dialog')).toBeHidden();
    expect(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth+1)).toBe(true);
    const paths=['/service/construction','/login','/membership','/call-vistrah','/jobs'];
    for(const path of paths){stage=path;await page.goto(base+path);await expect(page.locator('main h1').first()).toBeVisible();expect(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth+1)).toBe(true);}
    await context.close();
    // Separate sessions avoid a late anonymous /me response clearing a newly injected cookie.
    const customer=await browser.newContext({viewport});await customer.addCookies([{name:'vistrah_session',value:'synthetic-browser-session',url:base,httpOnly:true}]);const customerPage=await customer.newPage();
    for(const path of ['/account','/account/requests','/account/provider-applications','/account/membership','/provide-service','/account/finds']){stage=path;await customerPage.goto(base+path);await expect(customerPage.locator('main h1').first()).toBeVisible();await expect(customerPage.locator('.notice.error')).toHaveCount(0);expect(await customerPage.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth+1)).toBe(true);}
    await customerPage.goto(base+'/provide-service');await expect(customerPage.getByRole('heading',{name:'Apply to provide services.'})).toBeVisible();await expect(customerPage.getByText('Customer membership is not required.',{exact:false})).toBeVisible();
    stage='nonmember provider gate';await customerPage.goto(base+'/service/construction/service/repairs/companies');await expect(customerPage.getByRole('heading',{name:'Active membership required'})).toBeVisible();await expect(customerPage.getByText('Isolated eligible provider')).toHaveCount(0);
    active=true;stage='member provider directory';await customerPage.reload();await expect(customerPage.getByRole('heading',{name:'Isolated eligible provider'})).toBeVisible();
    stage='saved recommendation enquiry';await customerPage.goto(base+'/service/construction/service/repairs/request?intent=recommendations');await customerPage.getByRole('textbox',{name:/^Your requirements/}).fill('Synthetic repair scope for a test enquiry only.');await customerPage.getByRole('textbox',{name:'Location',exact:true}).fill('Synthetic locality');await customerPage.getByRole('button',{name:'Submit requirement',exact:true}).focus();await customerPage.keyboard.press('Enter');await expect(customerPage.getByText('Your request #42 for Repairs has been saved.')).toBeVisible();expect(requests.at(-1).requirements).toBe('[Recommendation assistance] Synthetic repair scope for a test enquiry only.');await customerPage.getByRole('link',{name:'View my requests'}).click();await expect(customerPage.getByText('[Recommendation assistance] Synthetic repair scope for a test enquiry only.')).toBeVisible();
    active=false;requests=[];await customer.close();
    const administrator=await browser.newContext({viewport});await administrator.addCookies([{name:'vistrah_session',value:'synthetic-admin-session',url:base,httpOnly:true}]);const adminPage=await administrator.newPage();stage='admin';await adminPage.goto(base+'/admin');await expect(adminPage.getByRole('heading',{name:/Platform overview/})).toBeVisible();expect(await adminPage.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth+1)).toBe(true);
    if(viewport.width<500){await adminPage.getByRole('button',{name:'Toggle admin sidebar'}).click();await expect(adminPage.getByRole('navigation',{name:'Admin navigation'})).toBeVisible();}
    await administrator.close();
  }
  console.log('Positioning browser: desktop/mobile public, metadata, catalogue/search, auth, membership/contact/jobs, customer/Finds/provider, admin, seller authentication CTA, help focus/click/Escape, member gates, saved enquiry intent/tracking, keyboard navigation and wrapping: passed.');
} catch(error) {
  console.error(`Positioning browser failed at ${stage}: ${error.message.slice(0,700)}`);process.exitCode=1;
} finally {
  await browser?.close();
  if(child.pid)await new Promise(resolve=>{const stop=spawn(join(process.env.SystemRoot||'C:\\Windows','System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});stop.on('exit',code=>{if(code!==0)child.kill();resolve();});stop.on('error',()=>{child.kill();resolve();});});
  api.closeAllConnections();
  await new Promise(resolve=>api.close(resolve));
}
