import {test,expect,type Page,type Locator} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {allServices,urls} from '../lib/urls';
import type {Category} from '../lib/types';
import type {ImageEntry} from '../lib/imagery';
const registry=JSON.parse(readFileSync(new URL('../lib/image-registry.json',import.meta.url),'utf8')) as Record<string,ImageEntry>;
const assets=JSON.parse(readFileSync(new URL('../lib/photo-assets.json',import.meta.url),'utf8')) as Record<string,{src:string}>;

async function photo(box:Locator,id:string){
  const entry=registry[id];expect(entry,id).toBeDefined();
  await expect(box).toHaveAttribute('data-image-id',id);
  await expect(box).toHaveAttribute('data-photo',entry.photo??'missing');
  await box.scrollIntoViewIfNeeded();
  if(!entry.photo){
    await expect(box.locator('img')).toHaveCount(0);
    await expect(box.locator('.visual-unavailable')).toHaveText('Photograph not yet available');
    await expect(box.getByRole('img')).toHaveAttribute('aria-label',new RegExp(entry.subject));
  }else{
    const img=box.locator('img');
    await expect(img).toHaveAttribute('alt',entry.alt);
    await expect.poll(()=>img.evaluate(el=>(el as HTMLImageElement).naturalWidth>0)).toBe(true);
    const url=new URL((await img.getAttribute('src'))!,'http://local.test');
    expect(url.searchParams.get('url')).toBe(assets[entry.photo].src);
    await expect(img).toHaveAttribute('sizes',/.+/);
    expect(await img.evaluate(el=>getComputedStyle(el).objectFit)).toMatch(/^(cover|contain)$/);
  }
  const size=await box.boundingBox();expect(size!.width/size!.height).toBeCloseTo(3/2,1);
}
async function noOverflow(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}

test('live catalogue identifiers and category cards resolve all 59 services without sibling duplication',async({page})=>{
  const categories:Category[]=await (await page.request.get('/api/catalogue')).json();
  const contexts=allServices(categories);expect(contexts).toHaveLength(59);expect(categories).toHaveLength(8);
  const ids=contexts.map(c=>`service/${c.category.slug}/${c.subcategory?c.subcategory.slug+'/':''}${c.service.slug}`);
  expect(ids.every(id=>registry[id]?.kind==='service')).toBe(true);
  const photos=ids.map(id=>registry[id].photo).filter(Boolean);
  expect(photos).toHaveLength(57);expect(new Set(photos).size).toBe(57);
  await page.setViewportSize({width:1280,height:900});
  for(const category of categories){
    await page.goto(urls.category(category));
    await photo(page.locator('.catalogue-hero .visual'),`category/${category.slug}`);
    const cards=page.locator('.service-card .visual');await expect(cards).toHaveCount(category.services.length);
    for(const [index,service] of category.services.entries()){
      const entry=registry[`service/${category.slug}/${service.slug}`];
      await expect(cards.nth(index)).toHaveAttribute('data-image-id',entry.id);
      await expect(cards.nth(index)).toHaveAttribute('data-photo',entry.photo!);
      const src=await cards.nth(index).locator('img').getAttribute('src');
      expect(new URL(src!,'http://local.test').searchParams.get('url')).toBe(assets[entry.photo!].src);
    }
    await noOverflow(page);
  }
});

test('representative service heroes retain subject mappings across desktop, tablet and mobile renders',async({page})=>{
  const ids=[
    'service/jobs-careers/interview-preparation','service/real-estate/property-verification',
    'service/civil-construction/equipment-materials','service/marketing/led-digital-displays',
    'service/tax-compliance/gst-registration','service/it-technology/mobile-app-development',
    'service/business-services/vendor-assistance','service/local-professional-services/plumbing-services',
  ];
  const requests:string[]=[];page.on('request',r=>{if(r.resourceType()==='image')requests.push(r.url());});
  for(const [index,id] of ids.entries()){
    await page.setViewportSize({width:[1280,768,390][index%3],height:900});
    await page.goto(registry[id].page);await photo(page.locator('.catalogue-hero .visual'),id);await noOverflow(page);
    if(index===0){await page.reload();await photo(page.locator('.catalogue-hero .visual'),id);}
  }
  expect(requests.every(url=>new URL(url).origin===new URL(page.url()).origin)).toBe(true);
  await page.screenshot({path:'../artifacts/image-registry/service-mobile.png',fullPage:true});
});

test('specialist cards and pages show two explicit gaps and two relevant photographs without fallback reuse',async({page})=>{
  const prefix='service/civil-construction/outdoor-lifestyle-design/';
  for(const width of [1280,768,320]){
    await page.setViewportSize({width,height:900});
    await page.goto('/service/civil-construction/outdoor-lifestyle-design');
    await photo(page.locator('.page-heading .visual'),'subcategory/civil-construction/outdoor-lifestyle-design');
    const cards=page.locator('.service-card .visual');await expect(cards).toHaveCount(4);
    await expect(cards.nth(0)).toHaveAttribute('data-photo','missing');
    await expect(cards.nth(1)).toHaveAttribute('data-photo','missing');
    await expect(cards.nth(2)).toHaveAttribute('data-photo','glass-enclosure');
    await expect(cards.nth(3)).toHaveAttribute('data-photo','outdoor');
    expect(await cards.nth(0).evaluate(el=>el.clientWidth/el.clientHeight)).toBeCloseTo(4/3,1);
    await noOverflow(page);
  }
  for(const slug of ['retractable-roofing','bioclimatic-pergolas','glass-systems']){
    const id=prefix+slug;await page.goto(registry[id].page);await photo(page.locator('.catalogue-hero .visual'),id);await noOverflow(page);
  }
  await page.screenshot({path:'../artifacts/image-registry/glass-mobile.png',fullPage:true});
});

test('enquiries, provider context, account, Finds and admin workflows use registered local imagery',async({page})=>{
  // Read-only presentation fixtures: no login, database writes or workflow execution.
  const catalogue=await (await page.request.get('/api/catalogue')).json();
  await page.route('**/api/**',async route=>{
    if(route.request().method()!=='GET')throw new Error('This presentation check must not mutate application data');
    const path=new URL(route.request().url()).pathname;
    if(path==='/api/me')return route.fulfill({json:{id:900001,name:'Imagery browser fixture',email:'imagery@example.invalid',phone:'',role:'ADMIN'}});
    if(path==='/api/admin/catalogue')return route.fulfill({json:catalogue});
    if(path==='/api/admin/overview')return route.fulfill({json:{customers:0,requests:0,providers:0,services:59,new_requests:0,payments:0}});
    if(path==='/api/admin/workflows')return route.fulfill({json:{items:[],total:0,counts:{},pending_customer_approvals:0,workers:[],integrations:[]}});
    if(['/api/me/requests','/api/me/orders','/api/me/payments','/api/admin/providers'].includes(path))return route.fulfill({json:[]});
    return route.continue();
  });
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:900});
    for(const [route,id,selector] of [
      ['/account/profile','account/profile','.account-context .visual'],
      ['/account/requests','account/requests','.account-context .visual'],
      ['/account/finds','account/finds','.account-context .visual'],
      ['/admin','admin/overview','.admin-heading .visual'],
      ['/admin/providers','admin/providers','.admin-heading .visual'],
      ['/admin/workflows','admin/workflows','.admin-heading .visual'],
      ['/service/real-estate/service/property-verification/request','service/real-estate/property-verification','.form-page-grid .visual'],
      ['/service/real-estate/service/property-verification/companies','service/real-estate/property-verification','.page-heading .visual'],
    ]){
      await page.goto(route);await photo(page.locator(selector),id);await noOverflow(page);
      if(route==='/admin/workflows')await expect(page.getByRole('heading',{name:'Worker health',exact:true})).toBeVisible();
    }
    await page.goto('/admin/workflows');await page.screenshot({path:`../artifacts/image-registry/workflows-${width}.png`,fullPage:true});
  }
});
