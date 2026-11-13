// Presentation preparation only. Never changes taxonomy, runtime data or image bytes.
const {isDeepStrictEqual}=require('node:util');

function canonicalizePhotos(manifest){
 const assets={},aliases={},byHash=new Map();
 for(const [key,asset] of Object.entries(manifest.assets)){
  const prior=byHash.get(asset.sha256);
  if(prior&&isDeepStrictEqual(assets[prior],asset)){aliases[key]=prior;continue;}
  assets[key]=asset;
  if(asset.sha256)byHash.set(asset.sha256,key);
 }
 const items=Object.fromEntries(Object.entries(manifest.items).map(([id,item])=>[id,{...item,photo:aliases[item.photo]??item.photo}]));
 return {manifest:{...manifest,assets,items},aliases};
}
function classificationIds(taxonomy){
 return taxonomy.categories.flatMap(category=>[
  `category/${category.slug}`,
  ...category.subcategories.flatMap(sub=>[
   `subcategory/${category.slug}/${sub.slug}`,
   ...sub.listing_types.map(type=>`type/${category.slug}/${sub.slug}/${type.slug}`)
  ])
 ]);
}
const tokens=value=>new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter(v=>v&&!['and','the','of','services','service'].includes(v)));
function score(id,item,key){
 if(id.startsWith('category/'))return 100000;
 const words=tokens(item.subject+' '+id.split('/').at(-1));
 const match=[...tokens(key)].filter(word=>words.has(word)).length;
 return match*100+(id.split('/').at(-1)===key?1000:0)+(id.startsWith('type/')?20:10);
}
function prepareCatalogue(manifest,taxonomy){
 const ids=classificationIds(taxonomy),groups=new Map();
 for(const id of ids){
  const item=manifest.items[id];
  if(!item)throw new Error('Missing approved mapping: '+id);
  if(item.photo!==null&&!manifest.assets[item.photo])throw new Error('Missing approved asset: '+id);
  if(item.photo!==null){const list=groups.get(item.photo)??[];list.push(id);groups.set(item.photo,list);}
 }
 const selected=new Set();
 for(const [key,candidates] of groups){
  candidates.sort((a,b)=>score(b,manifest.items[b],key)-score(a,manifest.items[a],key)||a.localeCompare(b,'en'));
  selected.add(candidates[0]);
 }
 const items={},queue=[];
 for(const id of ids){
  const item=manifest.items[id],ready=selected.has(id);
  items[id]={photo:ready?item.photo:null,subject:item.subject};
  if(!ready){const [level,category,subcategory]=id.split('/');queue.push({id,level,category,subcategory:level==='category'?null:subcategory,subject:item.subject,referenceAsset:item.photo,reason:'A distinct subject-specific original is required; the approved reference remains in the unchanged live mapping.'});}
 }
 return {version:1,activation:'pending-originals',assetsFrom:'marketplace-imagery.json',policy:{uniquePhotographPerCard:true,allowAlternateCropsAsUnique:false,preserveUnverifiedLiveMapping:true},originalImageRequirements:{sources:'Original commissioned/owned photographs or an independently approved licensed library; no provider dependency',subject:'Match the exact queue subject; do not substitute unrelated photos',identity:'Distinct original photograph, not a renamed file, crop or re-encoding of an assigned photograph',delivery:'Optimized local WebP, meaningful alt text, dimensions/bytes/SHA-256 and source/creator/rights provenance; review before activation'},items,originalImageQueue:queue};
}
function applyVerifiedReleases(manifest,releases={items:[]}){
 const items={...manifest.items},seen=new Set();
 for(const entry of releases.items){
  const asset=manifest.assets[entry.photo],item=items[entry.id];
  if(seen.has(entry.id)||!item||!asset||entry.verified!==true||asset.sha256!==entry.sha256)throw new Error('Unverified or invalid image release: '+entry.id);
  if(item.photo!==entry.previousPhoto&&item.photo!==entry.photo)throw new Error('Refusing to replace a different reviewed mapping: '+entry.id);
  seen.add(entry.id);items[entry.id]={...item,photo:entry.photo};
 }
 return {...manifest,items};
}
function sourceIdentity(asset){
 const pexels=asset.downloadUrl?.match(/images\.pexels\.com\/photos\/(\d+)\//);
 if(pexels)return 'pexels:'+pexels[1];
 try{const url=new URL(asset.source);return url.origin+url.pathname.replace(/\/$/,'');}catch{return asset.originalSha256??asset.sha256;}
}
function validateCatalogue(plan,approved,taxonomy){
 const errors=[],expected=classificationIds(taxonomy),seen=new Map(),queue=new Set();
 const ids=Object.keys(plan.items);
 if(ids.length!==expected.length||expected.some(id=>!Object.hasOwn(plan.items,id)))errors.push('Canonical classification coverage mismatch');
 for(const entry of plan.originalImageQueue){if(queue.has(entry.id))errors.push('Repeated queue ID: '+entry.id);queue.add(entry.id);if(!plan.items[entry.id]||plan.items[entry.id].photo!==null)errors.push('Queue does not match unresolved card: '+entry.id);}
 for(const [id,item] of Object.entries(plan.items)){
  if(item.photo===null){if(!queue.has(id))errors.push('Missing original-image queue entry: '+id);continue;}
  const asset=approved.assets[item.photo];
  if(!asset){errors.push('Unknown approved photo: '+id);continue;}
  if(approved.items[id]?.photo!==item.photo)errors.push('Changed approved subject assignment: '+id);
  for(const identity of [asset.sha256,asset.originalSha256,sourceIdentity(asset)].filter(Boolean)){
   if(seen.has(identity)&&seen.get(identity)!==id)errors.push('Duplicate photograph: '+seen.get(identity)+' / '+id);
   seen.set(identity,id);
  }
 }
 if(plan.activation!=='pending-originals')errors.push('Prepared mapping must remain inactive pending original-image review');
 return {errors,ready:ids.length-queue.size,queued:queue.size};
}
module.exports={canonicalizePhotos,classificationIds,prepareCatalogue,sourceIdentity,validateCatalogue,applyVerifiedReleases};
