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

describe('Simplified 2-level marketplace discovery (13 categories -> 81 business types)',()=>{
  it('exposes 13 categories and 81 single-step business types across the navigable hierarchy',()=>{
    expect(taxonomyCounts).toEqual({categories:13,subcategories:81,listingTypes:81});
    let subs=0;
    for(const category of marketplaceCategories){
      const html=renderToStaticMarkup(createElement(MarketplaceBrowser,{selection:{category,subcategory:undefined,listingType:undefined}}));
      subs+=(html.match(/data-marketplace-subcategory=/g)??[]).length;
      expect(html).not.toContain('<details');
      for(const subcategory of category.subcategories){
        const resolved=resolveMarketplaceSelection({category:category.slug,subcategory:subcategory.slug});
        expect(resolved?.listingType?.slug).toBe(subcategory.slug);
        const subHtml=renderToStaticMarkup(createElement(MarketplaceBrowser,{selection:resolved!}));
        expect(subHtml).not.toContain('/service/');
      }
    }
    expect(subs).toBe(81);
  });

  it('links all 13 category cards to valid category selections',()=>{
    const html=renderToStaticMarkup(createElement(MarketplaceCategories));
    expect(html.match(/data-marketplace-category=/g)).toHaveLength(13);
    for(const category of marketplaceCategories){
      expect(html).toContain(`href="${marketplaceCategoryUrl(category.slug).replaceAll('&','&amp;')}"`);
      expect(resolveMarketplaceSelection({category:category.slug})?.category).toBe(category);
    }
  });

  it('maps every category and business type to intact local photo bytes with SHA-256 verification',()=>{
    const items=sharedImagery.items as Record<string,{photo:string|null}>;
    const assets=sharedImagery.assets as Record<string,{src:string;sha256:string}>;
    const catPhotoKeys=marketplaceCategories.map(c=>items[marketplaceItemId(c.slug)]?.photo);
    expect(catPhotoKeys.every(Boolean)).toBe(true);
    expect(new Set(catPhotoKeys).size).toBeGreaterThanOrEqual(12);
    for(const category of marketplaceCategories){
      const key=items[marketplaceItemId(category.slug)].photo!;
      const asset=assets[key];
      expect(asset.src).toMatch(/^\/images\//);
      const bytes=readFileSync(new URL(`../public${asset.src}`,import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);
    }
  });

  it('searches preserved legacy keywords across all 749 terms and resolves legacy v1 bookmarks',()=>{
    expect(searchMarketplace('  PET CARE  ').map(c=>c.slug)).toContain('home-services');
    expect(searchMarketplace('Veterinary').map(c=>c.slug)).toContain('health-and-fitness');
    const dogWalking=searchMarketplaceEntries('  DOG WALKING  ');
    expect(dogWalking.length).toBeGreaterThanOrEqual(1);
    expect(dogWalking[0].level).toBe('Business type');
    expect((dogWalking[0].selection as {subcategory?:string}).subcategory).toBe('pet-care');
    const params=Object.fromEntries(new URL(dogWalking[0].href,'http://localhost').searchParams);
    expect(resolveMarketplaceSelection(params)?.listingType?.slug).toBe('pet-care');
    expect(searchMarketplaceEntries('no-such-classification')).toEqual([]);

    expect(legacyMarketplaceSelection({category:'pet-care',subcategory:'grooming'})).toEqual({
      category:'home-services',
      subcategory:'pet-care',
    });
    expect(legacyMarketplaceSelection({category:'automobiles'})).toEqual({
      category:'vehicles',
    });
  });

  it('rejects unknown or cross-category selections',()=>{
    expect(resolveMarketplaceSelection({category:'unknown'})).toBeNull();
    expect(resolveMarketplaceSelection({subcategory:'restaurant'})).toBeNull();
    expect(resolveMarketplaceSelection({category:'food-and-dining',subcategory:'veterinary-clinic'})).toBeNull();
    expect(resolveMarketplaceSelection({category:'home-services',subcategory:'pet-care',type:'restaurant'})).toBeNull();
  });

  it('renders 2-level breadcrumb and back link on business-type pages without /request links',()=>{
    const category=marketplaceCategories[12],subcategory=category.subcategories[0],listingType=subcategory.listing_types[0];
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

describe('Agriculture & Farming business types',()=>{
  it('exposes 6 clear business types and preserves keyword search like tractor rental',()=>{
    const agriculture=marketplaceCategories.at(-1)!;
    expect(agriculture.slug).toBe('agriculture-and-farming');
    expect(agriculture.subcategories).toHaveLength(6);
    expect(searchMarketplaceEntries('tractor rental')[0].selection.category).toBe(agriculture.slug);
    const subcategory=agriculture.subcategories[0],listingType=subcategory.listing_types[0];
    const html=renderToStaticMarkup(createElement(MarketplaceBrowser,{selection:{category:agriculture,subcategory,listingType}}));
    expect(html).not.toContain('Photograph unavailable');
    expect(html).not.toContain('/request');
  });
});

describe('clean homepage categories',()=>{
  it('removes explanatory counts and instructions only in compact mode while preserving all 13 cards',()=>{
    const compact=renderToStaticMarkup(createElement(MarketplaceCategories,{compact:true}));
    expect(compact.match(/data-marketplace-category=/g)).toHaveLength(13);
    expect(compact).not.toContain('13 categories');
    expect(compact).not.toContain('business types');
    expect(compact).not.toContain('Swipe or use arrows');
    for(const category of marketplaceCategories){
      expect(compact).toContain(`aria-label="${category.title.replaceAll('&','&amp;')}"`);
      expect(compact).toContain(marketplaceCategoryUrl(category.slug));
    }
    const discovery=renderToStaticMarkup(createElement(MarketplaceCategories));
    expect(discovery).toContain('13');
    expect(discovery).toContain('Swipe or use arrows');
    expect(discovery).toContain('business types');
  });

  it('shares the exact 13 categories and 81 searchable business types with 3-step self-onboarding',()=>{
    expect(SELF_ONBOARDING_CATEGORIES).toHaveLength(13);
    expect(ALL_SELF_ONBOARDING_TYPES).toHaveLength(81);
    expect(searchSelfOnboardingTypes('borewell').map(t=>t.slug)).toContain('irrigation-and-borewell');
    expect(resolveSelfOnboardingInitialSelection({type:'restaurants-and-dining'})).toEqual({
      categorySlug:'food-and-dining',
      typeSlug:'restaurant',
    });
  });
});
