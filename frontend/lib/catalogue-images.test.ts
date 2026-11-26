import {existsSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
import {describe, expect, it} from 'vitest';
import taxonomy from '../../shared/final-service-taxonomy.json';
import imagery from '../../shared/marketplace-imagery.json';
import {resolveCatalogueAsset, resolveCataloguePhotoKey} from '../../shared/catalogue-images';
import {marketplaceItemId} from './marketplace-taxonomy';
import {marketplacePhoto} from './marketplace-photos';
import {categoryPhoto, servicePhoto} from './imagery';
import type {Category, ServiceContext} from './types';

const ROOT = path.resolve(__dirname, '../..');

describe('10 Main Categories & 30 Direct Service Types Self-Hosted Catalogue Images', () => {
  it('maps all 10 Main Categories and 30 Direct Service Types to 40 unique local /images/catalogue/<slug>.webp files on disk', async () => {
    expect(taxonomy.categories).toHaveLength(10);
    const allSlugs: string[] = [];
    const seenPaths = new Set<string>();
    const seenHashes = new Set<string>();

    for (const cat of taxonomy.categories) {
      allSlugs.push(cat.slug);
      const catId = marketplaceItemId(cat.slug);
      const catPhoto = marketplacePhoto(catId);
      expect(catPhoto).not.toBeNull();
      expect(catPhoto!.src).toBe(`/images/catalogue/${cat.slug}.webp`);
      expect(catPhoto!.alt.length).toBeGreaterThan(15);

      const webPath = path.join(ROOT, 'frontend/public', catPhoto!.src);
      const adminPath = path.join(ROOT, 'admin/public', catPhoto!.src);
      const mobilePath = path.join(ROOT, 'mobile/assets/images/catalogue', `${cat.slug}.webp`);
      expect(existsSync(webPath), `missing web image: ${webPath}`).toBe(true);
      expect(existsSync(adminPath), `missing admin image: ${adminPath}`).toBe(true);
      expect(existsSync(mobilePath), `missing mobile image: ${mobilePath}`).toBe(true);

      const webBytes = readFileSync(webPath);
      const adminBytes = readFileSync(adminPath);
      const mobileBytes = readFileSync(mobilePath);
      expect(webBytes.equals(adminBytes)).toBe(true);
      expect(webBytes.equals(mobileBytes)).toBe(true);

      const meta = await sharp(webBytes).metadata();
      expect(meta.format).toBe('webp');
      expect(meta.width).toBe(960);
      expect(meta.height).toBe(720);

      seenPaths.add(catPhoto!.src);
      seenHashes.add(createHash('sha256').update(webBytes).digest('hex'));

      // Also verify category hero banner exists and is distinct across all 10 categories
      const webHero = path.join(ROOT, 'frontend/public/images/category-heroes', `${cat.slug}.webp`);
      const mobileHero = path.join(ROOT, 'mobile/assets/category-heroes', `${cat.slug}.webp`);
      expect(existsSync(webHero), `missing web hero: ${webHero}`).toBe(true);
      expect(existsSync(mobileHero), `missing mobile hero: ${mobileHero}`).toBe(true);
      expect(readFileSync(webHero).equals(readFileSync(mobileHero))).toBe(true);

      for (const svc of cat.types) {
        allSlugs.push(svc.slug);
        const subId = marketplaceItemId(cat.slug, svc.slug);
        const typeId = marketplaceItemId(cat.slug, svc.slug, svc.slug);
        const subPhoto = marketplacePhoto(subId);
        const typePhoto = marketplacePhoto(typeId);
        expect(subPhoto).toEqual(typePhoto);
        expect(typePhoto).not.toBeNull();
        expect(typePhoto!.src).toBe(`/images/catalogue/${svc.slug}.webp`);
        expect(typePhoto!.alt.length).toBeGreaterThan(15);

        const svcWebPath = path.join(ROOT, 'frontend/public', typePhoto!.src);
        const svcAdminPath = path.join(ROOT, 'admin/public', typePhoto!.src);
        const svcMobilePath = path.join(ROOT, 'mobile/assets/images/catalogue', `${svc.slug}.webp`);
        expect(existsSync(svcWebPath), `missing web image: ${svcWebPath}`).toBe(true);
        expect(existsSync(svcAdminPath), `missing admin image: ${svcAdminPath}`).toBe(true);
        expect(existsSync(svcMobilePath), `missing mobile image: ${svcMobilePath}`).toBe(true);

        const svcBytes = readFileSync(svcWebPath);
        expect(svcBytes.equals(readFileSync(svcAdminPath))).toBe(true);
        expect(svcBytes.equals(readFileSync(svcMobilePath))).toBe(true);

        const svcMeta = await sharp(svcBytes).metadata();
        expect(svcMeta.format).toBe('webp');
        expect(svcMeta.width).toBe(960);
        expect(svcMeta.height).toBe(720);

        seenPaths.add(typePhoto!.src);
        seenHashes.add(createHash('sha256').update(svcBytes).digest('hex'));
      }
    }

    expect(allSlugs).toHaveLength(70);
    expect(seenPaths.size).toBe(70);
    expect(seenHashes.size).toBe(70);
    expect(Object.keys(imagery.assets)).toHaveLength(70);
    expect(Object.keys(imagery.items)).toHaveLength(130);

    const heroHashes = new Set(
      taxonomy.categories.map((c) =>
        createHash('sha256')
          .update(readFileSync(path.join(ROOT, 'frontend/public/images/category-heroes', `${c.slug}.webp`)))
          .digest('hex'),
      ),
    );
    expect(heroHashes.size).toBe(10);
  });

  it('inherits parent Main Category image for custom/newly added service types and fails closed for unknown categories', () => {
    for (const cat of taxonomy.categories) {
      const parentPhoto = marketplacePhoto(`category/${cat.slug}`);
      expect(parentPhoto).not.toBeNull();

      const customSub = marketplacePhoto(`subcategory/${cat.slug}/custom-new-offering`);
      const customType = marketplacePhoto(`type/${cat.slug}/custom-new-offering/custom-new-offering`);
      expect(customSub).toEqual(parentPhoto);
      expect(customType).toEqual(parentPhoto);
      expect(resolveCataloguePhotoKey('custom-new-offering', cat.slug)).toBe(cat.slug);

      const catObj = {id: 1, slug: cat.slug, title: cat.title, description: cat.description, image: '', services: [], subcategories: []} as unknown as Category;
      expect(categoryPhoto(catObj).src).toBe(`/images/catalogue/${cat.slug}.webp`);

      const customSvcCtx = {
        category: catObj,
        service: {id: 99, slug: 'custom-new-offering', title: 'Custom Offering', description: 'Desc', image: ''},
      } as unknown as ServiceContext;
      expect(servicePhoto(customSvcCtx).src).toBe(`/images/catalogue/${cat.slug}.webp`);
    }

    expect(marketplacePhoto('category/removed-legacy-category')).toBeNull();
    expect(marketplacePhoto('subcategory/removed-legacy-category/anything')).toBeNull();
    expect(resolveCatalogueAsset('unknown-slug')).toBeNull();
  });
});
