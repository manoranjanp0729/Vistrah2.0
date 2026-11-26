import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';

const protectedPaths=['/api/admin/overview','/api/admin/provider-applications','/api/admin/workflows','/api/admin/job-sources'];
function diagnostics(page:Page){
  const failures:string[]=[];
  page.on('pageerror',error=>failures.push(error.name));
  page.on('response',response=>{if(response.status()>=500)failures.push(`${response.status()} ${new URL(response.url()).pathname}`);});
  return failures;
}
async function signIn(page:Page,next?:string){
  const password=process.env.QA_ADMIN_PASSWORD;
  if(!password)throw new Error('An isolated QA administrator password is required.');
  await page.goto('/login'+(next?'?next='+encodeURIComponent(next):''));
  await page.getByLabel('Email address').fill('qa-admin@example.com');
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
}

test('anonymous admin destinations redirect to login and admin APIs reject access',async({page})=>{
  const failures=diagnostics(page);
  for(const destination of ['/admin','/admin/provider-requirements']){
    await page.goto(destination);
    await expect(page).toHaveURL('/login?next='+encodeURIComponent(destination));
    await expect(page.getByRole('navigation',{name:'Admin navigation'})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
  }
  for(const path of protectedPaths)expect((await page.request.get(path)).status()).toBe(401);
  expect(failures).toEqual([]);
});

test('normal admin login exposes the existing dashboard and desktop/mobile navigation',async({page})=>{
  const failures=diagnostics(page);
  await signIn(page);
  await expect(page).toHaveURL('/admin');
  await expect(page.locator('.stat-card')).toHaveCount(4);
  const navigation=page.getByRole('navigation',{name:'Admin navigation'});
  await expect(navigation.getByRole('link')).toHaveCount(12);
  for(const [section,heading] of [['provider-requirements','Provider Requirements'],['provider-applications','Provider Applications'],['job-sources','Job Sources'],['workflows','Workflow Operations']]){
    await navigation.getByRole('link',{name:heading,exact:true}).click();
    await expect(page).toHaveURL('/admin/'+section);
    await expect(page.locator('.admin-heading h1')).toHaveText(heading);
    if(section==='provider-requirements')await expect(page.getByLabel('Service requirements')).toBeVisible();
  }
  await page.goto('/account');
  await expect(page.getByRole('navigation',{name:'Account navigation'}).getByRole('link',{name:'Control center'})).toHaveAttribute('href','/admin');
  await page.goto('/');
  await expect(page.locator('.account-link')).toHaveText('Admin dashboard');
  await expect(page.locator('.account-link')).toHaveAttribute('href','/admin');
  await page.locator('.account-link').click();await expect(page.locator('.stat-card')).toHaveCount(4);
  await page.goto('/');await page.setViewportSize({width:390,height:900});
  await page.getByRole('button',{name:'Open menu'}).click();
  await page.locator('#mobile-navigation').getByRole('link',{name:'Admin dashboard',exact:true}).click();
  await expect(page).toHaveURL('/admin');await expect(page.locator('.stat-card')).toHaveCount(4);
  await page.getByRole('button',{name:'Toggle admin sidebar'}).click();
  await navigation.getByRole('link',{name:'Provider Requirements',exact:true}).click();
  await expect(page.getByLabel('Service requirements')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(failures).toEqual([]);
});

test('explicit admin return destinations survive login and logout revokes access',async({page})=>{
  const failures=diagnostics(page);await signIn(page,'/admin/provider-requirements');
  await expect(page).toHaveURL('/admin/provider-requirements');
  await expect(page.getByLabel('Service requirements')).toBeVisible();
  const cookie=(await page.context().cookies()).find(cookie=>cookie.name==='vistrah_session');
  expect(cookie?.httpOnly).toBe(true);
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await expect(page).toHaveURL('/login');
  expect((await page.request.get('/api/admin/overview',{headers:{Cookie:`vistrah_session=${cookie!.value}`}})).status()).toBe(401);
  await page.goto('/admin');await expect(page).toHaveURL('/login?next=%2Fadmin');
  expect(failures).toEqual([]);
});

test('customer login and navigation remain intact and direct admin access stays blocked',async({page})=>{
  const failures=diagnostics(page);const email=`qa-admin-access-${randomUUID()}@example.com`,password=randomUUID()+randomUUID();
  await page.goto('/register');await page.getByLabel('Your name').fill('Admin access customer fixture');
  await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Create account',exact:true}).click();await expect(page).toHaveURL('/account');
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await page.goto('/login');await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page).toHaveURL('/account');await page.goto('/');
  await expect(page.locator('.account-link')).toHaveText('My account');await expect(page.locator('.account-link')).toHaveAttribute('href','/account');
  await expect(page.getByRole('link',{name:'Admin dashboard',exact:true})).toHaveCount(0);
  for(const destination of ['/admin','/admin/provider-requirements']){
    await page.goto(destination);await expect(page.getByRole('heading',{name:'Administrator access required'})).toBeVisible();
    await expect(page.getByRole('navigation',{name:'Admin navigation'})).toHaveCount(0);
  }
  for(const path of protectedPaths)expect((await page.request.get(path)).status()).toBe(403);
  const catalogue=await (await page.request.get('/api/catalogue')).json();const service=catalogue[0].services[0];
  expect((await page.request.get('/api/admin/provider-requirements/'+service.id)).status()).toBe(403);
  await page.goto('/account');await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await page.goto('/login?next=%2Faccount%2Frequests');await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page).toHaveURL('/account/requests');expect(failures).toEqual([]);
});
