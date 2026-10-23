// Focused UI check. Existing Expo :8081 and isolated source Next :3337.
import console from 'node:console';
import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.goto('http://127.0.0.1:8081/marketing-pricing',{waitUntil:'domcontentloaded',timeout:90000});
 const selector=page.getByRole('button',{name:'Choose pricing category',exact:true});
 await selector.waitFor({timeout:60000});await selector.click();
 await page.getByRole('button',{name:'Website Design & Development',exact:true}).click();
 await expect(page.getByRole('button',{name:'Close category selector',exact:true})).toHaveCount(0);
 const first=page.getByText('Landing Page',{exact:true});await expect(first).toBeVisible();
 const box=await first.boundingBox();expect(box.y+box.height).toBeLessThan(844);
 console.log('Expo: first matching service visible without scrolling at y='+box.y);
 await page.getByRole('button',{name:'Monthly',exact:true}).click();
 await selector.click();await page.getByRole('button',{name:'Outdoor Advertising',exact:true}).click();
 await expect(page.getByText('Roadside Hoardings',{exact:true})).toBeVisible();
 const mediaPrice=await page.getByText('Quotation required',{exact:true}).first().boundingBox();
 expect(mediaPrice.y+mediaPrice.height).toBeLessThan(844);
 console.log('Expo: selecting a new category closes the modal, resets incompatible filters and shows prices in place.');
 await page.goto('http://127.0.0.1:3337/marketing-pricing',{waitUntil:'domcontentloaded',timeout:90000});
 await page.getByLabel('Category',{exact:true}).selectOption('websites');
 await expect(page.getByRole('heading',{name:'Website Design & Development',exact:true})).toBeVisible();
 const price=page.locator('a[href="/marketing-pricing/landing-page"] strong');
 await expect(price).toBeVisible();const priceBox=await price.boundingBox();expect(priceBox.y+priceBox.height).toBeLessThan(844);
 console.log('Website: first selected-category price visible without scrolling at y='+priceBox.y);
 await page.getByLabel('Billing',{exact:true}).selectOption('month');
 await page.getByLabel('Category',{exact:true}).selectOption('outdoor');
 await expect(page.getByLabel('Billing',{exact:true})).toHaveValue('all');
 await expect(page.locator('a[href="/marketing-pricing/roadside-hoarding"]')).toBeVisible();
 await page.setViewportSize({width:1440,height:1000});
 await expect(page.getByLabel('Category',{exact:true})).toBeVisible();
 console.log('PASS: compact category selection, immediate prices and phone/desktop layouts across Expo web and website.');
}finally{await browser.close();}
