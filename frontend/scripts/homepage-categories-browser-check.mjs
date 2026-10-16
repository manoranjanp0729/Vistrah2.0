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
const root=fileURLToPath(new URL('../../',import.meta.url)),output=path.join(root,'artifacts/homepage-categories-clean');mkdirSync(output,{recursive:true});
const servers=[],report={passed:false,checks:[],screenshots:[],runtimeErrors:[],mutationAttempts:[]};let browser,web;
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>{servers.push(server);resolve(server.address().port);}));
async function freePort(){const server=http.createServer();const port=await listen(server);await new Promise(resolve=>server.close(resolve));return port;}
const api=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');if(req.method!=='GET'){report.mutationAttempts.push(req.url);res.statusCode=405;}res.end(req.url==='/catalogue'?'[]':'{}');});
const expo=http.createServer((req,res)=>{const dir=path.join(output,'expo-web'),pathname=new URL(req.url,'http://localhost').pathname.replace(/^\/app(?=\/|$)/,'')||'/';let target=path.resolve(dir,'.'+decodeURIComponent(pathname));if(!target.startsWith(dir+path.sep)||!existsSync(target)||!path.extname(target))target=path.join(dir,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.webp':'image/webp','.png':'image/png','.ttf':'font/ttf','.css':'text/css','.json':'application/json','.ico':'image/x-icon'})[path.extname(target)]??'application/octet-stream');try{res.end(readFileSync(target));}catch{res.statusCode=404;res.end();}});
async function ready(url){for(let i=0;i<100;i++){try{if((await globalThis.fetch(url)).ok)return;}catch{/* Preview starting. */}if(web.exitCode!==null)throw Error('Preview exited');await setTimeout(200);}throw Error('Preview timed out');}
try{
 const apiPort=await listen(api),expoPort=await listen(expo),webPort=await freePort();
 web=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(webPort)],{cwd:path.join(root,'frontend'),env:{...process.env,API_URL:'http://127.0.0.1:'+apiPort,TEST_NEXT_DIST_DIR:'.next-homepage-categories-clean',NODE_ENV:'production'},stdio:['ignore','pipe','pipe']});let log='';web.stdout.on('data',d=>log+=d);web.stderr.on('data',d=>log+=d);web.on('exit',()=>writeFileSync(path.join(output,'web.log'),log));await ready('http://127.0.0.1:'+webPort+'/membership');
 browser=await chromium.launch({channel:'chrome',headless:true});
 const taxonomy=JSON.parse(readFileSync(path.join(root,'shared/marketplace-taxonomy.json'),'utf8')).categories;
 for(const native of [false,true])for(const width of [320,390,430,1440]){
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<768,isMobile:width<768,reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>report.runtimeErrors.push(e.message));
  await context.route('**/api/**',async route=>{if(route.request().method()!=='GET'){report.mutationAttempts.push(route.request().url());return route.abort();}return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(new URL(route.request().url()).pathname.endsWith('/catalogue')?[]:{version:null})});});
  const client=native?'expo':'website',base='http://127.0.0.1:'+(native?expoPort:webPort)+(native?'/app':'');
  await page.goto(base+'/');await expect(page.getByText(/Opening your next possibilities/)).toBeHidden({timeout:15000});
  const section=native?page.getByTestId('homepage-categories'):page.locator('.homepage-categories');await expect(section.getByRole('heading',{name:'Services for you',exact:true})).toBeVisible();
  const viewAll=section.getByRole(native?'button':'link',{name:/^View all/});await expect(viewAll).toBeVisible();
  const rail=native?section.getByTestId('photo-rail-Marketplace categories'):section.locator('[data-photo-rail="Marketplace categories"]');const cards=rail.getByRole('link');await expect(cards).toHaveCount(14);await expect(page.getByText(/Opening your next possibilities/)).toBeHidden({timeout:15000});assert.deepEqual(await cards.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))),taxonomy.map(c=>c.title));
  const text=await section.textContent();assert(!/\d+ categories|\d+ subcategories|listing types|Swipe or use arrows/.test(text));
  const heading=await section.getByRole('heading',{name:'Services for you',exact:true}).boundingBox(),action=await viewAll.boundingBox();assert(action.x>=heading.x+heading.width-1,'View all must remain right aligned');assert(Math.abs((heading.y+heading.height/2)-(action.y+action.height/2))<12,'Heading and action should align');
  const scrollTarget=()=>rail.evaluateHandle(element=>[element,...element.querySelectorAll('*')].find(n=>n.scrollWidth>n.clientWidth+2&&['auto','scroll'].includes(n.ownerDocument.defaultView.getComputedStyle(n).overflowX)));
  const target=await scrollTarget();const overflow=await target.evaluate(n=>Boolean(n));
  if(width<768){await expect(rail.getByRole('button')).toBeHidden();await rail.scrollIntoViewIfNeeded();const bounds=await rail.boundingBox();const session=await context.newCDPSession(page);const x=Math.round(bounds.x+bounds.width-25),y=Math.round(bounds.y+75);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let step=1;step<=12;step++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-step*18,y}]});await setTimeout(20);}await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();await expect.poll(()=>target.evaluate(n=>n.scrollLeft)).toBeGreaterThan(1);}
  else if(overflow){const next=rail.getByRole('button',{name:/^Next /});await expect(next).toBeVisible();await next.click();await expect.poll(()=>target.evaluate(n=>n.scrollLeft)).toBeGreaterThan(1);}
  if(overflow)await target.evaluate(n=>n.scrollTo({left:0,behavior:'instant'}));
  for(const card of await cards.all()){await card.scrollIntoViewIfNeeded();const image=card.locator('img');await expect.poll(()=>image.evaluate(n=>n.complete&&n.naturalWidth>0)).toBe(true);const bounds=await card.boundingBox();assert(Math.abs(bounds.width-148)<1&&Math.abs(bounds.height-168)<1);const href=await card.getAttribute('href');if(!native)assert(href?.includes('/services?category='));}
  if(overflow)await target.evaluate(n=>n.scrollTo({left:0,behavior:'instant'}));await section.scrollIntoViewIfNeeded();const screenshot=client+'-services-for-you-'+width+'.png';await section.screenshot({path:path.join(output,screenshot)});report.screenshots.push(screenshot);
  assert(await page.locator('body').evaluate(n=>n.scrollWidth<=n.ownerDocument.defaultView.innerWidth+1));await cards.first().click();await expect(page).toHaveURL(/category=food-and-dining/);await page.goBack();await expect(section.getByRole('heading',{name:'Services for you',exact:true})).toBeVisible();await viewAll.click();await expect(page).toHaveURL(base+'/services');await expect(page.getByText(/14 categories/).first()).toBeVisible();
  report.checks.push(`${client} ${width}px: clean compact section, 14 ordered photo cards, 148x168 dimensions, right-aligned View all navigation, touch/desktop scrolling and no overflow`);await context.close();
 }
 assert.equal(report.mutationAttempts.length,0);assert.equal(report.runtimeErrors.length,0,JSON.stringify(report.runtimeErrors));report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1;}finally{if(browser)await browser.close();if(web)web.kill();for(const server of servers)server.close();writeFileSync(path.join(output,'browser-result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
