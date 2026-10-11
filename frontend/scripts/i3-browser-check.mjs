/** Synthetic memory-only API + ephemeral Next. Never contacts normal containers/database. */
import http from 'node:http';
import {URL} from 'node:url';
import process from 'node:process';
import console from 'node:console';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
import {chromium,expect} from '@playwright/test';
const {fetch,AbortSignal}=globalThis;
let id=0;const catalogue=JSON.parse(readFileSync('../shared/catalogue.json','utf8')).map((c,i)=>({...c,id:i+1,services:c.services.map(s=>({...s,id:++id})),subcategories:c.subcategories.map((s,j)=>({...s,id:j+1,services:s.services.map(v=>({...v,id:++id}))}))}));
const user={id:1,name:'Synthetic shared identity',email:'fixture@example.com',phone:'1234567890',role:'CUSTOMER',seller_enabled:false};
const claims=[],drafts=[];let passwordRequests=0,owned=false;
const business={id:12,name:'Synthetic Contact',company:'Synthetic Owned Business',email:'owned@example.com',phone:'1234567890',address:'Synthetic physical address',location:'Synthetic locality',verification_status:'VERIFIED',active:true};
const api=http.createServer(async(req,res)=>{
  const path=new URL(req.url,'http://fixture.invalid').pathname;let body='';for await(const part of req)body+=part;const input=body?JSON.parse(body):{};
  const authenticated=req.headers.authorization==='Bearer synthetic-i3-session';let status=200,data;
  if(path==='/catalogue')data=catalogue;
  else if(path==='/membership/plan')data={amount:12900,days:30};
  else if(path==='/jobs')data={items:[],total:0};
  else if(path==='/auth/seller/login'||path==='/auth/seller/register'){passwordRequests++;user.seller_enabled=true;data={user,access_token:'synthetic-i3-session'};}
  else if(!authenticated){status=401;data={detail:'Sign in required'};}
  else if(path==='/me')data=user;
  else if(path==='/auth/seller/enable'){user.seller_enabled=true;data=user;}
  else if(path==='/me/membership')data={active:false,records:[],expires_at:null};
  else if(path==='/seller/businesses')data=owned?[business]:[];
  else if(path==='/seller/businesses/12/services')data=[{provider_id:12,service_id:1,approval_status:'APPROVED',description:'Published synthetic listing',application_id:null}];
  else if(path==='/seller/businesses/12/publication-drafts'&&req.method==='POST'){data={id:'synthetic-draft-'+drafts.length,provider_id:12,service_id:input.service_id||null,actor_id:1,revision:1,status:'DRAFT',payload:input.profile||{description:input.description},prior_payload:input.profile?business:{description:'Published synthetic listing'},review_note:''};drafts.push(data);status=201;}
  else if(path==='/seller/businesses/12/publication-drafts')data=drafts;
  else if(path.startsWith('/seller/businesses/12/publication-drafts/')&&path.endsWith('/submit')){data=drafts.find(d=>path.includes(d.id));data.status='SUBMITTED';data.revision++;}
  else if(path==='/provider-applications'||path==='/provider-leads')data=[];
  else if(path==='/seller/ownership-claims'&&req.method==='POST'){data={id:'synthetic-claim',...input,user_id:1,status:'PENDING',review_note:'',grant_blocked:true};claims.push(data);status=201;}
  else if(path==='/seller/ownership-claims')data=claims;
  else {status=404;data={detail:'Synthetic route unavailable'};}
  res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));
});
await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));
const probe=http.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const base=`http://127.0.0.1:${port}`;const directory=resolve('../artifacts/i3');mkdirSync(directory,{recursive:true});
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)],{cwd:process.cwd(),env:{...process.env,API_URL:`http://127.0.0.1:${api.address().port}`,ALLOWED_ORIGINS:base,COOKIE_SECURE:'false',NEXT_TELEMETRY_DISABLED:'1'},stdio:'ignore',windowsHide:true});
let browser,diagnosticPage;const errors=[];
try {
  let ready=false;for(let n=0;n<100;n++){try{const r=await fetch(base+'/seller/login',{signal:AbortSignal.timeout(2000)});if(r.ok){ready=true;break;}}catch{/* Isolated startup only. */}await setTimeout(500);}if(!ready)throw new Error('Isolated Next startup failed');
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const width of [1440,390]) {
    user.seller_enabled=false;owned=false;claims.length=0;drafts.length=0;const context=await browser.newContext({viewport:{width,height:1000}});const page=await context.newPage();diagnosticPage=page;page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);await expect(page.getByRole('link',{name:'Provide a service',exact:true})).toHaveAttribute('href','/seller/login');
    for(const label of ['Sign up as user','Login as user','Sign up as seller','Login as seller'])await expect(page.getByRole('link',{name:label,exact:true})).toBeVisible();
    await page.getByRole('link',{name:'Provide a service',exact:true}).click();await expect(page.getByRole('heading',{name:'Login as seller',exact:true})).toBeVisible();
    const next='/service/jobs-careers/service/resume-building?tab=recommendations';await page.goto(base+'/seller/login?next='+encodeURIComponent(next));
    await page.getByRole('link',{name:'Create an account',exact:true}).click();await expect(page).toHaveURL(base+'/seller/register?next='+encodeURIComponent(next));
    await expect(page.getByRole('heading',{name:'Sign up as seller',exact:true})).toBeVisible();await page.getByRole('link',{name:'Sign in',exact:true}).last().click();await expect(page).toHaveURL(base+'/seller/login?next='+encodeURIComponent(next));
    await page.getByRole('textbox',{name:'Email address',exact:true}).fill(user.email);await page.getByLabel('Password',{exact:true}).fill('synthetic-browser-password');await page.waitForLoadState('networkidle');await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await expect(page).toHaveURL(base+next);await expect(page.getByRole('tab')).toHaveText(['Find Service Provider','VISTRAH Recommended','VISTRAH Services']);await expect(page.getByRole('tabpanel')).toContainText('Active membership required');await expect(page.locator('textarea')).toHaveCount(0);
    await page.goto(base+'/seller');await expect(page.getByRole('heading',{name:'Seller Dashboard',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'No explicitly owned business yet'})).toBeVisible();await expect(page.getByText('Add catalogue services through the existing per-service application review.',{exact:false})).toBeVisible();
    await page.getByLabel('Business ID',{exact:true}).fill('12');await page.getByLabel('Ownership claim statement',{exact:true}).fill('Synthetic ownership claim requiring administrator review.');await page.getByRole('button',{name:'Request ownership review',exact:true}).click();await expect(page.getByRole('heading',{name:'Business #12: PENDING'})).toBeVisible();
    await page.screenshot({path:join(directory,`seller-${width}.png`),fullPage:true});
    expect(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth+1)).toBe(true);
    if(width<600){await page.getByRole('button',{name:'Open menu',exact:true}).click();await expect(page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'Seller Dashboard',exact:true})).toBeVisible();}
    await page.goto(base+'/admin/ownership-claims');await expect(page.getByRole('heading',{name:'Administrator access required',exact:true})).toBeVisible();
    await page.goto(base);await expect(page.getByRole('link',{name:'Provide a service',exact:true})).toHaveAttribute('href','/seller');
    // Same identity can enable seller capability without another password/account.
    user.seller_enabled=false;await page.goto(base+'/seller');await expect(page.getByRole('heading',{name:'Use your account as a seller',exact:true})).toBeVisible();const count=passwordRequests;await page.getByRole('button',{name:'Enable seller access'}).click();await expect(page.getByRole('heading',{name:'Seller Dashboard',exact:true})).toBeVisible();expect(passwordRequests).toBe(count);
    // I4: owner editor saves/submits proposals without changing published details.
    owned=true;await page.reload();await expect(page.getByRole('heading',{name:business.company,exact:true})).toBeVisible();await page.getByText('Manage business and service drafts',{exact:true}).click();
    await page.getByLabel('Locality',{exact:true}).fill('Proposed synthetic locality');await page.getByRole('button',{name:'Save business draft',exact:true}).click();await expect(page.getByRole('heading',{name:'Business profile · DRAFT',exact:true})).toBeVisible();expect(business.location).toBe('Synthetic locality');
    await page.getByRole('button',{name:'Submit draft for review',exact:true}).click();await expect(page.getByRole('heading',{name:'Business profile · SUBMITTED',exact:true})).toBeVisible();
    await page.getByLabel('Proposed listing description',{exact:true}).fill('Proposed synthetic listing description for independent review.');await page.getByRole('button',{name:'Save listing draft',exact:true}).click();await expect(page.getByRole('heading',{name:'Resume Building · DRAFT',exact:true})).toBeVisible();
    await page.screenshot({path:join(directory,`publication-${width}.png`),fullPage:true});expect(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth+1)).toBe(true);
    await page.getByRole('link',{name:'Apply for another catalogue service',exact:true}).click();await expect(page).toHaveURL(base+'/provide-service?business=12');await page.waitForLoadState('networkidle');
    const nested=catalogue.find(c=>c.subcategories.length);await page.getByLabel('Service category',{exact:true}).selectOption(String(nested.id));await expect(page.locator('.provider-options input')).toHaveCount(nested.services.length);await page.locator('.provider-options input').first().check();
    await page.getByLabel('Service subcategory',{exact:true}).selectOption(String(nested.subcategories[0].id));await expect(page.locator('.provider-options input:checked')).toHaveCount(0);await expect(page.locator('.provider-options input')).toHaveCount(nested.subcategories[0].services.length);
    await page.getByLabel('Service category',{exact:true}).selectOption(String(catalogue[0].id));await expect(page.getByLabel('Service subcategory',{exact:true})).toHaveCount(0);await expect(page.locator('.provider-options input:checked')).toHaveCount(0);
    await context.close();
  }
  expect(errors).toEqual([]);console.log('I3/I4 synthetic browser passed: desktop/mobile four entries, shared capability, cookie session, safe tab return, no customer-membership grant, ownership/claims/nav/admin denial; owner business/listing draft save and submit, unchanged publication, dependent catalogue/direct/nested selections and resets; no runtime errors.');
} catch(error){console.error(error.message);if(diagnosticPage&&!diagnosticPage.isClosed()){console.error('Synthetic diagnostic:',new URL(diagnosticPage.url()).pathname,await diagnosticPage.locator('h1,h2,.notice.error').allTextContents());await diagnosticPage.screenshot({path:join(directory,'diagnostic.png'),fullPage:true});}process.exitCode=1;}
finally {await browser?.close();if(child.pid)await new Promise(resolve=>{const stop=spawn(join(process.env.SystemRoot||'C:\\Windows','System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});stop.on('exit',()=>resolve());stop.on('error',()=>{child.kill();resolve();});});api.closeAllConnections();await new Promise(resolve=>api.close(resolve));}
