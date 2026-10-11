export type Answer=string|number|boolean|string[]|{not_applicable:true;reason:string}|Record<string,unknown>[];
export type Answers=Record<string,Answer>;
export type Condition={field:string;operator:'equals'|'not_equals'|'includes';value:string|boolean|number};
export type RequirementField={id:string;label:string;type:'text'|'textarea'|'number'|'date'|'select'|'single_choice'|'multi_select'|'boolean'|'address'|'service_area'|'file'|'repeatable';description?:string;help?:string;required?:boolean;allow_na?:boolean;basis?:string;legal_basis?:string;options?:string[];visible_if?:Condition|null;required_if?:Condition|null;min_length?:number;max_length?:number;minimum?:number|null;maximum?:number|null;format?:string;error_message?:string;children?:RequirementField[]};
export type Declaration={id:string;label:string;required?:boolean};
export type Requirements={sections:{id:string;title:string;description?:string;fields:RequirementField[]}[];declarations:Declaration[];checklist?:Declaration[];notes?:string};
export type Configuration={id:number;service_id:number;version:number;state:string;configuration:Requirements;effective_at:string;created_at:string;published_at:string|null;change_note:string;applications_count?:number;validation_errors?:FieldError[]};
export type FieldError={field:string;message:string};
export type ApplicationSummary={id:string;category_id:number;provider_id:number|null;status:string;revision:number;created_at:string;submitted_at:string|null;business?:string};
export type ProviderApplication=ApplicationSummary&{user_id:number;common:Answers;common_configuration:Requirements;services:{service_id:number;title:string;status:string;requirement_id:number;required_requirement_id:number|null;answers:Answers;requirements:Configuration;latest_requirements:Configuration|null;required_requirements:Configuration|null}[];documents:{id:string;service_id:number;field_id:string;filename:string;media_type:string}[];history:{id:number;kind:string;service_id:number|null;reason:string;actor_id:number;created_at:string;details:Record<string,unknown>}[]};
export function matches(condition:Condition|null|undefined,answers:Answers){
  if(!condition)return true;
  const value=answers[condition.field];
  if(value===undefined||value===null||typeof value==='object'&&!Array.isArray(value))return false;
  if(condition.operator==='equals')return value===condition.value;
  if(condition.operator==='not_equals')return value!==condition.value;
  return Array.isArray(value)&&value.includes(condition.value as never);
}
export const editable=(status:string)=>['DRAFT','CHANGES_REQUESTED'].includes(status);
export function visibleAnswers(fields:RequirementField[],answers:Answers){
  const active:Answers={};for(const field of fields)if(matches(field.visible_if,active)&&answers[field.id]!==undefined)active[field.id]=answers[field.id];return active;
}
export const onboardingUrl=(categoryId:number)=>`/provide-service?category=${categoryId}`;
