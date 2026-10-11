/** Isolated in-memory API + separate Next build tree; no normal containers/data. */
import http from 'node:http';
import {URL} from 'node:url';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
import process from 'node:process';
import console from 'node:console';
import {chromium,expect} from '@playwright/test';
const {fetch,AbortSignal}=globalThis;

let id=0;
const catalogue=JSON.parse(readFileSync('../shared/catalogue.json','utf8')).map((c,i)=>({...c,id:i+1,services:c.services.map(s=>({...s,id:++id})),subcategories:c.subcategories.map((s,j)=>({...s,id:j+1,services:s.services.map(v=>({...v,id:++id}))}))}));
const cat=catalogue.find(c=>c.services.length);const service=cat.services[0];
const directoryPath=`/service/${cat.slug}/service/${service.slug}/companies`;
const requestPath=`/service/${cat.slug}/service/${service.slug}/request`;
const user={id:1,name:'Synthetic customer',email:'fixture@example.com',phone:'1234567890',role:'CUSTOMER',seller_enabled:true};
let saved=null,membershipActive=true,carouselFixtures=false;const searches=[],enquiries=[],mutations=[],providerReads=[];
const providers=[{id:71,slug:'near',company:'Synthetic Nearby',name:'Fixture',location:'Fixture locality',description:'Reviewed fixture description',verification_status:'VERIFIED',latitude:12,longitude:77,distance_km:1},
{id:72,slug:'far',company:'Synthetic Farther',name:'Fixture',location:'Farther fixture',description:'Reviewed farther description',verification_status:'VERIFIED',latitude:12.1,longitude:77,distance_km:12}];
const server=http.createServer(async(req,res)=>{
  const path=new URL(req.url,'http://synthetic.invalid').pathname;let body='';for await(const part of req)body+=part;
  const input=body?JSON.parse(body):{};let status=200,data;
  if(path==='/catalogue')data=catalogue;
  else if(path==='/membership/plan')data={amount:12900,days:30};
  else if(path==='/jobs')data={items:[],total:0};
  else if(path==='/auth/login')data={access_token:'wp05-synthetic',user};
  else if(req.headers.authorization!=='Bearer wp05-synthetic'){status=401;data={detail:'Sign in required'};}
  else if(path==='/me')data=user;
  else if(path==='/me/membership')data={active:membershipActive,records:[],expires_at:null};
  else if(path===`/services/${service.id}/member-information`){status=membershipActive?200:403;data=membershipActive?{notes:[]}:{detail:'Membership required'};}
  else if(path==='/me/location'){
    if(req.method==='PUT'){saved=input;mutations.push({method:'PUT',input});}
    if(req.method==='DELETE'){saved=null;mutations.push({method:'DELETE'});}
    data={location:saved};
  }
  else if(path===`/services/${service.id}/providers`){providerReads.push(path);data=[];} // Deliberately permissive legacy API: frontend must still gate.
  else if(path===`/services/${service.id}/nearby`){
    searches.push(input);if(input.radius_km===2)await setTimeout(500);
    data={nearby:carouselFixtures?Array.from({length:8},(_,i)=>({...providers[0],id:100+i,company:`Synthetic carousel ${i}`,distance_km:i/10})):input.radius_km===2?[{...providers[0],company:'Stale radius fixture'}]:[providers[0]],also_serves:[providers[1]],distance_kind:'straight-line',page:1,has_more_nearby:false,has_more_also_serves:false};
  }
  else if(path==='/requests'&&req.method==='POST'){enquiries.push(input);data={id:enquiries.length,...input,status:'NEW'};status=201;}
  else {status=404;data={detail:'Synthetic route unavailable'};}
  res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'private, no-store'});res.end(JSON.stringify(data));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const probe=http.createServer();await new Promise(done=>probe.listen(0,'127.0.0.1',done));const port=probe.address().port;await new Promise(done=>probe.close(done));
const base=`http://127.0.0.1:${port}`;const dist=`.next/wp05-${process.pid}`;const originalEnv=readFileSync('next-env.d.ts','utf8');
const artifacts=resolve('../artifacts/wp05');mkdirSync(artifacts,{recursive:true});
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)],{cwd:process.cwd(),env:{...process.env,API_URL:`http://127.0.0.1:${server.address().port}`,ALLOWED_ORIGINS:base,COOKIE_SECURE:'false',TEST_NEXT_DIST_DIR:dist,NEXT_TELEMETRY_DISABLED:'1'},stdio:'ignore',windowsHide:true});
let browser,page;const errors=[],consoleErrors=[];
try{
  let ready=false;for(let n=0;n<100;n++){try{if((await fetch(base+'/login',{signal:AbortSignal.timeout(2000)})).ok){ready=true;break;}}catch{/* Synthetic startup only. */}await setTimeout(500);}if(!ready)throw new Error('Isolated Next did not start');
  browser=await chromium.launch({channel:'chrome',headless:true});
  for(const width of [1440,390]){
    saved=null;membershipActive=true;carouselFixtures=false;searches.length=0;mutations.length=0;providerReads.length=0;
    const context=await browser.newContext({viewport:{width,height:1100}});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
    let gpsCalls=0,externalCalls=0;
    await context.exposeBinding('recordGps',()=>{gpsCalls++;});
    await context.addInitScript(()=>{Object.defineProperty(globalThis.navigator,'geolocation',{configurable:true,value:{getCurrentPosition(_success,failure){globalThis.recordGps();failure({code:1});}}});});
    await context.route('**/*',async route=>{const url=new URL(route.request().url());if(!['127.0.0.1','localhost'].includes(url.hostname)&&url.protocol!=='data:'){externalCalls++;await route.abort();}else await route.continue();});
    const entryArtifacts=resolve('../artifacts/wp05-entry');mkdirSync(entryArtifacts,{recursive:true});
    const detailPath=`/service/${cat.slug}/service/${service.slug}`;
    // Public chooser is rendered independently of membership, providers or maps.
    for(const [name,path] of [['home','/'],['services','/services'],['detail',detailPath]]){
      await page.goto(base+path);const choose=page.getByRole('button',{name:'Choose your location',exact:true});
      await expect(choose).toBeVisible();await expect(choose).toBeInViewport();expect(gpsCalls).toBe(0);
      await expect(page.getByRole('search')).toBeVisible();
      if(name==='home'){
        await expect(page.locator('.compact-category')).toHaveCount(catalogue.length);
        await page.getByText('Provider access and review',{exact:true}).click();
        await expect(page.getByRole('link',{name:'Existing provider application',exact:true})).toBeVisible();
        await page.getByText('Provider access and review',{exact:true}).click();
      }
      await page.screenshot({path:join(entryArtifacts,`source-${name}-${width}.png`),fullPage:true,caret:'initial'});
      await choose.click();await expect(page.getByLabel('Locality',{exact:true})).toBeVisible();
      await expect(page.getByText('Live map tiles and address lookup are unavailable',{exact:false})).toBeVisible();
      await expect(page.locator('.leaflet-container,.business-marker,.provider-card,form textarea[name="requirements"]')).toHaveCount(0);
      expect(providerReads).toHaveLength(0);expect(searches).toHaveLength(0);expect(mutations).toHaveLength(0);
      expect(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth+1)).toBe(true);
    }
    await page.goto(base+'/');await page.getByRole('button',{name:'Choose your location',exact:true}).click();
    await page.getByRole('button',{name:'Use my location',exact:true}).click();await expect(page.getByText('GPS was denied or unavailable.',{exact:false})).toBeVisible();expect(gpsCalls).toBe(1);
    await page.getByLabel('Locality',{exact:true}).fill('Public fixture area');await page.getByLabel('PIN code',{exact:true}).fill('560001');
    await page.getByLabel('Search latitude',{exact:true}).fill('12');await page.getByLabel('Search longitude',{exact:true}).fill('77');
    await page.getByRole('button',{name:'Use this location',exact:true}).click();await page.getByLabel('Search radius',{exact:true}).selectOption('25');
    await expect(page.getByText('Location is temporary unless you choose Save this location.',{exact:true})).toBeVisible();expect(saved).toBeNull();
    await page.getByRole('button',{name:'Save this location',exact:true}).click();await expect(page.getByText('Sign in to save this location.',{exact:false})).toBeVisible();expect(saved).toBeNull();
    await page.getByRole('link',{name:'Find a service',exact:true}).click();await expect(page).toHaveURL(base+'/services');
    await expect(page.locator('.location-entry-heading')).toContainText('Public fixture area');await expect(page.locator('.location-entry-heading')).toContainText('25 km');
    await page.locator(`main a[href="/service/${cat.slug}"]`).first().click();await expect(page.getByRole('button',{name:'Choose your location',exact:true})).toBeVisible();
    await page.locator(`main a[href="${detailPath}"]`).first().click();await expect(page).toHaveURL(base+detailPath);await expect(page.locator('.location-entry-heading')).toContainText('Public fixture area');
    expect(new URL(page.url()).search).toBe('');expect(providerReads).toHaveLength(0);expect(searches).toHaveLength(0);expect(mutations).toHaveLength(0);
    await page.getByRole('button',{name:'Choose your location',exact:true}).click();await page.getByRole('button',{name:'Clear location',exact:true}).click();
    await expect(page.getByText('Temporary location cleared.',{exact:true})).toBeVisible();await expect(page.locator('.location-entry-heading')).not.toContainText('Public fixture area');

    // A signed-in nonmember can choose an area without gaining provider access.
    membershipActive=false;await context.addCookies([{name:'vistrah_session',value:'wp05-synthetic',url:base}]);
    await page.goto(base+detailPath);await expect(page.getByRole('button',{name:'Choose your location',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Choose your location',exact:true}).click();await expect(page.getByLabel('Locality',{exact:true})).toBeVisible();
    await expect(page.locator('.leaflet-container,.provider-card,form textarea[name="requirements"]')).toHaveCount(0);
    await page.goto(base+directoryPath);await expect(page.getByRole('heading',{name:'Active membership required',exact:true})).toBeVisible();
    await expect(page.locator('.leaflet-container,.business-marker,.provider-card')).toHaveCount(0);expect(providerReads).toHaveLength(0);expect(searches).toHaveLength(0);
    await page.goto(base+requestPath);await expect(page.getByRole('heading',{name:'Active membership required',exact:true})).toBeVisible();await expect(page.locator('form textarea[name="requirements"]')).toHaveCount(0);
    await context.clearCookies();membershipActive=true;gpsCalls=0;
    await page.goto(base+directoryPath);await expect(page.getByRole('heading',{name:'Sign in to continue',exact:true})).toBeVisible();
    await page.goto(base+'/login?next='+encodeURIComponent(directoryPath));await page.getByLabel('Email address',{exact:true}).fill('fixture@example.com');await page.getByLabel('Password',{exact:true}).fill('synthetic-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(base+directoryPath);
    await expect(page.locator('.leaflet-container')).toBeVisible();expect(gpsCalls).toBe(0);expect(searches).toHaveLength(0);expect(mutations).toHaveLength(0);
    await page.getByRole('button',{name:'Use my location',exact:true}).click();await expect(page.getByText('GPS was denied or unavailable.',{exact:false})).toBeVisible();expect(gpsCalls).toBe(1);
    await page.evaluate(()=>{globalThis.navigator.geolocation.getCurrentPosition=success=>{globalThis.recordGps();success({coords:{latitude:12,longitude:77,accuracy:1200}});};});
    await page.getByRole('button',{name:'Use my location',exact:true}).click();await expect(page.getByText('This position may be inaccurate.',{exact:false})).toBeVisible();expect(searches).toHaveLength(0);
    await page.getByLabel('Locality',{exact:true}).fill('Fixture locality');await page.getByLabel('PIN code',{exact:true}).fill('560001');await page.getByLabel('Manual address',{exact:true}).fill('Private address never in enquiry');await page.getByLabel('Landmark',{exact:true}).fill('Private landmark');
    await page.getByRole('button',{name:'Use this location',exact:true}).click();await expect(page.getByRole('heading',{name:'Nearby providers',exact:true})).toBeVisible();expect(saved).toBeNull();expect(mutations).toHaveLength(0);
    await expect(page.getByRole('heading',{name:'Also serves your area',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Show Synthetic Nearby on map',exact:true}).click();await expect(page.locator('#nearby-provider-71')).toHaveAttribute('aria-current','true');await expect(page.locator('.selected-marker')).toHaveCount(1);
    await page.getByTitle('Synthetic Farther',{exact:true}).click();await expect(page.locator('#nearby-provider-72')).toHaveAttribute('aria-current','true');
    const beforePan=searches.length;await page.locator('.leaflet-container').focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(350);expect(searches).toHaveLength(beforePan);
    await page.getByRole('button',{name:'Search this area',exact:true}).click();await expect.poll(()=>searches.length).toBe(beforePan+1);
    const beforeManual=searches.length;await page.locator('.leaflet-container').click({position:{x:70,y:80}});await page.waitForTimeout(200);expect(searches).toHaveLength(beforeManual);
    await page.getByLabel('Search latitude',{exact:true}).fill('12');await page.getByLabel('Search longitude',{exact:true}).fill('77');await page.getByRole('button',{name:'Use this location',exact:true}).click();await expect.poll(()=>searches.length).toBe(beforeManual+1);
    await page.getByLabel('Search radius',{exact:true}).selectOption('2');await expect.poll(()=>searches.at(-1).radius_km).toBe(2);await page.getByLabel('Search radius',{exact:true}).selectOption('25');await expect.poll(()=>searches.at(-1).radius_km).toBe(25);await page.waitForTimeout(650);await expect(page.getByText('Stale radius fixture',{exact:true})).toHaveCount(0);
    await page.getByRole('button',{name:'Save this location',exact:true}).click();await expect(page.getByText('Location saved to your account.',{exact:false})).toBeVisible();expect(saved.latitude).toBe(12);
    await page.getByLabel('Search latitude',{exact:true}).fill('12.02');await page.getByRole('button',{name:'Use this location',exact:true}).click();await expect.poll(()=>searches.at(-1).latitude).toBe(12.02);expect(saved.latitude).toBe(12); // Change remains temporary.
    await page.screenshot({path:join(artifacts,`location-${width}.png`),fullPage:true,caret:'initial'});expect(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth+1)).toBe(true);
    await page.getByRole('button',{name:'Clear location',exact:true}).click();await expect(page.getByText('Saved and temporary locations cleared.',{exact:false})).toBeVisible();expect(saved).toBeNull();await expect(page.locator('#nearby-provider-71')).toHaveCount(0);
    await page.goto(base+requestPath);await page.getByRole('textbox',{name:/Your requirements/}).fill('Synthetic service enquiry with only locality and PIN.');await page.getByLabel('Locality',{exact:true}).fill('Fixture locality');await page.getByLabel('Enquiry PIN code',{exact:true}).fill('560001');await page.getByLabel('Exact service address (optional)',{exact:true}).fill('Unconsented address');
    const phone=page.getByRole('textbox',{name:/Contact number/});await phone.fill('abcdefghij');expect(await phone.evaluate(input=>input.validity.patternMismatch)).toBe(true);await phone.fill('1234567890');
    await page.getByRole('button',{name:'Submit requirement',exact:true}).click();await expect(page.getByText('One step closer.',{exact:true})).toBeVisible();expect(enquiries.at(-1).service_address).toBeNull();expect(enquiries.at(-1)).not.toHaveProperty('latitude');
    await page.goto(base+requestPath);await page.getByRole('textbox',{name:/Your requirements/}).fill('Synthetic enquiry with explicitly shared exact address.');await page.getByLabel('Locality',{exact:true}).fill('Fixture locality');await page.getByLabel('Exact service address (optional)',{exact:true}).fill('Explicit address');await page.getByLabel('Share the exact service address supplied below for this request',{exact:true}).check();await page.getByRole('button',{name:'Submit requirement',exact:true}).click();await expect(page.getByText('One step closer.',{exact:true})).toBeVisible();expect(enquiries.at(-1).service_address).toBe('Explicit address');
    // Homepage reuses the member-only coverage query, with native horizontal cards.
    carouselFixtures=true;await page.goto(base+'/');
    await expect(page.locator('h1')).toHaveText('Discover services.Offer your expertise.');
    await expect(page.getByText('No affiliate brands or links are configured.',{exact:false})).toBeVisible();
    expect(await page.getByRole('region',{name:'Affiliate brands',exact:true}).locator('a').count()).toBe(0);
    const homeNearby=page.getByRole('region',{name:'Services Near You',exact:true});
    await homeNearby.getByLabel('Choose a service',{exact:true}).selectOption(String(service.id));
    await homeNearby.getByLabel('Locality',{exact:true}).fill('Fixture locality');
    await homeNearby.getByLabel('Search latitude',{exact:true}).fill('12');await homeNearby.getByLabel('Search longitude',{exact:true}).fill('77');
    await homeNearby.getByRole('button',{name:'Use this location',exact:true}).click();
    const track=homeNearby.getByRole('region',{name:'Nearby providers',exact:true});
    await expect(track.locator('.provider-card')).toHaveCount(8);
    const next=homeNearby.getByRole('button',{name:'Next Nearby providers',exact:true});
    await expect(next).toBeEnabled();await next.focus();await page.keyboard.press('Enter');
    await expect.poll(()=>track.evaluate(element=>element.scrollLeft)).toBeGreaterThan(100);
    const previous=homeNearby.getByRole('button',{name:'Previous Nearby providers',exact:true});await expect(previous).toBeEnabled();
    const forwardPosition=await track.evaluate(element=>element.scrollLeft);
    await page.emulateMedia({reducedMotion:'reduce'});await previous.click();await expect.poll(()=>track.evaluate(element=>element.scrollLeft)).toBeLessThan(forwardPosition);
    expect(await track.evaluate(element=>globalThis.getComputedStyle(element).scrollSnapType)).toBe('none');
    const backwardPosition=await track.evaluate(element=>element.scrollLeft);
    await track.focus();await page.keyboard.press('ArrowRight');await expect.poll(()=>track.evaluate(element=>element.scrollLeft)).toBeGreaterThan(backwardPosition);
    expect(await track.evaluate(element=>globalThis.getComputedStyle(element).overflowX)).toBe('auto');
    expect(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth+1)).toBe(true);
    await page.screenshot({path:join(artifacts,`homepage-carousel-${width}.png`),fullPage:true,caret:'initial'});
    membershipActive=false;const beforeDenied=searches.length;await page.goto(base+'/');
    await expect(page.getByRole('region',{name:'Services Near You',exact:true}).getByRole('heading',{name:'Active membership required',exact:true})).toBeVisible();
    await expect(page.locator('.leaflet-container,.provider-card,#nearby-service')).toHaveCount(0);expect(searches).toHaveLength(beforeDenied);
    if(width===1440){await page.setViewportSize({width:768,height:1100});await expect(page.getByRole('button',{name:'Choose your location',exact:true})).toBeInViewport();expect(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth<=globalThis.innerWidth+1)).toBe(true);}
    expect(externalCalls).toBe(0);await context.close();
  }
  expect(errors).toEqual([]);
  // CSP intentionally forbids development eval debugging. Anonymous /me denial
  // is also expected; all other console errors must fail this isolated check.
  expect(consoleErrors.filter(message=>!message.startsWith('eval() is not supported in this environment.')&&!message.includes('status of 401 (Unauthorized)')&&!message.includes('status of 403 (Forbidden)'))).toEqual([]);
  console.log('WP05 browser passed at 1440/390px: approved homepage messaging, affiliate empty state, member-only nearby carousel keyboard/previous/next/reduced-motion/overflow checks; public homepage/services/detail chooser, anonymous/nonmember membership guards, navigation memory, explicit GPS/denial/inaccuracy, manual selection, temporary/save/change/clear, pan versus Search this area, pin/tile synchronization, stale radius response, enquiry consent and zero external map/geocoder requests.');
}catch(error){console.error(error.message);if(page&&!page.isClosed()){console.error(await page.locator('h1,h2,.notice.error').allTextContents());await page.screenshot({path:join(artifacts,'diagnostic.png'),fullPage:true,caret:'initial'});}process.exitCode=1;}
finally{
  await browser?.close();if(child.pid)await new Promise(done=>{const stop=spawn(join(process.env.SystemRoot||'C:\\Windows','System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});stop.on('exit',done);stop.on('error',()=>{child.kill();done();});});
  server.closeAllConnections();await new Promise(done=>server.close(done));
  if(readFileSync('next-env.d.ts','utf8').includes(dist))writeFileSync('next-env.d.ts',originalEnv);
  const config=JSON.parse(readFileSync('tsconfig.json','utf8'));config.include=config.include.filter(value=>!value.startsWith(dist+'/'));writeFileSync('tsconfig.json',JSON.stringify(config,null,2)+'\n');
}
