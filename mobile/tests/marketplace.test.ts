import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createMarketplace,marketplaceItemId,marketplaceUrl} from '../../shared/marketplace.ts';
import {photoCardDesign,twoRowColumns} from '../../shared/photo-card-design.ts';

const taxonomy=JSON.parse(readFileSync(new URL('../../shared/marketplace-taxonomy.json',import.meta.url),'utf8'));
const legacy=JSON.parse(readFileSync(new URL('../../shared/marketplace-legacy-map.json',import.meta.url),'utf8'));
const imagery=JSON.parse(readFileSync(new URL('../../shared/marketplace-imagery.json',import.meta.url),'utf8'));
const marketplace=createMarketplace(taxonomy,legacy);

test('preserves Unified 10-Sector hierarchy (10 sectors -> 133 subcategories -> 814 service types) and legacy redirects',()=>{
  assert.deepEqual(marketplace.taxonomyCounts,{categories:10,subcategories:133,listingTypes:814});
  for(const category of marketplace.marketplaceCategories){
    for(const subcategory of category.subcategories){
      assert.equal(marketplace.resolveMarketplaceSelection({category:category.slug,subcategory:subcategory.slug})?.subcategory?.slug,subcategory.slug);
      for(const type of subcategory.listing_types){
        const selection={category:category.slug,subcategory:subcategory.slug,type:type.slug};
        assert.equal(marketplace.resolveMarketplaceSelection(selection)?.listingType?.slug,type.slug);
        assert.equal(marketplace.resolveMarketplaceSelection(Object.fromEntries(new URL(marketplaceUrl(selection),'http://localhost').searchParams))?.listingType?.slug,type.slug);
      }
    }
  }
  assert.equal(marketplace.resolveMarketplaceSelection({category:'hospitality-restaurants-and-cafes',subcategory:'plumbers'}),null);
  assert.deepEqual(marketplace.legacyMarketplaceSelection({category:'home-services',subcategory:'electrician-and-plumber'}),{
    category:'interior-design-and-exteriors',
    subcategory:'repairs-and-maintenance',
    type:'plumbing',
  });
});

test('bundles the exact website image bytes across all curated assets and maps every item to a valid photo',()=>{
  for(const photo of Object.values(imagery.assets) as {src:string;sha256:string}[]){
    const web=readFileSync(new URL('../../frontend/public'+photo.src,import.meta.url));
    const native=readFileSync(new URL('../assets/marketplace/'+photo.src.split('/').at(-1),import.meta.url));
    assert.ok(web.equals(native));
    assert.equal(createHash('sha256').update(native).digest('hex'),photo.sha256);
  }
  const nativeManifest=readFileSync(new URL('../src/lib/marketplace-photos.ts',import.meta.url),'utf8');
  for(const category of marketplace.marketplaceCategories){
    const catPhoto=imagery.items[marketplaceItemId(category.slug)]?.photo;
    assert.ok(catPhoto&&imagery.assets[catPhoto],category.slug);
    assert.ok(nativeManifest.includes(`"${catPhoto}":`),catPhoto);
    for(const sub of category.subcategories){
      const subPhoto=imagery.items[marketplaceItemId(category.slug,sub.slug)]?.photo;
      assert.ok(subPhoto&&imagery.assets[subPhoto],`${category.slug}/${sub.slug}`);
      assert.ok(nativeManifest.includes(`"${subPhoto}":`),subPhoto);
      for(const type of sub.listing_types){
        const typePhoto=imagery.items[marketplaceItemId(category.slug,sub.slug,type.slug)]?.photo;
        assert.ok(typePhoto&&imagery.assets[typePhoto],`${category.slug}/${sub.slug}/${type.slug}`);
      }
    }
  }
});

test('uses one two-row rail contract across all 10 unified sector cards',()=>{
  const columns=twoRowColumns(marketplace.marketplaceCategories);
  assert.equal(columns.length,5);
  assert.equal(columns.at(-1)?.length,2);
  assert.deepEqual(columns.flat(),marketplace.marketplaceCategories);
  assert.deepEqual(photoCardDesign,{width:148,height:168,imageHeight:86,imageInset:7,radius:16,imageRadius:11,gap:12,titleSize:13,titleLineHeight:18,titleLines:2,rows:2});
});

test('search links to /services/nearby for specific service types, never to a legacy /service/ route',()=>{
  const result=marketplace.searchMarketplaceEntries('  DOG WALKING  ');
  assert.ok(result.length>=1);
  assert.equal(result[0].selection.type,'dog-walking');
  assert.ok(result[0].href.startsWith('/services/nearby?'));
  assert.ok(!result[0].href.includes('/service/'));
  const source=readFileSync(new URL('../src/app/(tabs)/services/index.tsx',import.meta.url),'utf8');
  assert.ok(!source.includes('/marketplace/taxonomy'));
  assert.ok(source.includes('legacyMarketplaceSelection'));
});

test('civil construction & rural sector preserves all agriculture subcategories and tractor rental search',()=>{
  const category=taxonomy.categories.find((c:{slug:string})=>c.slug==='civil-construction-and-contractors');
  assert.ok(category);
  assert.equal(category.subcategories.length,16);
  for(const sub of category.subcategories){
    assert.ok(imagery.items[marketplaceItemId(category.slug,sub.slug)].photo);
  }
  assert.equal(marketplace.searchMarketplaceEntries('tractor rental')[0].selection.category,category.slug);
});

test('homepage alone opts into compact category rails with mobile swipe and desktop controls',()=>{
  const home=readFileSync(new URL('../src/app/(tabs)/index.tsx',import.meta.url),'utf8'),categories=readFileSync(new URL('../src/components/marketplace-categories.tsx',import.meta.url),'utf8'),rail=readFileSync(new URL('../src/components/photo-card-rail.tsx',import.meta.url),'utf8');
  assert.equal((home.match(/<MarketplaceCategories compact homepage exclude=\{connectCategorySlugs\}\s*\/>/g)??[]).length,2);
  assert(home.includes('action="View all"'));
  assert(categories.includes('meta=""'));
  assert(categories.includes('vertical={!homepage}'));
  assert(categories.includes('uniformHomepage={homepage}'));
  assert(rail.includes('width>=768&&(previous||next)'));
  assert(rail.includes('!compact&&<Text'));
  assert(rail.includes('<ScrollView ref={scroll} horizontal'));
});
