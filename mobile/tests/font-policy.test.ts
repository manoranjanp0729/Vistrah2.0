import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {fontFace,standardWeight,isStandardFamily,type FontLocale} from '../src/lib/font-policy.ts';

test('language families and supported weights use bundled static TTF faces',()=>{
 for(const locale of ['en','kn','hi'] as FontLocale[])for(const weight of [400,500,600,700] as const){
  const name=fontFace(locale,weight);
  const data=readFileSync(new URL(`../assets/fonts/native/${name}.ttf`,import.meta.url));
  assert.equal(data.readUInt32BE(0),0x00010000);
  const tables=Array.from({length:data.readUInt16BE(4)},(_,i)=>data.toString('ascii',12+16*i,16+16*i));
  assert(!tables.includes('fvar'),'SDK57 native files must be static');
  assert(tables.includes('cmap'));
 }
 assert.equal(fontFace('kn',600),'NotoSansKannada_600SemiBold');
 assert.equal(fontFace('hi',500),'NotoSansDevanagari_500Medium');
 assert.equal(fontFace('en',400),'Montserrat_400Regular');
});
test('nested weight inheritance, emphasis and explicit families are preserved',()=>{
 assert.equal(standardWeight(undefined,600),600);
 assert.equal(standardWeight('normal',700),400);
 assert.equal(standardWeight('bold'),700);
 assert.equal(standardWeight('500'),500);
 assert.equal(standardWeight('600'),600);
 assert.equal(standardWeight('800'),700);
 assert.equal(isStandardFamily('Feather'),false);
 assert.equal(isStandardFamily('monospace'),false);
 assert.equal(isStandardFamily(undefined),true);
 assert.equal(isStandardFamily('serif'),true);
});
test('application screens use shared Text/Input so new pages cannot bypass typography',()=>{
 const root=new URL('../src/',import.meta.url);
 function inspect(dir:URL){for(const entry of readdirSync(dir,{withFileTypes:true})){
  const url=new URL(entry.name+(entry.isDirectory()?'/':''),dir);
  if(entry.isDirectory()){inspect(url);continue;}
  if(!entry.name.endsWith('.tsx')||['typography.tsx','bundled-fonts.native.tsx'].includes(entry.name))continue;
  const file=ts.createSourceFile(fileURLToPath(url),readFileSync(url,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  for(const node of file.statements)if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)&&node.moduleSpecifier.text==='react-native'){
   const bindings=node.importClause?.namedBindings;
   if(bindings&&ts.isNamedImports(bindings))for(const item of bindings.elements){
    assert(!['Text','TextInput'].includes((item.propertyName??item.name).text)||item.isTypeOnly,`Use shared typography: ${url.pathname}`);
   }
  }
 }}
 inspect(root);
});
