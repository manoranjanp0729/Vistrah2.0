import {createElement} from 'react';
import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {marketplaceCategories,searchMarketplace,taxonomyCounts,marketplaceCategoryUrl,marketplaceUrl,resolveMarketplaceSelection,searchMarketplaceEntries} from './marketplace-taxonomy';
import {MarketplaceCategories} from '../components/marketplace-categories';
import {MarketplaceBrowser} from '../components/marketplace-browser';
import imagery from './marketplace-imagery.json';
import catalogue from '../../shared/catalogue.json';
import {allServices,resolveRoute,urls} from './urls';
import type {Category} from './types';

vi.mock('next/link',()=>({default:({children,href,...props}:React.ComponentProps<'a'>)=>createElement('a',{href,...props},children)}));
describe('Canonical marketplace discovery',()=>{
  it('preserves all classifications across the navigable hierarchy',()=>{
    expect(taxonomyCounts).toEqual({categories:14,subcategories:126,listingTypes:749});
    let subs=0,types=0;
    for(const category of marketplaceCategories){
      const html=renderToStaticMarkup(createElement(MarketplaceBrowser,{selection:{category,subcategory:undefined,listingType:undefined}}));
      subs+=(html.match(/data-marketplace-subcategory=/g)??[]).length;
      expect(html).not.toContain('<details');
      for(const subcategory of category.subcategories){
        const subHtml=renderToStaticMarkup(createElement(MarketplaceBrowser,{selection:{category,subcategory,listingType:undefined}}));
        types+=(subHtml.match(/data-marketplace-type=/g)??[]).length;
        expect(subHtml).not.toContain('/service/');
      }
    }
    expect(subs).toBe(126);expect(types).toBe(749);
  });
  it('links all 14 category cards to valid category selections',()=>{
    const html=renderToStaticMarkup(createElement(MarketplaceCategories));
    expect(html.match(/data-marketplace-category=/g)).toHaveLength(14);
    for(const category of marketplaceCategories){
      expect(html).toContain(`href="${marketplaceCategoryUrl(category.slug).replaceAll('&','&amp;')}"`);
      expect(resolveMarketplaceSelection({category:category.slug})?.category).toBe(category);
    }
  });
  it('preserves the original categories distinct local photos with documented provenance and intact bytes',()=>{
    const photos=imagery as Record<string,{src:string;source:string;licenceUrl:string;sha256:string}>;
    const approved=marketplaceCategories.slice(0,13);
    const sources=approved.map(category=>photos[category.slug].src);
    expect(new Set(sources).size).toBe(13);
    for(const category of approved){
      const photo=photos[category.slug];expect(photo.src).toMatch(/^\/images\//);
      expect(photo.source).toMatch(/^https:\/\/(unsplash.com|www.pexels.com)\//);
      expect(photo.licenceUrl).toMatch(/^https:/);
      const bytes=readFileSync(new URL(`../public${photo.src}`,import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(photo.sha256);
    }
  });
  it('searches every level and provides precise hierarchy links',()=>{
    expect(searchMarketplace('  PET CARE  ').map(c=>c.slug)).toEqual(['pet-care']);
    expect(searchMarketplace('Veterinary Services').map(c=>c.slug)).toEqual(['pet-care']);
    const result=searchMarketplaceEntries('  DOG WALKING  ');
    expect(result).toHaveLength(1);expect(result[0].level).toBe('Listing type');
    const params=Object.fromEntries(new URL(result[0].href,'http://localhost').searchParams);
    expect(resolveMarketplaceSelection(params)?.listingType?.slug).toBe('dog-walking');
    expect(searchMarketplaceEntries('no-such-classification')).toEqual([]);
  });
  it('rejects unknown or cross-category selections',()=>{
    expect(resolveMarketplaceSelection({category:'unknown'})).toBeNull();
    expect(resolveMarketplaceSelection({subcategory:'training'})).toBeNull();
    expect(resolveMarketplaceSelection({category:'food-and-dining',subcategory:'veterinary-services'})).toBeNull();
    expect(resolveMarketplaceSelection({category:'pet-care',subcategory:'training',type:'restaurants'})).toBeNull();
  });
  it('renders breadcrumb and back links without treating a listing type as bookable',()=>{
    const category=marketplaceCategories[12],subcategory=category.subcategories[0],listingType=subcategory.listing_types[0];
    const html=renderToStaticMarkup(createElement(MarketplaceBrowser,{selection:{category,subcategory,listingType}}));
    expect(html).toContain('Marketplace breadcrumb');expect(html).toContain('aria-current="page"');
    expect(html).toContain(marketplaceUrl({category:category.slug,subcategory:subcategory.slug}).replaceAll('&','&amp;'));
    expect(html).toContain('cannot be booked or requested');expect(html).not.toContain('/request');
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

describe('additive Agriculture & Farming classification',()=>{
 it('preserves the exact original thirteen category trees and ordering',()=>{expect(createHash('sha256').update(JSON.stringify(marketplaceCategories.slice(0,13))).digest('hex')).toBe('262c3cf391d1ce522ed472ccd7a43483182fa86162af5d94f951b2510c8cf731');});
 it('exposes nine subcategories and 54 distinct new listing types without publishing services',()=>{
  const agriculture=marketplaceCategories.at(-1)!;expect(agriculture.slug).toBe('agriculture-and-farming');expect(agriculture.subcategories).toHaveLength(9);
  const entries=agriculture.subcategories.flatMap(s=>s.listing_types);expect(entries).toHaveLength(54);expect(new Set(entries.map(t=>t.slug)).size).toBe(54);
  const old=new Set(marketplaceCategories.slice(0,13).flatMap(c=>c.subcategories.flatMap(s=>s.listing_types.map(t=>t.slug))));expect(entries.every(t=>!old.has(t.slug))).toBe(true);
  expect(searchMarketplaceEntries('tractor rental')[0].selection.category).toBe(agriculture.slug);
  const subcategory=agriculture.subcategories[0],listingType=subcategory.listing_types[0];const html=renderToStaticMarkup(createElement(MarketplaceBrowser,{selection:{category:agriculture,subcategory,listingType}}));expect(html).toContain('agriculture-farm-land-preparation.webp');expect(html).not.toContain('Photograph unavailable');expect(html).toContain('cannot be booked or requested');expect(html).not.toContain('/request');
 });
});

describe('clean homepage categories',()=>{
 it('removes explanatory counts and instructions only in compact mode while preserving all cards',()=>{
  const compact=renderToStaticMarkup(createElement(MarketplaceCategories,{compact:true}));expect(compact.match(/data-marketplace-category=/g)).toHaveLength(14);expect(compact).not.toContain('14 categories');expect(compact).not.toContain('subcategories');expect(compact).not.toContain('Swipe or use arrows');
  for(const category of marketplaceCategories){expect(compact).toContain(`aria-label="${category.title.replaceAll('&','&amp;')}"`);expect(compact).toContain(marketplaceCategoryUrl(category.slug));}
  const discovery=renderToStaticMarkup(createElement(MarketplaceCategories));expect(discovery).toContain('14 categories');expect(discovery).toContain('Swipe or use arrows');expect(discovery).toContain('subcategories');
 });
});
