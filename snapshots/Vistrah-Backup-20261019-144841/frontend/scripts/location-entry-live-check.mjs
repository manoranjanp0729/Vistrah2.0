/** Read-only anonymous browser diagnosis: no normal database writes or login. */
import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import console from 'node:console';
import {URL} from 'node:url';
const base='http://localhost:3100';
const artifacts=resolve('../artifacts/wp05-entry');mkdirSync(artifacts,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const rows=[];
try{
  const context=await browser.newContext();
  const response=await context.request.get(base+'/api/catalogue');
  if(!response.ok())throw new Error('Live public catalogue unavailable: '+response.status());
  const categories=await response.json();
  const category=categories.find(c=>c.services?.length||c.subcategories?.some(s=>s.services?.length));
  const subcategory=category.services.length?null:category.subcategories.find(s=>s.services.length);
  const service=(subcategory||category).services[0];
  const path=`/service/${category.slug}/${subcategory?subcategory.slug+'/':''}service/${service.slug}`;
  for(const width of [1440,390]){
    const page=await context.newPage();await page.setViewportSize({width,height:900});
    let gpsCalls=0;await page.exposeFunction('recordGps',()=>{gpsCalls++;});
    await page.addInitScript(()=>{Object.defineProperty(globalThis.navigator,'geolocation',{configurable:true,value:{getCurrentPosition(_success,failure){globalThis.recordGps();failure({code:1,message:'Permission denied'});}}});});
    await page.route('**/*',async route=>{const url=new URL(route.request().url());if(!['localhost','127.0.0.1'].includes(url.hostname)||!['GET','HEAD'].includes(route.request().method()))await route.abort();else await route.continue();});
    for(const [label,url] of [['home','/'],['services','/services'],['detail',path],['guarded-directory',path+'/companies']]){
      const result=await page.goto(base+url);await page.waitForTimeout(300);
      rows.push({label,url,width,status:result.status(),chooseControls:await page.getByRole('button',{name:'Choose your location',exact:true}).count(),chooseText:await page.getByText('Choose your location',{exact:true}).count(),gpsActions:await page.getByRole('button',{name:'Use my location',exact:true}).count(),nearbyControls:await page.getByRole('heading',{name:'Find providers near your location',exact:true}).count(),leafletMaps:await page.locator('.leaflet-container').count(),tabs:await page.getByRole('tab').count(),accessGate:await page.getByRole('heading',{name:'Sign in to continue',exact:true}).count(),gpsCalls,overflow:await page.evaluate(()=>globalThis.document.documentElement.scrollWidth>globalThis.innerWidth+1)});
      expect(result.status()).toBe(200);
      if(label==='home'){
        await expect(page.locator('header .brand')).toContainText('Services. Simplified.');
        await expect(page.locator('h1')).toHaveText('Discover services.Offer your expertise.');
        await expect(page.locator('.compact-category')).toHaveCount(categories.length);
        const nearby=page.getByRole('region',{name:'Services Near You',exact:true});
        await expect(nearby.getByRole('heading',{name:'Sign in to continue',exact:true})).toBeVisible();
        await expect(nearby.locator('.provider-card,.carousel-track,.leaflet-container')).toHaveCount(0);
        const affiliate=page.getByRole('region',{name:'Affiliate brands',exact:true});
        await expect(affiliate).toContainText('No affiliate brands or links are configured.');
        await expect(affiliate.locator('a')).toHaveCount(0);
        rows.at(-1).categoryCards=categories.length;rows.at(-1).nearbyMembershipGated=true;rows.at(-1).affiliateEmpty=true;
      }
      if(label==='detail'){
        await expect(page.getByRole('tab')).toHaveCount(3);
        for(const tab of await page.getByRole('tab').all()){
          await tab.click();await expect(page.getByRole('tabpanel').getByRole('heading',{name:'Sign in to continue',exact:true})).toBeVisible();
          await expect(page.locator('.provider-card,.leaflet-container,form textarea[name="requirements"]')).toHaveCount(0);
        }
        rows.at(-1).allThreeTabsGated=true;
        await page.evaluate(()=>globalThis.scrollTo({top:0,behavior:'instant'}));
      }
      if(label!=='guarded-directory'){
        const chooser=page.getByRole('button',{name:'Choose your location',exact:true});
        await expect(chooser).toBeVisible();await expect(chooser).toBeInViewport();
        const search=page.getByRole('search');await expect(search).toBeVisible();
        const locationBox=await chooser.boundingBox(),searchBox=await search.boundingBox();
        if(width===1440)expect(searchBox.x).toBeGreaterThan(locationBox.x);
        else expect(searchBox.y).toBeGreaterThan(locationBox.y);
        rows.at(-1).locationInHeader=await page.locator('header').getByRole('button',{name:'Choose your location',exact:true}).count()>0;
        rows.at(-1).locationSearchResponsive=true;
        expect(gpsCalls).toBe(0);
        await chooser.click();
        await expect(page.getByLabel('Locality',{exact:true})).toBeVisible();
        await page.getByRole('button',{name:'Use my location',exact:true}).click();
        await expect(page.getByText(/GPS was denied or unavailable/)).toBeVisible();expect(gpsCalls).toBe(1);
        await page.getByLabel('Locality',{exact:true}).fill('Synthetic locality');
        await page.getByLabel('Manual address',{exact:true}).fill('Synthetic test address');
        await page.getByLabel('Landmark',{exact:true}).fill('Synthetic landmark');
        await page.getByLabel('PIN code',{exact:true}).fill('560001');
        await page.getByLabel('Search latitude',{exact:true}).fill('12.97');
        await page.getByLabel('Search longitude',{exact:true}).fill('77.59');
        await page.getByRole('button',{name:'Use this location',exact:true}).click();
        await expect(page.getByRole('status')).toContainText('temporary');
        await expect(page.getByLabel('Search radius',{exact:true}).locator('option')).toHaveText(['2 km','5 km','10 km','25 km']);
        await expect(page.getByText(/Live map tiles and address lookup are unavailable/)).toBeVisible();
        expect(await page.locator('.leaflet-container,.business-pin,.provider-card').count()).toBe(0);
        rows.at(-1).usable=true;rows.at(-1).manualConfirmed=true;rows.at(-1).gpsDenialFallback=true;
        expect(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth>globalThis.innerWidth+1)).toBe(false);
      }else await expect(page.getByRole('heading',{name:'Sign in to continue',exact:true})).toBeVisible();
      await page.screenshot({path:join(artifacts,`live-${label}-${width}.png`),fullPage:true,caret:'initial'});
      gpsCalls=0;
    }
    await page.close();
  }
  await context.close();writeFileSync(join(artifacts,'live-diagnosis.json'),JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows));
}finally{await browser.close();}
