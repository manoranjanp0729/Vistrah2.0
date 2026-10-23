// Isolated React Native Web fixture: real local fonts, no application/API requests.
/* global document, getComputedStyle */
import assert from 'node:assert/strict';
import {URL} from 'node:url';
import console from 'node:console';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from '@playwright/test';
const require=createRequire(new URL('../../mobile/package.json',import.meta.url));
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {Text,TextInput,View,StyleSheet}=require('react-native-web');
const e=React.createElement;
const fixture=renderToStaticMarkup(e(View,null,
 ...[400,500,600,700].map(weight=>e(Text,{key:weight,testID:`weight-${weight}`,style:{fontWeight:String(weight)}},`VISTRAH ${weight}`)),
 e(Text,{testID:'kannada'},'ಕನ್ನಡ ಸೇವೆಗಳು'),e(Text,{testID:'hindi'},'हिन्दी सेवाएँ'),
 e(Text,{testID:'italic',style:{fontStyle:'italic'}},'Vistrah italic'),
 e(Text,{testID:'nested'},'Outer ',e(Text,null,'nested text')),
 e(TextInput,{testID:'input',defaultValue:'Find a service'}),
 e(Text,{testID:'icon',style:{fontFamily:'Feather'}},'icon'),
 e(Text,{testID:'mono',style:{fontFamily:'monospace'}},'diagnostic')));
const css=await readFile(new URL('../../mobile/src/lib/fonts.css',import.meta.url),'utf8');
const html=`<!doctype html><html><head><meta charset="utf-8"><style>${StyleSheet.getSheet().textContent}</style><style>${css}</style></head><body>${fixture}</body></html>`;
const server=createServer(async(req,res)=>{
 try{
  const file=req.url.split('/').pop();
  if(['Montserrat.ttf','Montserrat-Italic.ttf','NotoSansKannada.ttf','NotoSansDevanagari.ttf'].includes(file)){
   res.setHeader('Content-Type','font/ttf');res.end(await readFile(new URL('../../mobile/public/fonts/'+file,import.meta.url)));
  }else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);}
 }catch{res.statusCode=500;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 const fonts=new Set();page.on('response',r=>{if(r.url().endsWith('.ttf')){assert.equal(r.status(),200);fonts.add(r.url().split('/').pop());}});
 for(const path of ['/','/app/']){
  await page.goto(`http://127.0.0.1:${server.address().port}${path}`);
  await page.evaluate(()=>document.fonts.ready);
  for(const id of ['weight-400','weight-500','weight-600','weight-700','kannada','hindi','italic','nested','input']){
   const family=await page.getByTestId(id).evaluate(el=>getComputedStyle(el).fontFamily);
   assert.match(family,/Vistrah Montserrat/,`${path} ${id}`);
  }
  assert.equal(await page.getByTestId('icon').evaluate(el=>getComputedStyle(el).fontFamily),'Feather');
  assert.match(await page.getByTestId('mono').evaluate(el=>getComputedStyle(el).fontFamily),/^monospace(?:, monospace)?$/);
 }
 for(const file of ['Montserrat.ttf','Montserrat-Italic.ttf','NotoSansKannada.ttf','NotoSansDevanagari.ttf'])assert(fonts.has(file),`${file} must actually load`);
 console.log('PASS: root and /app/; regular/medium/semibold/bold/italic, Kannada/Hindi, nested text and input; icon/monospace preserved.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
