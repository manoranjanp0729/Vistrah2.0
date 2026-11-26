import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {allServices,urls} from '../lib/urls';
import type {Category} from '../lib/types';
import type {ImageEntry} from '../lib/imagery';
const imageRegistry=JSON.parse(readFileSync(new URL('../lib/image-registry.json',import.meta.url),'utf8')) as Record<string,ImageEntry>;
const photos=JSON.parse(readFileSync(new URL('../lib/photo-assets.json',import.meta.url),'utf8')) as Record<string,{src:string}>;

async function photograph(page:Page,selector='.visual') {
  const box=page.locator(selector).first();
  await expect(box).toBeVisible();
  await box.scrollIntoViewIfNeeded();
  if(await box.getAttribute('data-photo')==='missing'){
    const id=(await box.getAttribute('data-image-id'))!;
    expect(imageRegistry[id]?.photo).toBeNull();
    expect(imageRegistry[id]?.missingReason).toBeTruthy();
    await expect(box.locator('img')).toHaveCount(0);
    await expect(box.locator('.visual-unavailable')).toBeVisible();
    return;
  }
  const image=box.locator('img');
  await expect(image).toBeVisible();
  await expect.poll(()=>image.evaluate(el=>(el as HTMLImageElement).complete&&(el as HTMLImageElement).naturalWidth>0)).toBe(true);
  const dimensions=await box.evaluate(el=>{
    const r=el.getBoundingClientRect();const img=el.querySelector('img')!;const i=img.getBoundingClientRect();
    return {width:r.width,height:r.height,imageWidth:i.width,imageHeight:i.height,fit:getComputedStyle(img).objectFit};
  });
  expect(dimensions.width).toBeGreaterThan(60);
  expect(Math.abs(dimensions.width-dimensions.imageWidth)).toBeLessThan(2);
  expect(Math.abs(dimensions.height-dimensions.imageHeight)).toBeLessThan(2);
  expect(['cover','contain']).toContain(dimensions.fit);
  await expect(image).toHaveAttribute('sizes',/.+/);
  const src=await image.getAttribute('src');
  expect(new URL(src!,page.url()).origin).toBe(new URL(page.url()).origin);
  const original=new URL(src!,page.url()).searchParams.get('url');
  expect(original).toMatch(/^\/images\/photos\/[a-z-]+\.webp$/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
}

async function administrator(page:Page) {
  await page.goto('/login?next=/admin');
  await page.getByLabel('Email address').fill('qa-admin@example.com');
  await page.getByLabel('Password',{exact:true}).fill(process.env.QA_ADMIN_PASSWORD!);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.locator('.admin-heading h1')).toBeVisible();
}

test('every bundled photograph is local and catalogue routes have subject images or documented gaps',async({page})=>{
  test.setTimeout(180000);
  for(const asset of Object.values(photos)){
    const response=await page.request.get(asset.src);
    expect(response.status(),asset.src).toBe(200);
    expect(response.headers()['content-type']).toContain('image/webp');
  }
  const categories:Category[]=await (await page.request.get('/api/catalogue')).json();
  await page.setViewportSize({width:1280,height:900});
  for(const category of categories){
    await page.goto(urls.category(category));await photograph(page,'.catalogue-hero .visual');
    for(const subcategory of category.subcategories){
      await page.goto(urls.subcategory(category,subcategory));await photograph(page,'.page-heading .visual');
      for(const service of subcategory.services){
        await page.goto(urls.providers(category,subcategory,service));await photograph(page,'.page-heading .visual');
        await expect(page.locator('.context-visual figcaption')).toContainText('illustrative photograph');
      }
    }
  }
  for(const context of allServices(categories)){
    await page.goto(urls.service(context.category,context.service,context.subcategory));
    await photograph(page,'.catalogue-hero .visual');
  }
});

test('public photography, cards and access/recovery states work at desktop, tablet and mobile widths',async({page})=>{
  test.setTimeout(180000);
  for(const width of [1440,1024,768,390,320]){
    await page.setViewportSize({width,height:1000});
    for(const route of ['/','/services','/services?q=unmatched-imagery-check','/membership','/call-vistrah','/jobs','/login','/register','/account','/admin','/sandbox-checkout','/missing-imagery-page']){
      await page.goto(route);await photograph(page);
    }
    await page.goto('/');
    await photograph(page,'.hero-art .visual');
    for(const selector of ['.category-card .visual','.service-card .visual']){
      await photograph(page,selector);
      const ratio=await page.locator(selector).first().evaluate(el=>el.clientWidth/el.clientHeight);
      expect(ratio).toBeCloseTo(4/3,1);
      await expect(page.locator(selector).first().locator('img')).toHaveAttribute('loading','lazy');
    }
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:`../artifacts/imagery/home-${width}.png`,fullPage:true});
    await page.goto('/login');await page.screenshot({path:`../artifacts/imagery/login-${width}.png`,fullPage:true});
  }
});

test('account, Finds and all admin sections retain compact local contextual photographs',async({page})=>{
  test.setTimeout(180000);
  await administrator(page);
  for(const width of [1440,1024,768,390]){
    await page.setViewportSize({width,height:1000});
    for(const section of ['','profile','requests','finds','membership','orders','payments']){
      await page.goto(`/account${section?'/'+section:''}`);
      await photograph(page,'.account-content .context-visual .visual');
    }
    await page.goto('/sandbox-checkout');await photograph(page,'.checkout-card .visual');
    for(const section of ['','catalogue','providers','provider-services','requests','offers','payments','audit','workflows','job-sources']){
      await page.goto(`/admin${section?'/'+section:''}`);
      await photograph(page,'.admin-heading .visual');
      const box=await page.locator('.admin-heading .visual').boundingBox();
      expect(box!.width).toBeLessThanOrEqual(156);
      if(section==='workflows')await expect(page.getByRole('heading',{name:'Worker health',exact:true})).toBeVisible();
      if(section==='job-sources')await expect(page.getByRole('heading',{name:'Adzuna (UK)',exact:true})).toBeVisible();
      if(['','workflows','job-sources'].includes(section))await page.screenshot({path:`../artifacts/imagery/admin-${section||'overview'}-${width}.png`,fullPage:true});
    }
  }
});

test('authentication sends its full photographed layout initially and preserves next-destination handling',async({request})=>{
  for(const page of ['login','register']){
    const response=await request.get(`/${page}?next=%2Fadmin&next=%2Faccount`);
    const html=await response.text();
    expect(html).toContain('class="auth-page"');
    expect(html).toContain('class="auth-story"');
    expect(html).toContain('name="email"');
    expect(html).toContain('name="password"');
    expect(html).toContain(`href="/${page==='login'?'register':'login'}?next=%2Fadmin"`);
    const unsafe=await request.get(`/${page}?next=${encodeURIComponent('//untrusted.example/')}`);
    expect(await unsafe.text()).toContain(`href="/${page==='login'?'register':'login'}?next=%2Faccount"`);
  }
});

test('cold local photography reserves its space and a broken image has an explicit stable fallback',async({page})=>{
  await page.addInitScript(()=>{
    const state=window as Window&{imageryCLS?:number};state.imageryCLS=0;
    new PerformanceObserver(list=>{
      for(const entry of list.getEntries()){
        const shift=entry as PerformanceEntry&{value:number;hadRecentInput:boolean};
        if(!shift.hadRecentInput)state.imageryCLS=(state.imageryCLS??0)+shift.value;
      }
    }).observe({type:'layout-shift',buffered:true});
  });
  const requests:string[]=[];
  page.on('request',r=>{if(r.resourceType()==='image')requests.push(r.url());});
  await page.route('**/_next/image?**',async route=>{
    await new Promise(resolve=>setTimeout(resolve,250));await route.continue();
  });
  await page.goto('/');await photograph(page,'.hero-art .visual');
  expect(requests.every(url=>new URL(url).origin===new URL(page.url()).origin)).toBe(true);
  await expect(page.locator('.hero-art .visual img')).not.toHaveAttribute('loading','lazy');
  const cls=await page.evaluate(()=>(window as Window&{imageryCLS?:number}).imageryCLS);
  expect(cls).toBeLessThan(.1);
  await page.unroute('**/_next/image?**');
  await page.route('**/_next/image?**',async route=>{
    await new Promise(resolve=>setTimeout(resolve,250));
    await route.fulfill({status:503,contentType:'text/plain',body:'Image unavailable for labelled browser test'});
  });
  await page.goto('/login');
  await expect(page.locator('.auth-visual .visual-unavailable')).toBeVisible();
  await expect(page.locator('.auth-visual')).toHaveAttribute('data-photo','planning');
  const box=await page.locator('.auth-visual').boundingBox();
  expect(box!.width/box!.height).toBeCloseTo(3/2,2);
  expect(await page.evaluate(()=>(window as Window&{imageryCLS?:number}).imageryCLS)).toBeLessThan(.1);
  await test.info().attach('local-image-loading.json',{body:JSON.stringify({requests,cls}),contentType:'application/json'});
});
