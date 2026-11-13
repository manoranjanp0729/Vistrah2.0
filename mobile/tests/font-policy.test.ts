import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {fontFace,standardWeight,isStandardFamily,fontChoices,isFontChoice,type FontLocale} from '../src/lib/font-policy.ts';

test('five selectable fonts have all static weights and keep Indian-script families',()=>{
 assert.deepEqual(fontChoices.map(font=>font.label),['Montserrat','Inter','Poppins','Nunito','DM Sans']);
 for(const font of fontChoices)for(const weight of [400,500,600,700] as const){
  const alias=fontFace('en',weight,font.id),data=readFileSync(new URL(`../assets/fonts/native/${alias}.ttf`,import.meta.url));
  assert.equal(data.readUInt32BE(0),0x00010000);
  const tables=Array.from({length:data.readUInt16BE(4)},(_,i)=>data.toString('ascii',12+16*i,16+16*i));
  assert(!tables.includes('fvar'));assert(tables.includes('cmap'));
  for(const locale of ['kn','hi'] as const)assert.equal(fontFace(locale,weight,font.id),fontFace(locale,weight));
 }
 for(const invalid of [null,undefined,'Arial','INTER','../../font','<script>'])assert.equal(isFontChoice(invalid),false);
});
test('downloaded assets match provenance hashes and bundled license notices',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../assets/fonts/native/settings-fonts-sources.json',import.meta.url),'utf8')) as {file:string;sha256:string;bytes:number}[];
 assert.equal(manifest.length,20);
 for(const entry of manifest){const data=readFileSync(new URL('../assets/fonts/native/'+entry.file,import.meta.url));assert.equal(data.length,entry.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),entry.sha256);}
 const notices=JSON.parse(readFileSync(new URL('../assets/fonts/font-licenses.json',import.meta.url),'utf8')) as {name:string;license:string}[];
 assert.deepEqual(notices.map(notice=>notice.name),fontChoices.map(font=>font.label));
 for(const notice of notices)assert.match(notice.license,/SIL OPEN FONT LICENSE/);
});

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
