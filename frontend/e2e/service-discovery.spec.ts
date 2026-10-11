import {test,expect} from '@playwright/test';
import {allServices,urls} from '../lib/urls';
import type {Category} from '../lib/types';

// Read-only public checks. Synthetic member/auth/save flows run in scripts/i2-browser-check.mjs.
const titles=['Find Service Provider','VISTRAH Recommended','VISTRAH Services'];
test('three tabs support keyboard navigation and readable mobile text',async({page})=>{
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:1000});await page.goto('/service/jobs-careers/service/resume-building');
    await expect(page.getByRole('tab')).toHaveText(titles);
    await page.getByRole('tab').first().focus();await page.keyboard.press(width<600?'ArrowDown':'ArrowRight');
    await expect(page.getByRole('tab').nth(1)).toHaveAttribute('aria-selected','true');await expect(page.getByRole('tab').nth(1)).toBeFocused();
    await page.keyboard.press('End');await expect(page.getByRole('tab').nth(2)).toHaveAttribute('aria-selected','true');
    await page.keyboard.press('Home');await expect(page.getByRole('tab').first()).toHaveAttribute('aria-selected','true');
    await expect(page.getByRole('tabpanel')).toHaveCount(1);await expect(page.locator('textarea')).toHaveCount(0);
    await page.evaluate(()=>document.documentElement.style.fontSize='200%');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await page.evaluate(()=>document.documentElement.style.fontSize='');
  }
});
test('all canonical services render exactly three public tab labels without protected forms',async({request})=>{
  test.setTimeout(180000);const categories=await (await request.get('/api/catalogue')).json() as Category[];
  for(const context of allServices(categories)){
    const path=urls.service(context.category,context.service,context.subcategory);const response=await request.get(path);expect(response.status(),path).toBe(200);const html=await response.text();
    expect((html.match(/role="tab"/g)||[]).length,path).toBe(3);for(const title of titles)expect(html,path).toContain(title);
    expect(html,path).not.toContain('<textarea');expect(html,path).toContain('mailto:info@vistrah.in');
  }
});
test('historical enquiry purposes and provider URLs retain I1 anonymous access guidance',async({page,request})=>{
  const categories=await (await request.get('/api/catalogue')).json() as Category[];const contexts=allServices(categories);
  for(const context of [contexts[0],contexts.find(c=>c.subcategory)!]){
    for(const intent of ['recommendations','in-house','contact']){
      const next=urls.request(context.category,context.service,context.subcategory)+'?intent='+intent;await page.goto(next);
      await expect(page.getByRole('heading',{name:'Sign in to continue',exact:true})).toBeVisible();await expect(page.locator('textarea')).toHaveCount(0);
      await expect(page.locator('main').getByRole('link',{name:'Sign in',exact:true})).toHaveAttribute('href','/login?next='+encodeURIComponent(next));
    }
    await page.goto(urls.providers(context.category,context.subcategory,context.service));await expect(page.getByRole('heading',{name:'Sign in to continue',exact:true})).toBeVisible();
  }
});
