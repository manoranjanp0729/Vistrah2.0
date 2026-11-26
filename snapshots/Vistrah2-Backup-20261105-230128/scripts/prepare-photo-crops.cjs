// Offline, non-destructive derivatives. Originals and licensing manifests stay intact.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const sharp=require(require.resolve('sharp',{paths:[path.join(root,'frontend')]}));
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const profiles={wide:[640,360],landscape:[420,300],card:[396,258],square:[204,204],banner:[900,500]};
const gcd=(a,b)=>b?gcd(b,a%b):a;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const originals=read('shared/marketplace-imagery.json');
const overrides=read('shared/photo-crop-focus.json');
const sources=new Map(),webSources={},nativeSources={};
function register(file,label,position='50% 50%',webPath,requested=['wide','landscape','card','square']){
 const bytes=fs.readFileSync(path.join(root,file)),id=hash(bytes);
 const source=sources.get(id)??{file,label,position,profiles:new Set()};
 requested.forEach(p=>source.profiles.add(p));sources.set(id,source);
 if(webPath)webSources[webPath]=id;
 if(file.startsWith('mobile/'))nativeSources[file]=id;
 return id;
}
for(const [key,a]of Object.entries(originals.assets)){
 const id=register('frontend/public'+a.src,key,a.position,a.src);
 if(id!==a.sha256)throw Error('Original integrity mismatch: '+key);
 const native='mobile/assets/marketplace/'+path.basename(a.src);
 if(hash(fs.readFileSync(path.join(root,native)))!==id)throw Error('Native original differs: '+key);
 nativeSources[native]=id;
}
const services=fs.readFileSync(path.join(root,'mobile/src/lib/service-photos.ts'),'utf8');
for(const match of services.matchAll(/require\('([^']+)'\)/g)){
 const file=path.posix.normalize('mobile/src/lib/'+match[1]);
 const id=register(file,path.basename(file),undefined,undefined,['wide','landscape','card','square','banner']);
 // Website service photos use their own local path; resolve byte-identical records.
 const photos=read('frontend/lib/photo-assets.json');
 for(const a of Object.values(photos))if(a?.src&&fs.existsSync(path.join(root,'frontend/public',a.src))&&hash(fs.readFileSync(path.join(root,'frontend/public',a.src)))===id)webSources[a.src]=id;
}
const ads=fs.readFileSync(path.join(root,'mobile/src/components/ads-marketing.tsx'),'utf8');
for(const match of ads.matchAll(/require\('([^']+)'\)/g))register(path.posix.normalize('mobile/src/components/'+match[1]),path.basename(match[1]),undefined,undefined,['wide']);

async function main(){
 const prior=fs.existsSync(path.join(root,'shared/photo-crops.json'))?read('shared/photo-crops.json'):undefined;
 const report={version:1,profiles,sources:{},webSources};
 const webDir=path.join(root,'frontend/public/images/photo-crops'),nativeDir=path.join(root,'mobile/assets/photo-crops');
 fs.mkdirSync(webDir,{recursive:true});fs.mkdirSync(nativeDir,{recursive:true});
 let count=0,totalBytes=0;
 for(const [id,source]of sources){
  const input=fs.readFileSync(path.join(root,source.file));
  const {data,info}=await sharp(input).rotate().toBuffer({resolveWithObject:true});
  const entry={original:source.file,label:source.label,originalSha256:id,width:info.width,height:info.height,variants:{}};
  for(const profile of source.profiles){
   const [targetWidth,targetHeight]=profiles[profile],unit=gcd(targetWidth,targetHeight),rw=targetWidth/unit,rh=targetHeight/unit;
   const cropScale=Math.floor(Math.min(info.width/rw,info.height/rh));
   if(cropScale<1)throw Error('Original is too small: '+source.label);
   const cropWidth=cropScale*rw,cropHeight=cropScale*rh;
   const outputScale=Math.min(unit,cropScale),width=outputScale*rw,height=outputScale*rh;
   const position=overrides[source.label]?.[profile]??overrides[source.label]?.all??source.position;
   const [px,py]=position.split(' ').map(v=>parseFloat(v)/100);
   if(![px,py].every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw Error('Invalid focal position: '+source.label);
   const crop={left:Math.round((info.width-cropWidth)*px),top:Math.round((info.height-cropHeight)*py),width:cropWidth,height:cropHeight};
   const filename=id.slice(0,16)+'-'+profile+'.webp';
   const cached=prior?.sources[id]?.variants[profile];
   if(cached&&cached.width===width&&cached.height===height&&cached.position===position&&JSON.stringify(cached.crop)===JSON.stringify(crop)
      &&[webDir,nativeDir].every(dir=>fs.existsSync(path.join(dir,filename))&&hash(fs.readFileSync(path.join(dir,filename)))===cached.sha256)){
    entry.variants[profile]=cached;count++;totalBytes+=cached.bytes;continue;
   }
   const output=await sharp(data).extract(crop).resize(width,height,{fit:'fill'}).webp({quality:82}).toBuffer();
   for(const dir of [webDir,nativeDir]){
    const dest=path.join(dir,filename);
    if(!fs.existsSync(dest)||!fs.readFileSync(dest).equals(output))fs.writeFileSync(dest,output);
   }
   entry.variants[profile]={src:'/images/photo-crops/'+filename,width,height,sha256:hash(output),bytes:output.length,crop,position,retainedArea:Number((cropWidth*cropHeight/(info.width*info.height)).toFixed(3)),upscaled:false,belowTarget:width<targetWidth||height<targetHeight};
   count++;totalBytes+=output.length;
  }
  report.sources[id]=entry;
 }
 fs.writeFileSync(path.join(root,'shared/photo-crops.json'),JSON.stringify(report,null,2)+'\n');
 const lines=['// Generated by scripts/prepare-photo-crops.cjs. Originals stay available.','export const photoCropSources=new Map<unknown,Partial<Record<string,number>>>(['];
 for(const [file,id]of Object.entries(nativeSources)){
  const values=Object.entries(report.sources[id].variants).map(([profile,v])=>`${profile}:require('../../assets/photo-crops/${path.basename(v.src)}')`).join(',');
  lines.push(` [require(${JSON.stringify(path.posix.relative('mobile/src/lib',file))}),{${values}}],`);
 }
 lines.push(']);');fs.writeFileSync(path.join(root,'mobile/src/lib/photo-crop-sources.ts'),lines.join('\n')+'\n');
 const webMap=Object.fromEntries(Object.entries(webSources).map(([src,id])=>[src,Object.fromEntries(Object.entries(report.sources[id].variants).map(([profile,v])=>[profile,v.src]))]));
 fs.writeFileSync(path.join(root,'frontend/lib/photo-crop-sources.json'),JSON.stringify(webMap,null,2)+'\n');
 const artifact=path.join(root,'artifacts/photo-crops');fs.mkdirSync(artifact,{recursive:true});
 const entries=Object.values(report.sources);
 // Review the two extreme aspect ratios, with the original beside each crop pair.
 for(let page=0;page<Math.ceil(entries.length/24);page++){
  const tiles=[];const rows=entries.slice(page*24,(page+1)*24);
  for(let index=0;index<rows.length;index++){
   const entry=rows[index],left=(index%3)*530,top=Math.floor(index/3)*158;
   const label=entry.label.replace(/[<>&"']/g,'');
   const caption=Buffer.from(`<svg width="525" height="22"><rect width="100%" height="100%" fill="white"/><text x="3" y="16" font-size="12">${page*24+index+1}. ${label}</text></svg>`);
   tiles.push({input:caption,left,top});
   for(const [j,file]of [entry.original,'frontend/public'+entry.variants.wide.src,'frontend/public'+(entry.variants.square??entry.variants.wide).src].entries()){
    const thumb=await sharp(path.join(root,file)).resize(172,128,{fit:'contain',background:'#eeeeee'}).png().toBuffer();
    tiles.push({input:thumb,left:left+j*176,top:top+24});
   }
  }
  await sharp({create:{width:1590,height:Math.ceil(rows.length/3)*158,channels:3,background:'white'}}).composite(tiles).png().toFile(path.join(artifact,`review-${page+1}.png`));
 }
 console.log(JSON.stringify({originals:sources.size,derivatives:count,bytesPerClient:totalBytes,reviewSheets:Math.ceil(entries.length/24),upscaled:Object.values(report.sources).flatMap(s=>Object.values(s.variants)).filter(v=>v.upscaled).length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
