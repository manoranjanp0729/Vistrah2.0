/** Device font preference interaction check. API responses are read-only fixtures. */
/* global document, localStorage, getComputedStyle */
import {chromium,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {URL,fileURLToPath} from 'node:url';
import console from 'node:console';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
try{
 await page.route('https://api.vistrah.in/**',route=>route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({catalogue:[],homepage:{version:null,layout:{sections:[]}},user:null,membership:null,location:null,business:null})}));
 await page.goto('http://127.0.0.1:8081/settings',{timeout:120000});
 const selector=()=>page.getByRole('button',{name:/^App Font:/});
 await expect(selector()).toBeEnabled({timeout:90000});
 await selector().click();
 const choices=['Montserrat','Inter','Poppins','Nunito','DM Sans'];
 for(const name of choices)await expect(page.getByRole('radio',{name,exact:true})).toBeVisible();
 mkdirSync(new URL('../../artifacts/font-settings/',import.meta.url),{recursive:true});
 await page.screenshot({path:fileURLToPath(new URL('../../artifacts/font-settings/choices-390.png',import.meta.url)),fullPage:true});
 await page.getByRole('radio',{name:'Inter',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('vistrah.font'))).toBe('inter');
 await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.querySelector('[aria-label="App Font: Inter"]')).fontFamily)).toContain('Inter');
 await page.reload();await expect(page.getByRole('button',{name:'App Font: Inter',exact:true})).toBeEnabled({timeout:60000});
 for(const [name,id] of [['Poppins','poppins'],['Nunito','nunito'],['DM Sans','dm-sans'],['Montserrat','montserrat']]){
  await selector().click();await page.getByRole('radio',{name,exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('vistrah.font'))).toBe(id);
 }
 await selector().click();await page.getByRole('radio',{name:'Poppins',exact:true}).click();
 await page.getByRole('button',{name:/^App Language:/}).click();
 await page.getByRole('radio',{name:/ಕನ್ನಡ/}).click();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.style.getPropertyValue('--vistrah-font'))).toContain('Vistrah Montserrat');
 await expect(page.getByText('ಅಪ್ಲಿಕೇಶನ್ ಅಕ್ಷರಶೈಲಿ',{exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('vistrah.font'))).toBe('poppins');
 await page.reload();await expect(page.getByText('ಅಪ್ಲಿಕೇಶನ್ ಅಕ್ಷರಶೈಲಿ',{exact:true})).toBeVisible({timeout:60000});
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('vistrah.font'))).toBe('poppins');
 console.log('PASS: five font previews, immediate switching, saved selection/reload, Kannada fallback and retained English preference.');
}finally{await browser.close();}
