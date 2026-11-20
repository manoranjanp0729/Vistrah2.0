import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveCatalogueAsset, resolveCataloguePhotoKey} from '../../shared/catalogue-images.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const taxonomy = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/final-service-taxonomy.json'), 'utf8'));
const imagery = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/marketplace-imagery.json'), 'utf8'));

test('all 10 Main Categories and 30 Direct Service Types exist in mobile/assets/images/catalogue with 40 unique files', () => {
  assert.equal(taxonomy.categories.length, 10);
  const mobilePhotosSource = fs.readFileSync(path.join(ROOT, 'mobile/src/lib/marketplace-photos.ts'), 'utf8');
  const heroSource = fs.readFileSync(path.join(ROOT, 'mobile/src/lib/category-hero-images.ts'), 'utf8');

  const hashes = new Set<string>();
  const heroHashes = new Set<string>();
  let totalTypes = 0;

  for (const cat of taxonomy.categories) {
    const catKey = resolveCataloguePhotoKey(`category/${cat.slug}`);
    assert.equal(catKey, cat.slug);
    const catAsset = resolveCatalogueAsset(`category/${cat.slug}`);
    assert.equal(catAsset?.src, `/images/catalogue/${cat.slug}.webp`);

    const mobileCatFile = path.join(ROOT, 'mobile/assets/images/catalogue', `${cat.slug}.webp`);
    const webCatFile = path.join(ROOT, 'frontend/public/images/catalogue', `${cat.slug}.webp`);
    assert.equal(fs.existsSync(mobileCatFile), true, `missing mobile catalogue file: ${mobileCatFile}`);
    assert.equal(fs.existsSync(webCatFile), true, `missing web catalogue file: ${webCatFile}`);

    const catBytes = fs.readFileSync(mobileCatFile);
    assert.equal(catBytes.equals(fs.readFileSync(webCatFile)), true);
    hashes.add(crypto.createHash('sha256').update(catBytes).digest('hex'));
    assert.equal(mobilePhotosSource.includes(`"${cat.slug}":require('../../assets/images/catalogue/${cat.slug}.webp')`), true);

    const mobileHeroFile = path.join(ROOT, 'mobile/assets/category-heroes', `${cat.slug}.webp`);
    assert.equal(fs.existsSync(mobileHeroFile), true, `missing mobile hero file: ${mobileHeroFile}`);
    heroHashes.add(crypto.createHash('sha256').update(fs.readFileSync(mobileHeroFile)).digest('hex'));
    assert.equal(heroSource.includes(`'${cat.slug}': require('../../assets/category-heroes/${cat.slug}.webp')`), true);

    for (const svc of cat.types) {
      totalTypes++;
      const svcKey = resolveCataloguePhotoKey(`type/${cat.slug}/${svc.slug}/${svc.slug}`);
      assert.equal(svcKey, svc.slug);
      const svcAsset = resolveCatalogueAsset(`subcategory/${cat.slug}/${svc.slug}`);
      assert.equal(svcAsset?.src, `/images/catalogue/${svc.slug}.webp`);

      const mobileSvcFile = path.join(ROOT, 'mobile/assets/images/catalogue', `${svc.slug}.webp`);
      const webSvcFile = path.join(ROOT, 'frontend/public/images/catalogue', `${svc.slug}.webp`);
      assert.equal(fs.existsSync(mobileSvcFile), true, `missing mobile catalogue file: ${mobileSvcFile}`);
      const svcBytes = fs.readFileSync(mobileSvcFile);
      assert.equal(svcBytes.equals(fs.readFileSync(webSvcFile)), true);
      hashes.add(crypto.createHash('sha256').update(svcBytes).digest('hex'));
      assert.equal(mobilePhotosSource.includes(`"${svc.slug}":require('../../assets/images/catalogue/${svc.slug}.webp')`), true);
    }

    // Custom service type under a Main Category inherits parent Main Category image
    assert.equal(resolveCataloguePhotoKey(`subcategory/${cat.slug}/custom-added-type`), cat.slug);
    assert.equal(resolveCataloguePhotoKey(`type/${cat.slug}/custom-added-type/custom-added-type`), cat.slug);
  }

  assert.equal(totalTypes, 30);
  assert.equal(hashes.size, 40);
  assert.equal(heroHashes.size, 10);
  assert.equal(Object.keys(imagery.assets).length, 40);
  assert.equal(resolveCataloguePhotoKey('category/stale-old-category'), null);
  assert.equal(resolveCataloguePhotoKey('subcategory/stale-old-category/foo'), null);
});
