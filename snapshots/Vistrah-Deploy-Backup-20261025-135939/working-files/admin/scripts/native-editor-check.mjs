/** Expo web interaction check; all API calls are intercepted with disposable data. */
import {chromium,expect} from '@playwright/test';
import {readFileSync,mkdirSync} from 'node:fs';
import {URL,fileURLToPath} from 'node:url';
import console from 'node:console';
const pages=JSON.parse(readFileSync(new URL('../../shared/edit-vistrah-page-defaults.json',import.meta.url),'utf8')).map(page=>({...page,content_source:'APP'}));
const user={id:999,name:'Disposable admin',email:'review@example.invalid',role:'ADMIN',seller_enabled:false};
let authenticated=false,failPublish=false,puts=0;
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const folder=new URL('../../artifacts/native-editor-review/',import.meta.url);mkdirSync(folder,{recursive:true});
const screenshot=name=>page.screenshot({path:fileURLToPath(new URL(name+'.png',folder)),fullPage:true});
try{
 page.on('pageerror',error=>console.log('Browser error: '+error.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url()),path=url.pathname;
  const api=url.hostname==='api.vistrah.in'||['8100','18100'].includes(url.port);
  if(!api){if(url.hostname==='vistrah.in')return route.abort();return route.continue();}
  const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(body)});
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization,X-Vistrah-Session'}});
  if(path==='/bootstrap')return reply({catalogue:[],homepage:{version:null,layout:{sections:[]}},user:authenticated?user:null,membership:null,location:null,business:null});
  if(path==='/auth/login'){authenticated=true;return reply({access_token:'disposable-mocked-token',user});}
  if(path==='/me')return authenticated?reply(user):reply({detail:'Sign in'},401);
  if(path==='/admin/overview')return reply({customers:0,requests:0,providers:0,services:0,new_requests:0,payments:0});
  if(path==='/admin/edit-vistrah/pages')return reply(pages);
  if(path==='/admin/edit-vistrah/library')return reply([]);
  const match=path.match(/^\/admin\/edit-vistrah\/pages\/([^/]+)(?:\/(publish))?$/);
  if(match){const entry=pages.find(item=>item.slug===match[1]);if(!entry)return reply({},404);
   if(route.request().method()==='PUT'){const payload=route.request().postDataJSON();expect(payload.revision).toBe(entry.revision);puts++;Object.assign(entry,payload,{revision:entry.revision+1,status:'DRAFT',content_source:entry.published_version?'CMS':'DRAFT'});return reply(entry);}
   if(match[2]==='publish'){expect(route.request().postDataJSON().revision).toBe(entry.revision);if(failPublish)return reply({detail:'Synthetic publish failure'},503);Object.assign(entry,{status:'LIVE',content_source:'CMS',published_version:1});return reply(entry);}
   return reply(entry);
  }
  return reply([]);
 });
 await page.goto('http://127.0.0.1:8081/admin-dashboard',{timeout:180000});
 await page.getByText('Sign in →',{exact:true}).click({timeout:180000});
 await page.getByLabel('Email address',{exact:true}).fill('review@example.invalid');
 await page.getByLabel('Password',{exact:true}).fill('disposable-password');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByText('Choose a page, tap a section, and edit its content.',{exact:true}).click({timeout:30000});
 await expect(page.getByRole('button',{name:'Edit Home Page',exact:true})).toBeVisible({timeout:30000});
 await page.getByRole('button',{name:'Edit Home Page',exact:true}).click();
 await expect(page.getByText('Tap anything to edit',{exact:true})).toBeVisible();
 await screenshot('edit-390');
 const firstTitle=pages[0].sections[0].content.en.title;
 await page.getByRole('button',{name:'Edit section '+firstTitle,exact:true}).click();
 await expect(page.getByLabel('Heading',{exact:true})).toBeVisible();
 await page.getByLabel('Heading',{exact:true}).fill('Simpler native editor');
 page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'Close panel',exact:true}).click();
 await expect(page.getByLabel('Heading',{exact:true})).toHaveValue('Simpler native editor');
 const applyBox=await page.getByRole('button',{name:'Apply changes',exact:true}).boundingBox();expect(applyBox.y+applyBox.height).toBeLessThanOrEqual(845);
 await screenshot('text-panel-390');
 await page.getByRole('button',{name:'Apply changes',exact:true}).click();
 await expect(page.getByRole('button',{name:'Edit section Simpler native editor',exact:true})).toBeVisible();
 page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'All pages',exact:true}).click();
 await expect(page.getByRole('button',{name:'Edit section Simpler native editor',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'+ Add a section',exact:true}).click();
 await page.getByRole('button',{name:'Add Text & media',exact:true}).click();
 await page.getByLabel('Heading',{exact:true}).fill('Disposable added section');
 await page.getByRole('button',{name:'Apply changes',exact:true}).click();
 await expect(page.getByRole('button',{name:'Edit section Disposable added section',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 await expect(page.getByRole('button',{name:'Edit section Disposable added section',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Review changes',exact:true}).click();
 await expect(page.getByText('Edited: '+pages[0].sections[0].name,{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'Publish page',exact:true})).toBeDisabled();
 await screenshot('review-390');
 await page.getByRole('checkbox',{name:'I reviewed this page',exact:true}).click();
 failPublish=true;await page.getByRole('button',{name:'Publish page',exact:true}).click();
 await expect(page.getByText('Synthetic publish failure',{exact:true})).toBeVisible();
 const savedPuts=puts;failPublish=false;
 await page.getByRole('checkbox',{name:'I reviewed this page',exact:true}).click();
 await page.getByRole('button',{name:'Publish page',exact:true}).click();
 await expect(page.getByText('Published to website and app.',{exact:true})).toBeVisible();expect(puts).toBe(savedPuts);
 await page.getByRole('button',{name:'All pages',exact:true}).click();
 await expect(page.getByRole('button',{name:'Edit Home Page',exact:true})).toBeVisible();
 await screenshot('pages-390');
 console.log('PASS: native page gallery, tap-to-edit, focused panel/apply, add/undo, review acknowledgement, saved-revision recovery, publication. All API data mocked.');
}catch(error){await screenshot('failure');throw error;}finally{await browser.close();}
