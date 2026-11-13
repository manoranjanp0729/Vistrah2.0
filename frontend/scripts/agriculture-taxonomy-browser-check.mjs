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
const root=fileURLToPath(new URL('../../',import.meta.url)),output=path.join(root,'artifacts/agriculture-photos');mkdirSync(output,{recursive:true});
const servers=[],report={passed:false,checks:[],screenshots:[],runtimeErrors:[],mutationAttempts:[]};let browser,web;
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>{servers.push(server);resolve(server.address().port);}));
async function freePort(){const server=http.createServer();const port=await listen(server);await new Promise(resolve=>server.close(resolve));return port;}
const api=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');if(req.method!=='GET'){report.mutationAttempts.push(req.url);res.statusCode=405;}res.end(req.url==='/catalogue'?'[]':'{}');});
const expo=http.createServer((req,res)=>{const dir=path.join(output,'expo-web'),pathname=new URL(req.url,'http://localhost').pathname.replace(/^\/app(?=\/|$)/,'')||'/';let target=path.resolve(dir,'.'+decodeURIComponent(pathname));if(!target.startsWith(dir+path.sep)||!existsSync(target)||!path.extname(target))target=path.join(dir,'index.html');res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.webp':'image/webp','.png':'image/png','.ttf':'font/ttf','.css':'text/css','.json':'application/json','.ico':'image/x-icon'})[path.extname(target)]??'application/octet-stream');try{res.end(readFileSync(target));}catch{res.statusCode=404;res.end();}});
async function ready(url){for(let i=0;i<100;i++){try{if((await globalThis.fetch(url)).ok)return;}catch{/* Preview starting. */}if(web.exitCode!==null)throw Error('Preview exited');await setTimeout(200);}throw Error('Preview timed out');}
try{
 const apiPort=await listen(api),expoPort=await listen(expo),webPort=await freePort();
 web=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(webPort)],{cwd:path.join(root,'frontend'),env:{...process.env,API_URL:'http://127.0.0.1:'+apiPort,TEST_NEXT_DIST_DIR:'.next-agriculture-photos',NODE_ENV:'production'},stdio:['ignore','pipe','pipe']});let log='';web.stdout.on('data',d=>log+=d);web.stderr.on('data',d=>log+=d);web.on('exit',()=>writeFileSync(path.join(output,'web.log'),log));await ready('http://127.0.0.1:'+webPort+'/membership');
 browser=await chromium.launch({channel:'chrome',headless:true});
 const agriculture=JSON.parse(readFileSync(path.join(root,'shared/marketplace-taxonomy.json'),'utf8')).categories.at(-1);
 async function loaded(card){await expect(card.page().getByText(/Opening your next possibilities/)).toBeHidden({timeout:15000});await card.scrollIntoViewIfNeeded();const image=card.locator('img');await expect(image).toHaveCount(1);await expect.poll(()=>image.evaluate(node=>node.complete&&node.naturalWidth>0)).toBe(true);}
 async function capture(card,name){await card.screenshot({path:path.join(output,name)});report.screenshots.push(name);}
 for(const native of [false,true])for(const width of [320,390,430,1440]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>report.runtimeErrors.push(e.message));
  await context.route('**/api/**',async route=>{if(route.request().method()!=='GET'){report.mutationAttempts.push(route.request().url());return route.abort();}return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(new URL(route.request().url()).pathname.endsWith('/catalogue')?[]:{version:null})});});
  const client=native?'expo':'website',base='http://127.0.0.1:'+(native?expoPort:webPort)+(native?'/app':'');
  await page.goto(base+'/');const main=page.getByRole('link',{name:'Agriculture & Farming',exact:true});await loaded(main);if(width===390||width===1440)await capture(main,client+'-homepage-category-'+width+'.png');await main.click();
  const rail=native?page.getByTestId('photo-rail-Subcategories'):page.locator('[data-photo-rail="Subcategories"]');await expect(rail.getByRole('link')).toHaveCount(9);
  for(const sub of agriculture.subcategories){const card=rail.getByRole('link',{name:sub.title,exact:true});await loaded(card);if(width===390)await capture(card,client+'-subcategory-'+sub.slug+'.png');}
  assert(await page.locator('body').evaluate(n=>n.scrollWidth<=n.ownerDocument.defaultView.innerWidth+1));await page.screenshot({path:path.join(output,client+'-agriculture-'+width+'.png')});report.screenshots.push(client+'-agriculture-'+width+'.png');
  for(const sub of agriculture.subcategories){
   await page.goto(base+'/services?category=agriculture-and-farming&subcategory='+sub.slug);const types=native?page.getByTestId('photo-rail-Listing types'):page.locator('[data-photo-rail="Listing types"]');await expect(types.getByRole('link')).toHaveCount(6);
   for(const type of sub.listing_types){const card=types.getByRole('link',{name:type.title,exact:true});await loaded(card);if(type===sub.listing_types[0]&&width===390)await capture(card,client+'-listing-'+type.slug+'.png');}
   if(width===390){await types.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,client+'-listing-panel-'+sub.slug+'.png')});report.screenshots.push(client+'-listing-panel-'+sub.slug+'.png');}
   const first=sub.listing_types[0];await types.getByRole('link',{name:first.title,exact:true}).click();await expect(page.getByText('No published service is currently mapped to this listing type. This classification cannot be booked or requested.')).toBeVisible();await loaded(page.getByRole('link',{name:first.title,exact:true}));
   assert(await page.locator('body').evaluate(n=>n.scrollWidth<=n.ownerDocument.defaultView.innerWidth+1));
  }
  await page.goto(base+'/services?q=tractor%20rental');const result=page.getByRole('link',{name:'Tractor rental',exact:true});await loaded(result);await result.click();await expect(page).toHaveURL(/category=agriculture-and-farming/);
  // Deliberately fail the category photograph: the shared card must display its existing fallback.
  await context.route('**/*',async route=>{const url=decodeURIComponent(route.request().url());if(url.includes('agriculture-category')&&(url.includes('.webp')||url.includes('/_next/image')))return route.abort();return route.fallback();});
  await page.goto(base+'/services');const failed=page.getByRole('link',{name:'Agriculture & Farming',exact:true});await failed.scrollIntoViewIfNeeded();await expect(failed.getByText('Photograph unavailable')).toBeVisible();await expect(failed.locator('img')).toHaveCount(0);
  report.checks.push(`${client} ${width}px: all 64 agricultural photos loaded, homepage/discovery/search/detail paths, nine subcategories, all 54 listing photos, failure fallback, no overflow or published services`);await context.close();
 }
 assert.equal(report.mutationAttempts.length,0);assert.equal(report.runtimeErrors.length,0,JSON.stringify(report.runtimeErrors));report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1;}finally{if(browser)await browser.close();if(web)web.kill();for(const server of servers)server.close();writeFileSync(path.join(output,'browser-result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
