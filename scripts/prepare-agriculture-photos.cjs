// Local optimization and visual review sheets only; no network or runtime data access.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('../frontend/node_modules/sharp'),{Buffer}=require('node:buffer');
const root=path.resolve(__dirname,'..'),output=path.join(root,'artifacts/agriculture-photos');
const records=JSON.parse(fs.readFileSync(path.join(output,'verified-downloads.json'),'utf8'));
const escapeXml=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;');
(async()=>{
 fs.mkdirSync(path.join(output,'optimized'),{recursive:true});
 const audit=[];
 for(const [index,record] of records.entries()){
  const original=path.join(output,'originals',record.sourceId+'.jpg'),metadata=await sharp(original).metadata();
  const suffix=record.id.startsWith('category/')?'category':record.id.startsWith('subcategory/')?'subcategory-'+record.id.split('/').at(-1):record.id.split('/').at(-1);
  const name='agriculture-'+suffix+'.webp';
  const position=['32966661','25731639','5953853','32873207'].includes(record.sourceId)?'south':'centre';
  const crop=await sharp(original).rotate().resize(640,410,{fit:'cover',position}).webp({quality:78,effort:6}).toBuffer();
  fs.writeFileSync(path.join(output,'optimized',name),crop);
  audit.push({...record,index:index+1,name,width:640,height:410,bytes:crop.length,sha256:crypto.createHash('sha256').update(crop).digest('hex'),originalSha256:crypto.createHash('sha256').update(fs.readFileSync(original)).digest('hex'),originalWidth:metadata.width,originalHeight:metadata.height});
 }
 for(let start=0;start<audit.length;start+=16){
  const tiles=[];
  for(const [slot,record] of audit.slice(start,start+16).entries()){
   const label=record.index+'. '+record.subject;
   const words=label.split(' '),lines=[''];for(const word of words){if((lines.at(-1)+' '+word).length>31)lines.push(word);else lines[lines.length-1]+=(lines.at(-1)?' ':'')+word;}
   const svg=`<svg width="256" height="60"><rect width="100%" height="100%" fill="white"/>${lines.map((line,i)=>`<text x="7" y="${18+i*16}" font-family="Arial" font-size="12">${escapeXml(line)}</text>`).join('')}</svg>`;
   const tile=await sharp({create:{width:256,height:224,channels:3,background:'white'}}).composite([{input:await sharp(path.join(output,'optimized',record.name)).resize(256,164).toBuffer(),top:0,left:0},{input:Buffer.from(svg),top:164,left:0}]).png().toBuffer();
   tiles.push({input:tile,left:(slot%4)*256,top:Math.floor(slot/4)*224});
  }
  await sharp({create:{width:1024,height:896,channels:3,background:'#ddd'}}).composite(tiles).jpeg({quality:88}).toFile(path.join(output,'review-'+(start/16+1)+'.jpg'));
 }
 fs.writeFileSync(path.join(output,'asset-audit.json'),JSON.stringify(audit,null,2)+'\n');
 console.log(JSON.stringify({photos:audit.length,bytes:audit.reduce((n,a)=>n+a.bytes,0),duplicateFiles:audit.filter((a,i)=>audit.some((b,j)=>j<i&&a.sha256===b.sha256)).map(a=>a.subject)}));
})().catch(error=>{console.error(error);process.exitCode=1;});
