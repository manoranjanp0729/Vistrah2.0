import {test,expect,type Page,type Locator} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import type {Category} from '../lib/types';

async function register(page:Page,next:string){
  await page.goto('/register?next='+encodeURIComponent(next));
  await page.getByLabel('Your name').fill('Provider browser fixture');
  await page.getByLabel('Email address').fill(`provider-browser-${Date.now()}@example.com`);
  await page.getByLabel('Password',{exact:true}).fill('provider-browser-test-password-123');
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await expect(page.getByLabel('Service category')).toBeVisible();
}
async function common(page:Page,name:string){
  await expect(page.getByLabel(/Legal business or individual name/)).toHaveCount(1);
  await page.getByLabel(/Legal business or individual name/).fill(name);
  await page.getByLabel(/Business structure/).selectOption('Individual');
  await page.getByLabel(/Authorized contact name/).fill('Provider browser fixture');
  await page.getByLabel(/Business email/).fill('browser-provider@example.com');
  await page.getByLabel(/Business contact number/).fill('6364456776');
  await page.getByLabel(/Business address/).fill('Private browser fixture address, Bengaluru');
  await page.getByLabel(/Primary operating location/).fill('Bengaluru');
  await page.getByLabel(/^Service areas/).fill('Bengaluru');
  await page.getByRole('checkbox',{name:/I confirm these details/}).check();
  await page.getByRole('checkbox',{name:/I consent to VISTRAH/}).check();
}
async function capability(group:Locator){
  await group.getByLabel(/Describe your capability/).fill('Browser fixture offering a clearly described service for manual review.');
  await group.getByLabel(/Years of relevant experience/).fill('4');
  await group.getByLabel(/Applicable registrations or practising credentials/).selectOption('Not applicable');
  await group.getByLabel(/Explain applicability or uncertainty/).fill('Applicability of registrations to this declared scope requires manual assessment.');
  await group.getByRole('checkbox',{name:/I confirm this service information/}).check();
  await group.getByRole('checkbox',{name:/I am authorized to offer this service/}).check();
}
async function administrator(page:Page){
  await page.goto('/login?next=/admin/provider-applications');
  await page.getByLabel('Email address').fill('qa-admin@example.com');
  await page.getByLabel('Password',{exact:true}).fill(process.env.QA_ADMIN_PASSWORD!);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.locator('.admin-heading h1')).toHaveText('Provider Applications');
}
async function review(page:Page,app:string,title:string){
  await page.goto('/admin/provider-applications?application='+app);
  const group=page.locator('.provider-review .provider-service-form').filter({has:page.getByRole('heading',{name:title,exact:true})});
  await expect(group).toBeVisible();
  const checks=group.getByRole('group',{name:'Manual verification checklist'}).getByRole('checkbox');
  for(const checkbox of await checks.all())await checkbox.check();
  await group.getByLabel('Review reason for '+title).fill('Browser fixture evidence and authority checked for this individual service.');
  await group.getByRole('button',{name:'Approve this service',exact:true}).click();
  await expect(group.locator('.status').first()).toHaveText('APPROVED');
}
const applicationId=(page:Page)=>new URL(page.url()).searchParams.get('application')!;

test('all category pages preserve the customer CTA and offer the correct provider category on desktop and mobile',async({page})=>{
  const categories:Category[]=await (await page.request.get('/api/catalogue')).json();
  expect(categories).toHaveLength(8);
  for(const [index,category] of categories.entries()){
    await page.setViewportSize({width:index%2?390:1280,height:900});
    await page.goto('/service/'+category.slug);
    const choose=page.getByRole('link',{name:'Choose a service',exact:true});const provide=page.getByRole('link',{name:'Provide a service',exact:true});
    await expect(choose).toHaveAttribute('href','#category-services');
    await expect(provide).toHaveAttribute('href',`/provide-service?category=${category.id}`);
    await expect(provide).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.getByRole('link',{name:'Provide a service',exact:true}).click();
  await expect(page.getByRole('link',{name:'Sign in',exact:true}).last()).toHaveAttribute('href',/next=%2Fprovide-service%3Fcategory%3D/);
});

test('multiple services retain a draft, render different questions and become publicly eligible only after individual approval',async({page,browser})=>{
  const categories:Category[]=await (await page.request.get('/api/catalogue')).json();const category=categories.find(c=>c.slug==='jobs-careers')!;
  const resume=category.services.find(s=>s.slug==='resume-building')!,interview=category.services.find(s=>s.slug==='interview-preparation')!;
  await register(page,`/provide-service?category=${category.id}`);await expect(page.getByLabel('Service category')).toHaveValue(String(category.id));
  await page.getByRole('checkbox',{name:resume.title,exact:true}).check();await page.getByRole('checkbox',{name:interview.title,exact:true}).check();
  await page.getByRole('button',{name:'Continue to business details'}).click();
  const company='QA provider business '+Date.now();await common(page,company);
  await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByText('Draft saved. You can resume it from My provider applications.')).toBeVisible();
  const app=applicationId(page);expect(app).toMatch(/^[0-9a-f-]{36}$/);await page.reload();await expect(page.getByLabel(/Legal business or individual name/)).toHaveValue(company);
  await page.getByRole('button',{name:'Continue to service requirements'}).click();
  const first=page.locator('.provider-service-form').filter({has:page.getByRole('heading',{name:resume.title,exact:true})});const second=page.locator('.provider-service-form').filter({has:page.getByRole('heading',{name:interview.title,exact:true})});
  for(const group of [first,second]){await capability(group);await group.getByLabel(/Will you recruit for employers/).selectOption('false');await group.getByLabel(/How do you protect candidate information/).fill('Candidate documents are restricted to authorized staff and removed when no longer needed.');}
  await expect(first.getByLabel(/Interview coaching approach/)).toHaveCount(0);await expect(second.getByLabel(/Interview coaching approach/)).toBeVisible();await second.getByLabel(/Interview coaching approach/).fill('Structured practice interviews and individual feedback against the candidate target role.');
  await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByText('Draft saved. You can resume it from My provider applications.')).toBeVisible();
  await page.reload();await page.getByRole('button',{name:'2. Service requirements'}).click();await expect(second.getByLabel(/Interview coaching approach/)).toHaveValue(/Structured practice/);
  await page.getByRole('button',{name:'Continue to review'}).click();await page.getByRole('button',{name:'Submit application for review'}).click();
  await expect(page.getByText('Application submitted for manual review. No service is listed until approved.')).toBeVisible();
  expect(await (await page.request.get(`/api/services/${resume.id}/providers`)).json()).toEqual([]);
  const context=await browser.newContext();const admin=await context.newPage();await administrator(admin);await review(admin,app,resume.title);
  const providers=await (await page.request.get(`/api/services/${resume.id}/providers`)).json();expect(providers).toHaveLength(1);expect(providers[0].company).toBe(company);
  expect(await (await page.request.get(`/api/services/${interview.id}/providers`)).json()).toEqual([]);
  await page.goto(`/service/${category.slug}/service/${resume.slug}/companies`);await expect(page.getByRole('heading',{name:company})).toBeVisible();
  await page.goto('/account/provider-applications');await expect(page.getByRole('heading',{name:'My provider applications'})).toBeVisible();await expect(page.getByRole('link',{name:'View application and review history'})).toBeVisible();
  await admin.screenshot({path:'../artifacts/provider-onboarding/manual-service-review-desktop.png',fullPage:true});
  await page.screenshot({path:'../artifacts/provider-onboarding/provider-account-desktop.png',fullPage:true});await context.close();
});

test('real estate conditionals, evidence upload, private binary download and mobile submission work end to end',async({page,browser})=>{
  await page.setViewportSize({width:390,height:900});const categories:Category[]=await (await page.request.get('/api/catalogue')).json();const category=categories.find(c=>c.slug==='real-estate')!,service=category.services[0];
  await register(page,`/provide-service?category=${category.id}`);await page.getByRole('checkbox',{name:service.title,exact:true}).check();await page.getByRole('button',{name:'Continue to business details'}).click();await common(page,'QA property provider '+Date.now());
  await page.getByRole('button',{name:'Continue to service requirements'}).click();const group=page.locator('.provider-service-form');await capability(group);
  await group.getByLabel(/Property services and operating experience/).fill('Property search and client coordination experience for this isolated browser fixture.');
  await group.getByLabel(/Will you represent owners/).selectOption('false');await expect(group.getByLabel(/Evidence of authority to represent/)).toHaveCount(0);
  await group.getByLabel(/Will you represent owners/).selectOption('true');await expect(group.getByLabel(/Evidence of authority to represent/)).toBeVisible();
  await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('button',{name:'Continue to review'}).click();await page.getByRole('button',{name:'Submit application for review'}).click();await expect(page.getByRole('alert').filter({hasText:'Evidence of authority'})).toBeVisible();
  await page.getByRole('button',{name:'2. Service requirements'}).click();const png=await sharp({create:{width:2,height:2,channels:3,background:'#ffffff'}}).png().toBuffer();
  await group.getByLabel(/Evidence of authority to represent/).setInputFiles({name:'test-evidence.png',mimeType:'image/png',buffer:png});await expect(group.getByText(/Document attached/)).toBeVisible();
  await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByText('Draft saved. You can resume it from My provider applications.')).toBeVisible();await page.getByRole('button',{name:'Continue to review'}).click();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:/authority document/}).click();const download=await downloadPromise;expect(await readFile((await download.path())!)).toEqual(png);
  const app=applicationId(page);const data=await (await page.request.get('/api/provider-applications/'+app)).json();expect(data.documents).toHaveLength(1);
  const documentResponse=await page.request.get(`/api/provider-applications/${app}/documents/${data.documents[0].id}`);
  expect(documentResponse.headers()['content-security-policy']).toContain('sandbox');
  expect(documentResponse.headers()['x-content-type-options']).toBe('nosniff');
  expect(documentResponse.headers()['cache-control']).toContain('no-store');
  const anonymous=await browser.newContext();const other=await anonymous.newPage();expect((await other.request.get(`/api/provider-applications/${app}/documents/${data.documents[0].id}`)).status()).toBe(401);await anonymous.close();
  await page.getByRole('button',{name:'Submit application for review'}).click();await expect(page.getByText('Application submitted for manual review. No service is listed until approved.')).toBeVisible();
  const context=await browser.newContext();const admin=await context.newPage();await administrator(admin);await review(admin,app,service.title);
  const rows=await (await page.request.get(`/api/services/${service.id}/providers`)).json();expect(rows).toHaveLength(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'../artifacts/provider-onboarding/submitted-mobile.png',fullPage:true});await context.close();
});

test('admin creates, validates, previews and publishes a configuration version while preserving the prior version',async({page})=>{
  await administrator(page);await page.goto('/admin/provider-requirements');await page.getByRole('button',{name:'Create configuration draft'}).click();
  await expect(page.getByRole('heading',{name:'Version 2 · DRAFT'})).toBeVisible();
  await page.getByText('Full declarative configuration: conditions, documents, validation and reviewer checklist').click();
  const json=page.getByLabel('Configuration JSON');const original=JSON.parse(await json.inputValue());const invalid=structuredClone(original);invalid.sections[0].fields[0].visible_if={field:'unknown_previous_question',value:true};
  await json.fill(JSON.stringify(invalid,null,2));await page.getByLabel('Change note').fill('Browser fixture validating and publishing a changed version.');
  await page.getByRole('button',{name:'Publish configuration',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Conditions must reference a previous field'})).toBeVisible();
  original.sections[0].fields.push({id:'additional_context',label:'Additional review context',type:'text',required:false});await json.fill(JSON.stringify(original,null,2));
  await page.getByRole('button',{name:'Validate and preview form'}).click();await expect(page.getByRole('heading',{name:'Provider form preview'})).toBeVisible();await expect(page.locator('.provider-preview').getByLabel(/Additional review context/)).toBeVisible();
  await page.screenshot({path:'../artifacts/provider-onboarding/requirements-preview-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Publish configuration',exact:true}).click();await expect(page.getByRole('heading',{name:'Version 2 · PUBLISHED'})).toBeVisible();
  await page.getByLabel('Configuration version').selectOption({label:'Version 1 · PUBLISHED · 1 applications'});await expect(page.getByRole('heading',{name:'Version 1 · PUBLISHED'})).toBeVisible();await expect(page.getByLabel('Configuration JSON')).toBeDisabled();
});

test('a correction previews and adopts the reviewer requested version even after a newer publication',async({page,browser})=>{
  const categories:Category[]=await (await page.request.get('/api/catalogue')).json();
  const category=categories.find(c=>c.slug==='jobs-careers')!,service=category.services.find(s=>s.slug==='resume-building')!;
  await register(page,`/provide-service?category=${category.id}`);
  await page.getByRole('checkbox',{name:service.title,exact:true}).check();await page.getByRole('button',{name:'Continue to business details'}).click();
  await common(page,'QA version correction '+Date.now());await page.getByRole('button',{name:'Continue to service requirements'}).click();
  const group=page.locator('.provider-service-form');await capability(group);
  await group.getByLabel(/Will you recruit for employers/).selectOption('false');await group.getByLabel(/How do you protect candidate information/).fill('Private records are available only to authorized team members.');
  await page.getByRole('button',{name:'Continue to review'}).click();await page.getByRole('button',{name:'Submit application for review'}).click();
  await expect(page.getByText('Application submitted for manual review. No service is listed until approved.')).toBeVisible();const app=applicationId(page);
  const context=await browser.newContext();const admin=await context.newPage();await administrator(admin);
  const origin=new URL(admin.url()).origin;
  async function publish(){const draft=await (await admin.request.post(`/api/admin/provider-requirements/${service.id}/drafts`,{headers:{Origin:origin}})).json();const response=await admin.request.post(`/api/admin/provider-requirements/versions/${draft.id}/publish`,{headers:{Origin:origin}});expect(response.status()).toBe(200);return response.json();}
  const requested=await publish();const submitted=await (await admin.request.get('/api/admin/provider-applications/'+app)).json();
  const decision=await admin.request.post(`/api/admin/provider-applications/${app}/services/${service.id}/review`,{headers:{Origin:origin},data:{revision:submitted.revision,status:'CHANGES_REQUESTED',reason:'Please explicitly adopt the requested version and renew the service declarations.',require_current_version:true}});expect(decision.status()).toBe(200);
  const latest=await publish();expect(latest.version).toBe(requested.version+1);
  await page.reload();await page.getByRole('button',{name:'2. Service requirements'}).click();
  const update=group.locator('details.notice');await update.locator('summary').click();
  await expect(update.locator('summary')).toHaveText(`Version ${requested.version} is available and required by your reviewer`);
  await expect(update.getByRole('button',{name:`Adopt version ${latest.version}`,exact:true})).toHaveCount(0);
  page.once('dialog',dialog=>dialog.accept());await update.getByRole('button',{name:`Adopt version ${requested.version}`,exact:true}).click();
  await expect(page.getByText('New version adopted. Review the service questions and declarations again.')).toBeVisible();
  await expect(group.getByLabel(/Describe your capability/).last()).toHaveValue('Browser fixture offering a clearly described service for manual review.');
  const currentForm=group.locator(':scope > .provider-fields');
  await currentForm.getByRole('checkbox',{name:/I confirm this service information/}).check();await currentForm.getByRole('checkbox',{name:/I am authorized to offer this service/}).check();
  await page.getByRole('button',{name:'Continue to review'}).click();await page.getByRole('checkbox',{name:/I reviewed the newer configurations/}).check();await page.getByRole('button',{name:'Submit application for review'}).click();
  await expect(page.getByText('Application submitted for manual review. No service is listed until approved.')).toBeVisible();
  const result=await (await page.request.get('/api/provider-applications/'+app)).json();expect(result.services[0].requirement_id).toBe(requested.id);expect(result.services[0].status).toBe('SUBMITTED');
  await context.close();
});
