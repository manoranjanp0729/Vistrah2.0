import businessTypesJson from './business-types.json';
import legacyMapJson from './marketplace-legacy-map.json';
import taxonomyJson from './marketplace-taxonomy.json';

export type RegulationKey = keyof typeof businessTypesJson.regulations;

export type RegulationMeta = {
  label: string;
  document: string;
};

export type SelfOnboardingBusinessType = {
  slug: string;
  title: string;
  description: string;
  categorySlug: string;
  categoryTitle: string;
  regulated?: RegulationKey;
  keywords: string[];
};

export type SelfOnboardingCategory = {
  slug: string;
  title: string;
  description: string;
  types: SelfOnboardingBusinessType[];
};

export const MAX_SELF_ONBOARDING_TYPES = 3;

export const SELF_ONBOARDING_REGULATIONS: Record<string, RegulationMeta> = businessTypesJson.regulations;

const keywordMap = new Map<string, string[]>();
for (const cat of taxonomyJson.categories) {
  for (const sub of cat.subcategories) {
    keywordMap.set(sub.slug, Array.isArray((sub as { keywords?: string[] }).keywords) ? (sub as { keywords?: string[] }).keywords! : []);
  }
}

export const SELF_ONBOARDING_CATEGORIES: SelfOnboardingCategory[] = businessTypesJson.categories.map((cat) => ({
  slug: cat.slug,
  title: cat.title,
  description: cat.description,
  types: cat.types.map((bt) => ({
    slug: bt.slug,
    title: bt.title,
    description: bt.description,
    categorySlug: cat.slug,
    categoryTitle: cat.title,
    regulated: 'regulated' in bt && bt.regulated ? (bt.regulated as RegulationKey) : undefined,
    keywords: keywordMap.get(bt.slug) ?? [],
  })),
}));

export const ALL_SELF_ONBOARDING_TYPES: SelfOnboardingBusinessType[] = SELF_ONBOARDING_CATEGORIES.flatMap((c) => c.types);

const typeBySlug = new Map<string, SelfOnboardingBusinessType>(
  ALL_SELF_ONBOARDING_TYPES.map((bt) => [bt.slug, bt]),
);

export function findSelfOnboardingType(slug?: string | null): SelfOnboardingBusinessType | undefined {
  if (!slug) return undefined;
  return typeBySlug.get(slug);
}

export function searchSelfOnboardingTypes(query: string, categorySlug?: string | null): SelfOnboardingBusinessType[] {
  const needle = query.trim().toLowerCase();
  const pool = categorySlug && !needle
    ? SELF_ONBOARDING_CATEGORIES.find((c) => c.slug === categorySlug)?.types ?? []
    : ALL_SELF_ONBOARDING_TYPES;
  if (!needle) return pool;
  return pool.filter((bt) => {
    if (bt.title.toLowerCase().includes(needle)) return true;
    if (bt.description.toLowerCase().includes(needle)) return true;
    if (bt.categoryTitle.toLowerCase().includes(needle)) return true;
    return bt.keywords.some((kw) => kw.toLowerCase().includes(needle));
  });
}

export function resolveSelfOnboardingInitialSelection(params: {
  category?: string;
  subcategory?: string;
  type?: string;
}): { categorySlug: string; typeSlug?: string } {
  const rawType = params.type || params.subcategory;
  if (rawType) {
    const direct = typeBySlug.get(rawType);
    if (direct) return { categorySlug: direct.categorySlug, typeSlug: direct.slug };
    const mappedSub = (legacyMapJson.subcategories as Record<string, string[] | undefined>)[rawType];
    if (mappedSub && mappedSub[1] && typeBySlug.has(mappedSub[1])) {
      return { categorySlug: mappedSub[0], typeSlug: mappedSub[1] };
    }
  }
  if (params.category) {
    const directCat = SELF_ONBOARDING_CATEGORIES.find((c) => c.slug === params.category);
    if (directCat) return { categorySlug: directCat.slug };
    const mappedCat = (legacyMapJson.categories as Record<string, string | undefined>)[params.category];
    if (mappedCat) return { categorySlug: mappedCat };
  }
  return { categorySlug: SELF_ONBOARDING_CATEGORIES[0].slug };
}

export function selfOnboardingUrl(params?: {
  category?: string;
  type?: string;
  business?: number | string;
}): string {
  if (!params) return '/seller/onboard';
  const query = new URLSearchParams();
  if (params.category && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.category)) query.set('category', params.category);
  if (params.type && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.type)) query.set('type', params.type);
  if (params.business !== undefined && /^[1-9]\d*$/.test(String(params.business))) query.set('business', String(params.business));
  const qs = query.toString();
  return qs ? `/seller/onboard?${qs}` : '/seller/onboard';
}
