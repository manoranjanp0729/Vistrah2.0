import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {URL} from 'node:url';
import {validateRegistry} from './audit-images.mjs';
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const fixture=()=>({catalogue:read('../../shared/catalogue.json'),registry:read('../lib/image-registry.json'),assets:read('../lib/photo-assets.json'),reuse:read('../lib/image-reuse.json')});
describe('image audit safeguards',()=>{
  it('accepts the registry with its exact reuse exceptions and documented missing subjects',()=>{
    const result=validateRegistry(fixture());expect(result.errors).toEqual([]);expect(result.warnings).toHaveLength(2);
  });
  it('rejects accidental reuse even when an existing exception already permits some uses',()=>{
    const data=fixture();data.registry['service/jobs-careers/interview-preparation'].photo='consultation';
    expect(validateRegistry(data).errors.join('\n')).toContain('Unapproved or changed image reuse: consultation');
  });
  it('detects a duplicate file renamed to a new asset key and path',()=>{
    const data=fixture();data.assets.duplicate={...data.assets.property,src:'/images/photos/duplicate.webp'};
    const errors=validateRegistry(data).errors.join('\n');
    expect(errors).toContain('Duplicate asset sha256');expect(errors).toContain('Duplicate asset source');
  });
  it('rejects missing coverage, unexplained gaps and external paths',()=>{
    const data=fixture();delete data.registry['service/jobs-careers/resume-building'];
    delete data.registry['service/civil-construction/outdoor-lifestyle-design/retractable-roofing'].missingReason;
    data.assets.property.src='https://untrusted.invalid/property.webp';
    const errors=validateRegistry(data).errors.join('\n');
    expect(errors).toContain('Missing registry identifier');expect(errors).toContain('missing asset must have a reason');expect(errors).toContain('invalid local asset path');
  });
  it('detects modified or missing local assets',()=>{
    const data=fixture();
    const errors=validateRegistry({...data,readAsset:()=>{throw new Error('unavailable');}}).errors;
    expect(errors.filter(e=>e.includes('local file unavailable'))).toHaveLength(60);
  });
});
