import type {EstimateField} from './estimate-scopes';
export function estimateRequirements(title:string,fields:EstimateField[],answers:Record<string,string>,details:string,budget:string,timing:string){
 const rows=fields.map(field=>{
  const value=(answers[field.id]??'').trim();
  if(!value)throw new Error('Please complete: '+field.label+'.');
  if(value.length>300)throw new Error(field.label+' must be at most 300 characters.');
  if(field.kind==='choice'&&!field.options?.includes(value))throw new Error('Choose an option for '+field.label+'.');
  if(field.kind==='number'&&(!/^\d+(\.\d+)?$/.test(value)||!Number.isFinite(Number(value))||Number(value)<=0))throw new Error('Enter a positive number for '+field.label+'.');
  return field.label+': '+value;
 });
 const result=['[Estimate request] '+title,...rows,'Preferred timing: '+timing,'Budget range: '+(budget.trim()||'Not specified'),'Additional details: '+(details.trim()||'None')].join('\n');
 if(result.length>4900)throw new Error('Please shorten your additional details.');
 return result;
}
