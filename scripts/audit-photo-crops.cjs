// Read-only verification of permanent derivatives and untouched source records.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const sharp=require(require.resolve('sharp',{paths:[path.join(root,'frontend')]}));
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const bytes=p=>fs.readFileSync(path.join(root,p));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
 const manifest=read('shared/photo-crops.json'),originals=read('shared/marketplace-imagery.json');
 let count=0,lowResolution=0;
 for(const [id,source]of Object.entries(manifest.sources)){
  assert.equal(hash(bytes(source.original)),id,'Original changed: '+source.label);
  for(const [profile,v]of Object.entries(source.variants)){
   const [tw,th]=manifest.profiles[profile];
   assert.equal(v.width*th,v.height*tw,'Wrong output ratio: '+source.label);
   assert.equal(v.crop.width*th,v.crop.height*tw,'Distorted crop: '+source.label);
   assert(v.crop.left>=0&&v.crop.top>=0&&v.crop.left+v.crop.width<=source.width&&v.crop.top+v.crop.height<=source.height);
   assert(v.width<=v.crop.width&&v.height<=v.crop.height,'Upscaling: '+source.label);
   const web=bytes('frontend/public'+v.src),native=bytes('mobile/assets/photo-crops/'+path.basename(v.src));
   assert(web.equals(native),'Client derivative mismatch: '+source.label);
   assert.equal(hash(web),v.sha256,'Derivative integrity: '+source.label);
   const meta=await sharp(web).metadata();assert.equal(meta.width,v.width);assert.equal(meta.height,v.height);
   if(v.belowTarget)lowResolution++;count++;
  }
 }
 for(const asset of Object.values(originals.assets)){
  const source=bytes('frontend/public'+asset.src);
  assert.equal(hash(source),asset.sha256);assert(source.equals(bytes('mobile/assets/marketplace/'+path.basename(asset.src))));
  assert(manifest.sources[manifest.webSources[asset.src]],'Missing crop source: '+asset.src);
 }
 console.log(JSON.stringify({verifiedSources:Object.keys(manifest.sources).length,verifiedDerivatives:count,lowResolutionVariants:lowResolution,originalsAndLicensesUnchanged:true}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
