export type ListingType = { slug: string; title: string };
export type MarketplaceSubcategory = {
  slug: string;
  title: string;
  listing_types: ListingType[];
  description?: string;
  keywords?: string[];
  regulated?: string;
};
export type MarketplaceCategory = {
  slug: string;
  title: string;
  description?: string;
  subcategories: MarketplaceSubcategory[];
};
export type MarketplaceSelection = {
  category?: string;
  subcategory?: string;
  type?: string;
  q?: string;
};
export type MarketplaceLegacyMap = {
  categories: Record<string, string>;
  subcategories: Record<string, string[]>;
  triples?: Record<string, string>;
};

export const marketplaceItemId = (category: string, subcategory?: string, type?: string) =>
  type
    ? `type/${category}/${subcategory}/${type}`
    : subcategory
      ? `subcategory/${category}/${subcategory}`
      : `category/${category}`;

export function marketplaceUrl(selection: MarketplaceSelection = {}) {
  const params = new URLSearchParams();
  for (const key of ['category', 'subcategory', 'type', 'q'] as const) {
    if (selection[key]) params.set(key, selection[key]!);
  }
  return `/services${params.size ? '?' + params.toString() : ''}`;
}

export function marketplaceNearbyTypeUrl(selection: {
  category: string;
  subcategory: string;
  type: string;
}) {
  const params = new URLSearchParams({
    category: selection.category,
    subcategory: selection.subcategory,
    type: selection.type,
  });
  return `/services/nearby?${params.toString()}`;
}

export const marketplaceCategoryUrl = (slug: string) => marketplaceUrl({ category: slug });

export const isSingleTypeSubcategory = (subcategory: MarketplaceSubcategory) =>
  subcategory.listing_types.length === 1 &&
  subcategory.listing_types[0].slug === subcategory.slug;

function rankMatch(titleLower: string, needle: string): number {
  if (titleLower === needle) return 0;
  if (titleLower.startsWith(needle)) return 1;
  if (titleLower.includes(' ' + needle) || titleLower.includes('-' + needle)) return 2;
  return 3;
}

export function createMarketplace(
  taxonomy: { categories: MarketplaceCategory[] },
  legacy?: MarketplaceLegacyMap,
) {
  const marketplaceCategories = taxonomy.categories;
  const taxonomyCounts = {
    categories: marketplaceCategories.length,
    subcategories: marketplaceCategories.flatMap(c => c.subcategories).length,
    listingTypes: marketplaceCategories.flatMap(c =>
      c.subcategories.flatMap(s => s.listing_types),
    ).length,
  };

  function resolveMarketplaceSelection(selection: MarketplaceSelection) {
    const category = selection.category
      ? marketplaceCategories.find(c => c.slug === selection.category)
      : undefined;
    const subcategory = selection.subcategory
      ? category?.subcategories.find(s => s.slug === selection.subcategory)
      : undefined;
    let listingType = selection.type
      ? subcategory?.listing_types.find(t => t.slug === selection.type)
      : undefined;
    if (
      (selection.category && !category) ||
      (selection.subcategory && !subcategory) ||
      (selection.type && !listingType)
    ) {
      return null;
    }
    if (subcategory && !listingType && isSingleTypeSubcategory(subcategory)) {
      listingType = subcategory.listing_types[0];
    }
    return { category, subcategory, listingType };
  }

  /** Maps legacy v3 (15-category) and v2 (13-category / 81-type) bookmarks onto the 10-Sector taxonomy. */
  function legacyMarketplaceSelection(
    selection: MarketplaceSelection,
  ): MarketplaceSelection | null {
    if (!legacy || resolveMarketplaceSelection(selection)) return null;
    const isCurrentCategory = selection.category
      ? marketplaceCategories.some(c => c.slug === selection.category)
      : false;
    if (isCurrentCategory) return null;

    if (selection.subcategory) {
      const ownerCat = marketplaceCategories.find(c =>
        c.subcategories.some(s => s.slug === selection.subcategory),
      );
      if (ownerCat) {
        const subObj = ownerCat.subcategories.find(s => s.slug === selection.subcategory)!;
        const matchedType = selection.type
          ? subObj.listing_types.find(lt => lt.slug === selection.type)?.slug
          : undefined;
        return {
          category: ownerCat.slug,
          subcategory: subObj.slug,
          ...(matchedType ? { type: matchedType } : {}),
          ...(selection.q ? { q: selection.q } : {}),
        };
      }
    }

    const subKey = selection.subcategory || selection.type;
    const mapped = subKey ? legacy.subcategories[subKey] : undefined;
    if (mapped && mapped.length >= 3) {
      return {
        category: mapped[0],
        subcategory: mapped[1],
        type: mapped[2],
        ...(selection.q ? { q: selection.q } : {}),
      };
    }
    const category = selection.category ? legacy.categories[selection.category] : undefined;
    if (category && marketplaceCategories.some(c => c.slug === category)) {
      return { category, ...(selection.q ? { q: selection.q } : {}) };
    }
    return null;
  }

  const haystack = (sub: MarketplaceSubcategory) => [
    sub.title,
    ...(sub.keywords ?? []),
    ...sub.listing_types.map(type => type.title),
  ];

  function searchMarketplace(query = '') {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return marketplaceCategories;
    return marketplaceCategories.filter(category =>
      [category.title, ...category.subcategories.flatMap(haystack)].some(title =>
        title.toLocaleLowerCase().includes(needle),
      ),
    );
  }

  function searchMarketplaceEntries(query: string) {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return [];
    const entries: Array<{
      id: string;
      title: string;
      path: string;
      href: string;
      selection: MarketplaceSelection;
      level: string;
      score: number;
    }> = [];

    for (const category of marketplaceCategories) {
      const catLower = category.title.toLocaleLowerCase();
      if (catLower.includes(needle)) {
        entries.push({
          id: marketplaceItemId(category.slug),
          title: category.title,
          path: category.title,
          href: marketplaceCategoryUrl(category.slug),
          selection: { category: category.slug },
          level: 'Category',
          score: rankMatch(catLower, needle) + 2,
        });
      }
      for (const sub of category.subcategories) {
        const subLower = sub.title.toLocaleLowerCase();
        if (subLower.includes(needle)) {
          entries.push({
            id: marketplaceItemId(category.slug, sub.slug),
            title: sub.title,
            path: category.title,
            href: marketplaceUrl({ category: category.slug, subcategory: sub.slug }),
            selection: { category: category.slug, subcategory: sub.slug },
            level: 'Subcategory',
            score: rankMatch(subLower, needle) + 1,
          });
        }
        for (const type of sub.listing_types) {
          const typeLower = type.title.toLocaleLowerCase();
          if (typeLower.includes(needle)) {
            entries.push({
              id: marketplaceItemId(category.slug, sub.slug, type.slug),
              title: type.title,
              path: `${category.title} / ${sub.title}`,
              href: marketplaceNearbyTypeUrl({
                category: category.slug,
                subcategory: sub.slug,
                type: type.slug,
              }),
              selection: {
                category: category.slug,
                subcategory: sub.slug,
                type: type.slug,
              },
              level: 'Listing type',
              score: rankMatch(typeLower, needle),
            });
          }
        }
      }
    }

    entries.sort((a, b) => a.score - b.score || a.title.localeCompare(b.title));
    return entries.map(({ score: _score, ...rest }) => rest);
  }

  return {
    marketplaceCategories,
    taxonomyCounts,
    resolveMarketplaceSelection,
    legacyMarketplaceSelection,
    searchMarketplace,
    searchMarketplaceEntries,
  };
}
