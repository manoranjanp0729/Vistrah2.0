import finalTaxonomy from './final-service-taxonomy.json' with {type: 'json'};
import manifest from './marketplace-imagery.json' with {type: 'json'};

export type CatalogueImageAsset = {
  src: string;
  alt: string;
  position?: string;
  fit?: string;
  width?: number;
  height?: number;
  bytes?: number;
  sha256?: string;
};

export type QuickAccessIconName =
  | 'coffee'
  | 'home'
  | 'truck'
  | 'calendar'
  | 'activity'
  | 'book-open'
  | 'scissors'
  | 'layers'
  | 'zap'
  | 'film'
  | 'briefcase'
  | 'volume-2'
  | 'credit-card';

export type QuickAccessCatalogueService = {
  id: number;
  slug: string;
  title: string;
  image?: string | null;
  active: boolean;
  popular?: boolean;
};

export type QuickAccessCatalogueCategory = {
  id?: number;
  slug: string;
  title: string;
  active: boolean;
  services: QuickAccessCatalogueService[];
  subcategories?: Array<{
    slug: string;
    active: boolean;
    services: QuickAccessCatalogueService[];
  }>;
};

export type QuickAccessDescriptor = {
  key: string;
  serviceId: number | null;
  serviceSlug: string;
  categorySlug: string;
  title: string;
  photoKey: string | null;
  alt: string;
  rawImage?: string | null;
  icon: QuickAccessIconName;
};

const items = manifest.items as Record<string, {photo: string | null; subject?: string}>;
const assets = manifest.assets as Record<string, CatalogueImageAsset>;

const CATALOGUE_PATH_RE =
  /^(?:https?:\/\/[^/]+)?\/?(?:app\/)?(?:images\/)?catalogue\/([a-z0-9-]+)\.(?:webp|png|jpe?g)$/i;

/**
 * Resolves the canonical photo key (`<slug>`) for any Main Category (`10`),
 * Direct Service Type (`30`), `/images/catalogue/<slug>.webp` path, or custom
 * service type under a verified Main Category (inheriting the parent category image).
 */
export function resolveCataloguePhotoKey(id: string, parentCategorySlug?: string): string | null {
  const clean = (id || '').trim();
  if (clean) {
    if (Object.hasOwn(items, clean)) {
      return items[clean]?.photo ?? null;
    }
    if (Object.hasOwn(assets, clean)) {
      return clean;
    }
    const pathMatch = CATALOGUE_PATH_RE.exec(clean);
    if (pathMatch) {
      const slug = pathMatch[1].toLowerCase();
      if (Object.hasOwn(assets, slug)) {
        return slug;
      }
    }
    const parts = clean.split('/');
    if ((parts[0] === 'subcategory' || parts[0] === 'type' || parts[0] === 'service') && parts[1]) {
      const leaf = parts[parts.length - 1];
      if (leaf && Object.hasOwn(assets, leaf)) {
        return leaf;
      }
      const parentId = `category/${parts[1]}`;
      if (Object.hasOwn(items, parentId)) {
        return items[parentId]?.photo ?? null;
      }
    }
  }
  if (parentCategorySlug) {
    const cleanParent = parentCategorySlug.trim();
    const parentId = `category/${cleanParent}`;
    if (Object.hasOwn(items, parentId)) {
      return items[parentId]?.photo ?? null;
    }
    if (Object.hasOwn(assets, cleanParent)) {
      return cleanParent;
    }
  }
  return null;
}

export function resolveCatalogueAsset(id: string, parentCategorySlug?: string): CatalogueImageAsset | null {
  const key = resolveCataloguePhotoKey(id, parentCategorySlug);
  if (!key) return null;
  const asset = assets[key];
  if (!asset) throw new Error(`Missing curated marketplace photo: ${id}`);
  return asset;
}

/**
 * Resolves relative `/api/...` or `/uploads/...` image URLs safely against `apiBase`,
 * and converts `/images/catalogue/<slug>.webp` into base-path-aware web URLs when needed,
 * never emitting broken root-relative `/images/...` or `/catalog/...` paths under `/app/`.
 */
export function resolveQuickAccessImageUri(
  rawUri: string | null | undefined,
  options: {apiBase?: string; webBasePath?: string} = {},
): string | null {
  if (!rawUri || typeof rawUri !== 'string') return null;
  const trimmed = rawUri.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const catalogueKey = resolveCataloguePhotoKey(trimmed);
  if (catalogueKey) {
    const base = (options.webBasePath ?? '').replace(/\/+$/, '');
    return `${base}/images/catalogue/${catalogueKey}.webp`;
  }

  if (trimmed.startsWith('/api/') || trimmed.startsWith('/uploads/') || trimmed.startsWith('/media/')) {
    const cleanApi = (options.apiBase ?? '').trim().replace(/\/+$/, '');
    if (!cleanApi) return null;
    if (cleanApi === '/api') {
      return trimmed.startsWith('/api/') ? trimmed : `/api${trimmed}`;
    }
    if (cleanApi.endsWith('/api') && trimmed.startsWith('/api/')) {
      return `${cleanApi.slice(0, -4)}${trimmed}`;
    }
    return `${cleanApi}${trimmed}`;
  }

  return null;
}

const CATEGORY_ICONS: Record<string, QuickAccessIconName> = {
  'restaurants-and-dining': 'coffee',
  'hotels-and-stay': 'home',
  'vehicle-rentals': 'truck',
  'event-management': 'calendar',
  'hospitals-and-labs': 'activity',
  'education-and-skills': 'book-open',
  'salons-and-beauty-parlour': 'scissors',
  'civil-and-construction': 'layers',
  'fuel-and-charging-stations': 'zap',
  'vibe-finder': 'film',
  'real-estate': 'home',
  'tax-compliance': 'credit-card',
};

export function quickAccessCategoryIcon(
  categorySlug: string,
  serviceSlug?: string,
): QuickAccessIconName {
  if (serviceSlug === 'digital-marketing') return 'volume-2';
  return CATEGORY_ICONS[categorySlug] ?? 'briefcase';
}

export function selectQuickAccessDescriptors(
  categories: readonly QuickAccessCatalogueCategory[],
  limit = 10,
): QuickAccessDescriptor[] {
  const activeBuckets: Array<{
    category: QuickAccessCatalogueCategory;
    services: QuickAccessCatalogueService[];
  }> = [];

  for (const cat of categories) {
    if (!cat.active || cat.slug === 'marketing') continue;
    const direct = (cat.services ?? []).filter(s => s.active);
    const nested = (cat.subcategories ?? [])
      .filter(sub => sub.active)
      .flatMap(sub => sub.services.filter(s => s.active));
    const merged = [...direct, ...nested].sort(
      (a, b) =>
        Number(Boolean(b.popular)) - Number(Boolean(a.popular)) ||
        Number(b.slug === 'digital-marketing') - Number(a.slug === 'digital-marketing'),
    );
    if (merged.length > 0) {
      activeBuckets.push({category: cat, services: merged});
    }
  }

  if (activeBuckets.length > 0) {
    const picked: Array<{
      category: QuickAccessCatalogueCategory;
      service: QuickAccessCatalogueService;
    }> = [];
    const seenIds = new Set<string>();

    // First include any explicitly popular services
    for (const bucket of activeBuckets) {
      for (const svc of bucket.services) {
        if (picked.length >= limit) break;
        const k = `${bucket.category.slug}:${svc.id}:${svc.slug}`;
        if (svc.popular && !seenIds.has(k)) {
          seenIds.add(k);
          picked.push({category: bucket.category, service: svc});
        }
      }
    }

    // Then interleave round-robin across active categories so all 10 categories are represented
    let round = 0;
    while (picked.length < limit) {
      let addedInRound = false;
      for (const bucket of activeBuckets) {
        if (picked.length >= limit) break;
        const candidate = bucket.services[round];
        if (!candidate) continue;
        const k = `${bucket.category.slug}:${candidate.id}:${candidate.slug}`;
        if (!seenIds.has(k)) {
          seenIds.add(k);
          picked.push({category: bucket.category, service: candidate});
          addedInRound = true;
        }
      }
      if (!addedInRound) break;
      round++;
    }

    return picked.map(({category, service}) => {
      const photoKey =
        resolveCataloguePhotoKey(service.slug, category.slug) ??
        resolveCataloguePhotoKey(service.image ?? '', category.slug);
      const asset = photoKey ? assets[photoKey] : null;
      return {
        key: String(service.id),
        serviceId: service.id,
        serviceSlug: service.slug,
        categorySlug: category.slug,
        title: service.title,
        photoKey,
        alt: asset?.alt ?? `${service.title} — verified local service on VISTRAH`,
        rawImage: service.image ?? null,
        icon: quickAccessCategoryIcon(category.slug, service.slug),
      };
    });
  }

  // Verified fallback from the 10-category taxonomy before `/catalogue` finishes loading
  return finalTaxonomy.categories.slice(0, limit).map(cat => {
    const firstType = cat.types[0];
    const slug = firstType?.slug ?? cat.slug;
    const title = firstType?.title ?? cat.title;
    const photoKey = resolveCataloguePhotoKey(slug, cat.slug);
    const asset = photoKey ? assets[photoKey] : null;
    return {
      key: `fallback-${cat.slug}-${slug}`,
      serviceId: null,
      serviceSlug: slug,
      categorySlug: cat.slug,
      title,
      photoKey,
      alt: asset?.alt ?? `${title} — verified local service on VISTRAH`,
      rawImage: null,
      icon: quickAccessCategoryIcon(cat.slug, slug),
    };
  });
}
