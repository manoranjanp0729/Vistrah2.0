import {test,expect} from '@playwright/test';
test.use({trace:'off',screenshot:'off',video:'off'});

test('login offers recovery and development configuration status is clear on mobile',async({page})=>{
  await page.goto('/login');await page.getByRole('link',{name:'Forgot password?',exact:true}).click();
  await expect(page).toHaveURL('/forgot-password');
  await expect(page.getByText('Email recovery is not configured on this development server.',{exact:false})).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await page.getByLabel('Email address').fill('missing-recovery@example.com');
  await page.getByRole('button',{name:'Send reset link',exact:true}).click();
  await expect(page.getByText('If an account matches that email and email delivery succeeds,',{exact:false})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('missing and unknown reset links offer safe recovery',async({page})=>{
  await page.goto('/reset-password');
  await expect(page.getByText('This reset link is missing or invalid.',{exact:false})).toBeVisible();
  const response=await page.request.get('/reset-password');
  expect(response.headers()['referrer-policy']).toBe('no-referrer');
  await page.evaluate(()=>window.location.hash='token='+'x'.repeat(43));await page.reload();
  await expect(page).toHaveURL('/reset-password');
  await page.getByLabel('New password',{exact:true}).fill(process.env.RECOVERY_NEW_PASSWORD!);
  await page.getByLabel('Confirm password',{exact:true}).fill(process.env.RECOVERY_NEW_PASSWORD!);
  await page.getByRole('button',{name:'Reset password',exact:true}).click();
  await expect(page.locator('#recovery-error')).toContainText('invalid or has already been used');
});

test('expired links show an expiration state without changing the account',async({page})=>{
  await page.goto('/reset-password');
  await page.evaluate(value=>{window.location.hash='token='+value;},process.env.RECOVERY_EXPIRED_TOKEN!);await page.reload();
  await expect(page).toHaveURL('/reset-password');
  await page.getByLabel('New password',{exact:true}).fill(process.env.RECOVERY_NEW_PASSWORD!);
  await page.getByLabel('Confirm password',{exact:true}).fill(process.env.RECOVERY_NEW_PASSWORD!);
  await page.getByRole('button',{name:'Reset password',exact:true}).click();
  await expect(page.locator('#recovery-error')).toContainText('expired');
});

test('matching fields are required before submitting a valid reset',async({page})=>{
  await page.goto('/reset-password');
  await page.evaluate(value=>{window.location.hash='token='+value;},process.env.RECOVERY_VALID_TOKEN!);await page.reload();
  await page.getByLabel('New password',{exact:true}).fill(process.env.RECOVERY_NEW_PASSWORD!);
  await page.getByLabel('Confirm password',{exact:true}).fill('a-different-long-passphrase');
  await page.getByRole('button',{name:'Reset password',exact:true}).click();
  await expect(page.locator('#recovery-error')).toHaveText('Passwords must match.');
});

test('successful reset revokes the old login, allows new login and preserves customer restrictions',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.name));
  const initial=await page.request.post('/api/auth/login',{headers:{Origin:process.env.BASE_URL!},data:{email:'recovery-customer@example.com',password:process.env.RECOVERY_INITIAL_PASSWORD!}});
  expect(initial.status()).toBe(200);
  await page.goto('/reset-password');
  await page.evaluate(value=>{window.location.hash='token='+value;},process.env.RECOVERY_VALID_TOKEN!);await page.reload();
  await page.setViewportSize({width:390,height:844});
  await page.getByLabel('New password',{exact:true}).fill(process.env.RECOVERY_NEW_PASSWORD!);
  await page.getByLabel('Confirm password',{exact:true}).fill(process.env.RECOVERY_NEW_PASSWORD!);
  await page.getByRole('button',{name:'Reset password',exact:true}).click();
  await expect(page.getByText('Your password has been reset. Sign in with your new password.',{exact:true})).toBeVisible();
  expect((await page.request.get('/api/me')).status()).toBe(401);
  await page.getByRole('link',{name:'Back to sign in',exact:true}).click();
  await page.getByLabel('Email address').fill('recovery-customer@example.com');
  await page.getByLabel('Password',{exact:true}).fill(process.env.RECOVERY_NEW_PASSWORD!);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page).toHaveURL('/account');
  expect((await page.request.get('/api/admin/overview')).status()).toBe(403);
  await page.goto('/admin');await expect(page.getByRole('heading',{name:'Administrator access required'})).toBeVisible();
  expect(errors).toEqual([]);
});
