import {describe,it,expect} from 'vitest';
import {editableWorkflow,terminalWorkflow,splitEntries,emptyJob} from './workflows';
describe('workflow customer controls',()=>{
  it('permits input editing only before execution',()=>{expect(editableWorkflow('DRAFT')).toBe(true);expect(editableWorkflow('READY')).toBe(true);for(const state of ['RUNNING','WAITING_APPROVAL','COMPLETED','CANCELLED'])expect(editableWorkflow(state)).toBe(false);});
  it('polls while work or authorization is outstanding',()=>{for(const state of ['QUEUED','RUNNING','WAITING_APPROVAL'])expect(terminalWorkflow(state)).toBe(false);for(const state of ['COMPLETED','FAILED','PARTIALLY_COMPLETED','CANCELLED'])expect(terminalWorkflow(state)).toBe(true);});
  it('normalizes preference lists without blank or repeated entries',()=>{expect(splitEntries(' Python, SQL, Python, , ')).toEqual(['Python','SQL']);});
  it('creates empty user-entry rows without inventing a vacancy',()=>{expect(emptyJob().source_url).toBe('');expect(emptyJob().description).toBe('');expect(emptyJob().salary_max).toBeNull();});
});
