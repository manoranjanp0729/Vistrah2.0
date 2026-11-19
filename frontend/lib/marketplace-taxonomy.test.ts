import {createElement,type ReactNode} from 'react';
import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup as renderMarkup} from 'react-dom/server';
import {LanguageProvider} from '../components/language-provider';
const renderToStaticMarkup=(node:ReactNode)=>renderMarkup(createElement(LanguageProvider,null,node));
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
  marketplaceCategories,
  searchMarketplace,
  taxonomyCounts,
  marketplaceCategoryUrl,
  marketplaceNearbyTypeUrl,
  marketplaceUrl,
  resolveMarketplaceSelection,
  legacyMarketplaceSelection,
  searchMarketplaceEntries,
  marketplaceItemId,
} from './marketplace-taxonomy';
import {MarketplaceCategories} from '../components/marketplace-categories';
import {MarketplaceBrowser} from '../components/marketplace-browser';
import sharedImagery from '../../shared/marketplace-imagery.json';
import catalogue from '../../shared/catalogue.json';
import {
  ALL_SELF_ONBOARDING_TYPES,
  SELF_ONBOARDING_CATEGORIES,
  resolveSelfOnboardingInitialSelection,
  searchSelfOnboardingTypes,
} from '../../shared/self-onboarding';
import {allServices,resolveRoute,urls} from './urls';
import type {Category} from './types';

vi.mock('next/link',()=>({default:({children,href,...props}:React.ComponentProps<'a'>)=>createElement('a',{href,...props},children)}));

describe('Unified 10-Sector marketplace discovery (10 sectors -> 133 subcategories -> 814 service types)',()=>{
  it('exposes 10 sectors, 133 subcategories, and 814 listing types linked directly to /services/nearby',()=>{
    expect(taxonomyCounts).toEqual({categories:10,subcategories:133,listingTypes:814});
    let subs=0;
    let types=0;
    for(const category of marketplaceCategories){
      const html=renderToStaticMarkup(createElement(MarketplaceBrowser,{selection:{category,subcategory:undefined,listingType:undefined}}));
      subs+=(html.match(/data-marketplace-subcategory=/g)??[]).length;
      expect(html).not.toContain('<details');
      for(const subcategory of category.subcategories){
        types+=subcategory.listing_types.length;
        const subResolved=resolveMarketplaceSelection({category:category.slug,subcategory:subcategory.slug});
        expect(subResolved?.subcategory?.slug).toBe(subcategory.slug);
        for(const lt of subcategory.listing_types){
          const ltResolved=resolveMarketplaceSelection({category:category.slug,subcategory:subcategory.slug,type:lt.slug});
          expect(ltResolved?.listingType?.slug).toBe(lt.slug);
        }
      }
    }
    expect(subs).toBe(133);
    expect(types).toBe(814);

    const food=marketplaceCategories.find(c=>c.slug==='hospitality-restaurants-and-cafes')!;
    const dining=food.subcategories.find(s=>s.slug==='restaurants-and-dining')!;
    const subHtml=renderToStaticMarkup(createElement(MarketplaceBrowser,{selection:{category:food,subcategory:dining,listingType:undefined}}));
    expect(subHtml).toContain(marketplaceNearbyTypeUrl({category:'hospitality-restaurants-and-cafes',subcategory:'restaurants-and-dining',type:'restaurants'}).replaceAll('&','&amp;'));
  });

  it('links all 10 sector cards to valid category selections',()=>{
    const html=renderToStaticMarkup(createElement(MarketplaceCategories));
    expect(html.match(/data-marketplace-category=/g)).toHaveLength(10);
    for(const category of marketplaceCategories){
      expect(html).toContain(`href="${marketplaceCategoryUrl(category.slug).replaceAll('&','&amp;')}"`);
      expect(resolveMarketplaceSelection({category:category.slug})?.category).toBe(category);
    }
  });

  it('maps every category, subcategory, and listing type to intact local photo bytes with SHA-256 verification',()=>{
    const items=sharedImagery.items as Record<string,{photo:string|null}>;
    const assets=sharedImagery.assets as Record<string,{src:string;sha256:string}>;
    const catPhotoKeys=marketplaceCategories.map(c=>items[marketplaceItemId(c.slug)]?.photo);
    expect(catPhotoKeys.every(Boolean)).toBe(true);
    for(const category of marketplaceCategories){
      const key=items[marketplaceItemId(category.slug)].photo!;
      const asset=assets[key];
      expect(asset.src).toMatch(/^\/images\//);
      const bytes=readFileSync(new URL(`../public${asset.src}`,import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);
    }
  });

  it('searches across all 814 service types in 1-2 keystrokes and resolves legacy v3 and v2 bookmarks',()=>{
    expect(searchMarketplace('  VETERINARY  ').map(c=>c.slug)).toContain('healthconnect-and-clinics');
    expect(searchMarketplace('Study Abroad').map(c=>c.slug)).toContain('overseas-education-and-skill-academies');
    const dogWalking=searchMarketplaceEntries('  DOG WALKING  ');
    expect(dogWalking.length).toBeGreaterThanOrEqual(1);
    expect(dogWalking[0].href).toContain('/services/nearby?');
    expect(dogWalking[0].selection.type).toBe('dog-walking');
    expect(searchMarketplaceEntries('no-such-classification')).toEqual([]);

    expect(legacyMarketplaceSelection({category:'home-services',subcategory:'electrician-and-plumber'})).toEqual({
      category:'interior-design-and-exteriors',
      subcategory:'repairs-and-maintenance',
      type:'plumbing',
    });
    expect(legacyMarketplaceSelection({category:'food-and-dining',subcategory:'restaurants-and-dining',type:'restaurants'})).toEqual({
      category:'hospitality-restaurants-and-cafes',
      subcategory:'restaurants-and-dining',
      type:'restaurants',
    });
    expect(legacyMarketplaceSelection({category:'vehicles'})).toEqual({
      category:'automobiles-and-garages',
    });
  });

  it('rejects unknown or cross-category selections',()=>{
    expect(resolveMarketplaceSelection({category:'unknown'})).toBeNull();
    expect(resolveMarketplaceSelection({subcategory:'restaurants-and-dining'})).toBeNull();
    expect(resolveMarketplaceSelection({category:'hospitality-restaurants-and-cafes',subcategory:'plumbers'})).toBeNull();
    expect(resolveMarketplaceSelection({category:'interior-design-and-exteriors',subcategory:'repairs-and-maintenance',type:'restaurants'})).toBeNull();
  });

  it('renders breadcrumb and back link on listing-type pages without /request links',()=>{
    const category=marketplaceCategories[0],subcategory=category.subcategories[0],listingType=subcategory.listing_types[0];
    const html=renderToStaticMarkup(createElement(MarketplaceBrowser,{selection:{category,subcategory,listingType}}));
    expect(html).toContain('Marketplace breadcrumb');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain(marketplaceUrl({category:category.slug}).replaceAll('&','&amp;'));
    expect(html).not.toContain('/request');
  });

  it('preserves all published service and request route IDs',()=>{
    const categories=structuredClone(catalogue) as unknown as Category[];
    allServices(categories).forEach(({service},index)=>{service.id=index+1;});
    for(const context of allServices(categories)){
      for(const url of [urls.service(context.category,context.service,context.subcategory),urls.request(context.category,context.service,context.subcategory)]){
        const resolved=resolveRoute(categories,url.split('/').slice(2));
        expect(resolved&&'service' in resolved&&resolved.service.id).toBe(context.service.id);
      }
    }
  });

  it('retains both homepage layouts and avoids the taxonomy API',()=>{
    const home=readFileSync(new URL('../app/(public)/page.tsx',import.meta.url),'utf8');
    const services=readFileSync(new URL('../app/(public)/services/page.tsx',import.meta.url),'utf8');
    expect(home.match(/<MarketplaceCategories compact exclude=\{connectCategorySlugs\}\/>/g)).toHaveLength(2);
    expect(services).toContain('<MarketplaceBrowser selection={selection} query={q}/>');
    expect(services).not.toContain('/marketplace/taxonomy');
  });
});

describe('Civil Construction, Agriculture & Real Estate sectors',()=>{
  it('exposes full listing types and preserves keyword search like tractor rental',()=>{
    const civil=marketplaceCategories.find(c=>c.slug==='civil-construction-and-contractors')!;
    expect(civil.subcategories).toHaveLength(16);
    const tractorHit=searchMarketplaceEntries('tractor rental')[0];
    expect(tractorHit.selection.category).toBe(civil.slug);
    expect(tractorHit.href).toContain('/services/nearby?');
    const subcategory=civil.subcategories[0],listingType=subcategory.listing_types[0];
    const html=renderToStaticMarkup(createElement(MarketplaceBrowser,{selection:{category:civil,subcategory,listingType}}));
    expect(html).not.toContain('Photograph unavailable');
    expect(html).not.toContain('/request');
  });
});

describe('clean homepage categories & 10-sector self-onboarding picker',()=>{
  it('removes explanatory counts and instructions only in compact mode while preserving all 10 sector cards',()=>{
    const compact=renderToStaticMarkup(createElement(MarketplaceCategories,{compact:true}));
    expect(compact.match(/data-marketplace-category=/g)).toHaveLength(10);
    expect(compact).not.toContain('10 categories');
    expect(compact).not.toContain('subcategories');
    expect(compact).not.toContain('Swipe or use arrows');
    for(const category of marketplaceCategories){
      expect(compact).toContain(`aria-label="${category.title.replaceAll('&','&amp;')}"`);
      expect(compact).toContain(marketplaceCategoryUrl(category.slug));
    }
    const discovery=renderToStaticMarkup(createElement(MarketplaceCategories));
    expect(discovery).toContain('10');
    expect(discovery).toContain('814');
    expect(discovery).toContain('Swipe or use arrows');
    expect(discovery).toContain('subcategories');
  });

  it('shares the exact 10 sectors and 814 searchable service types with 3-step self-onboarding',()=>{
    expect(SELF_ONBOARDING_CATEGORIES).toHaveLength(10);
    expect(ALL_SELF_ONBOARDING_TYPES).toHaveLength(814);
    expect(searchSelfOnboardingTypes('pl')[0].title.toLowerCase()).toContain('pl');
    expect(searchSelfOnboardingTypes('borewell').some(t=>t.slug.includes('borewell'))).toBe(true);
    expect(searchSelfOnboardingTypes('study abroad').some(t=>t.slug==='study-abroad-consultants')).toBe(true);
    expect(resolveSelfOnboardingInitialSelection({
      category:'food-and-dining',
      subcategory:'restaurants-and-dining',
      type:'family-restaurants',
    })).toEqual({
      categorySlug:'hospitality-restaurants-and-cafes',
      subcategorySlug:'restaurants-and-dining',
      typeSlug:'family-restaurants',
    });
  });
});
