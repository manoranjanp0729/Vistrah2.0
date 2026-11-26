import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi} from 'vitest';
import {LanguageProvider} from '../components/language-provider';
import {MarketplaceBrowser} from '../components/marketplace-browser';
import {MarketplaceCategories} from '../components/marketplace-categories';
import {marketplaceCategories,taxonomyCounts,marketplaceNearbyTypeUrl,resolveMarketplaceSelection,searchMarketplaceEntries,legacyMarketplaceSelection,marketplaceItemId} from './marketplace-taxonomy';
import {directCategories} from '../../shared/direct-service-types';
import {ALL_SELF_ONBOARDING_TYPES,SELF_ONBOARDING_CATEGORIES,resolveSelfOnboardingInitialSelection} from '../../shared/self-onboarding';
import imagery from '../../shared/marketplace-imagery.json';

vi.mock('next/link',()=>({default:({children,href,...props}:React.ComponentProps<'a'>)=>createElement('a',{href,...props},children)}));

const EXPECTED: Record<string, string[]> = {
  'Restaurants & Dining': [
    'Restaurant',
    'Cafes',
    'Pubs',
    'Street Food',
    'Bakeries & Desserts',
    'Cloud Kitchens & Tiffins',
    'Juice & Ice Cream Bars',
  ],
  'Hotels & Stay': [
    'Hotels',
    'Homestays',
    'Resorts',
    'PGs & Hostels',
    'Service Apartments',
    'Guest Houses & Lodges',
  ],
  'Vehicle Rentals': [
    'Cars',
    'Bikes',
    'Tempo Travellers & Vans',
    'Outstation Cabs & Taxis',
    'Goods & Mini Trucks',
  ],
  'Event Management': [
    'Wedding',
    'Birthday',
    'Banquet & Event Venues',
    'Catering & Live Counters',
    'Photography & Videography',
  ],
  'Hospitals and Labs': [
    'Hospitals',
    'Clinics',
    'Laboratory',
    'Dental Clinics',
    'Physiotherapy & Rehab',
    'Eye & Skin Clinics',
  ],
  'Education & Skills': [
    'Schools',
    'Colleges',
    'Universities',
    'Institutes',
    'Tuitions',
    'Competitive Exam Coaching',
    'Music, Dance & Arts',
    'Preschools & Daycare',
  ],
  'Salons & Beauty Parlour': [
    'Salons',
    'Beauty Parlour',
    'Spas',
    'Sauna',
    'Bridal Makeup & Mehendi',
    "Men's Grooming & Barbers",
    'Nail & Lash Studios',
  ],
  'Civil & Construction': [
    'Residential',
    'Commercial',
    'Plumbing & Electrical Repairs',
    'Waterproofing & Painting',
    'Architecture & Interiors',
  ],
  'Fuel & Charging Stations': [
    'Petrol Pumps',
    'Auto Gas',
    'EV Charging',
    'Car & Bike Wash / Detailing',
    'Tyre, Battery & Puncture Care',
    'EV Service & Battery Swap',
  ],
  'Vibe Finder': [
    'Theatres',
    'Social Events',
    'Gaming & Bowling Zones',
    'Turf & Sports Arenas',
    'Live Music & Comedy Clubs',
  ],
};

describe('Final two-level marketplace (10 categories / 60 subcategories)',()=>{
  it('has the exact 10 ordered main categories and 60 direct service types',()=>{
    expect(marketplaceCategories.map(c=>c.title)).toEqual(Object.keys(EXPECTED));
    expect(Object.fromEntries(marketplaceCategories.map(c=>[c.title,c.subcategories.map(t=>t.title)]))).toEqual(EXPECTED);
    expect(taxonomyCounts).toEqual({categories:10,subcategories:60,listingTypes:60});
    expect(ALL_SELF_ONBOARDING_TYPES).toHaveLength(60);
    expect(SELF_ONBOARDING_CATEGORIES.map(c=>c.title)).toEqual(Object.keys(EXPECTED));
  });

  it('renders direct /services/nearby?category=<main>&service_type=<sub> links for all 60 types',()=>{
    for(const category of marketplaceCategories){
      const html=renderToStaticMarkup(createElement(LanguageProvider,null,createElement(MarketplaceBrowser,{selection:{category,subcategory:undefined,listingType:undefined}})));
      for(const sub of category.subcategories){
        expect(sub.listing_types).toEqual([{slug:sub.slug,title:sub.title}]);
        const target=marketplaceNearbyTypeUrl({category:category.slug,subcategory:sub.slug,type:sub.slug});
        expect(target).toBe(`/services/nearby?category=${category.slug}&service_type=${sub.slug}`);
        expect(html).toContain(target.replaceAll('&','&amp;'));
        expect(resolveMarketplaceSelection({category:category.slug,service_type:sub.slug})?.listingType?.title).toBe(sub.title);
        expect(resolveMarketplaceSelection({category:category.slug,subcategory:sub.slug,type:sub.slug})?.listingType?.title).toBe(sub.title);
        expect((imagery.items as Record<string,unknown>)[marketplaceItemId(category.slug,sub.slug,sub.slug)]).toBeTruthy();
      }
    }
  });

  it('keeps all ten categories searchable and excludes removed verticals',()=>{
    const html=renderToStaticMarkup(createElement(LanguageProvider,null,createElement(MarketplaceCategories,{compact:true})));
    expect(html.match(/data-marketplace-category=/g)).toHaveLength(10);
    expect(searchMarketplaceEntries('Dental Clinics').some(r=>r.selection.category==='hospitals-and-labs')).toBe(true);
    expect(searchMarketplaceEntries('Plumbing').some(r=>r.selection.category==='civil-and-construction')).toBe(true);
    expect(searchMarketplaceEntries('Bakeries').some(r=>r.selection.category==='restaurants-and-dining')).toBe(true);
    expect(searchMarketplaceEntries('AgriConnect')).toHaveLength(0);
    expect(searchMarketplaceEntries('HealthConnect')).toHaveLength(0);
    expect(legacyMarketplaceSelection({category:'real-estate-and-property'})).toBeNull();
  });

  it('merges approved database types only under a final category',()=>{
    const merged=directCategories({categories:[{slug:'restaurants-and-dining',title:'Ignored title',types:[{slug:'custom-food-trucks',title:'Food Trucks'}]},{slug:'removed-category',title:'Removed',types:[{slug:'custom-invalid',title:'Invalid'}]}]});
    expect(merged).toHaveLength(10);
    const child=merged[0].subcategories.find(t=>t.slug==='custom-food-trucks');
    expect(child?.listing_types).toEqual([{slug:'custom-food-trucks',title:'Food Trucks'}]);
    expect(merged.some(c=>c.slug==='removed-category')).toBe(false);
    expect(resolveSelfOnboardingInitialSelection({category:'hospitals-and-labs',type:'dental-clinics'}).typeSlug).toBe('dental-clinics');
  });
});
