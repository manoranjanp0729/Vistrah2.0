import {test,expect} from '@playwright/test';
const admin='http://127.0.0.1:3211',desktop='http://127.0.0.1:3111',phone='http://127.0.0.1:4111';
type Layout={schema_version:1;sections:{id:string;template:string;title:string;subtitle:string;size:string;service_ids:number[]}[]};
type Draft={revision:number;layout:Layout;published_version:number|null};
type Published={version:number|null;layout:Layout};
let cleanupSnapshot:{draft:Draft;published:Published}|null=null;
// This suite mutates only the explicitly provisioned disposable project.
if(process.env.VISTRAH_HOMEPAGE_TEST!=='1')throw new Error('Run only after scripts/test-homepage.ps1 with VISTRAH_HOMEPAGE_TEST=1.');
test('draft, preview, publish, web/phone refresh, stale revision and restore',async({page,context})=>{
 cleanupSnapshot=null;
 console.log('[Homepage QA] Sign in and read the existing layout');
 const login=await context.request.post(admin+'/api/auth/login',{headers:{Origin:admin},data:{email:'homepage-admin@example.com',password:'Homepage-test-only-2026!'},timeout:10000});expect(login.ok()).toBeTruthy();
 async function draft(){const response=await context.request.get(admin+'/api/admin/homepage/draft',{timeout:10000});expect(response.ok()).toBeTruthy();return await response.json() as Draft;}
 async function mutate(path:string,data:unknown,method:'put'|'post'='post'){const response=await context.request[method](admin+'/api/admin/homepage/'+path,{headers:{Origin:admin},data,timeout:10000});expect(response.ok()).toBeTruthy();return await response.json() as Draft;}
 const original=await draft();const before=await (await context.request.get(desktop+'/api/homepage',{timeout:10000})).json();
 cleanupSnapshot={draft:original,published:before as Published};
 const empty={schema_version:1 as const,sections:[]};await mutate('draft',{revision:original.revision,layout:empty},'put');
 const suffix=String(Date.now());const titles=['QA banner '+suffix,'QA grid '+suffix,'QA carousel '+suffix];
 page.on('dialog',dialog=>dialog.accept());
 console.log('[Homepage QA] Open editor and add the three templates');
  await page.goto('/admin/homepage');await expect(page.getByRole('button',{name:/Add banner/})).toBeEnabled();
  for(const [index,template] of ['banner','service_grid','service_carousel'].entries()){
   await page.getByRole('button',{name:new RegExp('^Add '+template.replaceAll('_',' '))}).click();
   const group=page.getByRole('group',{name:(index+1)+'. '+template.replaceAll('_',' '),exact:true});
   await group.getByLabel('Title',{exact:true}).fill(titles[index]);
   await group.getByRole('checkbox').nth(0).check();
   if(template!=='banner')await group.getByRole('checkbox').nth(1).check();
   if(template==='banner')await group.getByLabel('Size',{exact:true}).selectOption('square');
  }
  console.log('[Homepage QA] Duplicate, remove and reorder sections/cards');
  await page.getByRole('group',{name:'1. banner',exact:true}).getByRole('button',{name:'Duplicate',exact:true}).click();
  await expect(page.getByRole('group',{name:'2. banner',exact:true})).toBeVisible();
  await page.getByRole('group',{name:'2. banner',exact:true}).getByRole('button',{name:'Remove',exact:true}).click();
  const carousel=page.getByRole('group',{name:'3. service carousel',exact:true});
  await carousel.getByRole('button',{name:'Move card 1 down',exact:true}).click();
  await carousel.getByRole('button',{name:'Move up',exact:true}).click();
  console.log('[Homepage QA] Save draft and check draft privacy');
  await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Draft saved');
  const saved=await draft();expect(saved.layout.sections.map(s=>s.title)).toEqual([titles[0],titles[2],titles[1]]);
  const stillPublic=await (await context.request.get(desktop+'/api/homepage',{timeout:10000})).json();expect(stillPublic).toEqual(before);
  const anonymous=await context.browser()!.newContext();try{const denied=await anonymous.request.get(admin+'/api/admin/homepage/draft');expect(denied.status()).toBe(401);}finally{await anonymous.close();}
  const stale=await context.request.put(admin+'/api/admin/homepage/draft',{headers:{Origin:admin},data:{revision:saved.revision-1,layout:saved.layout}});expect(stale.status()).toBe(409);
  console.log('[Homepage QA] Preview and publish the saved layout');
  await page.getByRole('button',{name:'Show desktop width',exact:true}).click();await expect(page.getByRole('button',{name:'Show phone width',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Publish saved draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Homepage published');
  const published=await (await context.request.get(desktop+'/api/homepage',{timeout:10000})).json();expect(published.layout).toEqual(saved.layout);
  console.log('[Homepage QA] Verify desktop and phone rendering');
  const publicDesktop=await context.newPage();await publicDesktop.goto(desktop);for(const title of titles)await expect(publicDesktop.getByRole('heading',{name:title,exact:true})).toBeVisible();
  const phoneContext=await context.browser()!.newContext({viewport:{width:390,height:844}});try{const publicPhone=await phoneContext.newPage();await publicPhone.goto(phone+'/app/');for(const title of titles)await expect(publicPhone.getByRole('heading',{name:title,exact:true})).toBeVisible();expect(await publicPhone.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBeTruthy();}finally{await phoneContext.close();}
  console.log('[Homepage QA] Restore a prior version and refresh both clients');
  const current=await draft();const changed={...current.layout,sections:current.layout.sections.map((s,i)=>i===0?{...s,title:'Changed '+suffix}:s)};
  const edited=await mutate('draft',{revision:current.revision,layout:changed},'put');await mutate('publish',{revision:edited.revision});
  await page.getByRole('button',{name:'Reload saved draft',exact:true}).click();await expect(page.getByRole('button',{name:'Publish saved draft',exact:true})).toBeEnabled();
  await page.getByText(new RegExp('^Version '+published.version+' ·')).getByRole('button',{name:'Restore to draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Previous version restored');
  expect((await (await context.request.get(desktop+'/api/homepage',{timeout:10000})).json()).layout.sections[0].title).toBe('Changed '+suffix);
  await page.getByRole('button',{name:'Publish saved draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Homepage published');
  expect((await (await context.request.get(desktop+'/api/homepage',{timeout:10000})).json()).layout).toEqual(saved.layout);
  await publicDesktop.reload();await expect(publicDesktop.getByRole('heading',{name:titles[0],exact:true})).toBeVisible();
  const restoredPhoneContext=await context.browser()!.newContext({viewport:{width:390,height:844}});try{const restoredPhone=await restoredPhoneContext.newPage();await restoredPhone.goto(phone+'/app/');await expect(restoredPhone.getByRole('heading',{name:titles[0],exact:true})).toBeVisible();await restoredPhone.reload();await expect(restoredPhone.getByRole('heading',{name:titles[0],exact:true})).toBeVisible();}finally{await restoredPhoneContext.close();}
});

// Cleanup has its own fixture/time budget. Never replace the original failure
// with requests made on the test's already-timed-out browser context.
test.afterEach(async({playwright},testInfo)=>{
 if(!cleanupSnapshot)return;
 testInfo.setTimeout(35000);
 const snapshot=cleanupSnapshot;cleanupSnapshot=null;
 const request=await playwright.request.newContext({timeout:5000});
 try{
  const login=await request.post(admin+'/api/auth/login',{headers:{Origin:admin},data:{email:'homepage-admin@example.com',password:'Homepage-test-only-2026!'}});
  if(!login.ok())throw new Error('Test cleanup sign-in failed');
  async function read(){const response=await request.get(admin+'/api/admin/homepage/draft');if(!response.ok())throw new Error('Test cleanup draft read failed');return await response.json() as Draft;}
  async function mutate(path:string,data:unknown,method:'put'|'post'='post'){const response=await request[method](admin+'/api/admin/homepage/'+path,{headers:{Origin:admin},data});if(!response.ok())throw new Error('Test cleanup restore failed');return await response.json() as Draft;}
  const current=await read();const priorPublic=snapshot.published.version?snapshot.published.layout:{schema_version:1,sections:[]};
  const reset=await mutate('draft',{revision:current.revision,layout:priorPublic},'put');await mutate('publish',{revision:reset.revision});
  const last=await read();await mutate('draft',{revision:last.revision,layout:snapshot.draft.layout},'put');
 }catch{
  const message='Disposable homepage cleanup did not finish. Inspect the test editor; published history was not deleted.';
  await testInfo.attach('cleanup-note',{body:message,contentType:'text/plain'});
  if(testInfo.status==='passed')throw new Error(message);
  console.warn(message);
 }finally{await request.dispose();}
});
