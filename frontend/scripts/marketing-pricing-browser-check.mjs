// Disposable UI fixtures only. Requires isolated Next dev :3337; no normal API.
/* global document, window */
import console from 'node:console';
import {URL} from 'node:url';
import {readFileSync} from 'node:fs';
import {chromium,expect} from '@playwright/test';
const catalogue=JSON.parse(readFileSync(new URL('../../shared/marketing-pricing.json',import.meta.url),'utf8'));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.setDefaultTimeout(20000);
 let available=true,submitted=null;
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  let status=200,data;
  if(path==='/api/marketing-pricing/catalogue')data=catalogue;
  else if(path==='/api/marketing-pricing/capabilities')data={quote_requests_available:available,message:available?'Fixture enabled':'Marketing quotation submission is not enabled on this server yet.'};
  else if(path==='/api/me')data={id:10001,name:'Synthetic Customer',email:'fixture@example.com',role:'CUSTOMER',seller_enabled:false,saved_location:null};
  else if(path==='/api/marketing-pricing/quotes'){
   if(route.request().method()==='POST'){
    submitted=route.request().postDataJSON();
    data={id:'synthetic-browser-quote',service_id:submitted.service_id,service_name:'Fixture service',package_id:submitted.package_id,status:'SUBMITTED',revision:1,estimate_paise:999900,pricing_state:'PROPOSED',customer_note:'',created_at:new Date().toISOString()};status=201;
   }else data={items:[]};
  }else {status=404;data={detail:'Disposable fixture: endpoint unavailable'};}
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 });
 const origin='http://127.0.0.1:3337';
 await page.goto(origin+'/marketing-pricing',{waitUntil:'domcontentloaded',timeout:120000});
 await expect(page.getByRole('heading',{name:'Pricing & services',exact:true})).toBeVisible();
 await page.getByLabel('Category',{exact:true}).selectOption('websites');
 await expect(page.locator('a[href="/marketing-pricing/landing-page"]')).toHaveCount(1);
 await page.getByLabel('Search services').fill('landing');
 await expect(page.locator('a[href^="/marketing-pricing/"]')).toHaveCount(1);
 await page.getByRole('link',{name:/Landing Page/}).click();
 await expect(page.getByRole('heading',{name:'Proposed inclusions'})).toBeVisible();
 await page.getByRole('button',{name:'Compare packages',exact:true}).click();
 await page.getByRole('button',{name:'Choose Growth',exact:true}).click();
 await expect(page.getByLabel('Package',{exact:true})).toHaveValue('marketing-growth');
 await page.getByLabel('Business name',{exact:true}).fill('Synthetic Business');
 await page.getByLabel('Contact name',{exact:true}).fill('Synthetic Contact');
 await page.getByLabel('Contact email',{exact:true}).fill('fixture@example.com');
 await page.getByLabel('Contact phone',{exact:true}).fill('9876543210');
 await page.getByLabel('City',{exact:true}).fill('Fixture City');
 await page.getByLabel('Requirements',{exact:true}).fill('Synthetic disposable campaign requirements for UI verification.');
 await page.getByRole('button',{name:'Submit quotation request',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Quote request received'})).toBeVisible();
 expect(submitted.package_id).toBe('marketing-growth');
 expect(submitted).not.toHaveProperty('estimate_paise');
 await page.setViewportSize({width:390,height:844});
 await page.goto(origin+'/marketing-pricing/roadside-hoarding?package=marketing-growth');
 await expect(page.getByLabel('Package',{exact:true})).toBeDisabled();
 await expect(page.getByLabel('Media format',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 available=false;await page.reload();
 await expect(page.getByRole('button',{name:'Submit quotation request',exact:true})).toBeDisabled();
 await expect(page.getByText('Marketing quotation submission is not enabled on this server yet.',{exact:true})).toBeVisible();
 await page.goto(origin+'/marketing-pricing/promotional-reel');
 await expect(page.getByRole('link',{name:'Open V Ads Studio',exact:true})).toHaveAttribute('href','/seller/v-ads');
 await page.goto(origin+'/marketing-pricing');
 await expect(page.getByRole('heading',{name:'Pricing & services',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.setViewportSize({width:1440,height:1000});
 console.log('PASS: desktop/narrow catalogue, filters, detail navigation, package choice, validated quote payload/fixture response, media brief, quote-only package guard, unavailable submission, Studio link and no horizontal overflow. UI fixtures only; backend persistence tested separately.');
}finally{await browser.close();}
