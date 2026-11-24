import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  quickAccessCategoryIcon,
  resolveCataloguePhotoKey,
  resolveQuickAccessImageUri,
  selectQuickAccessDescriptors,
  type QuickAccessCatalogueCategory,
} from '../../shared/catalogue-images.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const taxonomy = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'shared/final-service-taxonomy.json'), 'utf8'),
);

test('Quick Access resolves every live catalogue and initial-fallback item to a verified self-hosted bundled asset', () => {
  const marketplacePhotosSrc = fs.readFileSync(
    path.join(ROOT, 'mobile/src/lib/marketplace-photos.ts'),
    'utf8',
  );
  const servicePhotosSrc = fs.readFileSync(
    path.join(ROOT, 'mobile/src/lib/service-photos.ts'),
    'utf8',
  );

  // Build simulated `/catalogue` API payload matching all 10 Main Categories & 30 Direct Service Types
  let nextId = 100;
  const liveCategories: QuickAccessCatalogueCategory[] = taxonomy.categories.map(
    (cat: { slug: string; title: string; types: Array<{ slug: string; title: string }> }) => ({
      slug: cat.slug,
      title: cat.title,
      active: true,
      services: cat.types.map(t => ({
        id: ++nextId,
        slug: t.slug,
        title: t.title,
        image: `/images/catalogue/${t.slug}.webp`,
        active: true,
        popular: false,
      })),
    }),
  );

  const liveQuick = selectQuickAccessDescriptors(liveCategories, 10);
  assert.equal(liveQuick.length, 10);
  assert.equal(new Set(liveQuick.map(i => i.categorySlug)).size, 10);

  for (const item of liveQuick) {
    assert.ok(item.photoKey, `Expected non-empty photoKey for ${item.serviceSlug}`);
    assert.ok(item.alt.length > 5, `Expected descriptive alt text for ${item.serviceSlug}`);
    assert.equal(item.icon, quickAccessCategoryIcon(item.categorySlug, item.serviceSlug));

    const bundledRequire = `"${item.photoKey}":require('../../assets/images/catalogue/${item.photoKey}.webp')`;
    assert.equal(
      marketplacePhotosSrc.includes(bundledRequire),
      true,
      `Expected ${item.photoKey} in mobile/src/lib/marketplace-photos.ts`,
    );

    const diskPath = path.join(ROOT, 'mobile/assets/images/catalogue', `${item.photoKey}.webp`);
    assert.equal(fs.existsSync(diskPath), true, `Missing bundled asset on disk: ${diskPath}`);
    assert.ok(fs.statSync(diskPath).size > 1024, `Asset unexpectedly empty: ${diskPath}`);
  }

  // Every single one of the 30 Direct Service Types must also resolve cleanly
  for (const cat of taxonomy.categories) {
    for (const svc of cat.types) {
      const key = resolveCataloguePhotoKey(svc.slug, cat.slug);
      assert.equal(key, svc.slug);
      const diskPath = path.join(ROOT, 'mobile/assets/images/catalogue', `${key}.webp`);
      assert.equal(fs.existsSync(diskPath), true);
    }
  }

  // Empty/loading `/catalogue` state still yields 10 verified Quick Access items with bundled photos
  const fallbackQuick = selectQuickAccessDescriptors([], 10);
  assert.equal(fallbackQuick.length, 10);
  for (const item of fallbackQuick) {
    assert.equal(item.serviceId, null);
    assert.ok(item.photoKey);
    const diskPath = path.join(ROOT, 'mobile/assets/images/catalogue', `${item.photoKey}.webp`);
    assert.equal(fs.existsSync(diskPath), true);
  }

  // Custom added service types inherit parent category image
  const customQuick = selectQuickAccessDescriptors(
    [
      {
        slug: 'restaurants-and-dining',
        title: 'Restaurants & Dining',
        active: true,
        services: [
          {
            id: 999,
            slug: 'custom-udupi-tiffin-room',
            title: 'Udupi Tiffin Room',
            active: true,
            popular: true,
          },
        ],
      },
    ],
    5,
  );
  assert.equal(customQuick[0].photoKey, 'restaurants-and-dining');

  assert.equal(servicePhotosSrc.includes('...cataloguePhotoEntries()'), true);
  assert.equal(servicePhotosSrc.includes('export function buildQuickAccessShortcuts'), true);
});

test('Quick Access URL & home component handle /app/ base paths, explicit dimensions, and onError fallback', () => {
  // Root-relative catalogue paths map to canonical photo keys and /app/-safe URLs
  assert.equal(resolveCataloguePhotoKey('/images/catalogue/hotels.webp'), 'hotels');
  assert.equal(resolveCataloguePhotoKey('/app/images/catalogue/hospitals.webp'), 'hospitals');
  assert.equal(
    resolveQuickAccessImageUri('/images/catalogue/cafes.webp', { webBasePath: '/app' }),
    '/app/images/catalogue/cafes.webp',
  );
  assert.equal(
    resolveQuickAccessImageUri('/uploads/listing-1.jpg', { apiBase: 'https://vistrah.in/api' }),
    'https://vistrah.in/api/uploads/listing-1.jpg',
  );
  assert.equal(
    resolveQuickAccessImageUri('/api/media/photo-2.webp', { apiBase: 'https://vistrah.in/api' }),
    'https://vistrah.in/api/media/photo-2.webp',
  );
  assert.equal(resolveQuickAccessImageUri('/catalog/broken-unbundled.jpg'), null);

  const indexSrc = fs.readFileSync(
    path.join(ROOT, 'mobile/src/app/(tabs)/index.tsx'),
    'utf8',
  );
  assert.equal(indexSrc.includes('buildQuickAccessShortcuts('), true);
  assert.equal(indexSrc.includes('resizeMode="cover"'), true);
  assert.equal(indexSrc.includes('setFailedShortcutPhotos'), true);
  assert.equal(indexSrc.includes("colors={['#091B33', '#0F294A', '#163A66']}"), true);
  assert.match(indexSrc, /shortcutImage:\s*\{\s*width:\s*124,\s*height:\s*90/);
});
