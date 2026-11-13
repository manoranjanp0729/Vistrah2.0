/** Isolated synthetic API and separate Next dev tree; no live mutations. */
/* global window, document, navigator, Event */
import http from 'node:http';
import {URL} from 'node:url';
import {Buffer} from 'node:buffer';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import process from 'node:process';
import console from 'node:console';
import {chromium,expect} from '@playwright/test';
const {fetch,AbortSignal}=globalThis;
const out=resolve('../artifacts/v-ads-phase2-browser');mkdirSync(out,{recursive:true});
const media=readFileSync('public/videos/v-ads/optimized/Vistrah Users.mp4');
const advertiser={id:'advertiser',name:'Synthetic advertiser',handle:'synthetic',description:'Synthetic advertiser profile',status:'APPROVED'};
const reel={id:'video',title:'Approved fixture video',description:'Approved fixture description',video_url:'/v-ads/media/media',published_at:'2026-10-19T00:00:00Z',advertiser,likes_count:0,comments_count:0};
const user={id:1,name:'Synthetic seller',email:'fixture@example.test',role:'CUSTOMER',seller_enabled:true};
const second={...reel,id:'video-2',title:'Second approved video'};
let mode='feed',liked=false,comments=[],submitted=false,uploaded=false;const mutations=[],ranges=[];
const api=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://synthetic.invalid');const path=url.pathname;
 const auth=req.headers.authorization==='Bearer phase2-synthetic';
 if(path==='/v-ads/media/media'){
  ranges.push(req.headers.range??'full');const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range??'');
  const start=match?Number(match[1]):0,end=match&&match[2]?Math.min(Number(match[2]),media.length-1):media.length-1;
  if(start>=media.length){res.writeHead(416,{'Content-Range':`bytes */${media.length}`});res.end();return;}
  res.writeHead(match?206:200,{'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Length':String(end-start+1),...(match?{'Content-Range':`bytes ${start}-${end}/${media.length}`}:{})});res.end(media.subarray(start,end+1));return;
 }
 let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;chunks.push(chunk);}const raw=Buffer.concat(chunks);
 const mutation=!['GET','HEAD'].includes(req.method);if(mutation)mutations.push({path,method:req.method,size});
 let status=200,data;
 if(path==='/me'){status=auth?200:401;data=auth?user:{detail:'Sign in required'};}
 else if(path==='/catalogue')data=[];
 else if(path==='/v-ads/reels'){status=mode==='offline'?503:200;data=mode==='offline'?{detail:'Offline fixture; check your connection.'}:{items:mode==='empty'?[]:[reel,second],page:1,has_more:false};}
 else if(path==='/v-ads/reels/video')data=reel;
 else if(path==='/v-ads/advertisers/advertiser')data={...advertiser,videos:[reel]};
 else if(path==='/v-ads/reels/video/comments'&&req.method==='GET')data={items:comments,page:1};
 else if(!auth){status=401;data={detail:'Sign in required'};}
 else if(path==='/v-ads/reels/video/engagement')data={liked,likes_count:liked?1:0};
 else if(path==='/v-ads/reels/video/like'){liked=req.method==='POST';data={liked,likes_count:liked?1:0};}
 else if(path==='/v-ads/reels/video/comments'){
  const input=JSON.parse(raw);const comment={id:'comment-'+comments.length,user_id:1,body:input.body,created_at:'2026-10-19T00:00:00Z'};comments.unshift(comment);status=201;data=comment;
 }
 else if(path==='/v-ads/me')data={accounts:[advertiser],videos:submitted?[{id:'submitted',advertiser_id:'advertiser',title:'Seller fixture',description:'',status:'PENDING',review_reason:'',created_at:'2026-10-19T00:00:00Z'}]:[],uploads:uploaded?[{id:'owned-upload',advertiser_id:'advertiser',size_bytes:16,video_id:submitted?'submitted':null}]:[],uploads_available:mode!=='disabled',page:1,has_more:false};
 else if(path==='/v-ads/advertisers/advertiser/uploads'){if(req.headers['content-type']!=='video/mp4'||!size){status=422;data={detail:'Invalid fixture upload'};}else{uploaded=true;status=201;data={id:'owned-upload',status:'VALIDATED',size_bytes:size};}}
 else if(path==='/v-ads/videos/submit'){const input=JSON.parse(raw);if(input.upload_id!=='owned-upload'||Object.hasOwn(input,'video_url'))throw new Error('Unsafe submission');submitted=true;status=201;data={id:'submitted',status:'PENDING'};}
 else {status=404;data={detail:'Not found'};}
 res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));
});
await new Promise(done=>api.listen(0,'127.0.0.1',done));
const reserve=http.createServer();await new Promise(done=>reserve.listen(0,'127.0.0.1',done));const port=reserve.address().port;await new Promise(done=>reserve.close(done));
const base=`http://127.0.0.1:${port}`;const dist='.next-v-ads-phase2-check';
const originalNextEnv=readFileSync('next-env.d.ts');
const originalTsconfig=readFileSync('tsconfig.json');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)],{cwd:process.cwd(),env:{...process.env,API_URL:`http://127.0.0.1:${api.address().port}`,ALLOWED_ORIGINS:base,COOKIE_SECURE:'false',TEST_NEXT_DIST_DIR:dist,NEXT_TELEMETRY_DISABLED:'1'},stdio:'ignore',windowsHide:true});
let browser;const checks=[];
try {
 let ready=false;for(let i=0;i<90;i++){if(child.exitCode!==null)throw new Error('Isolated Next exited');try{const response=await fetch(base+'/v-ads',{signal:AbortSignal.timeout(1500)});if(response.ok){ready=true;break;}}catch{/* Wait for this isolated preview to start. */}await delay(500);}if(!ready)throw new Error('Isolated Next did not become ready');
 browser=await chromium.launch({channel:'chrome',headless:true});
 // Development bundles need eval; production same-origin media policy is unchanged.
 const context=await browser.newContext({viewport:{width:390,height:844},bypassCSP:true});
 await context.addInitScript(()=>{Object.defineProperty(navigator,'share',{value:async data=>{window.__shared=data.url;},configurable:true});});
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/v-ads');await expect(page.getByRole('heading',{name:reel.title,exact:true})).toBeVisible();
 await expect.poll(()=>page.locator('video').first().evaluate(video=>video.readyState)).toBeGreaterThanOrEqual(2);
 await expect.poll(()=>page.locator('video').first().evaluate(video=>video.paused)).toBe(false);
 await page.getByRole('article',{name:reel.title}).getByRole('button',{name:'Pause video',exact:true}).click();await expect.poll(()=>page.locator('video').first().evaluate(video=>video.paused)).toBe(true);
 await page.getByRole('article',{name:reel.title}).getByRole('button',{name:'Play video',exact:true}).click();await expect.poll(()=>page.locator('video').first().evaluate(video=>video.paused)).toBe(false);
 await page.getByRole('article',{name:reel.title}).getByRole('button',{name:'Unmute video',exact:true}).click();await expect.poll(()=>page.locator('video').first().evaluate(video=>video.muted)).toBe(false);
 await page.getByRole('article',{name:reel.title}).getByRole('button',{name:'Mute video',exact:true}).click();
 await page.getByLabel('V Ads videos',{exact:true}).evaluate(node=>node.scrollTo(0,node.clientHeight));
 await expect.poll(()=>page.locator('video').first().evaluate(video=>video.paused)).toBe(true);await expect.poll(()=>page.locator('video').nth(1).evaluate(video=>video.paused)).toBe(false);
 await page.getByLabel('V Ads videos',{exact:true}).evaluate(node=>node.scrollTo(0,0));await expect.poll(()=>page.locator('video').first().evaluate(video=>video.paused)).toBe(false);
 await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{value:'hidden',configurable:true});document.dispatchEvent(new Event('visibilitychange'));});await expect.poll(()=>page.locator('video').first().evaluate(video=>video.paused)).toBe(true);
 await page.evaluate(()=>{delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'));});await expect.poll(()=>page.locator('video').first().evaluate(video=>video.paused)).toBe(false);
 await page.getByRole('article',{name:reel.title}).getByRole('button',{name:'Like video',exact:true}).click();await expect(page.getByRole('link',{name:'Sign in',exact:true})).toBeVisible();checks.push('guest authentication; playback pause/resume; sound; scroll autoplay; background pause');
 await context.addCookies([{name:'vistrah_session',value:'phase2-synthetic',url:base}]);await page.reload();
 await page.getByRole('article',{name:reel.title}).getByRole('button',{name:'Like video',exact:true}).click();await expect(page.getByRole('article',{name:reel.title}).getByRole('button',{name:'Unlike video',exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('article',{name:reel.title}).getByRole('button',{name:'Unlike video',exact:true})).toBeVisible();
 await page.getByRole('article',{name:reel.title}).getByRole('button',{name:'Open comments',exact:true}).click();await expect.poll(()=>page.locator('video').first().evaluate(video=>video.paused)).toBe(true);
 await page.getByRole('textbox',{name:'Add a comment'}).fill('Persisted synthetic comment');await page.getByRole('article',{name:reel.title}).getByRole('button',{name:'Post',exact:true}).click();await expect(page.getByText('Persisted synthetic comment',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Close comments'}).click();await page.getByRole('article',{name:reel.title}).getByRole('button',{name:'Share',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.__shared)).toBe(base+'/v-ads?video=video');
 await page.getByRole('article',{name:reel.title}).getByRole('link',{name:advertiser.name,exact:true}).click();await expect(page.getByRole('heading',{name:advertiser.name,exact:true})).toBeVisible();await page.getByRole('link',{name:reel.title,exact:true}).click();await expect(page.getByRole('heading',{name:reel.title,exact:true})).toBeVisible();checks.push('saved likes; comments; public shares; advertiser profile and deep link');
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});await expect(page.getByRole('navigation').first().getByRole('link',{name:'V Ads',exact:true})).toBeAttached();if(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth))throw new Error('Horizontal overflow at '+width);await page.screenshot({path:join(out,'reels-'+width+'.png')});}checks.push('320/390/1440 responsive layout');
 await page.goto(base+'/seller/v-ads');await page.getByLabel('Choose MP4').setInputFiles({name:'fixture.mp4',mimeType:'video/mp4',buffer:Buffer.from('synthetic-upload')});await expect(page.getByText('Validated upload selected.',{exact:true})).toBeVisible();await page.getByLabel('Video title',{exact:true}).fill('Seller fixture');await page.getByRole('button',{name:'Submit for review',exact:true}).click();await expect(page.getByText('PENDING',{exact:true})).toBeVisible();checks.push('authenticated raw upload and pending submission');
 mode='disabled';await page.reload();await expect(page.getByText('Video uploads and submissions are not available yet.',{exact:true})).toBeVisible();await expect(page.getByLabel('Choose MP4')).toHaveCount(0);checks.push('disabled backend gate');
 mode='empty';await page.goto(base+'/v-ads');await expect(page.getByText('No approved videos yet.',{exact:true})).toBeVisible();mode='offline';await page.reload();await expect(page.getByText('Offline fixture; check your connection.',{exact:true})).toBeVisible();mode='feed';await page.getByRole('button',{name:'Retry / refresh'}).click();await expect(page.getByRole('heading',{name:reel.title,exact:true})).toBeVisible();checks.push('empty/offline/retry states');
 if(errors.length)throw new Error('Browser errors: '+errors.join('; '));if(!ranges.some(value=>value!=='full'))throw new Error('No media range request observed');
 writeFileSync(join(out,'result.json'),JSON.stringify({checks,mutations,ranges,errors,normalServicesUntouched:true,nativeDeviceVerified:false},null,2));console.log(JSON.stringify({checks:checks.length,mutations:mutations.length,rangeRequests:ranges.length,errors:errors.length}));
} finally {
 await browser?.close();if(child.pid)await new Promise(done=>{const stop=spawn(join(process.env.SystemRoot||'C:\\Windows','System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});stop.on('exit',done);stop.on('error',()=>{child.kill();done();});});
 const generatedNextEnv=readFileSync('next-env.d.ts');if(!generatedNextEnv.equals(originalNextEnv)&&generatedNextEnv.toString().includes(dist))writeFileSync('next-env.d.ts',originalNextEnv);
 const generatedTsconfig=readFileSync('tsconfig.json');if(!generatedTsconfig.equals(originalTsconfig)){
  const current=JSON.parse(generatedTsconfig);current.include=current.include.filter(value=>!value.startsWith(dist+'/'));
  if(JSON.stringify(current)===JSON.stringify(JSON.parse(originalTsconfig)))writeFileSync('tsconfig.json',originalTsconfig);
 }
 api.closeAllConnections();await new Promise(done=>api.close(done));
}
