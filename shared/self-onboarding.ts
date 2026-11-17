import businessTypesJson from './business-types.json';
import legacyMapJson from './marketplace-legacy-map.json';

export type RegulationKey = keyof typeof businessTypesJson.regulations;

export type RegulationMeta = {
  label: string;
  document: string;
};

export type SelfOnboardingBusinessType = {
  slug: string;
  listingTypeSlug: string;
  subcategorySlug: string;
  subcategoryTitle: string;
  title: string;
  description: string;
  categorySlug: string;
  categoryTitle: string;
  regulated?: RegulationKey;
  keywords: string[];
  searchHaystack: string;
};

export type SelfOnboardingSubcategoryGroup = {
  slug: string;
  title: string;
  count: number;
};

export type SelfOnboardingCategory = {
  slug: string;
  title: string;
  description: string;
  subcategories: SelfOnboardingSubcategoryGroup[];
  types: SelfOnboardingBusinessType[];
};

export const MAX_SELF_ONBOARDING_TYPES = 3;

export const SELF_ONBOARDING_REGULATIONS: Record<string, RegulationMeta> =
  businessTypesJson.regulations;

export const SELF_ONBOARDING_CATEGORIES: SelfOnboardingCategory[] =
  businessTypesJson.categories.map(cat => {
    const subCounts = new Map<string, { slug: string; title: string; count: number }>();
    const types: SelfOnboardingBusinessType[] = cat.types.map(bt => {
      const subSlug = bt.subcategory_slug || bt.slug;
      const subTitle = bt.subcategory_title || cat.title;
      const existingSub = subCounts.get(subSlug);
      if (existingSub) existingSub.count += 1;
      else subCounts.set(subSlug, { slug: subSlug, title: subTitle, count: 1 });

      const keywords = Array.isArray(bt.keywords) ? bt.keywords : [];
      const searchHaystack = [
        bt.title,
        subTitle,
        cat.title,
        bt.slug.replace(/-/g, ' '),
        ...keywords,
      ]
        .join(' ')
        .toLowerCase();

      return {
        slug: bt.slug,
        listingTypeSlug: bt.listing_type_slug || bt.slug,
        subcategorySlug: subSlug,
        subcategoryTitle: subTitle,
        title: bt.title,
        description: bt.description,
        categorySlug: cat.slug,
        categoryTitle: cat.title,
        regulated:
          'regulated' in bt && bt.regulated
            ? (bt.regulated as RegulationKey)
            : undefined,
        keywords,
        searchHaystack,
      };
    });

    return {
      slug: cat.slug,
      title: cat.title,
      description: cat.description,
      subcategories: Array.from(subCounts.values()),
      types,
    };
  });

export const ALL_SELF_ONBOARDING_TYPES: SelfOnboardingBusinessType[] =
  SELF_ONBOARDING_CATEGORIES.flatMap(c => c.types);

const typeBySlug = new Map<string, SelfOnboardingBusinessType>(
  ALL_SELF_ONBOARDING_TYPES.map(bt => [bt.slug, bt]),
);

const triplesMap = (legacyMapJson as { triples?: Record<string, string> }).triples ?? {};

export function findSelfOnboardingType(
  slug?: string | null,
): SelfOnboardingBusinessType | undefined {
  if (!slug) return undefined;
  return typeBySlug.get(slug);
}

function rankTypeMatch(bt: SelfOnboardingBusinessType, needle: string): number {
  const title = bt.title.toLowerCase();
  if (title === needle) return 0;
  if (title.startsWith(needle)) return 1;
  if (title.includes(' ' + needle)) return 2;
  if (title.includes(needle)) return 3;
  if (bt.subcategoryTitle.toLowerCase().includes(needle)) return 4;
  return 5;
}

export function searchSelfOnboardingTypes(
  query: string,
  categorySlug?: string | null,
  subcategorySlug?: string | null,
): SelfOnboardingBusinessType[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    const cat = categorySlug
      ? SELF_ONBOARDING_CATEGORIES.find(c => c.slug === categorySlug)
      : undefined;
    const pool = cat ? cat.types : ALL_SELF_ONBOARDING_TYPES;
    if (subcategorySlug && subcategorySlug !== 'all') {
      return pool.filter(bt => bt.subcategorySlug === subcategorySlug);
    }
    return pool;
  }

  const tokens = needle.split(/\s+/).filter(Boolean);
  const matches = ALL_SELF_ONBOARDING_TYPES.filter(bt =>
    tokens.every(tok => bt.searchHaystack.includes(tok)),
  );
  matches.sort(
    (a, b) =>
      rankTypeMatch(a, needle) - rankTypeMatch(b, needle) ||
      a.title.localeCompare(b.title),
  );
  return matches;
}

export function resolveSelfOnboardingInitialSelection(params: {
  category?: string;
  subcategory?: string;
  type?: string;
}): { categorySlug: string; subcategorySlug?: string; typeSlug?: string } {
  const { category, subcategory, type } = params;

  // 1. Exact (category, subcategory, type) triple from `/services` or `/services/nearby`
  if (category && subcategory && type) {
    const tripleKey = `${category}/${subcategory}/${type}`;
    const mappedUnique = triplesMap[tripleKey];
    if (mappedUnique && typeBySlug.has(mappedUnique)) {
      const hit = typeBySlug.get(mappedUnique)!;
      return {
        categorySlug: hit.categorySlug,
        subcategorySlug: hit.subcategorySlug,
        typeSlug: hit.slug,
      };
    }
  }

  // 2. Direct unique service type slug (any of the 808 slugs)
  const rawType = type || subcategory;
  if (rawType) {
    const direct = typeBySlug.get(rawType);
    if (direct) {
      return {
        categorySlug: direct.categorySlug,
        subcategorySlug: direct.subcategorySlug,
        typeSlug: direct.slug,
      };
    }

    // 3. Subcategory slug -> preselect category & subcategory filter
    for (const cat of SELF_ONBOARDING_CATEGORIES) {
      if (category && cat.slug !== category) continue;
      const subHit = cat.subcategories.find(s => s.slug === rawType);
      if (subHit) {
        return {
          categorySlug: cat.slug,
          subcategorySlug: subHit.slug,
        };
      }
    }

    // 4. Simplified v2 slug fallback (`restaurant`, `clinic-and-doctor`, etc.)
    const mappedV2 = (
      legacyMapJson.subcategories as Record<string, string[] | undefined>
    )[rawType];
    if (mappedV2 && mappedV2[3] && typeBySlug.has(mappedV2[3])) {
      const hit = typeBySlug.get(mappedV2[3])!;
      return {
        categorySlug: hit.categorySlug,
        subcategorySlug: hit.subcategorySlug,
        typeSlug: hit.slug,
      };
    }
  }

  if (category) {
    const directCat = SELF_ONBOARDING_CATEGORIES.find(c => c.slug === category);
    if (directCat) return { categorySlug: directCat.slug };
    const mappedCat = (
      legacyMapJson.categories as Record<string, string | undefined>
    )[category];
    if (mappedCat && SELF_ONBOARDING_CATEGORIES.some(c => c.slug === mappedCat)) {
      return { categorySlug: mappedCat };
    }
  }

  return { categorySlug: SELF_ONBOARDING_CATEGORIES[0].slug };
}

export function selfOnboardingUrl(params?: {
  category?: string;
  subcategory?: string;
  type?: string;
  business?: number | string;
}): string {
  if (!params) return '/seller/onboard';
  const query = new URLSearchParams();
  if (params.category && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.category)) {
    query.set('category', params.category);
  }
  if (params.subcategory && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.subcategory)) {
    query.set('subcategory', params.subcategory);
  }
  if (params.type && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.type)) {
    query.set('type', params.type);
  }
  if (params.business !== undefined && /^[1-9]\d*$/.test(String(params.business))) {
    query.set('business', String(params.business));
  }
  const qs = query.toString();
  return qs ? `/seller/onboard?${qs}` : '/seller/onboard';
}
