import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {createMarketplace,marketplaceNearbyTypeUrl} from '../../shared/marketplace.ts';
const taxonomy=JSON.parse(readFileSync(new URL('../../shared/marketplace-taxonomy.json',import.meta.url),'utf8'));
const marketplace=createMarketplace(taxonomy);
const expected={
 'Restaurants & Dining':['Restaurant','Cafes','Pubs','Street Food'],
 'Hotels & Stay':['Hotels','Homestays','Resorts'],
 'Vehicle Rentals':['Cars','Bikes'],
 'Event Management':['Wedding','Birthday'],
 'Hospitals and Labs':['Hospitals','Clinics','Laboratory'],
 'Education & Skills':['Schools','Colleges','Universities','Institutes','Tuitions'],
 'Salons & Beauty Parlour':['Salons','Beauty Parlour','Spas','Sauna'],
 'Civil & Construction':['Residential','Commercial'],
 'Fuel & Charging Stations':['Petrol Pumps','Auto Gas','EV Charging'],
 'Vibe Finder':['Theatres','Social Events'],
};
test('exact final 10 categories and 30 direct types',()=>{
 assert.deepEqual(marketplace.marketplaceCategories.map(c=>c.title),Object.keys(expected));
 assert.deepEqual(Object.fromEntries(marketplace.marketplaceCategories.map(c=>[c.title,c.subcategories.map(s=>s.title)])),expected);
 assert.equal(marketplace.taxonomyCounts.listingTypes,30);
});
test('every direct service type opens nearby with no third selection',()=>{
 for(const category of marketplace.marketplaceCategories)for(const type of category.subcategories){
  assert.deepEqual(type.listing_types,[{slug:type.slug,title:type.title}]);
  const href=marketplaceNearbyTypeUrl({category:category.slug,subcategory:type.slug,type:type.slug});
  const url=new URL(href,'https://vistrah.in');
  assert.equal(url.pathname,'/services/nearby');
  assert.equal(marketplace.resolveMarketplaceSelection(Object.fromEntries(url.searchParams))?.listingType?.title,type.title);
 }
});
test('removed types are not searchable and new types are discoverable',()=>{
 assert.equal(marketplace.searchMarketplaceEntries('tractor rental').length,0);
 assert(marketplace.searchMarketplaceEntries('EV Charging').some(r=>r.selection.category==='fuel-and-charging-stations'));
});
