/** I2: ephemeral Next + synthetic HTTP API; never connects to a database or live service. */
import http from 'node:http';
import process from 'node:process';
import console from 'node:console';
import {URL} from 'node:url';
import {setTimeout} from 'node:timers';
import {readFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
const {fetch,AbortSignal}=globalThis;
let serviceId=0;
const catalogue=JSON.parse(readFileSync('../shared/catalogue.json','utf8')).map((c,i)=>({...c,id:i+1,services:c.services.map(s=>({...s,id:++serviceId})),subcategories:c.subcategories.map((sub,j)=>({...sub,id:j+1,services:sub.services.map(s=>({...s,id:++serviceId}))}))}));
const contexts=catalogue.flatMap(category=>[...category.services.map(service=>({category,service})),...category.subcategories.flatMap(subcategory=>subcategory.services.map(service=>({category,subcategory,service})))]);
const canonical=({category,subcategory,service})=>`/service/${category.slug}/${subcategory?`${subcategory.slug}/`:''}service/${service.slug}`;
const legacy=({category,subcategory,service},suffix)=>subcategory?`/service/${category.slug}/${subcategory.slug}/${service.slug}/${suffix}`:`${canonical({category,service})}/${suffix}`;
const sample=contexts.find(c=>c.service.slug==='resume-building');
const user={id:1,name:'Synthetic I2 customer',email:'fixture@example.invalid',phone:'1234567890',role:'CUSTOMER'};
const provider={id:333,slug:'synthetic-provider',company:'I2 synthetic eligible provider',name:'Synthetic contact',location:'Synthetic locality',verification_status:'VERIFIED',address:'Synthetic address'};
let active=false,payment=null,requests=[],membershipError=false,providerReads=0;
const api=http.createServer(async(req,res)=>{
  const path=new URL(req.url,'http://fixture.invalid').pathname;
  const authenticated=req.headers.authorization==='Bearer synthetic-i2-session';
  let body='';for await(const chunk of req)body+=chunk;const input=body?JSON.parse(body):{};
  let data,status=200;
  if(path==='/catalogue')data=catalogue;
  else if(path==='/membership/plan')data={amount:12900,days:30};
  else if(path==='/jobs')data={items:[],total:0,note:'Synthetic empty cache'};
  else if(path==='/auth/login'||path==='/auth/register')data={user,access_token:'synthetic-i2-session'};
  else if(!authenticated){status=401;data={detail:'Sign in required'};}
  else if(path==='/me')data=user;
  else if(path==='/me/membership'){status=membershipError?503:200;data=membershipError?{detail:'Synthetic availability failure'}:{active,expires_at:null,records:[]};}
  else if(path==='/me/payments')data=payment?[payment]:[];
  else if(path==='/me/requests')data=requests;
  else if(path==='/membership/offers')data=[];
  else if(path==='/payments/checkout'){payment={id:'synthetic-i2-payment',amount:12900,currency:'INR',mode:'SANDBOX',status:'PENDING',created_at:new Date().toISOString()};data=payment;}
  else if(path==='/payments/synthetic-i2-payment/simulate'){payment={...payment,status:input.outcome};data=payment;}
  else if(path==='/requests'){
    if(!active){status=403;data={detail:'Eligible membership required'};}
    else{status=201;const service=contexts.find(c=>c.service.id===input.service_id).service;data={id:42+requests.length,service_title:service.title,status:'SUBMITTED',created_at:new Date().toISOString(),...input};requests.push(data);}
  }else if(/^\/services\/\d+\/providers(?:\/[a-z-]+)?$/.test(path)){
    providerReads++;
    if(!active){status=403;data={detail:'Eligible membership required'};}
    else data=path.endsWith('/providers')?[provider]:provider;
  }else if(/^\/services\/\d+\/member-information$/.test(path)){
    if(!active){status=403;data={detail:'Eligible membership required'};}else data={notes:['Synthetic member preparation guide']};
  }else{status=404;data={detail:'Synthetic route unavailable'};}
  res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));
});
await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));
const probe=http.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)],{cwd:process.cwd(),env:{...process.env,API_URL:`http://127.0.0.1:${api.address().port}`,ALLOWED_ORIGINS:base,COOKIE_SECURE:'false',NEXT_TELEMETRY_DISABLED:'1'},stdio:'ignore',windowsHide:true});
const labels=['Find Service Provider','VISTRAH Recommended','VISTRAH Services'];
const tabs=['providers','recommendations','in-house'];
const artifacts=resolve('../artifacts/i2');mkdirSync(artifacts,{recursive:true});
let browser,diagnosticPage,stage='startup';const runtimeErrors=[];
async function fit(page){expect(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth+1)).toBe(true);}
async function selected(page,index){await expect(page.getByRole('tab').nth(index)).toHaveAttribute('aria-selected','true');await expect(page.getByRole('tabpanel')).toHaveCount(1);await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby',await page.getByRole('tab').nth(index).getAttribute('id'));}
try{
  let ready=false;
  for(let n=0;n<100;n++){try{const response=await fetch(`${base}/login`,{signal:AbortSignal.timeout(2000)});await response.arrayBuffer();if(response.ok){ready=true;break;}}catch{/* Waiting for only the isolated server. */}await new Promise(resolve=>setTimeout(resolve,500));}
  if(!ready)throw new Error('Isolated Next server did not become ready');
  browser=await chromium.launch({channel:'chrome',headless:true});
  stage='59 canonical service renders';
  for(const context of contexts){const response=await fetch(base+canonical(context));expect(response.status).toBe(200);const html=await response.text();expect((html.match(/role="tab"/g)||[]).length).toBe(3);for(const label of labels)expect(html).toContain(label);expect(html).not.toContain(provider.company);expect(html).not.toContain('<textarea');}
  expect(contexts).toHaveLength(59);expect(providerReads).toBe(0);
  for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:320,height:844}]){
    stage=`anonymous keyboard ${viewport.width}`;const context=await browser.newContext({viewport});const page=await context.newPage();page.on('pageerror',error=>runtimeErrors.push(error.message.slice(0,200)));page.on('console',message=>{if(message.type()==='error'&&/hydrat/i.test(message.text()))runtimeErrors.push(message.text().slice(0,200));});await page.goto(base+canonical(sample));await page.waitForLoadState('networkidle');await expect(page.getByRole('tab')).toHaveText(labels);await selected(page,0);
    await expect(page.getByRole('tablist')).toHaveAttribute('aria-orientation',viewport.width<600?'vertical':'horizontal');
    const first=page.getByRole('tab').first();await first.focus();await page.keyboard.press('ArrowRight');await selected(page,1);await expect(page.getByRole('tab').nth(1)).toBeFocused();expect(new URL(page.url()).searchParams.get('tab')).toBe('recommendations');
    await page.keyboard.press('End');await selected(page,2);await page.keyboard.press('Home');await selected(page,0);await page.keyboard.press('ArrowLeft');await selected(page,2);await page.keyboard.press('Tab');await expect(page.getByRole('tabpanel')).toBeFocused();
    if(viewport.width<600){await first.focus();await page.keyboard.press('ArrowDown');await selected(page,1);await page.keyboard.press('ArrowUp');await selected(page,0);await page.getByRole('tab').nth(2).click();await selected(page,2);}
    await expect(page.getByRole('tabpanel')).toContainText('Sign in to continue');await expect(page.locator('textarea')).toHaveCount(0);await expect(page.getByText(provider.company)).toHaveCount(0);await fit(page);
    await expect(page.locator('.service-secondary-contact a')).toHaveAttribute('href','mailto:info@vistrah.in');
    await page.locator('#service-pathways').screenshot({path:join(artifacts,`anonymous-${viewport.width}.png`)});
    if(viewport.width===390){await page.evaluate(()=>globalThis.document.documentElement.style.fontSize='200%');await fit(page);await expect(page.getByRole('tab')).toHaveText(labels);await page.locator('#service-pathways').screenshot({path:join(artifacts,'anonymous-390-text-200.png')});}
    await context.close();
  }
  for(const [index,tab] of tabs.entries()){
    active=false;payment=null;requests=[];stage=`authentication and activation ${tab}`;
    const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();diagnosticPage=page;const destination=`${canonical(sample)}?tab=${tab}`;
    await page.goto(base+destination);await selected(page,index);await page.getByRole('tabpanel').getByRole('link',{name:'Create account',exact:true}).click();await expect(page).toHaveURL(`${base}/register?next=${encodeURIComponent(destination)}`);
    await page.locator('main').getByRole('link',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(`${base}/login?next=${encodeURIComponent(destination)}`);await expect(page.getByRole('heading',{name:'Good to see you again.'})).toBeVisible();await page.getByRole('textbox',{name:'Email address',exact:true}).fill(user.email);await page.getByLabel('Password',{exact:true}).fill('synthetic-i2-private-passphrase');await page.waitForLoadState('networkidle');stage=`post-login return ${tab}`;await page.getByRole('button',{name:'Sign in',exact:true}).click();await selected(page,index);await expect(page.getByRole('tabpanel')).toContainText('Active membership required');await expect(page.locator('textarea')).toHaveCount(0);await expect(page.getByText(provider.company)).toHaveCount(0);
    await page.getByRole('tabpanel').getByRole('link',{name:'Explore membership'}).click();await page.getByRole('link',{name:'Try sandbox membership'}).click();await expect(page).toHaveURL(`${base}/sandbox-checkout?next=${encodeURIComponent(destination)}`);
    await page.getByRole('button',{name:'Create sandbox transaction'}).click();await expect(page.getByRole('button',{name:'Simulate successful payment'})).toBeVisible();await page.reload();await page.getByRole('button',{name:'Simulate successful payment'}).click();await page.getByRole('button',{name:'Check access and return'}).click();await expect(page.getByText('Access is not active.',{exact:false})).toBeVisible();expect(new URL(page.url()).pathname).toBe('/sandbox-checkout');
    active=true;stage=`post-activation return ${tab}`;await page.getByRole('button',{name:'Check access and return'}).click();await selected(page,index);expect(new URL(page.url()).pathname+new URL(page.url()).search).toBe(destination);await fit(page);
    await page.locator('#service-pathways').screenshot({path:join(artifacts,`member-${tab}-390.png`)});
    if(tab==='providers'){
      stage='provider directory/detail';await page.getByRole('tabpanel').getByRole('link',{name:'Browse providers',exact:true}).click();await expect(page.getByRole('heading',{name:provider.company})).toBeVisible();await page.getByRole('link').filter({has:page.getByRole('heading',{name:provider.company})}).click();await expect(page.getByRole('heading',{name:provider.company})).toBeVisible();await expect(page.getByRole('navigation',{name:'Breadcrumb'}).getByRole('link',{name:sample.service.title,exact:true})).toHaveAttribute('href',destination);
    }else{
      stage=`save and track ${tab}`;if(tab==='in-house')await expect(page.getByRole('tabpanel')).toContainText('No VISTRAH-managed offering available for this service.');
      await page.getByRole('tabpanel').getByRole('link',{name:tab==='recommendations'?'Request human review':'Enquire about delivery options',exact:true}).click();await expect(page).toHaveURL(`${base}${legacy(sample,'request')}?intent=${tab}`);await expect(page.getByRole('navigation',{name:'Breadcrumb'}).getByRole('link',{name:sample.service.title,exact:true})).toHaveAttribute('href',destination);
      const text=`Synthetic ${tab} enquiry scope, for isolated testing only.`;await page.getByRole('textbox',{name:/^Your requirements/}).fill(text);await page.getByRole('textbox',{name:'Location',exact:true}).fill('Synthetic locality');await page.getByRole('button',{name:'Submit requirement',exact:true}).click();await expect(page.getByText(`Your request #42 for ${sample.service.title} has been saved.`)).toBeVisible();expect(requests[0].requirements).toBe((tab==='recommendations'?'[Recommendation assistance] ':'[Delivery options enquiry] ')+text);await page.getByRole('link',{name:'View my requests'}).click();await expect(page.getByText(requests[0].requirements,{exact:true})).toBeVisible();
    }
    stage=`access failure ${tab}`;membershipError=true;await page.goto(base+destination);await selected(page,index);await expect(page.getByRole('tabpanel').getByRole('alert')).toContainText('Unable to check service access');await expect(page.getByRole('tabpanel').getByRole('link')).toHaveCount(0);membershipError=false;
    active=false;await page.goto(base+legacy(sample,'request')+`?intent=${tab==='providers'?'contact':tab}`);await expect(page.getByRole('heading',{name:'Active membership required',exact:true})).toBeVisible();await expect(page.locator('textarea')).toHaveCount(0);await context.close();
  }
  stage='nested legacy routes';const nested=contexts.find(c=>c.subcategory);active=true;const member=await browser.newContext();await member.addCookies([{name:'vistrah_session',value:'synthetic-i2-session',url:base,httpOnly:true}]);const nestedPage=await member.newPage();
  for(const tab of ['recommendations','in-house']){await nestedPage.goto(base+canonical(nested)+`?intent=${tab}`);await selected(nestedPage,tabs.indexOf(tab));await nestedPage.getByRole('tabpanel').getByRole('link',{name:tab==='recommendations'?'Request human review':'Enquire about delivery options',exact:true}).click();await expect(nestedPage).toHaveURL(`${base}${legacy(nested,'request')}?intent=${tab}`);await expect(nestedPage.locator('textarea')).toBeVisible();}
  await nestedPage.goto(base+legacy(nested,'companies'));await expect(nestedPage.getByRole('heading',{name:provider.company})).toBeVisible();await nestedPage.goto(base+legacy(nested,'companies')+'/'+provider.slug);await expect(nestedPage.getByRole('heading',{name:provider.company})).toBeVisible();await member.close();active=false;
  expect(runtimeErrors).toEqual([]);
  console.log('I2 passed: 59 canonical SSR routes; exactly three tabs; keyboard/ARIA/panels; 1440/390/320px and 200% text; anonymous/nonmember/member/error states; all three auth/activation returns; provider directory/detail; saved recommendation/delivery intents and tracking; nested legacy routes; no anonymous-page runtime/hydration errors. Screenshots: artifacts/i2.');
}catch(error){console.error(`I2 failed at ${stage}: ${error.message.slice(0,1000)}`);if(diagnosticPage&&!diagnosticPage.isClosed())console.error('Synthetic diagnostic:',new URL(diagnosticPage.url()).pathname,await diagnosticPage.locator('.notice.error').allTextContents());process.exitCode=1;}
finally{await browser?.close();if(child.pid)await new Promise(resolve=>{const stop=spawn(join(process.env.SystemRoot||'C:\\Windows','System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});stop.on('exit',code=>{if(code!==0)child.kill();resolve();});stop.on('error',()=>{child.kill();resolve();});});api.closeAllConnections();await new Promise(resolve=>api.close(resolve));}
