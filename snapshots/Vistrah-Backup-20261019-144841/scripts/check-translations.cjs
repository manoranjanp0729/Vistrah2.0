// Read-only maintenance command: node scripts/check-translations.cjs
// Review draft text with a fluent speaker, then explicitly move approved entries
// into kn.json/hi.json. This command never writes or publishes translations.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'shared',name),'utf8'));
const flatten=(value,prefix='')=>Object.fromEntries(Object.entries(value).flatMap(([key,item])=>{const id=prefix?`${prefix}.${key}`:key;return typeof item==='string'?[[id,item]]:item&&typeof item==='object'?Object.entries(flatten(item,id)):[];}));
const english={...flatten(read('interface-copy.json')),...read('locales/en.json')};
for(const category of read('marketplace-taxonomy.json').categories){english[`taxonomy.category/${category.slug}`]=category.title;for(const sub of category.subcategories){english[`taxonomy.subcategory/${category.slug}/${sub.slug}`]=sub.title;for(const item of sub.listing_types)english[`taxonomy.type/${category.slug}/${sub.slug}/${item.slug}`]=item.title;}}
const drafts=read('locales/drafts.json');
const tokens=value=>[...value.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort().join(',');
let incomplete=false;
for(const locale of ['kn','hi']){
 const dictionary=read(`locales/${locale}.json`);
 const missing=Object.keys(english).filter(key=>!dictionary[key]);
 const unknown=Object.keys(dictionary).filter(key=>!(key in english));
 const invalidParameters=Object.keys(dictionary).filter(key=>english[key]&&tokens(dictionary[key])!==tokens(english[key]));
 incomplete ||= !!(missing.length||unknown.length||invalidParameters.length);
 console.log(JSON.stringify({locale,missing,unknown,invalidParameters,draftKeys:Object.keys(drafts[locale]||{})},null,2));
}
process.exitCode=incomplete?1:0;
