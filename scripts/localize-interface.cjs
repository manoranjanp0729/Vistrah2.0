// Inventory mobile/public/admin interface copy and connect static JSX to locale-aware rendering.
const fs=require('node:fs'),path=require('node:path');
const ts=require('../frontend/node_modules/typescript');
const root=path.resolve(__dirname,'..');
const walk=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(directory,entry.name)):[path.join(directory,entry.name)]);
const files=['mobile/src/app','mobile/src/components','frontend/components','frontend/app/(public)'].flatMap(directory=>walk(path.join(root,directory))).filter(file=>file.endsWith('.tsx')&&!/localized-ui|language-provider|\/lib\/language/.test(file.replaceAll('\\','/')));
const fields=new Set(['label','title','subtitle','description','placeholder','accessibilityLabel','accessibilityHint','aria-label','badgeText','emptyTitle','emptyCopy','heading','guidance','action']);
const phrases=new Set();let changed=0;
const normalize=value=>value.replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/\s+/g,' ').trim();
const human=value=>/[A-Za-z]{2}/.test(value.replace(/\{\w+\}/g,''))&&!/^[a-z][A-Za-z0-9]*(?:[._][A-Za-z0-9]+)+$/.test(value)&&!/^[/#]|https?:|@|^[A-Z_\d-]+$|^rgba?\(/.test(value)&&!/^VISTRAH$|^MP4$|^H\.264|^AAC$/.test(value);
const add=value=>{value=normalize(value);if(human(value))phrases.add(value);};
function literal(node){return ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node);}
function template(node){if(literal(node))return node.text;if(ts.isTemplateExpression(node))return node.head.text+node.templateSpans.map((span,index)=>'{value'+index+'}'+span.literal.text).join('');return null;}
for(const file of files){
 const source=fs.readFileSync(file,'utf8'),native=file.includes(path.sep+'mobile'+path.sep),client=native||/^['"]use client['"]/.test(source.trimStart());
 const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[];let textUsed=false,elementUsed=false;
 function visit(node){
  if(ts.isJsxText(node)){
   const raw=node.getText(tree),value=normalize(raw);if(human(value)){
    add(value);const padded=(/^\s/.test(raw)?' ':'')+value+(/\s$/.test(raw)?' ':'');
    edits.push([node.getStart(tree),node.end,'<UiText value={'+JSON.stringify(padded)+'}/>']);textUsed=true;
   }
  }
  if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
   const relevant=node.attributes.properties.some(attribute=>ts.isJsxAttribute(attribute)&&fields.has(attribute.name.getText(tree))&&attribute.initializer&&((ts.isStringLiteral(attribute.initializer)&&human(attribute.initializer.text))||(ts.isJsxExpression(attribute.initializer)&&attribute.initializer.expression&&hasCopy(attribute.initializer.expression))));
   const tag=node.tagName.getText(tree),intrinsic=/^[a-z]/.test(tag);
   if(relevant&&(client||intrinsic)&&!tag.startsWith('Ui')&&tag!=='option'&&tag!=='Script'){
    edits.push([node.tagName.getStart(tree),node.tagName.end,'UiElement as='+ (intrinsic?JSON.stringify(tag):'{'+tag+'}')]);elementUsed=true;
    if(ts.isJsxOpeningElement(node)&&ts.isJsxElement(node.parent))edits.push([node.parent.closingElement.tagName.getStart(tree),node.parent.closingElement.tagName.end,'UiElement']);
   }
  }
  if(ts.isJsxAttribute(node)&&fields.has(node.name.getText(tree))&&node.initializer){if(ts.isStringLiteral(node.initializer))add(node.initializer.text);else if(ts.isJsxExpression(node.initializer)&&node.initializer.expression)collect(node.initializer.expression);}
  if(ts.isJsxAttribute(node)&&node.name.getText(tree)==='value'&&node.parent.parent.tagName?.getText(tree)==='UiText'&&node.initializer&&ts.isJsxExpression(node.initializer)&&node.initializer.expression)collect(node.initializer.expression);
  if(ts.isPropertyAssignment(node)&&fields.has(node.name.getText(tree).replace(/['"]/g,'')))collect(node.initializer);
  if(ts.isVariableDeclaration(node)&&/label|title|copy|text|message|hint|reason/i.test(node.name.getText(tree))&&node.initializer)collect(node.initializer);
  if(ts.isCallExpression(node)&&/setError|setMessage|setNotice|new Error/.test(node.expression.getText(tree)))node.arguments.forEach(collect);
  if(ts.isJsxExpression(node)&&node.expression&&(ts.isJsxElement(node.parent)||ts.isJsxFragment(node.parent))){
   const expression=node.expression,raw=expression.getText(tree);
   if((literal(expression)||ts.isConditionalExpression(expression)||ts.isTemplateExpression(expression))&&!containsJsx(expression)&&hasCopy(expression)||/^(?:copy\.|label$|title$|subtitle$|description$|badgeText$|emptyText$|error$|message$|statusText$|roleLabel$|(?:item|option|tab|section|card|l|link|step|preset|group|benefit|path|entry)\.(?:label|title|subtitle|description|name|summary)$|.*Progress\(.*\)\.label$|businessProgress\(.*\)$)/.test(raw)){
    collect(expression);edits.push([node.getStart(tree),node.end,'<UiText value={'+raw+'}/>']);textUsed=true;
   }
  }
  ts.forEachChild(node,visit);
 }
 function containsJsx(node){let found=false;function walk(child){if(ts.isJsxElement(child)||ts.isJsxSelfClosingElement(child))found=true;else ts.forEachChild(child,walk);}walk(node);return found;}
 function hasCopy(node){let found=false;function walk(child){const value=template(child);if(value&&human(value))found=true;else ts.forEachChild(child,walk);}walk(node);return found;}
 function collect(node){const value=template(node);if(value)add(value);else ts.forEachChild(node,collect);}
 visit(tree);
 if(process.argv.includes('--apply')&&edits.length){
  const sorted=edits.sort((a,b)=>b[0]-a[0]);let result=source,last=source.length;
  for(const [start,end,value] of sorted){if(end>last)throw Error('Overlapping localization edits: '+file);result=result.slice(0,start)+value+result.slice(end);last=start;}
  const target=path.join(root,native?'mobile/src/components/localized-ui':'frontend/components/localized-ui');let relative=path.relative(path.dirname(file),target).replaceAll('\\','/');if(!relative.startsWith('.'))relative='./'+relative;
  const imported=[textUsed?'UiText':null,elementUsed?'UiElement':null].filter(Boolean).join(',');const line='import {'+imported+'} from '+JSON.stringify(relative)+';\n';
  const existing=/import \{([^}]+)\} from (["'][^"']*localized-ui["']);/.exec(result);
  if(existing){const names=new Set([...existing[1].split(',').map(value=>value.trim()),...imported.split(',')]);result=result.replace(existing[0],'import {'+[...names].join(',')+'} from '+existing[2]+';');}
  else if(/^['"]use client['"];?/.test(result.trimStart()))result=result.replace(/(['"]use client['"];?\r?\n)/,'$1'+line);else result=line+result;
  fs.writeFileSync(file,result);changed++;
 }
}
// Shared presentation helpers supply strings outside JSX.
for(const name of ['homepage-video.ts','homepage-connect.ts','customer-listing.ts','seller-journey.ts','v-ads-management.ts','ads-marketing.ts','business-membership.ts','commerce.ts','commerce-orders.ts','service-listing.ts']){
 const source=ts.createSourceFile(name,fs.readFileSync(path.join(root,'shared',name),'utf8'),ts.ScriptTarget.Latest,true);
 function visit(node){if(literal(node)&&human(node.text)&&(/\s/.test(node.text)||/^[A-Z][a-z]/.test(node.text))&&!/mail|^http/.test(node.text))add(node.text);ts.forEachChild(node,visit);}visit(source);
}
fs.writeFileSync(path.join(__dirname,'interface-phrases.json'),JSON.stringify([...phrases].sort(),null,2)+'\n');
console.log(JSON.stringify({files:files.length,phrases:phrases.size,changed}));
