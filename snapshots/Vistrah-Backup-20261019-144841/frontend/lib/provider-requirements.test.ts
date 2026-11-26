import {describe,it,expect} from 'vitest';
import {matches,visibleAnswers,editable,onboardingUrl,type RequirementField} from './provider-requirements';
describe('provider requirements presentation',()=>{
  it('uses real category IDs in the entry journey',()=>{expect(onboardingUrl(42)).toBe('/provide-service?category=42');});
  it('requires a real boolean and supports selected-value conditions',()=>{
    expect(matches({field:'licensed',operator:'equals',value:true},{licensed:true})).toBe(true);
    expect(matches({field:'licensed',operator:'equals',value:true},{licensed:'true'})).toBe(false);
    expect(matches({field:'areas',operator:'includes',value:'Bengaluru'},{areas:['Bengaluru']})).toBe(true);
    expect(matches({field:'licensed',operator:'not_equals',value:'Registered'},{})).toBe(false);
    expect(matches({field:'licensed',operator:'equals',value:true},{licensed:{not_applicable:true,reason:'Not relevant'}})).toBe(false);
  });
  it('does not reveal descendants based on stale hidden answers',()=>{
    const fields:RequirementField[]=[{id:'recruits',label:'Recruitment',type:'boolean'},{id:'authorized',label:'Authority',type:'boolean',visible_if:{field:'recruits',operator:'equals',value:true}},{id:'evidence',label:'Authority evidence',type:'file',visible_if:{field:'authorized',operator:'equals',value:true}}];
    expect(visibleAnswers(fields,{recruits:false,authorized:true,evidence:'previous-file'})).toEqual({recruits:false});
    expect(visibleAnswers(fields,{recruits:true,authorized:true,evidence:'previous-file'}).evidence).toBe('previous-file');
  });
  it('only allows draft or requested changes to enter editing controls',()=>{
    for(const state of ['DRAFT','CHANGES_REQUESTED'])expect(editable(state)).toBe(true);
    for(const state of ['SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','SUSPENDED'])expect(editable(state)).toBe(false);
  });
});
