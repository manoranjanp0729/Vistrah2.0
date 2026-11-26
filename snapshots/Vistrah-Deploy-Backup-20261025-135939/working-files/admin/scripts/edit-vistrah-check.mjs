/** Isolated editor browser check. All API traffic is mocked; no database writes. */
/* global structuredClone, document, innerWidth */
import {chromium,expect} from '@playwright/test';
import {readFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath,URL} from 'node:url';
import console from 'node:console';
import {Buffer} from 'node:buffer';
const origin='http://127.0.0.1:3299';
const defaults=JSON.parse(readFileSync(new URL('../../shared/edit-vistrah-page-defaults.json',import.meta.url),'utf8'));
const pages=structuredClone(defaults);
let failPublish=false,putCount=0;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.route('**/api/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname.replace('/api','');
  const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(path==='/me')return reply({id:999,role:'ADMIN',name:'Disposable reviewer'});
  if(path==='/admin/edit-vistrah/library')return reply([]);
  if(path==='/admin/edit-vistrah/pages')return reply(pages);
  const match=path.match(/^\/admin\/edit-vistrah\/pages\/([^/]+)(?:\/(publish|unpublish|published))?$/);
  if(!match)return reply({detail:'Unexpected mocked endpoint: '+path},404);
  const entry=pages.find(item=>item.slug===match[1]);if(!entry)return reply({},404);
  if(request.method()==='PUT'){
   const payload=request.postDataJSON();expect(payload.revision).toBe(entry.revision);putCount++;
   Object.assign(entry,payload,{revision:entry.revision+1,status:'DRAFT',content_source:entry.published_version?'CMS':'DRAFT'});return reply(entry);
  }
  if(match[2]==='publish'){
   expect(request.postDataJSON().revision).toBe(entry.revision);
   if(failPublish)return reply({detail:'Synthetic publish failure'},503);
   Object.assign(entry,{status:'LIVE',content_source:'CMS',published_version:(entry.published_version??0)+1});return reply(entry);
  }
  if(match[2]==='unpublish'){Object.assign(entry,{status:'DRAFT',content_source:'DRAFT',revision:entry.revision+1});return reply(entry);}
  return reply(entry);
 });
 await page.goto(origin+'/admin/edit-vistrah',{timeout:120000});
 const panel=page.getByRole('region',{name:'Section editor'});
 await expect(panel).toBeVisible({timeout:90000});
 const heading=panel.getByLabel('Heading',{exact:true});
 await heading.fill('Disposable editor heading');
 await expect(page.getByText('Unsaved changes',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Undo',exact:true}).click();
 await expect(heading).not.toHaveValue('Disposable editor heading');
 await page.getByRole('button',{name:'Redo',exact:true}).click();
 await expect(heading).toHaveValue('Disposable editor heading');
 await page.getByRole('button',{name:'Preview',exact:true}).click();
 await expect(page.getByRole('region',{name:'Draft content preview'})).toContainText('Disposable editor heading');
 const other=page.getByRole('navigation',{name:'Pages to edit'}).getByRole('button').nth(1);
 page.once('dialog',dialog=>dialog.dismiss());await other.click();
 await expect(heading).toHaveValue('Disposable editor heading');
 await page.getByRole('button',{name:'Save draft',exact:true}).click();
 await expect(page.getByText('Draft saved. Published content is unchanged.',{exact:true})).toBeVisible();
 await heading.fill('Saved despite publish failure');failPublish=true;
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Publish',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'Synthetic publish failure'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();
 const savedPuts=putCount;failPublish=false;
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Publish',exact:true}).click();
 await expect(page.getByRole('status').last()).toContainText('Published for');expect(putCount).toBe(savedPuts);
 await page.getByText('Page settings & recovery',{exact:true}).click();
 await page.getByRole('button',{name:'Restore published content to draft'}).click();
 await expect(page.getByText('Published content loaded for editing. Save and publish to apply.',{exact:true})).toBeVisible();
 page.on('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Unpublish',exact:true}).click();
 await expect(page.getByText('Unpublished. Draft retained; open screens must reload.',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Unpublish',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'4. '+defaults[0].sections[3].name+' Visible',exact:true}).click();
 await panel.getByLabel('Image layout',{exact:true}).selectOption('content_rail');
 await expect(page.locator('[data-layout="rail"]')).toHaveCount(1);
 const png=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;return canvas.toDataURL('image/png').split(',')[1];});
 await panel.getByLabel('Choose photo',{exact:true}).setInputFiles({name:'disposable.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await expect(panel.getByText('Photo 1: disposable.png · 2 × 2 px',{exact:true})).toBeVisible();
 mkdirSync(new URL('../../artifacts/edit-vistrah-review/',import.meta.url),{recursive:true});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:fileURLToPath(new URL('../../artifacts/edit-vistrah-review/editor-'+width+'.png',import.meta.url)),fullPage:true});
 }
 console.log('PASS: undo/redo, preview, discard protection, save/publish failure recovery, restore/unpublish, layouts, image decoding, desktop/phone overflow. API fully mocked.');
}finally{await browser.close();}
