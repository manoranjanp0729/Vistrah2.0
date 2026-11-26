import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {fileURLToPath,URL} from 'node:url';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import process from 'node:process';
import console from 'node:console';

export function validateRegistry({catalogue,registry,assets,reuse,readAsset}) {
  const errors=[],warnings=[];
  const expected=[];
  for(const category of catalogue){
    expected.push(`category/${category.slug}`);
    for(const service of category.services)expected.push(`service/${category.slug}/${service.slug}`);
    for(const sub of category.subcategories){
      expected.push(`subcategory/${category.slug}/${sub.slug}`);
      for(const service of sub.services)expected.push(`service/${category.slug}/${sub.slug}/${service.slug}`);
    }
  }
  for(const id of expected)if(!Object.hasOwn(registry,id))errors.push(`Missing registry identifier: ${id}`);
  for(const entry of Object.values(registry)){
    if(registry[entry.id]!==entry)errors.push(`Registry key/id mismatch: ${entry.id}`);
    for(const key of ['subject','alt','page'])if(!entry[key]?.trim())errors.push(`${entry.id}: empty ${key}`);
    if(!/^\d+\s*\/\s*\d+$/.test(entry.aspectRatio)||entry.aspectRatio.split('/').some(n=>Number(n)<=0))errors.push(`${entry.id}: invalid aspect ratio`);
    if(!/^\d+% \d+%$/.test(entry.position)||entry.position.split(' ').some(n=>parseInt(n)>100))errors.push(`${entry.id}: invalid crop position`);
    if(!entry.surfaces?.length)errors.push(`${entry.id}: missing usage inventory`);
    if(entry.photo===null){
      if(!entry.missingReason?.trim())errors.push(`${entry.id}: missing asset must have a reason`);
      else warnings.push(`${entry.id}: ${entry.missingReason}`);
    }else if(!Object.hasOwn(assets,entry.photo))errors.push(`${entry.id}: unknown photo ${entry.photo}`);
  }
  for(const field of ['src','sha256','source','downloadUrl']){
    const seen=new Map();
    for(const [key,asset] of Object.entries(assets)){
      if(!asset[field]){errors.push(`${key}: missing ${field}`);continue;}
      if(seen.has(asset[field]))errors.push(`Duplicate asset ${field}: ${seen.get(asset[field])}, ${key}`);
      seen.set(asset[field],key);
    }
  }
  for(const [key,asset] of Object.entries(assets)){
    if(!/^\/images\/photos\/[a-z-]+\.webp$/.test(asset.src)){errors.push(`${key}: invalid local asset path`);continue;}
    for(const field of ['alt','photographer','licence','licenceUrl','licenceVerified','verificationUrl','crop'])if(!asset[field]?.trim())errors.push(`${key}: missing ${field}`);
    try{
      const source=new URL(asset.source),licence=new URL(asset.licenceUrl),download=new URL(asset.downloadUrl);
      if(!['unsplash.com','www.pexels.com'].includes(source.hostname)||source.protocol!=='https:')errors.push(`${key}: unverified source host`);
      if(!['unsplash.com','www.pexels.com'].includes(licence.hostname)||licence.protocol!=='https:')errors.push(`${key}: invalid licence reference`);
      if(!['images.pexels.com','images.unsplash.com'].includes(download.hostname)||download.protocol!=='https:')errors.push(`${key}: invalid download host`);
      const verification=new URL(asset.verificationUrl);
      if(verification.hostname!==source.hostname||verification.protocol!=='https:')errors.push(`${key}: invalid verification reference`);
    }catch{errors.push(`${key}: invalid provenance URL`);}
    if(!['cover','contain'].includes(asset.fit))errors.push(`${key}: invalid object fit`);
    if(!(asset.width>0&&asset.height>0&&asset.width<=1440&&asset.height<=1600))errors.push(`${key}: invalid optimized dimensions`);
    if(readAsset)try{
      const buffer=readAsset(asset.src);
      if(buffer.length!==asset.bytes)errors.push(`${key}: asset size mismatch`);
      if(createHash('sha256').update(buffer).digest('hex')!==asset.sha256)errors.push(`${key}: asset hash mismatch`);
    }catch{errors.push(`${key}: local file unavailable`);}
  }
  const sameIds=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
  const duplicateGroups=[];
  for(const key of Object.keys(assets)){
    const ids=Object.values(registry).filter(e=>e.photo===key).map(e=>e.id).sort();
    const exceptions=reuse.filter(e=>e.photo===key);
    if(ids.length>1){
      duplicateGroups.push({photo:key,ids});
      if(exceptions.length!==1||!exceptions[0].reason?.trim()||!sameIds(ids,exceptions[0].ids))errors.push(`Unapproved or changed image reuse: ${key} (${ids.join(', ')})`);
    }else if(exceptions.length)errors.push(`Stale reuse exception: ${key}`);
  }
  for(const exception of reuse)if(!Object.hasOwn(assets,exception.photo))errors.push(`Unknown reuse asset: ${exception.photo}`);
  return {errors,warnings,duplicateGroups};
}

export function audit(){
  const frontend=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  const root=resolve(frontend,'..');
  const json=path=>JSON.parse(readFileSync(path,'utf8'));
  const catalogue=json(resolve(root,'shared/catalogue.json'));
  const registry=json(resolve(frontend,'lib/image-registry.json'));
  const assets=json(resolve(frontend,'lib/photo-assets.json'));
  const reuse=json(resolve(frontend,'lib/image-reuse.json'));
  const result=validateRegistry({catalogue,registry,assets,reuse,readAsset:src=>readFileSync(resolve(frontend,'public',src.slice(1)))});
  for(const directory of ['app','components'])for(const file of readdirSync(resolve(frontend,directory),{recursive:true})){
    if(typeof file!=='string'||!file.endsWith('.tsx'))continue;
    if(/photo\s*=\s*["']/.test(readFileSync(resolve(frontend,directory,file),'utf8')))result.errors.push(`Hard-coded component photo bypasses registry: ${directory}/${file}`);
  }
  const before=json(resolve(root,'docs/imagery/before.json'));
  const inventory=Object.values(registry).map(entry=>({
    ...entry,...(entry.photo?{
      src:assets[entry.photo].src,fit:assets[entry.photo].fit,source:assets[entry.photo].source,
      photographer:assets[entry.photo].photographer,licence:assets[entry.photo].licence,
      licenceUrl:assets[entry.photo].licenceUrl,verificationUrl:assets[entry.photo].verificationUrl,
      licenceVerified:assets[entry.photo].licenceVerified,
    }:{src:null,source:null,licence:null}),
    previousSrc:before.find(old=>old.id===entry.id)?.src??null,
  }));
  const services=inventory.filter(e=>e.kind==='service'),oldServices=before.filter(e=>e.kind==='service');
  const available=services.filter(e=>e.src),oldUnique=new Set(oldServices.map(e=>e.src)).size;
  const summary={
    categories:inventory.filter(e=>e.kind==='category').length,subcategories:inventory.filter(e=>e.kind==='subcategory').length,
    services:services.length,totalRegistryEntries:inventory.length,assets:Object.keys(assets).length,
    newAssets:Object.values(assets).filter(e=>!before.some(old=>old.src===e.src)).length,
    uniqueServiceImages:new Set(available.map(e=>e.src)).size,missingServices:services.filter(e=>!e.src).map(e=>e.id),
    previousUniqueServiceImages:oldUnique,previousRepeatedAssignments:oldServices.length-oldUnique,
    repeatedServiceAssignments:available.length-new Set(available.map(e=>e.src)).size,
    changedServiceMappings:services.filter(e=>e.src!==e.previousSrc).length,
    intentionalReuseGroups:result.duplicateGroups.length,totalOptimizedBytes:Object.values(assets).reduce((sum,e)=>sum+e.bytes,0),
  };
  if(process.argv.includes('--write')){
    writeFileSync(resolve(root,'docs/imagery/current.json'),JSON.stringify({summary,inventory,reuse},null,2)+'\n');
    const rows=inventory.map(e=>`| ${e.id} | ${e.page} | ${e.subject} | ${e.previousSrc??'—'} | ${e.src??'MISSING'} | ${e.alt} |`);
    writeFileSync(resolve(root,'docs/imagery/inventory.md'),'# Image inventory\n\nGenerated by `npm run audit:images -- --write`. Provenance, crop, ratio, all usage surfaces and reuse rationales are in [current.json](current.json). Source rights live in the shared photo manifest.\n\n| Stable identifier | Route/context | Intended subject | Previous image | Current image | Alt text |\n|---|---|---|---|---|---|\n'+rows.join('\n')+'\n');
  }
  console.log(JSON.stringify(summary,null,2));
  for(const warning of result.warnings)console.warn('MISSING:',warning);
  for(const error of result.errors)console.error('ERROR:',error);
  console.log(`Image registry: ${result.errors.length} errors; ${result.warnings.length} documented missing assets.`);
  if(result.errors.length)process.exitCode=1;
  return {summary,...result};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))audit();
