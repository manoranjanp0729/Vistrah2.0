import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import imagery from '../../shared/marketplace-imagery.json';
import releases from '../../shared/catalogue-image-releases.json';
import batch2 from './fixtures/catalogue-batch2-replacements.json';
import originalAssets from './photo-assets.json';
import {marketplacePhoto} from './marketplace-photos';
const records=Object.entries(imagery.items).filter(([id])=>id.includes('/agriculture-and-farming'));
const assets=imagery.assets as Record<string,{src:string;alt:string;source:string;downloadUrl?:string;photographer?:string;licence?:string;licenceUrl?:string;width:number;height:number;bytes:number;sha256:string;originalSha256?:string}>;
describe('Reviewed agricultural photographs',()=>{
 it('covers all 64 classifications with unique subjects, source photos and optimized bytes',()=>{
  expect(records).toHaveLength(64);
  const photos=records.map(([id,item])=>{expect(item.photo).toBeTruthy();expect(marketplacePhoto(id)?.alt.length).toBeGreaterThan(15);return assets[item.photo!];});
  for(const field of ['src','source','sha256','originalSha256'] as const)expect(new Set(photos.map(p=>p[field])).size).toBe(64);
  for(const photo of photos){expect(photo.source).toMatch(/^https:\/\/(www\.pexels\.com\/photo|pixabay\.com\/photos)\//);expect(photo.downloadUrl).toMatch(/^https:\/\/(images\.pexels\.com|cdn\.pixabay\.com)\//);expect(photo.photographer).toBeTruthy();expect(photo.licence).toMatch(/Pexels|Pixabay/);expect(photo.licenceUrl).toMatch(/^https:/);expect(photo.bytes).toBeLessThan(150000);}
 });
 it('decodes every optimized photo and bundles identical local bytes for Expo',async()=>{
  for(const [,item] of records){const photo=assets[item.photo!],web=readFileSync(new URL('../public'+photo.src,import.meta.url)),native=readFileSync(new URL('../../mobile/assets/marketplace/'+photo.src.split('/').at(-1),import.meta.url));expect(web.equals(native)).toBe(true);expect(createHash('sha256').update(web).digest('hex')).toBe(photo.sha256);expect(web.length).toBe(photo.bytes);const decoded=await sharp(web).metadata();expect([decoded.width,decoded.height,decoded.format]).toEqual([640,410,'webp']);}
 });
 it('preserves every previously approved image asset and mapping',()=>{
  // Reconstruct reviewed replacements only; keep the original metadata checksum.
  // Batch-2's current mappings, full metadata and bytes are independently locked below.
  const previousPhotos=new Map([...releases.items,...batch2.items,...((releases as {subcategoryUniquenessItems?:typeof releases.items}).subcategoryUniquenessItems??[])].map(release=>[release.id,release.previousPhoto]));
  const prior=Object.fromEntries(Object.entries(imagery.items).filter(([id])=>!id.includes('/agriculture-and-farming')).map(([id,item])=>[id,{...item,photo:assets[previousPhotos.get(id)??item.photo!]}]));
  expect(createHash('sha256').update(JSON.stringify(prior)).digest('hex')).toBe('89b62405ca05b382c82c235592a4ce778d927e33c8cb15204ef04084cff751e1');
 });
 it('preserves all ten verified batch-2 replacements, metadata and web/Expo bytes',()=>{
  expect(batch2.items).toHaveLength(10);
  expect(new Set([...releases.items,...batch2.items].map(item=>item.id)).size).toBe(35);
  const items=imagery.items as Record<string,{photo:string|null}>;
  for(const replacement of batch2.items){
   expect(items[replacement.id].photo).toBe(replacement.photo);
   const photo=assets[replacement.photo];expect(photo).toEqual(replacement.asset);
   const web=readFileSync(new URL('../public'+photo.src,import.meta.url));
   const native=readFileSync(new URL('../../mobile/assets/marketplace/'+photo.src.split('/').at(-1),import.meta.url));
   expect(web.equals(native)).toBe(true);
   expect(createHash('sha256').update(web).digest('hex')).toBe(replacement.asset.sha256);
   expect(web.length).toBe(replacement.asset.bytes);
  }
 });
 it('preserves the original photographer credit as exact Unicode, not Windows mojibake',()=>{
  const credit=assets['construction-equipment'].photographer;
  expect(credit).toBe(originalAssets['construction-equipment'].photographer);
  expect(credit).toBe('Kaan Durmu\u015f');
  expect(Buffer.from(credit!,'utf8').toString('hex')).toBe('4b61616e204475726d75c59f');
 });
 it('preserves the unavailable fallback and unknown-ID errors',()=>{expect(()=>marketplacePhoto('category/unknown')).toThrow('Missing curated marketplace photo');});
});
