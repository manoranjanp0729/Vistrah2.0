import {test,expect,type Page} from '@playwright/test';

async function loadedFace(page:Page,selector:string) {
  return page.locator(selector).first().evaluate(async element=>{
    await document.fonts.ready;
    const style=getComputedStyle(element);
    const family=style.fontFamily.split(',')[0].replaceAll('"','').trim();
    return {
      family,weight:style.fontWeight,size:parseFloat(style.fontSize),
      loaded:[...document.fonts].some(face=>face.family.replaceAll('"','')===family&&face.status==='loaded'),
    };
  });
}

test('cold font loading is local, with real editorial italics and Inter UI weights',async({page})=>{
  const fontRequests:string[]=[];
  await page.addInitScript(()=>{
    const state=window as Window & {typographyCLS?:number};
    state.typographyCLS=0;
    new PerformanceObserver(list=>{
      for(const entry of list.getEntries()){
        const shift=entry as PerformanceEntry & {value:number;hadRecentInput:boolean};
        if(!shift.hadRecentInput)state.typographyCLS=(state.typographyCLS??0)+shift.value;
      }
    }).observe({type:'layout-shift',buffered:true});
  });
  await page.route(/\.(woff2|ttf)(\?|$)/,async route=>{
    await new Promise(resolve=>setTimeout(resolve,250));
    await route.continue();
  });
  page.on('request',request=>{
    if(request.resourceType()==='font'||/fonts\.(googleapis|gstatic)\.com/.test(request.url()))fontRequests.push(request.url());
  });
  await page.goto('/');
  for(const [selector,family,weight] of [['body','inter','400'],['.hero h1','dmSerif','400'],['.hero h1 em','dmSerifItalic','400'],['.category-copy h3','inter','600'],['.button','inter','600']]){
    expect(await loadedFace(page,selector)).toMatchObject({family,weight,loaded:true});
  }
  expect(fontRequests.length).toBeGreaterThan(0);
  expect(fontRequests.every(url=>new URL(url).origin===new URL(page.url()).origin)).toBe(true);
  expect(await page.locator('body').evaluate(el=>getComputedStyle(el).fontSynthesis)).toBe('none');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const layoutShift=await page.evaluate(()=>(window as Window & {typographyCLS?:number}).typographyCLS);
  expect(layoutShift).toBeLessThan(.1);
  await test.info().attach('font-loading.json',{body:JSON.stringify({fontRequests,layoutShift}),contentType:'application/json'});
  await page.goto('/login');
  expect(await loadedFace(page,'.auth-form-wrap h2')).toMatchObject({family:'inter',loaded:true});
  for(const input of await page.locator('.form input').all()){
    expect(await input.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  }
});

test('operational pages use Inter and do not download unused serif or italic faces',async({page,browser})=>{
  await page.goto('/login?next=/admin');
  await page.getByLabel('Email address').fill('qa-admin@example.com');
  await page.getByLabel('Password',{exact:true}).fill(process.env.QA_ADMIN_PASSWORD!);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.locator('.admin-heading h1')).toBeVisible();
  // Isolate the direct load from the login page's font cache and trace snapshots.
  const context=await browser.newContext({storageState:await page.context().storageState()});
  try {
    const admin=await context.newPage();
    const fonts:string[]=[];
    admin.on('request',request=>{if(request.resourceType()==='font')fonts.push(request.url());});
    await admin.goto(new URL('/admin',page.url()).href);
    await expect(admin.locator('.stat-card strong').first()).toBeVisible();
    for(const selector of ['body','.admin-heading h1','.stat-card strong','.admin-sidebar nav>a']){
      expect(await loadedFace(admin,selector)).toMatchObject({family:'inter',loaded:true});
    }
    expect(fonts).toHaveLength(1);
    expect(fonts[0]).toContain('InterVariable-');
    for(const width of [1440,768,390,320]){
      await admin.setViewportSize({width,height:1000});
      await admin.goto(new URL('/admin/catalogue',page.url()).href);
      await admin.getByRole('button',{name:'Add record'}).click();
      const dialog=admin.getByRole('dialog');
      await expect(dialog).toBeVisible();
      expect(await loadedFace(admin,'.dialog-heading h2')).toMatchObject({family:'inter',loaded:true});
      await expect(dialog.getByLabel('Title',{exact:true})).toBeVisible();
      expect(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await admin.screenshot({path:`../artifacts/typography/dialog-${width}.png`});
      await dialog.getByRole('button',{name:'Close dialog'}).click();
    }
    await admin.setViewportSize({width:390,height:1000});
    await admin.goto(new URL('/admin/payments',page.url()).href);
    await admin.getByRole('button',{name:'View ledger'}).first().click();
    expect(await loadedFace(admin,'.ledger-json')).toMatchObject({family:'inter',loaded:true});
    await admin.getByRole('button',{name:'Close dialog'}).click();
    for(const route of ['/admin/workflows','/admin/job-sources','/account/profile','/account/finds']){
      await admin.goto(new URL(route,page.url()).href);
      await expect(admin.locator('h1').first()).toBeVisible();
      if(route.startsWith('/admin/'))await expect(admin.getByText('Loading operational data…',{exact:true})).toHaveCount(0);
      if(route==='/admin/workflows')await expect(admin.getByRole('heading',{name:'Worker health',exact:true})).toBeVisible();
      if(route==='/admin/job-sources')await expect(admin.getByRole('heading',{name:'Adzuna (UK)',exact:true})).toBeVisible();
      if(route==='/account/finds')await expect(admin.getByText('Loading your requests…',{exact:true})).toHaveCount(0);
      await admin.evaluate(()=>{document.documentElement.style.fontSize='200%';});
      await admin.evaluate(()=>document.fonts.ready);
      await admin.screenshot({path:`../artifacts/typography/${route.split('/').join('-').slice(1)}-text-200.png`});
      const overflow=await admin.evaluate(()=>({
        width:document.documentElement.scrollWidth,
        offenders:[...document.querySelectorAll('body *')].filter(el=>{
          if(el.closest('.table-wrap')||el.closest('.account-sidebar nav'))return false;
          const box=el.getBoundingClientRect();return box.width>0&&box.right>innerWidth+1;
        }).slice(0,20).map(el=>({tag:el.tagName,class:el.className,width:el.getBoundingClientRect().width})),
      }));
      expect(overflow.width,`${route} at 200% text: ${JSON.stringify(overflow.offenders)}`).toBeLessThanOrEqual(390);
      expect(await admin.locator('.admin-topbar,.header-inner').evaluate(el=>{
        const parent=el.getBoundingClientRect();
        return [...el.children].every(child=>{const box=child.getBoundingClientRect();return box.top>=parent.top&&box.bottom<=parent.bottom;});
      }),`${route} header contains wrapped text`).toBe(true);
      expect(await admin.locator('.brand,.admin-brand').first().evaluate(el=>{
        const range=document.createRange();range.selectNodeContents(el.firstChild!);
        return range.getClientRects().length;
      }),`${route} preserves the wordmark on one line`).toBe(1);
    }
  } finally { await context.close(); }
});

test('narrow pages and 200% text remain readable without document overflow',async({page})=>{
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:1000});
    for(const route of ['/','/services','/membership','/register','/jobs']){
      await page.goto(route);
      await page.evaluate(()=>document.fonts.ready);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${route} at ${width}`).toBe(true);
      if(width===390){
        await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${route} with 200% text`).toBe(true);
        expect(await page.locator('body').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBe(32);
      }
    }
  }
});
