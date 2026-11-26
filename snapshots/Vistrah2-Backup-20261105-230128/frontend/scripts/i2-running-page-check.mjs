/** Read-only I2 deployment regression: no login, submissions, server start or database fixtures. */
import {chromium,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import process from 'node:process';
import console from 'node:console';
const base=process.env.BASE_URL||'http://localhost:3100';
const labels=['Find Service Provider','VISTRAH Recommended','VISTRAH Services'];
const directory=resolve('../artifacts/i2-running');mkdirSync(directory,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
let failures=0;
try {
  for(const width of [1440,390]) {
    const context=await browser.newContext({viewport:{width,height:1000}});const page=await context.newPage();
    for(const route of ['/','/services','/service/jobs-careers','/service/jobs-careers/service/resume-building']) {
      const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:30000});
      const primary=page.locator('#service-pathways [data-pathway]');
      console.log(JSON.stringify({route,width,status:response.status(),tabs:await page.getByRole('tab').count(),pathways:await primary.evaluateAll(elements=>elements.map(element=>element.getAttribute('data-pathway'))),primaryCount:await primary.count()}));
      if(route.endsWith('/service/resume-building')) {
        await page.locator('#service-pathways').screenshot({path:join(directory,`service-${width}.png`)});
        try {
          await expect(page.getByRole('tab')).toHaveText(labels,{timeout:1000});
          await expect(primary).toHaveCount(3);
          for(const tab of await page.getByRole('tab').all()) {
            await tab.click();
            await expect(page.getByRole('tabpanel').getByRole('heading',{name:'Sign in to continue',exact:true})).toBeVisible();
            await expect(page.getByRole('tabpanel').locator('textarea')).toHaveCount(0);
          }
          await expect(page.locator('textarea')).toHaveCount(0);
          await expect(page.locator('#service-pathways a[href="mailto:info@vistrah.in"]')).toBeVisible();
          await page.getByRole('tab').first().focus();await page.keyboard.press(width<600?'ArrowDown':'ArrowRight');
          await expect(page.getByRole('tab').nth(1)).toHaveAttribute('aria-selected','true');
        } catch(error) {failures++;console.error(`I2 running-page regression at ${route}, ${width}px: ${error.message.split('\n')[0]}`);}
      }
    }
    for(const intent of ['recommendations','in-house','contact']) {
      const route='/service/jobs-careers/service/resume-building/request?intent='+intent;
      await page.goto(base+route);
      try {
        await expect(page.getByRole('heading',{name:'Sign in to continue',exact:true})).toBeVisible();
        await expect(page.locator('textarea')).toHaveCount(0);
        await expect(page.locator('main').getByRole('link',{name:'Sign in',exact:true})).toHaveAttribute('href','/login?next='+encodeURIComponent(route));
        console.log(`Legacy anonymous guard preserved: ${intent}, ${width}px`);
      } catch(error) {failures++;console.error(`Legacy guard regression: ${intent}, ${width}px: ${error.message.split('\n')[0]}`);}
    }
    await context.close();
  }
} finally {await browser.close();}
console.log(`Running-page failures: ${failures}; screenshots: ${directory}`);
if(failures)process.exitCode=1;
