// Curated subject pools are ordered by the canonical subcategory order.
// This only writes presentation manifests and bundled image copies, never taxonomy or records.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {canonicalizePhotos,applyVerifiedReleases}=require('./catalogue-photo-manifest.cjs');
const root=path.resolve(__dirname,'..'),read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const taxonomy=read('shared/marketplace-taxonomy.json');
const assets={...read('frontend/lib/photo-assets.json'),...read('frontend/lib/marketplace-imagery.json'),...read('shared/marketplace-imagery.json').assets};
const pools={
 'food-and-dining':[['restaurant','chef'],['burger','pizza','chef'],['cafe','coffee','tea'],['chef','food-and-dining'],['cake','ice-cream','cafe'],['chef','restaurant'],['food-and-dining','chef'],['grocery','food-and-dining']],
 'home-and-everyday-services':[['cleaning','cleaning-care'],['plumbing','electrical','home-maintenance'],['air-conditioning','computer-repair','electrical'],['electrical','interior','plumbing'],['laundry','cleaning'],['pest','pest-care'],['interior','architecture','construction'],['garden','outdoor'],['moving','truck','vendor-logistics'],['cleaning','chef','home-maintenance']],
 'shopping-and-local-retail':[['grocery','store-signage'],['technology','computer-repair','servers'],['clothes','beauty-fashion-and-lifestyle'],['interior','property'],['pharmacy','makeup'],['books','celebration','printing'],['store-signage','clothes','books'],['printing','vendor-logistics','construction-equipment'],['store-signage','clothes']],
 'beauty-fashion-and-lifestyle':[['barber','beauty-fashion-and-lifestyle'],['makeup','makeup-artist','spa'],['spa','health-fitness-and-wellness'],['makeup-artist','makeup'],['clothes','beauty-fashion-and-lifestyle'],['jewellery','clothes'],['media-production','professional-profile'],['tattoo','tattoo-care']],
 automobiles:[['automobiles','motorcycle','truck'],['automobiles','motorcycle'],['automobiles','motorcycle','truck'],['mechanic','electrical'],['car-wash','mechanic'],['mechanic','motorcycle'],['finance','accounting-calculation'],['registration-paperwork','automobiles'],['mechanic','truck'],['truck','automobiles']],
 'rental-services':[['rental-keys','property'],['commercial-building','property-documents'],['automobiles','motorcycle','truck'],['interior','property'],['technology','computer-repair'],['air-conditioning','laundry'],['celebration','events','restaurant'],['construction-equipment','construction'],['cycling','travel-stay-and-experiences','outdoor'],['clothes','jewellery'],['football','cycling','gym'],['vendor-logistics','construction-equipment'],['rental-keys','moving']],
 'travel-stay-and-experiences':[['hotel','property','interior'],['travel-stay-and-experiences','planning','airplane'],['airplane','automobiles','truck'],['travel-stay-and-experiences','outdoor'],['cycling','outdoor','travel-stay-and-experiences'],['events','travel-stay-and-experiences'],['registration-paperwork','airplane']],
 'health-fitness-and-wellness':[['doctor','physio'],['doctor','lab','physio'],['lab','doctor'],['pharmacy','doctor'],['gym','football'],['health-fitness-and-wellness','spa'],['football','cycling','gym'],['physio','physio-care'],['food-and-dining','grocery'],['consultation','spa','health-fitness-and-wellness']],
 'education-and-skills':[['education-and-skills','books'],['books','education-and-skills','collaboration'],['technology','books','consultation'],['printing','mechanic','electrical'],['books','education-and-skills'],['printing','media-production','makeup-artist'],['resume','interview','career-workplace'],['books','resume'],['technology','collaboration']],
 'jobs-and-careers':[['career-workplace','technology','chef','construction'],['career-workplace','interview','job-search'],['interview','resume','career-workplace'],['job-search','registration-paperwork'],['technology','media-production','planning'],['career-workplace','collaboration'],['resume','interview','job-search'],['interview','professional-advice','resume']],
 'professional-services':[['professional-advice','construction-contract'],['accountant-consultation','bookkeeping','finance'],['consultation','market-analysis','business-registration'],['marketing','digital-display','printing'],['technology','servers','mobile-development'],['architecture','media-production','printing'],['property-appraisal','property-documents','home-purchase'],['finance','accounting-calculation'],['documents','registration-paperwork','document-bundles'],['engineering-team','construction-estimate','architecture']],
 'events-and-celebrations':[['restaurant','hotel','events'],['wedding','celebration','restaurant'],['celebration','cake','restaurant'],['events','collaboration'],['media-production','events','chef'],['celebration','jewellery','events'],['events','travel-stay-and-experiences'],['planning','wedding','media-production']],
 'pet-care':[['vet-dog','vet-cat'],['pet-grooming','pet-bath'],['cat','pet-care'],['dog-walking','pet-care'],['dog-walking','cat'],['pet-food','pet-grooming','pet-care'],['pet-care','cat']],
};
function specificPhoto(title,category,index){
 const text=title.toLowerCase();
 if(category==='pet-care'){
  if(/veterin|animal hospital|vaccin|emergency|consultation/.test(text))return index%2?'vet-cat':'vet-dog';
  if(/bath/.test(text))return 'pet-bath';if(/groom|trim|nail/.test(text))return 'pet-grooming';
  if(/food/.test(text))return 'pet-food';if(/walk|training|obedience/.test(text))return 'dog-walking';return null;
 }
 const rules=[[/carpent|woodwork|door.and.lock/,'carpentry'],[/painting|polishing/,'wall-painting'],[/ice.?cream/,'ice-cream'],[/\btea\b/,'tea'],[/coffee/,'coffee'],[/caf[eé]/,'cafe'],[/pizza/,'pizza'],[/burger/,'burger'],[/cake|pastr|chocol|sweet|dessert/,'cake'],[/fruit|vegetab|grocery|organic food/,'grocery'],[/cater|cook|kitchen.*food|chef/,'chef'],[/restaur|\bdining\b/,'restaurant'],[/laundry|dry.clean|ironing/,'laundry'],[/cleaning|housekeep/,'cleaning'],[/garden|lawn|landscap|plant care/,'garden'],[/moving|shifting|relocation/,'moving'],[/plumb|tap|water tank/,'plumbing'],[/electric|wiring|fan install/,'electrical'],[/air.condition|\bac\b/,'air-conditioning'],[/pest|termite|rodent|mosquito|cockroach/,'pest'],[/hair|barber/,'barber'],[/makeup|cosmetic/,'makeup'],[/massage|spa/,'spa'],[/tattoo|pierc/,'tattoo'],[/jewell|rings|\bgold\b|silver/,'jewellery'],[/clothing|fashion|tailor|footwear|garment|bridal wear/,'clothes'],[/motorcycle|scooter|two.wheel/,'motorcycle'],[/truck|fleet|freight/,'truck'],[/car wash|detailing|polish/,'car-wash'],[/vehicle repair|engine|spare parts|tyre|battery|vehicle servic|roadside/,'mechanic'],[/\bcars?\b|suv|four.wheel/,'automobiles'],[/flight|airline|air ticket/,'airplane'],[/hotel|guest.?house|hostel|resort/,'hotel'],[/wedding/,'wedding'],[/birthday|balloon|floral|flower/,'celebration'],[/pharmac|medicine|medical suppl/,'pharmacy'],[/blood test|diagnostic|laborator|patholog/,'lab'],[/physio|rehabilit/,'physio'],[/doctor|clinic|hospital|specialist/,'doctor'],[/yoga|pilates|meditation/,'health-fitness-and-wellness'],[/gym|fitness|personal train/,'gym'],[/football|sports coach/,'football'],[/cycling|bicycle/,'cycling'],[/books|stationery|language|exam|certification/,'books'],[/school|tutor/,'education-and-skills'],[/resume|\bcv\b/,'resume'],[/interview/,'interview'],[/software|computer|online learn|web develop/,'technology'],[/server|network|cloud comput/,'servers'],[/photo|videograph|film/,'media-production'],[/account|tax|bookkeep/,'bookkeeping'],[/legal|lawyer|notar|contract/,'construction-contract'],[/real estate|property doc/,'property-documents'],[/interior|furniture|home decor/,'interior']];
 return rules.find(([pattern])=>pattern.test(text))?.[1]??null;
}
const approved=read('shared/marketplace-imagery.json');
const items={};
for(const category of taxonomy.categories){
 if(category.slug==='agriculture-and-farming'){
  for(const [id,item] of Object.entries(approved.items))if(id.startsWith('category/'+category.slug)||id.startsWith('subcategory/'+category.slug+'/')||id.startsWith('type/'+category.slug+'/'))items[id]=item;
  continue;
 }
 items[`category/${category.slug}`]={photo:category.slug,subject:category.title};
 const categoryPools=pools[category.slug];if(categoryPools?.length!==category.subcategories.length)throw new Error('Curated subcategory pool mismatch: '+category.slug);
 category.subcategories.forEach((sub,index)=>{
  const pool=categoryPools[index];pool.forEach(key=>{if(!assets[key])throw new Error('Missing curated asset '+key);});
  items[`subcategory/${category.slug}/${sub.slug}`]={photo:pool[0],subject:sub.title};
  sub.listing_types.forEach((type,typeIndex)=>{const photo=specificPhoto(type.title,category.slug,typeIndex)??pool[typeIndex%pool.length];items[`type/${category.slug}/${sub.slug}/${type.slug}`]={photo,subject:type.title};});
  // Where every title names the same subject, use the curated alternate subject views.
  // Pools are explicitly reviewed for this subcategory; this is not a parent-photo fallback.
  const ids=sub.listing_types.map(type=>`type/${category.slug}/${sub.slug}/${type.slug}`);
  if(new Set(ids.map(id=>items[id].photo)).size===1)ids.forEach((id,typeIndex)=>{items[id].photo=pool[typeIndex%pool.length];});
 });
}
const releases=fs.existsSync(path.join(root,'shared/catalogue-image-releases.json'))?read('shared/catalogue-image-releases.json'):{items:[]};
const used=new Set([...Object.values(items).map(item=>item.photo),...releases.items.map(item=>item.photo)]);const selectedAssets=Object.fromEntries([...used].sort().map(key=>[key,assets[key]]));
const canonical=canonicalizePhotos({assets:selectedAssets,items});
canonical.manifest=applyVerifiedReleases(canonical.manifest,releases);
const destination=path.join(root,'mobile/assets/marketplace');fs.mkdirSync(destination,{recursive:true});
const requires=[];
for(const [key,asset] of Object.entries(canonical.manifest.assets)){
 const bytes=fs.readFileSync(path.join(root,'frontend/public',asset.src));if(crypto.createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw new Error('Source photo integrity mismatch: '+key);
 const name=path.basename(asset.src),target=path.join(destination,name);
 if(fs.existsSync(target)&&!fs.readFileSync(target).equals(bytes))throw new Error('Refusing to overwrite different native asset: '+name);
 if(!fs.existsSync(target))fs.writeFileSync(target,bytes);
 requires.push(`  ${JSON.stringify(key)}:require('../../assets/marketplace/${name}'),`);
}
fs.writeFileSync(path.join(root,'shared/marketplace-imagery.json'),JSON.stringify(canonical.manifest,null,2)+'\n');
fs.writeFileSync(path.join(root,'mobile/src/lib/marketplace-photos.ts'),"// Static Metro requires mirror the exact website photo bytes.\nexport const marketplacePhotos:Record<string,number>={\n"+requires.join('\n')+'\n};\n');
const sameParent=[];for(const c of taxonomy.categories)for(const s of c.subcategories){const parent=items[`subcategory/${c.slug}/${s.slug}`].photo;if(s.listing_types.every(t=>items[`type/${c.slug}/${s.slug}/${t.slug}`].photo===parent))sameParent.push(c.slug+'/'+s.slug);}
console.log(JSON.stringify({items:Object.keys(items).length,photos:used.size,sameParentGroups:sameParent}));
