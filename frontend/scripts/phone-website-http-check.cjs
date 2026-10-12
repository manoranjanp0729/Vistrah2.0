const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const exported=process.env.PHONE_EXPORT_DIR||path.join(root,'mobile/dist');
const caddyExecutable=process.env.CADDY_EXECUTABLE||'caddy';
const directory=path.join(root,'artifacts/phone-website-http-check');fs.mkdirSync(directory,{recursive:true});
const fixture=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({desktop:true,path:req.url}));});
async function run(){
  await new Promise(resolve=>fixture.listen(19402,'127.0.0.1',resolve));
  const config=fs.readFileSync(root+'/infra/aws-test/Caddyfile','utf8').split('\nwww.vistrah.in')[0].replace('vistrah.in {','http://127.0.0.1:19400 {').replaceAll('phone-web:8080','127.0.0.1:19401').replaceAll('web:3000','127.0.0.1:19402');
  const phone=fs.readFileSync(root+'/infra/aws-test/Caddyfile.phone','utf8').replace(':8080 {','http://127.0.0.1:19401 {').replace('root * /srv','root * '+JSON.stringify(exported.replaceAll('\\\\','/')));
  fs.writeFileSync(directory+'/Caddyfile','{\n admin off\n auto_https off\n}\n'+config+'\n'+phone);
  const log=fs.openSync(directory+'/caddy.log','w');const server=spawn(caddyExecutable,['run','--config',directory+'/Caddyfile'],{stdio:['ignore',log,log]});
  try{
    let ready=false;for(let i=0;i<30;i++){try{await fetch('http://127.0.0.1:19400/');ready=true;break;}catch{await new Promise(resolve=>setTimeout(resolve,100));}}assert.equal(ready,true);
    const base='http://127.0.0.1:19400',headers={'User-Agent':'Mozilla/5.0 (Linux; Android 14) Mobile'};
    const desktop=await fetch(base+'/');assert.equal((await desktop.json()).desktop,true);
    const rootPhone=await fetch(base+'/',{headers,redirect:'manual'});assert.equal(rootPhone.status,302);assert.equal(rootPhone.headers.get('location'),'/app/');
    const html=await fetch(base+'/app/',{headers});assert.equal(html.status,200);assert.match(html.headers.get('content-security-policy'),/frame-ancestors 'none'/);const markup=await html.text();assert.match(markup,/<title>VISTRAH<\/title>/);const bundle=markup.match(/src="([^\"]+\.js)"/)[1];assert.ok(bundle.startsWith('/app/'));assert.equal((await fetch(base+bundle,{headers})).status,200);
    const api=await fetch(base+'/api/me',{headers});assert.equal((await api.json()).path,'/api/me');
    for(const p of ['/app/account','/app/employer-jobs','/app/provider-applications/new','/app/finds','/app/service/find-jobs','/app/service/1','/app/estimate/1','/app/seller/ownership']){
      const result=await fetch(base+p,{headers});assert.equal(result.status,200);assert.equal(await result.text(),markup);
    }
    const asset=fs.readdirSync(path.join(exported,'assets/assets')).find(file=>file.startsWith('collaboration.'));const photo=await fetch(base+'/app/assets/assets/'+asset,{headers});assert.equal(photo.status,200);assert.match(photo.headers.get('content-type'),/image\/webp/);
    const legacy=await fetch(base+'/account/profile',{headers,redirect:'manual'});assert.equal(legacy.headers.get('location'),'/app/account/profile');
    console.log('HTTP integration passed: desktop unchanged, phone redirect, same-origin API proxy, production JS/photo assets, CSP and eight deep screen routes.');
  }finally{server.kill('SIGTERM');fixture.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});

