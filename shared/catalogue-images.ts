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

const items = manifest.items as Record<string, {photo: string | null; subject?: string}>;
const assets = manifest.assets as Record<string, CatalogueImageAsset>;

/**
 * Resolves the canonical photo key (`<slug>`) for any Main Category (`10`),
 * Direct Service Type (`30`), or custom/newly added service type under a
 * verified Main Category (automatically inheriting the parent category's image).
 */
export function resolveCataloguePhotoKey(id: string, parentCategorySlug?: string): string | null {
  if (Object.hasOwn(items, id)) {
    return items[id]?.photo ?? null;
  }
  if (Object.hasOwn(assets, id)) {
    return id;
  }
  const parts = id.split('/');
  if ((parts[0] === 'subcategory' || parts[0] === 'type' || parts[0] === 'service') && parts[1]) {
    const parentId = `category/${parts[1]}`;
    if (Object.hasOwn(items, parentId)) {
      return items[parentId]?.photo ?? null;
    }
  }
  if (parentCategorySlug) {
    const parentId = `category/${parentCategorySlug}`;
    if (Object.hasOwn(items, parentId)) {
      return items[parentId]?.photo ?? null;
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
