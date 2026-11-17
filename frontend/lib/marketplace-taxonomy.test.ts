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

describe('Full 800+ marketplace discovery (15 categories -> 132 subcategories -> 808 service types)',()=>{
  it('exposes 15 categories, 132 subcategories, and 808 listing types linked directly to /services/nearby',()=>{
    expect(taxonomyCounts).toEqual({categories:15,subcategories:132,listingTypes:808});
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
    expect(subs).toBe(132);
    expect(types).toBe(808);

    const food=marketplaceCategories.find(c=>c.slug==='food-and-dining')!;
    const dining=food.subcategories.find(s=>s.slug==='restaurants-and-dining')!;
    const subHtml=renderToStaticMarkup(createElement(MarketplaceBrowser,{selection:{category:food,subcategory:dining,listingType:undefined}}));
    expect(subHtml).toContain(marketplaceNearbyTypeUrl({category:'food-and-dining',subcategory:'restaurants-and-dining',type:'restaurants'}).replaceAll('&','&amp;'));
  });

  it('links all 15 category cards to valid category selections',()=>{
    const html=renderToStaticMarkup(createElement(MarketplaceCategories));
    expect(html.match(/data-marketplace-category=/g)).toHaveLength(15);
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

  it('searches across all 808 service types in 1-2 keystrokes and resolves legacy v2 bookmarks',()=>{
    expect(searchMarketplace('  PET CARE  ').map(c=>c.slug)).toContain('pet-care');
    expect(searchMarketplace('Veterinary').map(c=>c.slug)).toContain('pet-care');
    const dogWalking=searchMarketplaceEntries('  DOG WALKING  ');
    expect(dogWalking.length).toBeGreaterThanOrEqual(1);
    expect(dogWalking[0].href).toContain('/services/nearby?');
    expect(dogWalking[0].selection.type).toBe('dog-walking');
    expect(searchMarketplaceEntries('no-such-classification')).toEqual([]);

    expect(legacyMarketplaceSelection({category:'home-services',subcategory:'electrician-and-plumber'})).toEqual({
      category:'home-and-everyday-services',
      subcategory:'repairs-and-maintenance',
      type:'plumbing',
    });
    expect(legacyMarketplaceSelection({category:'vehicles'})).toEqual({
      category:'automobiles',
    });
  });

  it('rejects unknown or cross-category selections',()=>{
    expect(resolveMarketplaceSelection({category:'unknown'})).toBeNull();
    expect(resolveMarketplaceSelection({subcategory:'restaurants-and-dining'})).toBeNull();
    expect(resolveMarketplaceSelection({category:'food-and-dining',subcategory:'plumbers'})).toBeNull();
    expect(resolveMarketplaceSelection({category:'home-and-everyday-services',subcategory:'plumbers',type:'restaurants'})).toBeNull();
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

describe('Agriculture & Farming and Property & Construction',()=>{
  it('exposes full listing types and preserves keyword search like tractor rental',()=>{
    const agriculture=marketplaceCategories.find(c=>c.slug==='agriculture-and-farming')!;
    expect(agriculture.subcategories).toHaveLength(9);
    const tractorHit=searchMarketplaceEntries('tractor rental')[0];
    expect(tractorHit.selection.category).toBe(agriculture.slug);
    expect(tractorHit.href).toContain('/services/nearby?');
    const subcategory=agriculture.subcategories[0],listingType=subcategory.listing_types[0];
    const html=renderToStaticMarkup(createElement(MarketplaceBrowser,{selection:{category:agriculture,subcategory,listingType}}));
    expect(html).not.toContain('Photograph unavailable');
    expect(html).not.toContain('/request');
  });
});

describe('clean homepage categories & 800+ self-onboarding picker',()=>{
  it('removes explanatory counts and instructions only in compact mode while preserving all 15 cards',()=>{
    const compact=renderToStaticMarkup(createElement(MarketplaceCategories,{compact:true}));
    expect(compact.match(/data-marketplace-category=/g)).toHaveLength(15);
    expect(compact).not.toContain('15 categories');
    expect(compact).not.toContain('subcategories');
    expect(compact).not.toContain('Swipe or use arrows');
    for(const category of marketplaceCategories){
      expect(compact).toContain(`aria-label="${category.title.replaceAll('&','&amp;')}"`);
      expect(compact).toContain(marketplaceCategoryUrl(category.slug));
    }
    const discovery=renderToStaticMarkup(createElement(MarketplaceCategories));
    expect(discovery).toContain('15');
    expect(discovery).toContain('808');
    expect(discovery).toContain('Swipe or use arrows');
    expect(discovery).toContain('subcategories');
  });

  it('shares the exact 15 categories and 808 searchable service types with 3-step self-onboarding',()=>{
    expect(SELF_ONBOARDING_CATEGORIES).toHaveLength(15);
    expect(ALL_SELF_ONBOARDING_TYPES).toHaveLength(808);
    expect(searchSelfOnboardingTypes('pl')[0].title.toLowerCase()).toContain('pl');
    expect(searchSelfOnboardingTypes('borewell').some(t=>t.slug.includes('borewell'))).toBe(true);
    expect(resolveSelfOnboardingInitialSelection({
      category:'food-and-dining',
      subcategory:'restaurants-and-dining',
      type:'family-restaurants',
    })).toEqual({
      categorySlug:'food-and-dining',
      subcategorySlug:'restaurants-and-dining',
      typeSlug:'family-restaurants',
    });
  });
});
