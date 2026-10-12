import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {authEndpoint} from '../src/lib/seller-auth.ts';
import {matches,visibleAnswers,preparedAnswers,type RequirementField} from '../src/lib/provider-requirements.ts';
import {evidenceMeta,evidenceLimit} from '../src/lib/evidence-validation.ts';
import {resetToken} from '../src/lib/reset-token.ts';
import {newInputs,preparedInputs} from '../src/lib/finds.ts';
test('seller and employer authentication uses the existing capability endpoints',()=>{
  assert.equal(authEndpoint(false,true),'/auth/seller/login');
  assert.equal(authEndpoint(true,true),'/auth/seller/register');
  assert.equal(authEndpoint(false,false),'/auth/login');
  assert.equal(authEndpoint(true,false),'/auth/register');
});
test('hidden conditional answers cannot activate dependent required questions',()=>{
  const fields:RequirementField[]=[{id:'registered',label:'Registered',type:'boolean'},{id:'registration',label:'Registration',type:'text',visible_if:{field:'registered',operator:'equals',value:true}},{id:'proof',label:'Proof',type:'text',visible_if:{field:'registration',operator:'equals',value:'retained'}}];
  assert.deepEqual(visibleAnswers(fields,{registered:false,registration:'retained',proof:'private'}),{registered:false});
  assert.equal(matches({field:'registered',operator:'equals',value:true},{registered:'true'}),false);
  assert.equal(matches({field:'areas',operator:'includes',value:'Bengaluru'},{areas:['Bengaluru']}),true);
});
test('evidence caps file size before reading and accepts only supported formats',()=>{
  assert.deepEqual(evidenceMeta('evidence.PDF',evidenceLimit),{filename:'evidence.PDF',media_type:'application/pdf'});
  assert.equal(evidenceMeta('image.jpeg',100).media_type,'image/jpeg');
  for(const [name,size] of [['script.exe',100],['evidence.pdf',0],['evidence.pdf',evidenceLimit+1],['evidence.pdf',NaN]] as [string,number][])assert.throws(()=>evidenceMeta(name,size));
});
test('multiline areas preserve editing state and normalize only submitted answers',()=>{
  const configuration={sections:[{id:'business',title:'Business',fields:[{id:'areas',label:'Areas',type:'service_area'} as RequirementField]}],declarations:[]};
  const answers={areas:[' Bengaluru ','',' Mysuru '],other:'retained'};
  assert.deepEqual(preparedAnswers(configuration,answers),{areas:['Bengaluru','Mysuru'],other:'retained'});
  assert.deepEqual(answers.areas,[' Bengaluru ','',' Mysuru ']);
  assert.deepEqual(preparedInputs({...newInputs,target_titles:[' Engineer ','']}).target_titles,['Engineer']);
});
test('reset email links are parsed locally without browser handoff',()=>{
  const token='a'.repeat(43);
  assert.equal(resetToken(token),token);
  assert.equal(resetToken('https://vistrah.example/reset-password#token='+token),token);
  assert.equal(resetToken('vistrah://reset-password?token='+token),token);
  assert.throws(()=>resetToken('https://vistrah.example/reset-password'));
});
test('only the admin account action can open the VISTRAH website',()=>{
  const root=new URL('../src/',import.meta.url).pathname;
  function files(dir:string):string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(dir,entry.name)):/\.tsx?$/.test(entry.name)?[join(dir,entry.name)]:[]);}
  const source=files(root).map(file=>({file,text:readFileSync(file,'utf8')}));
  assert.equal(source.some(item=>item.text.includes('openWebsite')),false);
  const callers=source.filter(item=>item.text.includes('openAdminDashboard')&&!item.file.endsWith('/lib/web.ts'));
  assert.equal(callers.length,1);assert.ok(callers[0].file.endsWith('/app/(tabs)/account.tsx'));
  assert.match(callers[0].text,/role==='ADMIN'/);
  const helper=source.find(item=>item.file.endsWith('/lib/web.ts'))!.text;
  assert.match(helper,/EXPO_PUBLIC_ADMIN_URL/);assert.doesNotMatch(helper,/Authorization|access_token/);
});
