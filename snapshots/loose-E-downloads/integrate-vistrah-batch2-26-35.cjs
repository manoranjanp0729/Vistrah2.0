// VISTRAH Batch 2 26-35 only. No Git, Docker, database, network or service changes.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=process.cwd();
const source=path.join(root,'artifacts','catalogue-batch2','input');
const manifestPath=path.join(source,'batch2-ready-manifest.json');
const paths={market: path.join(root,'shared','marketplace-imagery.json'),catalogue:path.join(root,'shared','catalogue-imagery.json'),mobile:path.join(root,'mobile','src','lib','marketplace-photos.ts')};
const sum=b=>crypto.createHash('sha256').update(b).digest('hex');
const assert=(condition,reason)=>{if(!condition)throw Error(reason)};
const exists=f=>fs.existsSync(f);
const contents={};
let items, market, catalogue, mobile, assetWrites=[];
try {
 assert(exists(manifestPath),'Missing '+manifestPath);
 const batch=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 items=batch.items;
 assert(batch.batch==='batch2'&&items?.length===10,'Expected 10 Batch 2 entries');
 for(const [key,p] of Object.entries(paths)){assert(exists(p),'Missing '+p);contents[key]=fs.readFileSync(p,'utf8')}
 market=JSON.parse(contents.market);catalogue=JSON.parse(contents.catalogue);mobile=contents.mobile;
 assert(market.assets&&market.items&&catalogue.items,'Unexpected registry structure');
 // In Expo, this block is already used by the 25-image release.
 const anchor=/^(\s*)["']catalogue-first25-food-and-dining--restaurants-and-dining["']\s*:\s*require\(/m;
 const found=mobile.match(anchor);
 assert(found,'Expo catalogue-first25 image import anchor missing; no changes made');
 const seen=new Set();const newLines=[];
 for(const item of items){
  const {id,filename,photo,sha256,bytes,dimensions,name}=item;
  assert(id?.startsWith('subcategory/')&&!seen.has(id),'Invalid or duplicate catalogue ID: '+id);seen.add(id);
  assert(/^catalogue-batch2--[a-z0-9-]+--[a-z0-9-]+\.webp$/.test(filename),'Unexpected filename '+filename);
  assert(photo===filename.replace(/^catalogue-batch2--/,'catalogue-batch2-').replace(/\.webp$/,''),'Photo key mismatch '+id);
  assert(Array.isArray(dimensions)&&dimensions[0]===900&&dimensions[1]===600,'Unexpected dimensions '+id);
  const original=path.join(source,filename);assert(exists(original),'Missing photo '+filename);
  const buffer=fs.readFileSync(original);assert(buffer.length===bytes&&sum(buffer)===sha256,'Image integrity failed '+filename);
  assert(!market.assets[photo]&&catalogue.items[id]&&market.items[id], 'Existing/missing mapping '+id);
  assert(catalogue.items[id].photo===null,'Catalogue assignment already present '+id);
  assert(!mobile.includes('"'+photo+'":')&&!mobile.includes("'"+photo+"':"),'Expo image already registered '+photo);
  const base='catalogue-batch2--'+filename.slice('catalogue-batch2--'.length);
  const web=path.join(root,'frontend','public','images','marketplace',base);
  const expo=path.join(root,'mobile','assets','marketplace',base);
  assert(!exists(web)&&!exists(expo),'Destination already exists '+base);
  assetWrites.push({web,expo,buffer});
  market.assets[photo]={src:'/images/marketplace/'+base,alt:'Photograph illustrating '+name,position:'50% 50%',fit:'cover',width:dimensions[0],height:dimensions[1],bytes,sha256,originalSha256:sha256,source:'user-supplied:vistrah-batch2/'+filename,provenance:{kind:'original-ai-generated',origin:'ChatGPT VISTRAH Batch 2',filename,reviewedOn:'2026-10-20'}};
  market.items[id].photo=photo;catalogue.items[id].photo=photo;
  newLines.push(found[1]+JSON.stringify(photo)+':require(\'../../assets/marketplace/'+base+'\'),');
 }
 const queue=new Set(catalogue.originalImageQueue?.map(x=>x.id)||[]);
 assert(items.every(x=>queue.has(x.id)), 'One or more IDs missing from original-image queue');
 catalogue.originalImageQueue=catalogue.originalImageQueue.filter(x=>!seen.has(x.id));
 const updatedMobile=mobile.replace(anchor,(whole)=>newLines.join('\n')+'\n'+whole);
 assert(updatedMobile!==mobile,'Mobile map not modified');
 const changed={market:JSON.stringify(market,null,2)+'\n',catalogue:JSON.stringify(catalogue,null,2)+'\n',mobile:updatedMobile};
 const backupDir=path.join(root,'artifacts','catalogue-batch2','backup-before-26-35');
 assert(!exists(backupDir),'Backup folder already exists. No changes made: '+backupDir);
 console.log('Validated 10 unique images and image mappings; creating protected file backups...');
 fs.mkdirSync(backupDir,{recursive:true});
 for(const [key,data] of Object.entries(contents)) fs.writeFileSync(path.join(backupDir,key+'.backup'),data,{flag:'wx'});
 const touched=[];let committed=false;
 try {
  for(const {web,expo,buffer} of assetWrites)for(const dest of [web,expo]){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,buffer,{flag:'wx'});touched.push(dest)}
  for(const [key,p] of Object.entries(paths)){fs.writeFileSync(p,changed[key],'utf8');touched.push(p)}
  for(const {web,expo,buffer} of assetWrites) assert(sum(fs.readFileSync(web))===sum(buffer)&&sum(fs.readFileSync(expo))===sum(buffer),'Postcopy hash mismatch');
  for(const [key,p] of Object.entries(paths))assert(fs.readFileSync(p,'utf8')===changed[key],'Postwrite mismatch '+key);
  committed=true;
 } finally {
  if(!committed){
   for(const [key,p] of Object.entries(paths))fs.writeFileSync(p,contents[key],'utf8');
   for(const {web,expo} of assetWrites)for(const p of [web,expo])if(exists(p))fs.unlinkSync(p);
  }
 }
 console.log(JSON.stringify({status:'INTEGRATED_LOCAL_SOURCE',activated:items.length,webImages:10,expoImages:10,backupDirectory:backupDir,remainingQueue:catalogue.originalImageQueue.length,notice:'No running website container rebuilt; restart/reload needed to see new photos.'},null,2));
} catch(e){console.error('NO INTEGRATION: '+e.message);process.exitCode=1;}
