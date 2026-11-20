import source from './business-types.json';
import {createMarketplace, type MarketplaceCategory} from './marketplace';

export type DirectType = {slug: string; title: string; description?: string; regulated?: string};
export type DirectCatalogue = {categories: {slug: string; title: string; types: DirectType[]}[]};

/** Public approved metadata only. Source categories and initial titles stay authoritative. */
export function directCategories(remote?: DirectCatalogue | null): MarketplaceCategory[] {
  return source.categories.map(category => {
    const types: DirectType[] = [...category.types];
    for (const type of remote?.categories?.find(c => c.slug === category.slug)?.types ?? []) {
      if (/^[a-z0-9-]{1,100}$/.test(type.slug) && typeof type.title === 'string' && type.title.length <= 150 && !types.some(t => t.slug === type.slug)) types.push(type);
    }
    return {slug: category.slug, title: category.title, description: category.description,
      subcategories: types.map(type => ({slug: type.slug, title: type.title,
        listing_types: [{slug: type.slug, title: type.title}]}))};
  });
}

export function directMarketplace(remote?: DirectCatalogue | null) {
  return createMarketplace({categories: directCategories(remote)});
}
