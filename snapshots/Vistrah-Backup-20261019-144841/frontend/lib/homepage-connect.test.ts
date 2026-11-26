import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi} from 'vitest';
import {HomepageConnect} from '../components/homepage-connect';
import {MarketplaceCategories} from '../components/marketplace-categories';
import {connectSections,connectCategorySlugs} from '../../shared/homepage-connect';
import {marketplaceCategories,marketplaceCategoryUrl,resolveMarketplaceSelection} from './marketplace-taxonomy';
vi.mock('next/link',()=>({default:({children,...props}:React.ComponentProps<'a'>)=>createElement('a',props,children)}));

describe('Homepage Connect features',()=>{
 it('renders AgriConnect then HealthConnect with canonical category links and approved photographs',()=>{
  const html=renderToStaticMarkup(createElement(HomepageConnect));
  expect(html.indexOf('VISTRAH AgriConnect')).toBeLessThan(html.indexOf('VISTRAH HealthConnect'));
  for(const section of connectSections){const category=marketplaceCategories.find(c=>c.slug===section.categorySlug)!;expect(html).toContain(category.title.replaceAll('&','&amp;'));expect(html).toContain(`href="${marketplaceCategoryUrl(category.slug)}"`);expect(resolveMarketplaceSelection({category:section.categorySlug})?.category).toBe(category);expect(html).toContain(section.description);expect(html).toContain(section.background);}
  expect(html.match(/<img /g)).toHaveLength(2);expect(html).not.toContain('Photograph unavailable');expect(html).not.toContain('lucide-arrow-up-right');expect(html).not.toContain('subcategories');
 });
 it('excludes the dedicated categories only when explicitly requested by the homepage',()=>{
  const home=renderToStaticMarkup(createElement(MarketplaceCategories,{compact:true,exclude:connectCategorySlugs}));const all=renderToStaticMarkup(createElement(MarketplaceCategories));
  expect(home.match(/data-marketplace-category=/g)).toHaveLength(12);expect(all.match(/data-marketplace-category=/g)).toHaveLength(14);
  for(const slug of connectCategorySlugs){expect(home).not.toContain(`data-marketplace-category="${slug}"`);expect(all).toContain(`data-marketplace-category="${slug}"`);}
 });
});
