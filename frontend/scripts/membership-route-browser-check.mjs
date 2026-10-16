// Read-only routing checks against the existing local Expo server. No API writes.
import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath,URL} from 'node:url';
import path from 'node:path';
import process from 'node:process';
import console from 'node:console';
import assert from 'node:assert/strict';
const base=process.env.MEMBERSHIP_EXPO_URL??'http://localhost:8081';
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Use the authorized local Expo preview only');
const output=fileURLToPath(new URL('../../artifacts/membership-routing/',import.meta.url));mkdirSync(output,{recursive:true});
const report={passed:false,checks:[],apiLimitations:[],runtimeErrors:[]};let browser;
async function screen(page){await expect(page.getByRole('heading',{name:'VISTRAH Business Membership',exact:true})).toBeVisible();await expect(page.getByText(/Opening your next possibilities/)).toBeHidden({timeout:15000});await expect(page.getByText('Unmatched Route',{exact:true})).toHaveCount(0);await expect(page).toHaveURL(base+'/membership');}
try{
 browser=await chromium.launch({channel:'chrome',headless:true});
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});page.on('pageerror',error=>report.runtimeErrors.push(error.message));
  page.on('response',response=>{if(new URL(response.url()).pathname.endsWith('/membership/plans')&&response.status()>=400)report.apiLimitations.push({endpoint:'/membership/plans',status:response.status()});});
  await page.goto(base+'/membership');await screen(page);await page.reload();await screen(page);
  await page.goto(base+'/account');await page.getByText('Membership',{exact:true}).click();await screen(page);
  for(const period of ['Monthly','Annual'])for(const plan of ['Basic','Plus','Premium']){await page.getByRole('button',{name:period,exact:true}).click();await page.getByRole('button',{name:plan,exact:true}).click();await screen(page);}
  await page.getByRole('button',{name:'Monthly',exact:true}).click();await page.getByRole('button',{name:'Plus',exact:true}).click();
  assert(await page.locator('body').evaluate(node=>node.scrollWidth<=node.ownerDocument.defaultView.innerWidth+1));
  await page.screenshot({path:path.join(output,`membership-${width}.png`)});
  for(const alias of ['/app/membership','/account/membership','/app/account/membership','/Membership']){await page.goto(base+alias);await screen(page);await page.reload();await screen(page);}
  report.checks.push(`${width}px: direct /membership, refresh, Account Membership button, all six toggles without URL changes, website aliases and alias refresh, no overflow`);await page.close();
 }
 assert.equal(report.runtimeErrors.length,0,JSON.stringify(report.runtimeErrors));report.passed=true;
}catch(error){report.error=error.stack;process.exitCode=1;}finally{if(browser)await browser.close();report.apiLimitations=Array.from(new Map(report.apiLimitations.map(item=>[JSON.stringify(item),item])).values());writeFileSync(path.join(output,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
