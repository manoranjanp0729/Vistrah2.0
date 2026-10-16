import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createMarketplace,marketplaceItemId,marketplaceUrl} from '../../shared/marketplace.ts';
import {photoCardDesign,twoRowColumns} from '../../shared/photo-card-design.ts';
const taxonomy=JSON.parse(readFileSync(new URL('../../shared/marketplace-taxonomy.json',import.meta.url),'utf8'));
const imagery=JSON.parse(readFileSync(new URL('../../shared/marketplace-imagery.json',import.meta.url),'utf8'));
const marketplace=createMarketplace(taxonomy);
test('preserves canonical hierarchy and every native navigation selection',()=>{
 assert.deepEqual(marketplace.taxonomyCounts,{categories:14,subcategories:126,listingTypes:749});
 for(const category of marketplace.marketplaceCategories)for(const subcategory of category.subcategories)for(const type of subcategory.listing_types){
  const selection={category:category.slug,subcategory:subcategory.slug,type:type.slug};
  assert.equal(marketplace.resolveMarketplaceSelection(selection)?.listingType?.slug,type.slug);
  assert.equal(marketplace.resolveMarketplaceSelection(Object.fromEntries(new URL(marketplaceUrl(selection),'http://localhost').searchParams))?.listingType?.slug,type.slug);
 }
 assert.equal(marketplace.resolveMarketplaceSelection({category:'pet-care',subcategory:'cleaning-services'}),null);
});
test('bundles the same image bytes as the website for all 889 classifications',()=>{
 assert.equal(Object.keys(imagery.items).length,889);
 for(const photo of Object.values(imagery.assets) as {src:string;sha256:string}[]){
  const web=readFileSync(new URL('../../frontend/public'+photo.src,import.meta.url));
  const native=readFileSync(new URL('../assets/marketplace/'+photo.src.split('/').at(-1),import.meta.url));
  assert.ok(web.equals(native));assert.equal(createHash('sha256').update(native).digest('hex'),photo.sha256);
 }
});
test('child photos are curated individually with varied subjects rather than repeating every parent',()=>{
 for(const category of marketplace.marketplaceCategories){
  const parent=imagery.items[marketplaceItemId(category.slug)].photo;
  assert.ok(category.subcategories.some(sub=>imagery.items[marketplaceItemId(category.slug,sub.slug)].photo!==parent));
  for(const sub of category.subcategories){
   const parent=imagery.items[marketplaceItemId(category.slug,sub.slug)].photo;
   const children=sub.listing_types.map(type=>imagery.items[marketplaceItemId(category.slug,sub.slug,type.slug)].photo);
   assert.ok(children.some(photo=>photo!==parent),category.slug+'/'+sub.slug);
   assert.ok(new Set(children).size>=2,category.slug+'/'+sub.slug);
  }
 }
});
test('uses one two-row rail contract without losing an odd final card',()=>{
 const columns=twoRowColumns(marketplace.marketplaceCategories);
 assert.equal(columns.length,7);assert.equal(columns.at(-1)?.length,2);
 assert.deepEqual(columns.flat(),marketplace.marketplaceCategories);
 assert.deepEqual(photoCardDesign,{width:148,height:168,imageHeight:86,imageInset:7,radius:16,imageRadius:11,gap:12,titleSize:13,titleLineHeight:18,titleLines:2,rows:2});
});
test('search links to the right classification, never to a service or request',()=>{
 const result=marketplace.searchMarketplaceEntries('  DOG WALKING  ');assert.equal(result.length,1);
 assert.equal(result[0].selection.type,'dog-walking');assert.ok(!result[0].href.includes('/service/'));
 const source=readFileSync(new URL('../src/app/(tabs)/services.tsx',import.meta.url),'utf8');
 assert.ok(source.includes('This classification cannot be booked or requested.'));assert.ok(!source.includes('/marketplace/taxonomy'));
 assert.ok(source.includes('mobileServiceId(item)'));
});

test('agriculture keeps the original taxonomy intact and uses distinct approved photos',()=>{
 assert.equal(createHash('sha256').update(JSON.stringify(taxonomy.categories.slice(0,13))).digest('hex'),'262c3cf391d1ce522ed472ccd7a43483182fa86162af5d94f951b2510c8cf731');
 const category=taxonomy.categories.at(-1);assert.equal(category.slug,'agriculture-and-farming');assert.equal(category.order,14);assert.equal(category.subcategories.length,9);
 const entries=category.subcategories.flatMap(sub=>sub.listing_types);assert.equal(entries.length,54);assert.equal(new Set(entries.map(t=>t.slug)).size,54);
 for(const sub of category.subcategories){assert.ok(imagery.items[marketplaceItemId(category.slug,sub.slug)].photo);for(const type of sub.listing_types)assert.ok(imagery.items[marketplaceItemId(category.slug,sub.slug,type.slug)].photo);}
 assert.equal(marketplace.searchMarketplaceEntries('tractor rental')[0].selection.category,category.slug);
});

test('homepage alone opts into compact category rails with mobile swipe and desktop controls',()=>{
 const home=readFileSync(new URL('../src/app/(tabs)/index.tsx',import.meta.url),'utf8'),categories=readFileSync(new URL('../src/components/marketplace-categories.tsx',import.meta.url),'utf8'),rail=readFileSync(new URL('../src/components/photo-card-rail.tsx',import.meta.url),'utf8');
 assert.equal((home.match(/<MarketplaceCategories compact exclude=\{connectCategorySlugs\}\/>/g)??[]).length,2);assert(home.includes('action="View all"'));assert(categories.includes("meta={compact?'':"));assert(categories.includes('!compact&&<Text'));assert(rail.includes('width>=768&&(previous||next)'));assert(rail.includes('!compact&&<Text'));assert(rail.includes('<ScrollView ref={scroll} horizontal'));
});
