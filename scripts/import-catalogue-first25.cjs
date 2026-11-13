// Import reviewed user-supplied photographs only. No network, generation or layout changes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('../frontend/node_modules/sharp');
const {applyVerifiedReleases}=require('./catalogue-photo-manifest.cjs');
const root=path.resolve(__dirname,'..'),input=path.join(root,'artifacts/catalogue-first25-upload/input');
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const alt={
 'restaurants-and-dining':'A waiter serving diners in a warm restaurant',
 'cleaning-services':'A cleaner wiping a table in a residential living room',
 'grocery-and-daily-needs':'A shopper selecting fresh produce in a grocery shop',
 'salons-and-haircare':'A hairstylist drying a client’s hair in a salon',
 'new-vehicles':'Customers viewing a new vehicle with a showroom representative',
 'residential-property-rentals':'An agent showing a bright apartment to prospective tenants',
 'hotels-and-accommodation':'A neatly prepared hotel bedroom with bedside lighting',
 'hospitals-and-clinics':'A clinic reception desk and patient waiting area',
 'schools-and-academic-education':'A teacher leading a lesson in a classroom',
 'jobs-by-industry':'Two construction professionals reviewing work on a tablet',
 'legal-services':'A legal adviser reviewing paperwork with a client',
 'venues':'An event hall arranged with banquet tables and warm lighting',
 'veterinary-services':'A veterinarian examining a dog beside its owner',
 'quick-bites-and-street-food':'A cook preparing fresh food at a street-food stall',
 'repairs-and-maintenance':'A maintenance worker repairing plumbing beneath a sink',
 'electronics':'An electronics shop assistant advising a customer',
 'beauty-and-skincare':'A skincare professional applying a facial treatment',
 'used-vehicles':'A buyer and mechanic inspecting a used vehicle’s engine',
 'vehicle-rentals':'A rental representative handing vehicle keys to a customer',
 'travel-planning':'A travel adviser planning a trip with a customer',
 'doctors-and-specialists':'A doctor discussing care with a patient',
 'tutors-and-coaching':'A tutor helping a student with a written exercise',
 'jobs-by-employment-type':'A professional working at a laptop in a home office',
 'business-consulting':'A business adviser discussing performance charts with a client',
 'weddings':'A floral wedding mandap with ceremony seating'
};
(async()=>{
 const archive=process.argv[2];if(!archive)throw new Error('Supply the authorized source ZIP path');
 const releasePath=path.join(root,'shared/catalogue-image-releases.json');
 if(fs.existsSync(releasePath))throw new Error('Release manifest already exists; do not overwrite');
 const manifest=read('shared/marketplace-imagery.json'),plan=read('shared/catalogue-imagery.json');
 const queued=new Set(plan.originalImageQueue.map(item=>item.id));
 const csv=fs.readFileSync(path.join(input,'image-map.csv'),'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/);
 if(csv.shift()!=='catalogue_id,filename'||csv.length!==25)throw new Error('Unexpected mapping CSV');
 const shaSeen=new Set(Object.values(manifest.assets).map(asset=>asset.sha256)),idSeen=new Set(),pixelSeen=new Set();
 for(const asset of Object.values(manifest.assets)){
  const pixels=await sharp(fs.readFileSync(path.join(root,'frontend/public',asset.src))).resize(64,64,{fit:'fill'}).removeAlpha().raw().toBuffer();pixelSeen.add(hash(pixels));
 }
 const archiveSha256=hash(fs.readFileSync(archive)),records=[],writes=[];
 for(const line of csv){
  const parts=line.split(',');if(parts.length!==2)throw new Error('Invalid CSV row');
  const [id,filename]=parts;
  if(!queued.has(id)||idSeen.has(id)||filename!==id.split('/').slice(1).join('--')+'.webp')throw new Error('Unreviewed/duplicate classification: '+id);
  idSeen.add(id);
  const bytes=fs.readFileSync(path.join(input,filename)),sha256=hash(bytes),meta=await sharp(bytes).metadata();
  if(meta.format!=='webp'||meta.width<300||meta.height<150||bytes.length>150000||shaSeen.has(sha256))throw new Error('Invalid or duplicated image: '+filename);
  const pixels=await sharp(bytes).resize(64,64,{fit:'fill'}).removeAlpha().raw().toBuffer(),pixelHash=hash(pixels);
  if(pixelSeen.has(pixelHash))throw new Error('Duplicated decoded image: '+filename);
  pixelSeen.add(pixelHash);shaSeen.add(sha256);
  const slug=id.split('/').at(-1),key='catalogue-first25-'+filename.slice(0,-5),target='catalogue-first25--'+filename;
  if(!alt[slug])throw new Error('Missing reviewed alt text');
  manifest.assets[key]={src:'/images/marketplace/'+target,alt:alt[slug],position:'50% 50%',fit:'cover',width:meta.width,height:meta.height,bytes:bytes.length,sha256,originalSha256:sha256,source:'user-supplied:vistrah-first25/'+filename,provenance:{kind:'user-supplied',archive:'vistrah_first25_images.zip',archiveSha256,filename,reviewedOn:'2026-10-20',review:'Visual subject, decoding, unique bytes/pixels and dimensions verified; original bytes retained'}};
  records.push({id,photo:key,previousPhoto:manifest.items[id].photo,sha256,verified:true});
  for(const dir of ['frontend/public/images/marketplace','mobile/assets/marketplace']){
   const destination=path.join(root,dir,target);if(fs.existsSync(destination))throw new Error('Refusing asset overwrite: '+destination);writes.push({destination,bytes});
  }
 }
 const releases={version:1,batch:'user-supplied-first25',sourceArchiveSha256:archiveSha256,reviewedOn:'2026-10-20',items:records};
 const activated=applyVerifiedReleases(manifest,releases);
 for(const {destination,bytes}of writes)fs.writeFileSync(destination,bytes,{flag:'wx'});
 for(const {destination,bytes}of writes)if(!fs.readFileSync(destination).equals(bytes))throw new Error('Copy verification failed');
 fs.writeFileSync(releasePath,JSON.stringify(releases,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(root,'shared/marketplace-imagery.json'),JSON.stringify(activated,null,2)+'\n');
 console.log(JSON.stringify({verifiedAndActivated:records.length,assetCopies:writes.length,bytesPerPlatform:records.reduce((sum,r)=>sum+activated.assets[r.photo].bytes,0),layoutsChanged:false}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
