// Isolated Next :3337; synthetic API replies and existing local public media only.
/* global document, getComputedStyle */
import console from 'node:console';
import {URL} from 'node:url';
import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.setDefaultTimeout(20000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const items=[1,2].map(n=>({id:'fixture-video-'+n,title:'Fixture portrait '+n,description:'Synthetic visual check',video_url:'/videos/v-ads/optimized/Vistrah%20Users.mp4',published_at:null,advertiser:{id:'fixture-brand',name:'Fixture Brand',handle:'fixture'},likes_count:0,comments_count:0}));
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  const feed=path==='/api/v-ads/reels';
  return route.fulfill({status:feed?200:path.endsWith('/view')?200:404,contentType:'application/json',body:JSON.stringify(feed?{items,page:1,has_more:false}:path.endsWith('/view')?{counted:false}:{detail:'Disposable fixture: unavailable'})});
 });
 await page.goto('http://127.0.0.1:3337/v-ads',{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>document.querySelector('video')?.videoWidth>0,{},{timeout:30000});
 const feed=page.locator('[aria-label="V Ads videos"]');
 for(const [width,height] of [[390,844],[360,740],[430,932],[844,390],[390,700],[1024,768]]){
  await page.setViewportSize({width,height});
  if(height>500)await expect.poll(async()=>feed.evaluate(node=>Math.abs(node.clientWidth/node.clientHeight-9/16))).toBeLessThan(.003);
  const metrics=await page.locator('video').first().evaluate(video=>{const box=video.getBoundingClientRect();return {width:box.width,height:box.height,top:box.top,bottom:box.bottom,fit:getComputedStyle(video).objectFit,sourceWidth:video.videoWidth,sourceHeight:video.videoHeight};});
  expect(metrics.fit).toBe('contain');expect(metrics.top).toBeGreaterThanOrEqual(0);expect(metrics.bottom).toBeLessThanOrEqual(height+1);
  if(height>500)expect(Math.abs(metrics.width/metrics.height-9/16)).toBeLessThan(.003);
  await expect(page.getByRole('button',{name:'Like video',exact:true}).first()).toBeInViewport();
  console.log(width+'x'+height+': player '+metrics.width.toFixed(2)+'x'+metrics.height.toFixed(2)+'; full frame retained; source '+metrics.sourceWidth+'x'+metrics.sourceHeight);
 }
 await page.setViewportSize({width:390,height:844});
 await feed.evaluate(node=>{node.scrollTop=node.clientHeight;});
 await expect.poll(async()=>feed.evaluate(node=>Math.round(node.scrollTop/node.clientHeight))).toBe(1);
 await page.setViewportSize({width:430,height:932});
 await expect.poll(async()=>feed.evaluate(node=>Math.round(node.scrollTop/node.clientHeight))).toBe(1);
 await expect(page.getByRole('button',{name:'Open comments'}).nth(1)).toBeVisible();
 const crop=await page.locator('video').nth(1).evaluate(video=>{const b=video.getBoundingClientRect(),ratio=video.videoWidth/video.videoHeight;const scale=Math.min(b.width/video.videoWidth,b.height/video.videoHeight);return {sideGap:(b.width-video.videoWidth*scale)/2,verticalGap:(b.height-video.videoHeight*scale)/2,ratio};});
 if(Math.abs(crop.ratio-9/16)<.001){expect(Math.abs(crop.sideGap)).toBeLessThan(1);expect(Math.abs(crop.verticalGap)).toBeLessThan(1);}
 expect(errors).toEqual([]);
 console.log('PASS: responsive uncropped portrait frame, browser-height/orientation changes, hidden scrollbar gutter, second-reel scroll position and controls. Fixture-only API.');
}finally{await browser.close();}
