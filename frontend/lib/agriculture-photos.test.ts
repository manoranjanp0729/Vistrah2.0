import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import imagery from '../../shared/marketplace-imagery.json';
import {marketplacePhoto} from './marketplace-photos';
const records=Object.entries(imagery.items).filter(([id])=>id.includes('/agriculture-and-farming'));
const assets=imagery.assets as Record<string,{src:string;alt:string;source:string;downloadUrl:string;photographer:string;licence:string;licenceUrl:string;width:number;height:number;bytes:number;sha256:string;originalSha256?:string}>;
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
  const prior={assets:Object.fromEntries(Object.entries(imagery.assets).filter(([key])=>!key.startsWith('agriculture-'))),items:Object.fromEntries(Object.entries(imagery.items).filter(([id])=>!id.includes('/agriculture-and-farming')))};
  expect(createHash('sha256').update(JSON.stringify(prior)).digest('hex')).toBe('c1bc390c121b8700a0a7d02b4f3c737f3449ce8d372608019ec936dba0aeaa7e');
 });
 it('preserves the unavailable fallback and unknown-ID errors',()=>{expect(()=>marketplacePhoto('category/unknown')).toThrow('Missing curated marketplace photo');});
});
