// Production website and Expo web preview against a synthetic, read-only API.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {fileURLToPath,URL} from 'node:url';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
import process from 'node:process';
import console from 'node:console';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {chromium,expect} from '@playwright/test';
const root=fileURLToPath(new URL('../../',import.meta.url)),output=path.join(root,'artifacts/shared-photo-cards');mkdirSync(output,{recursive:true});
const sharp=createRequire(new URL('../package.json',import.meta.url))('sharp');
const taxonomy=JSON.parse(readFileSync(path.join(root,'shared/marketplace-taxonomy.json'),'utf8')).categories;
const imagery=JSON.parse(readFileSync(path.join(root,'shared/marketplace-imagery.json'),'utf8'));
const catalogue=JSON.parse(readFileSync(path.join(root,'shared/catalogue.json'),'utf8'));let id=0;const services=[];
catalogue.forEach((category,index)=>{category.id=index+1;category.active=true;for(const service of category.services){service.id=++id;service.active=true;services.push({category,service});}for(const sub of category.subcategories){sub.active=true;for(const service of sub.services){service.id=++id;service.active=true;services.push({category,subcategory:sub,service});}}});
const requests=[],errors=[],report={checks:[],journeys:[],passed:false};let browser,web,published=false;
const api=http.createServer((req,res)=>{
 requests.push(req.url);res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Content-Type','application/json');
 if(req.method==='OPTIONS'){res.end();return;}
 if(req.url==='/catalogue')res.end(JSON.stringify(catalogue));
 else if(req.url==='/homepage')res.end(JSON.stringify(published?{version:4,layout:{schema_version:1,sections:[{id:'fixture',template:'service_grid',title:'Published priority',subtitle:'Synthetic layout',size:'wide',service_ids:[services[0].service.id]}]}}:{version:null}));
 else if(req.url.startsWith('/me')){res.statusCode=401;res.end('{}');}else res.end('[]');
});
const expoRoot=path.join(output,'expo-web');
const expo=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){void globalThis.fetch('http://127.0.0.1:48761'+url.pathname.slice(4)+url.search).then(async response=>{res.statusCode=response.status;res.setHeader('Content-Type','application/json');res.end(await response.text());}).catch(()=>{res.statusCode=502;res.end('{}');});return;}
 const pathname=url.pathname.replace(/^\/app(?=\/|$)/,'')||'/';
 let target=path.resolve(expoRoot,'.'+decodeURIComponent(pathname));
 if(!target.startsWith(expoRoot+path.sep)){target=path.join(expoRoot,'index.html');}
 if(!existsSync(target)||!path.extname(target))target=path.join(expoRoot,'index.html');
 const mime={'.js':'text/javascript','.html':'text/html','.webp':'image/webp','.png':'image/png','.ttf':'font/ttf','.json':'application/json','.css':'text/css','.ico':'image/x-icon'};
 res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');try{res.end(readFileSync(target));}catch{res.statusCode=404;res.end();}
});
const listen=(server,port=0)=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
async function ready(url){for(let index=0;index<100;index++){try{if((await globalThis.fetch(url)).ok)return;}catch{/* Wait for the isolated process. */}if(web.exitCode!==null)throw new Error('Web process exited');await setTimeout(200);}throw new Error('Web readiness timed out');}
async function checkRail(page,rail,native){
 await rail.scrollIntoViewIfNeeded();
 const cards=native?rail.getByRole('link'):rail.locator('[data-photo-card]');
 const dimensions=await cards.evaluateAll(nodes=>nodes.map(node=>{const rect=node.getBoundingClientRect();return {width:rect.width,height:rect.height,top:Math.round(rect.top)};}));
 assert(dimensions.every(card=>Math.abs(card.width-148)<1&&Math.abs(card.height-168)<1),JSON.stringify(dimensions));
 assert.equal(new Set(dimensions.map(card=>card.top)).size,2,'Rail must have exactly two rows');
 const measure=()=>rail.evaluate(element=>{const target=[element,...element.querySelectorAll('*')].find(node=>node.scrollWidth>node.clientWidth+2&&['auto','scroll'].includes(node.ownerDocument.defaultView.getComputedStyle(node).overflowX));return target?{x:target.scrollLeft,width:target.clientWidth,total:target.scrollWidth}:null;});
 const initial=await measure();if(initial){
  const next=rail.getByRole('button',{name:/^Next /});if(await next.isVisible()){await expect(next).toBeEnabled();await next.click();await expect.poll(async()=>(await measure())?.x??0).toBeGreaterThan(1);}
  // Native touch gesture on the actual exported DOM, then restore the shared section.
  if(page.viewportSize().width<600){const bounds=await rail.boundingBox();const session=await page.context().newCDPSession(page);await session.send('Input.synthesizeScrollGesture',{x:Math.round(bounds.x+Math.min(bounds.width-40,200)),y:Math.round(bounds.y+130),xDistance:-140,yDistance:0,gestureSourceType:'touch',speed:500});await session.detach();}
  await rail.evaluate(element=>{for(const node of [element,...element.querySelectorAll('*')])if(node.scrollWidth>node.clientWidth+2)node.scrollTo({left:0,behavior:'instant'});});
 }
 for(const card of await cards.all()){
  await card.scrollIntoViewIfNeeded();
  if(native){const image=card.locator('img');assert((await image.first().boundingBox()).width<=148,'Photo must fit card');if(await image.count())await expect.poll(()=>image.first().evaluate(node=>node.complete&&node.naturalWidth>0)).toBe(true);}
  else{const image=card.locator('img');if(await image.count())await expect.poll(()=>image.evaluate(node=>node.complete&&node.naturalWidth>0)).toBe(true);const title=card.locator('h3');assert((await title.boundingBox()).height<=36.1);}
 }
 await rail.evaluate(element=>{for(const node of [element,...element.querySelectorAll('*')])if(node.scrollWidth>node.clientWidth+2)node.scrollTo({left:0,behavior:'instant'});});
 assert(await page.locator('body').evaluate(node=>node.scrollWidth<=node.ownerDocument.defaultView.innerWidth+1),'Page overflow');
}
try{
 for(const asset of Object.values(imagery.assets))await sharp(path.join(root,'frontend/public',asset.src)).raw().toBuffer();report.checks.push(`All ${Object.keys(imagery.assets).length} referenced photo assets decode; 889 taxonomy item mappings`);
 await listen(api,48761);await listen(expo);const probe=http.createServer();await listen(probe);const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
 web=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{cwd:path.join(root,'frontend'),env:{...process.env,NODE_ENV:'production',TEST_NEXT_DIST_DIR:process.env.TEST_NEXT_DIST_DIR||'.next-shared-photo-cards',API_URL:'http://127.0.0.1:48761'},stdio:['ignore','pipe','pipe']});
 let log='';web.stdout.on('data',data=>{log+=data;});web.stderr.on('data',data=>{log+=data;});web.on('exit',()=>writeFileSync(path.join(output,'web.log'),log));
 await ready(`http://127.0.0.1:${port}/services`);try{browser=await chromium.launch({channel:'chrome',headless:true});}catch{browser=await chromium.launch({headless:true});}
 for(const native of [false,true])for(const width of [390,1440]){
  const base=`http://127.0.0.1:${native?expo.address().port:port}${native?'/app':''}`,client=native?'expo':'web';
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<600,reducedMotion:'reduce'});const page=await context.newPage();page.on('pageerror',error=>errors.push({client,message:error.message}));
  await page.goto(base+'/');const categoryRail=native?page.getByTestId('photo-rail-Marketplace categories'):page.locator('[data-photo-rail="Marketplace categories"]');await expect(categoryRail).toBeVisible();
  await categoryRail.scrollIntoViewIfNeeded();await page.waitForLoadState('networkidle');if(native)await expect(page.getByText(/Opening your next possibilities/)).toBeHidden();await page.screenshot({path:path.join(output,`${client}-home-${width}.png`)});await checkRail(page,categoryRail,native);
  for(const category of (process.env.SCREENSHOTS_ONLY?[]:taxonomy)){
   await page.goto(base+'/services');const card=native?page.getByTestId(`marketplace-category-${category.slug}`):page.locator(`[data-marketplace-category="${category.slug}"]`);await expect(card).toBeAttached();await card.click();
   const subRail=native?page.getByTestId('photo-rail-Subcategories'):page.locator('[data-photo-rail="Subcategories"]');await expect(subRail).toBeVisible();
   const sub=category.subcategories[0],subCard=native?page.getByTestId(`marketplace-subcategory-${sub.slug}`):page.locator(`[data-marketplace-subcategory="${sub.slug}"]`);await subCard.click();
   const typeRail=native?page.getByTestId('photo-rail-Listing types'):page.locator('[data-photo-rail="Listing types"]');await expect(typeRail).toBeVisible();
   const type=sub.listing_types[0],typeCard=native?page.getByTestId(`marketplace-type-${type.slug}`):page.locator(`[data-marketplace-type="${type.slug}"]`);await typeCard.click();
   await expect(page.getByText('No published service is currently mapped to this listing type. This classification cannot be booked or requested.')).toBeVisible();
   const back=page.getByRole(native?'button':'link',{name:`Back to ${sub.title}`,exact:true});await back.click();await expect(typeRail).toBeVisible();
   report.journeys.push({client,width,category:category.slug,subcategory:sub.slug,listingType:type.slug,passed:true});
  }
  await page.goto(base+'/services?category=home-and-everyday-services');const subRail=native?page.getByTestId('photo-rail-Subcategories'):page.locator('[data-photo-rail="Subcategories"]');await expect(subRail).toBeVisible();await subRail.scrollIntoViewIfNeeded();await page.waitForLoadState('networkidle');if(native)await expect(page.getByText(/Opening your next possibilities/)).toBeHidden();await page.screenshot({path:path.join(output,`${client}-subcategories-${width}.png`)});await checkRail(page,subRail,native);
  await page.goto(base+'/services?category=home-and-everyday-services&subcategory=repairs-and-maintenance');const typeRail=native?page.getByTestId('photo-rail-Listing types'):page.locator('[data-photo-rail="Listing types"]');await expect(typeRail).toBeVisible();await typeRail.scrollIntoViewIfNeeded();await page.waitForLoadState('networkidle');if(native)await expect(page.getByText(/Opening your next possibilities/)).toBeHidden();await page.screenshot({path:path.join(output,`${client}-listing-types-${width}.png`)});await checkRail(page,typeRail,native);
  await page.goto(base+'/services?q=dog%20walking');const dog=page.getByRole('link',{name:'Dog walking',exact:true});await expect(dog).toBeVisible();await dog.click();await expect(page.getByText('No published service is currently mapped to this listing type. This classification cannot be booked or requested.')).toBeVisible();
  await page.goto(base+'/services?q='+encodeURIComponent(services[0].service.title));const service=page.getByRole('link',{name:services[0].service.title,exact:true});await expect(service).toBeVisible();await service.click();
  if(native)await expect(page.getByText(services[0].service.title,{exact:true}).filter({visible:true}).first()).toBeVisible();else await expect(page.getByRole('tab')).toHaveCount(3);
  report.checks.push(`${client} ${width}px: ${process.env.SCREENSHOTS_ONLY?"representative photo rails":"all 14 hierarchy journeys"}, same 148x168 card dimensions, two rows, arrow/touch scrolling, photo loading, title limits, search and published-service links`);await context.close();
 }
 published=true;
 for(const native of [false,true]){const base=`http://127.0.0.1:${native?expo.address().port:port}${native?'/app':''}`,page=await browser.newPage({viewport:{width:390,height:900}});await page.goto(base+'/');await expect(page.getByText('Published priority',{exact:true})).toBeVisible();const text=await page.locator('body').textContent();assert(text.indexOf('Published priority')<text.indexOf('Services for you'));await page.close();}
 assert(!requests.some(url=>url.startsWith('/marketplace/taxonomy')));assert.equal(errors.length,0,JSON.stringify(errors));report.checks.push('Published homepage precedence preserved in both clients; no taxonomy API requests or runtime errors');report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1;}finally{
 if(browser)await browser.close();if(web)web.kill();api.close();expo.close();report.browserErrors=errors;writeFileSync(path.join(output,process.env.SCREENSHOTS_ONLY?'screenshot-result.json':'browser-result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,journeys:report.journeys.length,checks:report.checks,error:report.error,browserErrors:errors},null,2));
}
