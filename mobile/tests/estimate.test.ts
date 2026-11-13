import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {estimateScopes} from '../src/lib/estimate-scopes.ts';
import {estimateRequirements} from '../src/lib/estimate.ts';
test('every catalogue service has its own scoped estimate questions',()=>{
 const catalogue=JSON.parse(readFileSync(new URL('../../shared/catalogue.json',import.meta.url),'utf8'));
 const slugs:string[]=[];function collect(value:unknown){if(Array.isArray(value))value.forEach(collect);else if(value&&typeof value==='object'){const row=value as Record<string,unknown>;if('includes' in row)slugs.push(String(row.slug));Object.values(row).forEach(collect);}}collect(catalogue);
 assert.equal(slugs.length,59);for(const slug of slugs){assert.equal(estimateScopes[slug]?.length,3,slug);assert.equal(new Set(estimateScopes[slug].map(f=>f.id)).size,3);}
 assert.notDeepEqual(estimateScopes['resume-building'],estimateScopes['digital-marketing']);assert.notDeepEqual(estimateScopes['retractable-roofing'],estimateScopes['bioclimatic-pergolas']);
});
test('estimate payload preserves scope and validates missing, invalid choices and dimensions',()=>{
 const fields=estimateScopes['retractable-roofing'];const answers={scope1:'3.5',scope2:'8',scope3:'Motorised'};
 const result=estimateRequirements('Retractable Roofing',fields,answers,'Existing terrace','Under 2 lakh','Next month');assert.match(result,/\[Estimate request\] Retractable Roofing/);assert.match(result,/Roof width \(metres\): 3.5/);assert.match(result,/Operation: Motorised/);
 assert.throws(()=>estimateRequirements('Roof',fields,{},'','','Soon'),/Please complete/);
 assert.throws(()=>estimateRequirements('Roof',fields,{...answers,scope1:'0'},'','','Soon'),/positive number/);
 assert.throws(()=>estimateRequirements('Roof',fields,{...answers,scope3:'invalid'},'','','Soon'),/Choose an option/);
});
