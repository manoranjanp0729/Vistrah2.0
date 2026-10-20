// Read-only catalogue/image audit. Shared image bytes across web/native are intentional.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('../frontend/node_modules/sharp');
const {validateCatalogue,sourceIdentity}=require('./catalogue-photo-manifest.cjs');
const root=path.resolve(__dirname,'..');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
async function audit(){
 const approved=read('shared/marketplace-imagery.json'),plan=read('shared/catalogue-imagery.json');
 const result=validateCatalogue(plan,approved,read('shared/marketplace-taxonomy.json'));
 const native=fs.readFileSync(path.join(root,'mobile/src/lib/marketplace-photos.ts'),'utf8');
 const bindings=Object.fromEntries([...native.matchAll(/"([^"]+)":require\('\.\.\/\.\.\/assets\/marketplace\/([^']+)'\)/g)].map(m=>[m[1],m[2]]));
 const entries=Object.entries(approved.assets).map(([key,asset])=>({key,asset,native:true}));
 const knownPaths=new Set(entries.map(({asset})=>asset.src));
 const unusedApproved=[];
 for(const file of ['frontend/lib/photo-assets.json','frontend/lib/marketplace-imagery.json'])for(const [key,asset]of Object.entries(read(file))){
  if(!knownPaths.has(asset.src)){knownPaths.add(asset.src);entries.push({key:'legacy/'+key,asset,native:false});unusedApproved.push({key,src:asset.src,alt:asset.alt,registry:file});}
 }
 const seen=new Map(),perceptual=[],rows=[];
 for(const {key,asset,native:needsNative}of entries){
  const web=fs.readFileSync(path.join(root,'frontend/public',asset.src));
  const meta=await sharp(web).metadata();
  const pixels=await sharp(web).rotate().ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const decodedHash=hash(Buffer.concat([Buffer.from(`${pixels.info.width}x${pixels.info.height}:`),pixels.data]));
  const grey=await sharp(web).rotate().resize(9,8,{fit:'fill'}).greyscale().raw().toBuffer();
  let dhash=0n;for(let y=0;y<8;y++)for(let x=0;x<8;x++)dhash=(dhash<<1n)|(grey[y*9+x]>grey[y*9+x+1]?1n:0n);
  for(const identity of [hash(web),decodedHash,sourceIdentity(asset),asset.originalSha256].filter(Boolean)){
   if(seen.has(identity)&&seen.get(identity)!==key)result.errors.push('Duplicate asset: '+seen.get(identity)+' / '+key);
   seen.set(identity,key);
  }
  if(hash(web)!==asset.sha256||web.length!==asset.bytes)result.errors.push('Web integrity mismatch: '+key);
  if(needsNative){
   const mobile=fs.readFileSync(path.join(root,'mobile/assets/marketplace',path.basename(asset.src)));
   if(!web.equals(mobile))result.errors.push('Web/mobile bytes differ: '+key);
   if(bindings[key]!==path.basename(asset.src))result.errors.push('Native mapping mismatch: '+key);
  }
  if(meta.width!==asset.width||meta.height!==asset.height)result.errors.push('Dimensions differ: '+key);
  for(const other of rows){let bits=dhash^other.dhash,count=0;while(bits){count++;bits&=bits-1n;}if(count<=8)perceptual.push({a:other.key,b:key,distance:count,action:'Visual review only; never replace relevant photos automatically'});}
  rows.push({key,dhash});
 }
 if(Object.keys(bindings).length!==Object.keys(approved.assets).length)result.errors.push('Unexpected native asset binding');
 const liveReuse=new Map();for(const [id,item]of Object.entries(approved.items)){if(item.photo){const ids=liveReuse.get(item.photo)??[];ids.push(id);liveReuse.set(item.photo,ids);}}
 return {scope:'All 889 canonical marketplace classifications, their referenced images and the existing legacy approved catalogue photo pools; legacy publication unchanged',...result,
  assets:Object.keys(approved.assets).length,webMobileParity:!result.errors.some(error=>/Web\/mobile|Native mapping|native asset/.test(error)),decodedImages:rows.length,unusedApprovedCandidates:unusedApproved,
  preparedAssignmentDuplicates:result.errors.filter(e=>e.startsWith('Duplicate photograph:')),
  activeMapping:'shared/marketplace-imagery.json (preserved until original queue is complete)',
  liveRepeatedPhotoGroups:[...liveReuse.values()].filter(ids=>ids.length>1).length,
  originalQueueFile:'shared/catalogue-imagery.json#originalImageQueue',nearDuplicateReview:perceptual,
  taxonomySha256:hash(fs.readFileSync(path.join(root,'shared/marketplace-taxonomy.json')))};
}
if(require.main===module)audit().then(result=>{
 const target=process.argv[2];if(target){const full=path.resolve(root,target);if(!full.startsWith(root+path.sep))throw new Error('Report must stay within workspace');fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,JSON.stringify(result,null,2)+'\n');}
 console.log(JSON.stringify(result));if(result.errors.length)process.exitCode=1;
}).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={audit};
