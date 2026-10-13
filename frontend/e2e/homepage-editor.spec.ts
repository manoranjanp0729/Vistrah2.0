import {test,expect} from '@playwright/test';
const admin='http://127.0.0.1:3211',desktop='http://127.0.0.1:3111',phone='http://127.0.0.1:4111';
type Layout={schema_version:1;sections:{id:string;template:string;title:string;subtitle:string;size:string;service_ids:number[]}[]};
type Draft={revision:number;layout:Layout;published_version:number|null};
// This suite mutates only the explicitly provisioned disposable project.
if(process.env.VISTRAH_HOMEPAGE_TEST!=='1')throw new Error('Run only after scripts/test-homepage.ps1 with VISTRAH_HOMEPAGE_TEST=1.');
test('draft, preview, publish, web/phone refresh, stale revision and restore',async({page,context})=>{
 const login=await context.request.post(admin+'/api/auth/login',{headers:{Origin:admin},data:{email:'homepage-admin@example.com',password:'Homepage-test-only-2026!'}});expect(login.ok()).toBeTruthy();
 async function draft(){const response=await context.request.get(admin+'/api/admin/homepage/draft');expect(response.ok()).toBeTruthy();return await response.json() as Draft;}
 async function mutate(path:string,data:unknown,method:'put'|'post'='post'){const response=await context.request[method](admin+'/api/admin/homepage/'+path,{headers:{Origin:admin},data});expect(response.ok()).toBeTruthy();return await response.json() as Draft;}
 const original=await draft();const before=await (await context.request.get(desktop+'/api/homepage')).json();
 const empty={schema_version:1 as const,sections:[]};await mutate('draft',{revision:original.revision,layout:empty},'put');
 const suffix=String(Date.now());const titles=['QA banner '+suffix,'QA grid '+suffix,'QA carousel '+suffix];
 page.on('dialog',dialog=>dialog.accept());
 try{
  await page.goto('/admin/homepage');await expect(page.getByRole('button',{name:/Add banner/})).toBeEnabled();
  for(const [index,template] of ['banner','service_grid','service_carousel'].entries()){
   await page.getByRole('button',{name:new RegExp('^Add '+template.replaceAll('_',' '))}).click();
   const group=page.getByRole('group',{name:(index+1)+'. '+template.replaceAll('_',' '),exact:true});
   await group.getByLabel('Title',{exact:true}).fill(titles[index]);
   await group.getByRole('checkbox').nth(0).check();
   if(template!=='banner')await group.getByRole('checkbox').nth(1).check();
   if(template==='banner')await group.getByLabel('Size',{exact:true}).selectOption('square');
  }
  await page.getByRole('group',{name:'1. banner',exact:true}).getByRole('button',{name:'Duplicate',exact:true}).click();
  await expect(page.getByRole('group',{name:'2. banner',exact:true})).toBeVisible();
  await page.getByRole('group',{name:'2. banner',exact:true}).getByRole('button',{name:'Remove',exact:true}).click();
  const carousel=page.getByRole('group',{name:'3. service carousel',exact:true});
  await carousel.getByRole('button',{name:'Move card 1 down',exact:true}).click();
  await carousel.getByRole('button',{name:'Move up',exact:true}).click();
  await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Draft saved');
  const saved=await draft();expect(saved.layout.sections.map(s=>s.title)).toEqual([titles[0],titles[2],titles[1]]);
  const stillPublic=await (await context.request.get(desktop+'/api/homepage')).json();expect(stillPublic).toEqual(before);
  const anonymous=await context.browser()!.newContext();try{const denied=await anonymous.request.get(admin+'/api/admin/homepage/draft');expect(denied.status()).toBe(401);}finally{await anonymous.close();}
  const stale=await context.request.put(admin+'/api/admin/homepage/draft',{headers:{Origin:admin},data:{revision:saved.revision-1,layout:saved.layout}});expect(stale.status()).toBe(409);
  await page.getByRole('button',{name:'Show desktop width',exact:true}).click();await expect(page.getByRole('button',{name:'Show phone width',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Publish saved draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Homepage published');
  const published=await (await context.request.get(desktop+'/api/homepage')).json();expect(published.layout).toEqual(saved.layout);
  const publicDesktop=await context.newPage();await publicDesktop.goto(desktop);for(const title of titles)await expect(publicDesktop.getByRole('heading',{name:title,exact:true})).toBeVisible();
  const phoneContext=await context.browser()!.newContext({viewport:{width:390,height:844}});try{const publicPhone=await phoneContext.newPage();await publicPhone.goto(phone+'/app/');for(const title of titles)await expect(publicPhone.getByRole('heading',{name:title,exact:true})).toBeVisible();expect(await publicPhone.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBeTruthy();}finally{await phoneContext.close();}
  const current=await draft();const changed={...current.layout,sections:current.layout.sections.map((s,i)=>i===0?{...s,title:'Changed '+suffix}:s)};
  const edited=await mutate('draft',{revision:current.revision,layout:changed},'put');await mutate('publish',{revision:edited.revision});
  await page.getByRole('button',{name:'Reload saved draft',exact:true}).click();await expect(page.getByRole('button',{name:'Publish saved draft',exact:true})).toBeEnabled();
  await page.getByText(new RegExp('^Version '+published.version+' ·')).getByRole('button',{name:'Restore to draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Previous version restored');
  expect((await (await context.request.get(desktop+'/api/homepage')).json()).layout.sections[0].title).toBe('Changed '+suffix);
  await page.getByRole('button',{name:'Publish saved draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Homepage published');
  expect((await (await context.request.get(desktop+'/api/homepage')).json()).layout).toEqual(saved.layout);
  await publicDesktop.reload();await expect(publicDesktop.getByRole('heading',{name:titles[0],exact:true})).toBeVisible();
  const restoredPhoneContext=await context.browser()!.newContext({viewport:{width:390,height:844}});try{const restoredPhone=await restoredPhoneContext.newPage();await restoredPhone.goto(phone+'/app/');await expect(restoredPhone.getByRole('heading',{name:titles[0],exact:true})).toBeVisible();await restoredPhone.reload();await expect(restoredPhone.getByRole('heading',{name:titles[0],exact:true})).toBeVisible();}finally{await restoredPhoneContext.close();}
 }finally{
  const current=await draft();const priorPublic=before.version?before.layout:empty;
  const reset=await mutate('draft',{revision:current.revision,layout:priorPublic},'put');await mutate('publish',{revision:reset.revision});
  const last=await draft();await mutate('draft',{revision:last.revision,layout:original.layout},'put');
 }
});
