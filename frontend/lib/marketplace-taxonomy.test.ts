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
const EXPECTED={
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
describe('Final two-level marketplace',()=>{
 it('has the exact 10 ordered main categories and 30 direct types',()=>{
  expect(marketplaceCategories.map(c=>c.title)).toEqual(Object.keys(EXPECTED));
  expect(Object.fromEntries(marketplaceCategories.map(c=>[c.title,c.subcategories.map(t=>t.title)]))).toEqual(EXPECTED);
  expect(taxonomyCounts).toEqual({categories:10,subcategories:30,listingTypes:30});
  expect(ALL_SELF_ONBOARDING_TYPES).toHaveLength(30);
  expect(SELF_ONBOARDING_CATEGORIES.map(c=>c.title)).toEqual(Object.keys(EXPECTED));
 });
 it('renders direct nearby links for every type without another selection step',()=>{
  for(const category of marketplaceCategories){
   const html=renderToStaticMarkup(createElement(LanguageProvider,null,createElement(MarketplaceBrowser,{selection:{category,subcategory:undefined,listingType:undefined}})));
   for(const sub of category.subcategories){
    expect(sub.listing_types).toEqual([{slug:sub.slug,title:sub.title}]);
    const target=marketplaceNearbyTypeUrl({category:category.slug,subcategory:sub.slug,type:sub.slug});
    expect(html).toContain(target.replaceAll('&','&amp;'));
    expect(resolveMarketplaceSelection({category:category.slug,subcategory:sub.slug,type:sub.slug})?.listingType?.title).toBe(sub.title);
    expect((imagery.items as Record<string,unknown>)[marketplaceItemId(category.slug,sub.slug,sub.slug)]).toBeTruthy();
   }
  }
 });
 it('keeps all ten categories visible on the homepage and supports title search',()=>{
  const html=renderToStaticMarkup(createElement(LanguageProvider,null,createElement(MarketplaceCategories,{compact:true})));
  expect(html.match(/data-marketplace-category=/g)).toHaveLength(10);
  expect(searchMarketplaceEntries('EV Charging').some(r=>r.selection.category==='fuel-and-charging-stations')).toBe(true);
  expect(searchMarketplaceEntries('plumber')).toHaveLength(0);
  expect(legacyMarketplaceSelection({category:'real-estate-and-property'})).toBeNull();
 });
 it('merges approved database types only under a final category',()=>{
  const merged=directCategories({categories:[{slug:'restaurants-and-dining',title:'Ignored title',types:[{slug:'custom-food-trucks',title:'Food Trucks'}]},{slug:'removed-category',title:'Removed',types:[{slug:'custom-invalid',title:'Invalid'}]}]});
  expect(merged).toHaveLength(10);
  const child=merged[0].subcategories.find(t=>t.slug==='custom-food-trucks');
  expect(child?.listing_types).toEqual([{slug:'custom-food-trucks',title:'Food Trucks'}]);
  expect(merged.some(c=>c.slug==='removed-category')).toBe(false);
  expect(resolveSelfOnboardingInitialSelection({category:'restaurants-and-dining',type:'restaurant'}).categorySlug).toBe('restaurants-and-dining');
 });
});
