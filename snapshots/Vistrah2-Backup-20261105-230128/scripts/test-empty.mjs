import assert from 'node:assert/strict';
import {chromium} from '../frontend/node_modules/playwright/index.mjs';
const origin=process.env.EMPTY_BASE_URL||'http://localhost:3101';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome'});
try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const catalogue=await page.request.get(`${origin}/api/catalogue`);
  assert.equal(catalogue.status(),200);
  assert.deepEqual(await catalogue.json(),[]);
  await page.goto(origin);
  await page.getByRole('heading',{name:'Our catalogue is being prepared'}).waitFor();
  assert.equal(await page.locator('.category-card,.service-card').count(),0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.goto(`${origin}/services`);
  await page.getByRole('heading',{name:'No services available yet'}).waitFor();
  await page.goto(`${origin}/services?q=resume`);
  await page.getByRole('heading',{name:'No services found'}).waitFor();
  assert.equal((await page.request.get(`${origin}/service/jobs-careers`)).status(),404);
  const plan=await page.request.get(`${origin}/api/membership/plan`);
  assert.equal((await plan.json()).amount,12900);
  await page.screenshot({path:'artifacts/empty-catalogue-mobile.png',fullPage:true});
  console.log('Empty-catalogue Docker/browser checks passed.');
} finally {
  await browser.close();
}
