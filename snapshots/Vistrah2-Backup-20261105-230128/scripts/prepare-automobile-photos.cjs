// Offline preparation of reviewed automotive stock photos; no taxonomy or runtime writes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),sharp=require(require.resolve('sharp',{paths:[path.join(root,'frontend')]}));
const {prepareCatalogue}=require('./catalogue-photo-manifest.cjs');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,data)=>fs.writeFileSync(path.join(root,p),JSON.stringify(data,null,2)+'\n');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const manifest=read('shared/marketplace-imagery.json'),before=structuredClone(manifest.items);
 const sources=read('shared/automobile-photo-sources.json'),assignments=read('shared/automobile-photo-assignments.json');
 for(const record of sources){
  assert(/^automobile-[a-z-]+$/.test(record.id)&&/^\d+$/.test(record.sourceId));
  assert(record.source.startsWith('https://www.pexels.com/photo/')&&record.licence==='Pexels License');
  const raw=fs.readFileSync(path.join(root,'artifacts/automobile-photos/originals',record.sourceId+'.jpg'));
  const original=await sharp(raw).metadata();
  const {data,info}=await sharp(raw).rotate().resize({width:1440,height:1440,fit:'inside',withoutEnlargement:true}).webp({quality:86}).toBuffer({resolveWithObject:true});
  const src='/images/photos/'+record.id+'.webp';
  for(const file of ['frontend/public'+src,'mobile/assets/marketplace/'+record.id+'.webp']){
   const dest=path.join(root,file);
   if(fs.existsSync(dest))assert(fs.readFileSync(dest).equals(data),'Refusing to overwrite different source bytes: '+file);
   else fs.writeFileSync(dest,data);
  }
  manifest.assets[record.id]={key:record.id,source:record.source,alt:record.alt,position:record.position,fit:'cover',photographer:record.photographer,
   downloadUrl:record.downloadUrl,licence:record.licence,licenceUrl:record.licenceUrl,licenceVerified:record.licenceVerified,
   verificationUrl:record.source,evidence:'Official Pexels photo page identifies the subject and offers free download under the Pexels License; original and crop visually reviewed. Illustrative stock photography, no endorsement implied.',
   originalSha256:hash(raw),src,width:info.width,height:info.height,sourceWidth:original.width,sourceHeight:original.height,bytes:data.length,sha256:hash(data)};
 }
 for(const [id,item]of Object.entries(assignments.items)){
  assert(id==='category/automobiles'||id.startsWith('subcategory/automobiles/')||id.startsWith('type/automobiles/'));
  assert(manifest.items[id]&&manifest.assets[item.photo]);
  assert.equal(manifest.items[id].subject,item.subject);
  manifest.items[id]={...manifest.items[id],photo:item.photo};
 }
 for(const [id,item]of Object.entries(before))if(!Object.hasOwn(assignments.items,id))assert.deepEqual(manifest.items[id],item);
 write('shared/marketplace-imagery.json',manifest);
 // The distinct-original-per-card preparation remains separate from active references.
 write('shared/catalogue-imagery.json',prepareCatalogue(manifest,read('shared/marketplace-taxonomy.json')));
 const requires=Object.entries(manifest.assets).map(([key,a])=>`  ${JSON.stringify(key)}:require('../../assets/marketplace/${path.basename(a.src)}'),`);
 fs.writeFileSync(path.join(root,'mobile/src/lib/marketplace-photos.ts'),'// Static Metro requires mirror the exact website photo bytes.\nexport const marketplacePhotos:Record<string,number>={\n'+requires.join('\n')+'\n};\n');
 console.log(JSON.stringify({reviewedCards:Object.keys(assignments.items).length,changedCards:Object.keys(assignments.items).filter(id=>before[id].photo!==manifest.items[id].photo).length,newLicensedPhotos:sources.length,unrelatedActiveMappingsChanged:0}));
})().catch(e=>{console.error(e);process.exitCode=1;});
