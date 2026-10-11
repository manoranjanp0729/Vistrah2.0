import {test,expect} from '@playwright/test';
import {allServices,urls} from '../lib/urls';
import type {Category} from '../lib/types';
const destination='mailto:info@vistrah.in';
// Match the production renderer's timezone. Existing sourceTime vacancy formatting
// uses the runtime timezone; local Asia/Calcutta browsers otherwise hydrate differently.
test.use({timezoneId:'UTC'});

test('public email actions work across desktop, tablet and mobile contact layouts',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.name));
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:1000});
    for(const path of ['/','/services','/membership','/call-vistrah','/service/jobs-careers/service/resume-building']){
      await page.goto(path);
      await expect(page.locator('.footer-email')).toHaveText('info@vistrah.in');
      await expect(page.locator('.footer-email')).toHaveAttribute('href',destination);
      expect(await page.locator('a[href^="tel:"]').count()).toBe(0);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
    if(width===1440)await expect(page.locator('.header-contact')).toHaveAttribute('href',destination);
    else{
      await page.getByRole('button',{name:'Open menu'}).click();
      await expect(page.locator('#mobile-navigation').getByRole('link',{name:'Email VISTRAH',exact:true})).toHaveAttribute('href',destination);
    }
    await page.goto('/call-vistrah');
    await expect(page.locator('.contact-email')).toHaveAttribute('href',destination);
    await page.goto('/service/jobs-careers/service/resume-building');
    await expect(page.locator('.service-secondary-contact a[href^="mailto:"]')).toHaveAttribute('href',destination);
    await expect(page.locator('.help-card > a')).toHaveAttribute('href',destination);
    await expect(page.getByRole('tab')).toHaveCount(3);
    await expect(page.locator('textarea')).toHaveCount(0);
    await page.goto('/service/jobs-careers/service/resume-building/request');
    await expect(page.getByRole('heading',{name:'Sign in to continue',exact:true})).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('all service pages and category/subcategory banners use email without company telephone links',async({request})=>{
  test.setTimeout(180000);
  const categories=await (await request.get('/api/catalogue')).json() as Category[];
  const contexts=allServices(categories);expect(contexts).toHaveLength(59);
  const pages=[...contexts.map(c=>urls.service(c.category,c.service,c.subcategory)),...categories.map(c=>urls.category(c)),...categories.flatMap(c=>c.subcategories.map(s=>urls.subcategory(c,s)))];
  for(const path of pages){
    const response=await request.get(path);expect(response.status(),path).toBe(200);
    const html=await response.text();
    expect(html,path).toContain('href="'+destination+'"');
    expect(html,path).not.toMatch(/href="tel:|Call VISTRAH|\+916364456776|\+91 63644 56776/);
  }
});

test('saved enquiry forms retain personal phone validation and submission wiring',async({page})=>{
  let submissions=0;let payload:Record<string,unknown>={};
  await page.route('**/api/me',route=>route.fulfill({json:{id:900001,name:'Contact UI fixture',email:'fixture@example.invalid',phone:'',role:'CUSTOMER'}}));
  await page.route('**/api/requests',route=>{
    submissions++;payload=route.request().postDataJSON();
    return route.fulfill({status:201,json:{id:900001,...payload,status:'NEW'}});
  });
  await page.goto('/service/jobs-careers/service/resume-building/request');
  await page.getByLabel('Your requirements').fill('Please review my resume for a software engineering role.');
  await page.getByLabel('Location',{exact:true}).fill('Bengaluru');
  const phone=page.getByLabel('Contact number');
  await expect(phone).toHaveAttribute('type','tel');await expect(phone).toHaveAttribute('required','');
  await phone.fill('short');await page.getByRole('button',{name:'Submit requirement'}).click();expect(submissions).toBe(0);
  // Existing personal-phone fixture retained; this is not company contact content.
  await phone.fill('6364456776');await page.getByRole('button',{name:'Submit requirement'}).click();
  await expect(page.getByRole('heading',{name:'One step closer.'})).toBeVisible();
  expect(submissions).toBe(1);expect(payload.phone).toBe('6364456776');expect(payload.service_id).toBeTruthy();
  await expect(page.getByRole('link',{name:'View my requests'})).toHaveAttribute('href','/account/requests');
});
