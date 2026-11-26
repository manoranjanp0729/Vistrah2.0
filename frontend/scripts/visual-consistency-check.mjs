/* global process, URL, document, getComputedStyle, innerWidth, console */
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

// Local source preview only. All browser API requests are intercepted; no account/database writes.
const base=process.env.VISUAL_REVIEW_URL??'http://127.0.0.1:3115';
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Use an isolated local preview');
const output=resolve('../artifacts/visual-consistency');
await mkdir(output,{recursive:true});
const product={id:'visual-review-product',business:'Sample local business',revision:1,kind:'PRODUCT',title:'Sample product',description:'A sample listing used only for local visual verification.',unit_price_paise:125000,currency:'INR',available:true,service_id:null};
const venue={source:'vistrah',id:1,slug:'visual-review-venue',name:'Sample venue',company:'Sample venue',contact_name:'',category_slug:'restaurants-and-dining',business_type:'cafe',service_title:'Cafe',description:'Sample venue for local visual verification.',address:'Sample locality',location:'Bengaluru',latitude:12.9716,longitude:77.5946,distance_km:1,coverage_radius_km:null,verification_status:'VERIFIED',phone:'',whatsapp:'',timings:'',photo_url:null,website_url:null,rating:4.5,user_ratings_total:10};
const results=[];
const failures=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const [width,mode,accent] of [[1440,'light','navy'],[1440,'dark','teal'],[390,'light','navy'],[390,'dark','teal']]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.addCookies([{name:'vistrah_theme',value:mode,url:base},{name:'vistrah_accent',value:accent,url:base}]);
  const page=await context.newPage();
  await page.route('**/api/**',async route=>{
   const request=route.request(),path=new URL(request.url()).pathname;
   assert.equal(request.method(),'GET','Visual review must never submit data');
   if(path.startsWith('/api/commerce/'))return route.fulfill({json:{items:[product],total:1,page:1,page_size:20}});
   if(path==='/api/marketplace/listings')return route.fulfill({json:{items:[venue],total:1,radius_km:5,category:{slug:venue.category_slug,title:'Cafes'},business_type:null}});
   if(path==='/api/me')return route.fulfill({status:401,json:{detail:'Unauthenticated visual review'}});
   return route.fulfill({status:404,json:{detail:'Not configured in visual fixture'}});
  });
  for(const path of ['/products','/vibe-finder','/account']){
   const response=await page.goto(base+path,{waitUntil:'networkidle',timeout:60000});
   assert.equal(response.status(),200,path);
   if(path==='/products')await page.getByRole('heading',{name:'Sample product',exact:true}).waitFor();
   if(path==='/vibe-finder')await page.getByRole('heading',{name:'Sample venue',exact:true}).waitFor();
   const metrics=await page.evaluate(()=>{
    const rgb=v=>v.match(/[\d.]+/g).slice(0,3).map(Number);
    const lum=v=>{const c=rgb(v).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
    const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
    const texts=Array.from(document.querySelectorAll('[data-products-marketplace] article h3,[data-products-marketplace] article strong,[data-products-marketplace] article p,[data-vibe-finder] h3,[data-vibe-finder] [class*="ratingRow"],[data-vibe-finder] label,[data-vibe-finder] [class*="filterLabel"]'));
    const colors=texts.map(el=>{let parent=el,bg='rgba(0, 0, 0, 0)';while(parent&&bg==='rgba(0, 0, 0, 0)'){bg=getComputedStyle(parent).backgroundColor;parent=parent.parentElement;}return {text:el.textContent,ratio:contrast(getComputedStyle(el).color,bg)};});
    const settings=document.querySelector('.standalone-settings button');
    const firstHeading=document.querySelector('main h1');
    const overlaps=settings&&firstHeading?settings.getBoundingClientRect().bottom>firstHeading.getBoundingClientRect().top:false;
    return {overflow:document.documentElement.scrollWidth>innerWidth,headingCount:document.querySelectorAll('main h1').length,settingsVisible:!!settings&&settings.getBoundingClientRect().width>0,settingsOverlap:overlaps,colors};
   });
   const label=`${path.slice(1)}-${width}-${mode}`;
   if(metrics.overflow||!metrics.settingsVisible||metrics.settingsOverlap||metrics.colors.some(x=>x.ratio<4.5))failures.push({label,...metrics});
   await page.screenshot({path:resolve(output,`${label}.png`),fullPage:true});
   results.push({label,...metrics});
  }
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('dialog').waitFor();
  results.push({label:`settings-${width}-${mode}`,opens:true});
  await context.close();
 }
}finally{await browser.close();}
await writeFile(resolve(output,'results.json'),JSON.stringify({sourcePreview:base,fixtureData:true,results,failures},null,2));
console.log(JSON.stringify({checks:results.length,failures},null,2));
assert.equal(failures.length,0,'Visual checks failed; inspect artifacts/visual-consistency/results.json');
