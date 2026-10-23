// Requires a fresh disposable fixture API on :8197 and admin Next dev on :3327.
// Admin QA env: API_URL=http://127.0.0.1:8197, ALLOWED_ORIGINS=http://127.0.0.1:3327,
// TEST_NEXT_DIST_DIR=.next-edit-vistrah-qa. Never points at normal containers/data.
import console from 'node:console';
import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1400,height:1050}});
 page.setDefaultTimeout(15000);
 console.log('Opening isolated editor');
 await page.context().addCookies([{name:'vistrah_admin_session',value:'isolated-cms-fixture-only',url:'http://127.0.0.1:3327',httpOnly:true,sameSite:'Lax'}]);
 page.on('dialog',dialog=>void dialog.accept());
 await page.goto('http://127.0.0.1:3327/admin/edit-vistrah',{waitUntil:'domcontentloaded',timeout:90000});
 await expect(page.getByRole('button',{name:/Home Page.*App content/})).toBeVisible({timeout:30000});
 await expect(page.getByText('Existing app page baseline:',{exact:false})).toBeVisible();
 console.log('Existing page tabs available');
 await page.getByRole('button',{name:/Digital Marketing.*App content/}).click();
 console.log('Marketing page selected');
 const heading=page.getByRole('textbox',{name:'Heading',exact:true}).first();
 await expect(heading).not.toHaveValue('');
 await heading.fill('Synthetic CMS browser proof');
 await page.getByRole('button',{name:'Save Draft',exact:true}).click();
 await expect(page.getByText(/Saved draft revision/)).toBeVisible();
 const before=await page.request.get('http://127.0.0.1:8197/edit-vistrah/pages/digital-marketing');
 expect(before.status()).toBe(404);
 await page.getByRole('button',{name:'Make It Live',exact:true}).click();
 await expect(page.getByText(/is now LIVE/)).toBeVisible();
 const live=await (await page.request.get('http://127.0.0.1:8197/edit-vistrah/pages/digital-marketing')).json();
 expect(live.sections[0].content.en.title).toBe('Synthetic CMS browser proof');
 await heading.fill('Synthetic unpublished draft');
 await page.getByRole('button',{name:'Save Draft',exact:true}).click();
 await expect(page.getByText(/Saved draft revision/)).toBeVisible();
 const unchanged=await (await page.request.get('http://127.0.0.1:8197/edit-vistrah/pages/digital-marketing')).json();
 expect(unchanged.sections[0].content.en.title).toBe('Synthetic CMS browser proof');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:/Digital Marketing.*Live v.*draft/}).click();
 await expect(page.getByRole('textbox',{name:'Heading',exact:true}).first()).toHaveValue('Synthetic unpublished draft');
 await page.route('**/api/admin/edit-vistrah/library',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Synthetic library outage'})}));
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.getByRole('button',{name:/Home Page.*App content/})).toBeVisible();
 await expect(page.getByText('The section library could not load.',{exact:false})).toBeVisible();
 await page.unroute('**/api/admin/edit-vistrah/library');
 await page.route('**/api/admin/edit-vistrah/pages',route=>route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({detail:'Synthetic old API'})}));
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.getByText(/running API \(404\)/)).toBeVisible();
 await expect(page.getByRole('button',{name:'Add Page',exact:true})).toBeDisabled();
 await page.unroute('**/api/admin/edit-vistrah/pages');
 await page.getByRole('button',{name:'Retry loading existing pages'}).click();
 await expect(page.getByRole('button',{name:/Home Page.*App content/})).toBeVisible();
 await page.setViewportSize({width:390,height:844});
 await expect(page.getByRole('button',{name:/Home Page.*App content/})).toBeVisible();
 console.log('PASS: existing pages, populated marketing details, draft, publish, live snapshot isolation, reload, library outage, API 404 recovery, narrow viewport. Disposable fixture data only.');
}finally{await browser.close();}
