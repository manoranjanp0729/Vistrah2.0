import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import type {Category} from '../lib/types';
let serviceId=0;
const catalogue=(JSON.parse(readFileSync(new URL('../../shared/catalogue.json',import.meta.url),'utf8')) as Category[]).map((c,i)=>({...c,id:i+1,services:c.services.map(s=>({...s,id:++serviceId})),subcategories:c.subcategories.map((sub,j)=>({...sub,id:j+1,services:sub.services.map(s=>({...s,id:++serviceId}))}))}));
test.describe.configure({timeout:30000});
test.use({timezoneId:'UTC'});
const help=(page:Page,id:string)=>page.locator(`[data-help-id="${id}"]`).first().locator('> .help-trigger');
const visiblePanel=(page:Page)=>page.locator('.help-popover:popover-open');
async function admin(page:Page){
  await page.route('**/api/me',r=>r.fulfill({json:{id:900001,name:'Help fixture',email:'help@example.invalid',role:'ADMIN'}}));
  await page.route('**/api/admin/catalogue',r=>r.fulfill({json:catalogue}));
  await page.route('**/api/admin/overview',r=>r.fulfill({json:{customers:1,requests:1,providers:1,services:59,payments:0,new_requests:1}}));
}
test('hover, focus, pointer travel and dismissal explain service actions without executing them',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.name));
  let writes=0;page.on('request',r=>{if(['POST','PUT','PATCH','DELETE'].includes(r.method()))writes++;});
  await page.goto('/service/jobs-careers/service/resume-building');
  const trigger=help(page,'pathway.providers');await trigger.hover();
  await expect(visiblePanel(page)).toContainText('Eligible membership is required');
  await visiblePanel(page).hover();await page.waitForTimeout(450);await expect(visiblePanel(page)).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded','true');
  const id=await trigger.getAttribute('aria-controls');await expect(page.locator(`[id="${id}"]`)).toHaveAttribute('role','dialog');
  await visiblePanel(page).getByRole('button',{name:'Close help'}).click();await expect(visiblePanel(page)).toHaveCount(0);await expect(trigger).toBeFocused();
  await page.keyboard.press('Tab');await page.getByRole('tab',{name:'VISTRAH Recommended',exact:true}).click();await help(page,'pathway.recommendations').focus();await expect(visiblePanel(page)).toContainText('human review');
  await page.keyboard.press('Escape');await expect(visiblePanel(page)).toHaveCount(0);
  await help(page,'pathway.email').click();await expect(visiblePanel(page)).toContainText('email application');
  await page.locator('h1').click();await expect(visiblePanel(page)).toHaveCount(0);
  expect(writes).toBe(0);expect(errors).toEqual([]);await expect(page.getByRole('tab')).toHaveCount(3);
  await page.getByRole('tabpanel').getByRole('link',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/\/login\?next=.*tab%3Drecommendations/);
});
test('help preserves responsive navigation and stays outside actionable links and labels',async({page})=>{
  for(const width of [1440,1024,768,390]){
    await page.setViewportSize({width,height:1000});await page.goto('/services');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(await page.locator('.help-trigger').evaluateAll(buttons=>buttons.every(b=>!b.parentElement?.closest('a,button,label')))).toBe(true);
  }
  await admin(page);await page.goto('/admin');await page.getByRole('button',{name:'Toggle admin sidebar'}).click();
  await help(page,'admin.provider-requirements').click();await expect(visiblePanel(page)).toContainText('Draft changes');
  const box=await visiblePanel(page).boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(390);
});
test('touch help remains readable at narrow widths and 200 percent text without overflow',async({browser})=>{
  const context=await browser.newContext({viewport:{width:320,height:700},hasTouch:true,isMobile:true,timezoneId:'UTC',reducedMotion:'reduce'});
  const page=await context.newPage();await page.goto('/');
  await page.getByRole('button',{name:'Open menu'}).tap();
  const trigger=page.locator('#mobile-navigation [data-help-id="public.membership"] > .help-trigger');await trigger.tap();
  await expect(visiblePanel(page)).toContainText('sandbox payments');
  await page.addStyleTag({content:'html{font-size:200%}'});
  const bounds=await visiblePanel(page).boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(320);
  await visiblePanel(page).getByRole('button',{name:'Close help'}).tap();await expect(visiblePanel(page)).toHaveCount(0);
  await context.close();
});
test('admin help remains available beside navigation, statistics and within modal top layer',async({page})=>{
  await admin(page);await page.goto('/admin');
  await expect(page.getByRole('heading',{name:'A clear view of what’s next.'})).toBeVisible();
  await help(page,'admin.provider-requirements').focus();await expect(visiblePanel(page)).toContainText('Draft changes do not alter published versions');
  await page.keyboard.press('Escape');await help(page,'admin.stats').click();await expect(visiblePanel(page)).toContainText('individual service approval');
  await page.route('**/api/admin/payments',r=>r.fulfill({json:[{id:'help-payment',amount:12900,status:'SUCCEEDED',mode:'SANDBOX',created_at:'2026-10-10T00:00:00Z'}]}));
  await page.goto('/admin/payments');await help(page,'admin.refund').click();await expect(visiblePanel(page)).toContainText('revoke the membership');
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Refund',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Refund sandbox payment'})).toBeVisible();
  await page.getByRole('dialog',{name:'Refund sandbox payment'}).locator('[data-help-id="admin.refund"] > .help-trigger').click();
  await expect(visiblePanel(page)).toContainText('revoke the membership');
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'Refund sandbox payment'})).toBeVisible();
  await page.getByRole('button',{name:'Close dialog'}).click();await expect(page.getByRole('dialog',{name:'Refund sandbox payment'})).toHaveCount(0);
});
test('requirements, job-source and workflow controls explain their real consequences',async({page})=>{
  await admin(page);let writes=0;page.on('request',r=>{if(['POST','PUT','PATCH','DELETE'].includes(r.method()))writes++;});
  const configuration={sections:[{id:'business',title:'Evidence',fields:[{id:'registration',label:'Registration evidence',type:'text'}]}],declarations:[]};
  await page.route(/\/api\/admin\/provider-requirements\/\d+$/,r=>r.fulfill({json:[{id:1,version:1,state:'DRAFT',configuration,change_note:'Fixture version',effective_at:'2026-10-10T00:00:00Z',created_at:'2026-10-10T00:00:00Z'}]}));
  await page.route('**/api/admin/provider-requirements/versions/1/history',r=>r.fulfill({json:[]}));
  await page.goto('/admin/provider-requirements');await help(page,'requirements.publish').click();
  await expect(visiblePanel(page)).toContainText('existing applications keep their pinned versions');
  await page.keyboard.press('Escape');await expect(page.getByLabel('Field identifier')).toHaveValue('registration');
  await page.route('**/api/admin/job-sources',r=>r.fulfill({json:{sources:[{id:'remotive',name:'Remotive',status:'configured',enabled:true,credential_ready:true,access_ready:true,adapter:'API',note:'Fixture source',quota:'Provider limits',requests_last_24h:0}],queued:[],recent:[]}}));
  await page.goto('/admin/job-sources');await help(page,'source.acquire').focus();await expect(visiblePanel(page)).toContainText('scheduled discovery is disabled');
  await page.route('**/api/admin/workflows*',r=>r.fulfill({json:{items:[],counts:{},pending_customer_approvals:0,total:0,workers:[],integrations:[]}}));
  await page.goto('/admin/workflows');await help(page,'finds.worker').click();await expect(visiblePanel(page)).toContainText('does not guarantee source access');expect(writes).toBe(0);
});
test('provider onboarding explains pinned requirements and private documents while keeping inputs usable',async({page})=>{
  await page.route('**/api/me',r=>r.fulfill({json:{id:900001,name:'Help provider',email:'help@example.invalid',role:'CUSTOMER'}}));
  const configuration={sections:[{id:'evidence',title:'Supporting evidence',fields:[{id:'document',label:'Registration document',type:'file',required:true}]}],declarations:[]};
  await page.route('**/api/provider-applications/00000000-0000-4000-8000-000000000001',r=>r.fulfill({json:{id:'00000000-0000-4000-8000-000000000001',status:'DRAFT',revision:1,common:{},common_configuration:{sections:[],declarations:[]},history:[],documents:[],services:[{service_id:1,title:'Resume Building',status:'DRAFT',requirement_id:1,answers:{},requirements:{version:1,effective_at:'2026-10-10T00:00:00Z',configuration}}]}}));
  await page.goto('/provide-service?application=00000000-0000-4000-8000-000000000001');await page.getByRole('button',{name:'2. Service requirements',exact:true}).click();
  await help(page,'provider.upload').click();await expect(visiblePanel(page)).toContainText('Save the draft to attach');
  await page.keyboard.press('Escape');await expect(page.getByLabel('Registration document',{exact:false})).toHaveAttribute('type','file');
  await help(page,'provider.save').focus();await expect(visiblePanel(page)).toContainText('does not submit for review');
});
test('provider approval guidance is read-only and existing review handler still receives its decision',async({page})=>{
  await admin(page);let writes=0;
  const configuration={sections:[],declarations:[],checklist:[]};
  const app={id:'help-application',user_id:900002,status:'SUBMITTED',revision:1,common:{},common_configuration:configuration,documents:[],history:[],services:[{service_id:1,title:'Resume Building',status:'SUBMITTED',answers:{},requirement_id:1,requirements:{version:1,state:'PUBLISHED',configuration}}]};
  await page.route(/\/api\/admin\/provider-applications(?:\?page=1)?$/,r=>r.fulfill({json:[{id:app.id,business:'Help test business',status:'SUBMITTED',created_at:'2026-10-10T00:00:00Z'}]}));
  await page.route('**/api/admin/provider-applications/help-application',r=>r.fulfill({json:app}));
  await page.route('**/api/admin/provider-applications/help-application/services/1/review',r=>{writes++;expect(r.request().postDataJSON().status).toBe('APPROVED');return r.fulfill({json:{...app,status:'APPROVED',services:[{...app.services[0],status:'APPROVED'}]}});});
  await page.goto('/admin/provider-applications');await page.getByRole('button',{name:'Review application help-app'}).click();
  await help(page,'provider.approve').hover();await expect(visiblePanel(page)).toContainText('verified identity and an active provider');expect(writes).toBe(0);
  await page.keyboard.press('Escape');await page.getByLabel('Review reason for Resume Building').fill('Manual fixture evidence reviewed.');
  await page.getByRole('button',{name:'Approve this service',exact:true}).click();await expect.poll(()=>writes).toBe(1);
  await help(page,'status.service').click();await expect(visiblePanel(page)).toContainText('SUSPENDED and REJECTED services cannot');
});
