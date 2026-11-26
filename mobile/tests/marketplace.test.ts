import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {createMarketplace,marketplaceNearbyTypeUrl} from '../../shared/marketplace.ts';

const taxonomy=JSON.parse(readFileSync(new URL('../../shared/marketplace-taxonomy.json',import.meta.url),'utf8'));
const marketplace=createMarketplace(taxonomy);

const expected={
  'Restaurants & Dining':['Restaurant','Cafes','Pubs','Street Food','Bakeries & Desserts','Cloud Kitchens & Tiffins','Juice & Ice Cream Bars'],
  'Hotels & Stay':['Hotels','Homestays','Resorts','PGs & Hostels','Service Apartments','Guest Houses & Lodges'],
  'Vehicle Rentals':['Cars','Bikes','Tempo Travellers & Vans','Outstation Cabs & Taxis','Goods & Mini Trucks'],
  'Event Management':['Wedding','Birthday','Banquet & Event Venues','Catering & Live Counters','Photography & Videography'],
  'Hospitals and Labs':['Hospitals','Clinics','Laboratory','Dental Clinics','Physiotherapy & Rehab','Eye & Skin Clinics'],
  'Education & Skills':['Schools','Colleges','Universities','Institutes','Tuitions','Competitive Exam Coaching','Music, Dance & Arts','Preschools & Daycare'],
  'Salons & Beauty Parlour':['Salons','Beauty Parlour','Spas','Sauna','Bridal Makeup & Mehendi',"Men's Grooming & Barbers",'Nail & Lash Studios'],
  'Civil & Construction':['Residential','Commercial','Plumbing & Electrical Repairs','Waterproofing & Painting','Architecture & Interiors'],
  'Fuel & Charging Stations':['Petrol Pumps','Auto Gas','EV Charging','Car & Bike Wash / Detailing','Tyre, Battery & Puncture Care','EV Service & Battery Swap'],
  'Vibe Finder':['Theatres','Social Events','Gaming & Bowling Zones','Turf & Sports Arenas','Live Music & Comedy Clubs'],
};

test('exact final 10 categories and 60 direct service types',()=>{
  assert.deepEqual(marketplace.marketplaceCategories.map(c=>c.title),Object.keys(expected));
  assert.deepEqual(Object.fromEntries(marketplace.marketplaceCategories.map(c=>[c.title,c.subcategories.map(s=>s.title)])),expected);
  assert.equal(marketplace.taxonomyCounts.listingTypes,60);
});

test('every direct service type opens /services/nearby?category=<main>&service_type=<sub> cleanly',()=>{
  for(const category of marketplace.marketplaceCategories)for(const type of category.subcategories){
    assert.deepEqual(type.listing_types,[{slug:type.slug,title:type.title}]);
    const href=marketplaceNearbyTypeUrl({category:category.slug,subcategory:type.slug,type:type.slug});
    assert.equal(href,`/services/nearby?category=${category.slug}&service_type=${type.slug}`);
    const url=new URL(href,'https://vistrah.in');
    assert.equal(url.pathname,'/services/nearby');
    assert.equal(marketplace.resolveMarketplaceSelection(Object.fromEntries(url.searchParams))?.listingType?.title,type.title);
  }
});

test('removed types are not searchable and all new types are discoverable',()=>{
  assert.equal(marketplace.searchMarketplaceEntries('tractor rental').length,0);
  assert.equal(marketplace.searchMarketplaceEntries('AgriConnect').length,0);
  assert(marketplace.searchMarketplaceEntries('Dental Clinics').some(r=>r.selection.category==='hospitals-and-labs'));
  assert(marketplace.searchMarketplaceEntries('EV Service').some(r=>r.selection.category==='fuel-and-charging-stations'));
});
