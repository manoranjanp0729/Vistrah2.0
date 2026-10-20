// Explicit source-only preparation; no network, deletion, taxonomy or runtime writes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {canonicalizePhotos,prepareCatalogue,validateCatalogue}=require('./catalogue-photo-manifest.cjs');
const root=path.resolve(__dirname,'..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const {manifest,aliases}=canonicalizePhotos(read('shared/marketplace-imagery.json'));
const plan=prepareCatalogue(manifest,read('shared/marketplace-taxonomy.json'));
const audit=validateCatalogue(plan,manifest,read('shared/marketplace-taxonomy.json'));
if(audit.errors.length)throw new Error(audit.errors.join('\n'));
const requires=[];
for(const [key,asset]of Object.entries(manifest.assets)){
 const web=fs.readFileSync(path.join(root,'frontend/public',asset.src));
 const native=fs.readFileSync(path.join(root,'mobile/assets/marketplace',path.basename(asset.src)));
 if(!web.equals(native)||crypto.createHash('sha256').update(web).digest('hex')!==asset.sha256)throw new Error('Image bytes/integrity mismatch: '+key);
 requires.push(`  ${JSON.stringify(key)}:require('../../assets/marketplace/${path.basename(asset.src)}'),`);
}
fs.writeFileSync(path.join(root,'shared/marketplace-imagery.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(root,'mobile/src/lib/marketplace-photos.ts'),"// Static Metro requires mirror the exact website photo bytes.\nexport const marketplacePhotos:Record<string,number>={\n"+requires.join('\n')+'\n};\n');
fs.writeFileSync(path.join(root,'shared/catalogue-imagery.json'),JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify({cards:Object.keys(plan.items).length,uniqueAssignedPhotos:audit.ready,originalsQueued:audit.queued,removedAliases:aliases,activeUIChanged:false}));
