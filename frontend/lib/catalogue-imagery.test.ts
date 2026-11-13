import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import approved from '../../shared/marketplace-imagery.json';
import plan from '../../shared/catalogue-imagery.json';
import taxonomy from '../../shared/marketplace-taxonomy.json';
import releases from '../../shared/catalogue-image-releases.json';
const {validateCatalogue,canonicalizePhotos,prepareCatalogue,applyVerifiedReleases}=createRequire(import.meta.url)('../../scripts/catalogue-photo-manifest.cjs');

describe('Catalogue-specific unique photographs',()=>{
 it('regenerates the prepared mapping and queue consistently for both clients',()=>{
  expect(prepareCatalogue(approved,taxonomy)).toEqual(plan);
 });
 it('contains no redundant aliases in the shared approved registry',()=>{
  expect(canonicalizePhotos(approved).aliases).toEqual({});
 });
 it('covers every card once and queues every missing original without activating unfinished imagery',()=>{
  const audit=validateCatalogue(plan,approved,taxonomy);
  expect(audit.errors).toEqual([]);
  expect(Object.keys(plan.items)).toHaveLength(889);
  expect(audit.ready+audit.queued).toBe(889);
  expect(audit.queued).toBe(plan.originalImageQueue.length);
  expect(plan.policy.preserveUnverifiedLiveMapping).toBe(true);
 });
 it('activates exactly the 25 reviewed uploads and rejects unverified or changed hashes',()=>{
  expect(releases.items).toHaveLength(25);
  expect(applyVerifiedReleases(approved,releases)).toEqual(approved);
  const unverified=structuredClone(releases);unverified.items[0].verified=false;
  expect(()=>applyVerifiedReleases(approved,unverified)).toThrow('Unverified');
  const changed=structuredClone(releases);changed.items[0].sha256='changed';
  expect(()=>applyVerifiedReleases(approved,changed)).toThrow('Unverified');
 });
 it('rejects assigning one photograph to two different cards',()=>{
  const changed=structuredClone(plan),ready=Object.entries(changed.items).filter(([,item])=>item.photo!==null);
  ready[1][1].photo=ready[0][1].photo;
  expect(validateCatalogue(changed,approved,taxonomy).errors.some((message:string)=>message.startsWith('Duplicate photograph:'))).toBe(true);
 });
 it('rejects the same source photo disguised by a different encoded-file hash',()=>{
  const changed=structuredClone(approved),ready=Object.values(plan.items).filter(item=>item.photo!==null);
  const assets=changed.assets as Record<string,{source:string;downloadUrl?:string}>;
  assets[ready[1].photo!].source=assets[ready[0].photo!].source;
  assets[ready[1].photo!].downloadUrl=assets[ready[0].photo!].downloadUrl;
  expect(validateCatalogue(plan,changed,taxonomy).errors.some((message:string)=>message.startsWith('Duplicate photograph:'))).toBe(true);
 });
 it('requires a complete actionable original-image queue',()=>{
  const changed=structuredClone(plan);changed.originalImageQueue.pop();
  expect(validateCatalogue(changed,approved,taxonomy).errors.some((message:string)=>message.startsWith('Missing original-image queue entry:'))).toBe(true);
 });
 it('collapses byte-identical aliases only when all existing photo metadata agrees',()=>{
  const asset=Object.values(approved.assets)[0];
  const result=canonicalizePhotos({assets:{first:asset,alias:{...asset}},items:{a:{photo:'first'},b:{photo:'alias'}}});
  expect(Object.keys(result.manifest.assets)).toEqual(['first']);
  expect(result.manifest.items.b.photo).toBe('first');
  const distinct=canonicalizePhotos({assets:{first:asset,alias:{...asset,alt:'Different approved description'}},items:{}});
  expect(Object.keys(distinct.manifest.assets)).toHaveLength(2);
 });
});
