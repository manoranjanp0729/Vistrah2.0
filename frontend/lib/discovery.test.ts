import {describe,it,expect} from 'vitest';
import {preparationAvailable,vacancyStatus} from './discovery';
import type {Vacancy} from './discovery';
const vacancy={title:'Engineer',employer:'Employer',location:'London',arrangement:'REMOTE',description:'Verified vacancy description for preparation.',status:'SOURCE_LISTED'} as Vacancy;
describe('discovery presentation',()=>{
  it('never presents source listing as confirmed open',()=>{expect(vacancyStatus(vacancy)).toContain('open status unconfirmed');expect(vacancyStatus({...vacancy,status:'STALE'})).toContain('Stale');});
  it('requires supplied details before preparing factual drafts',()=>{expect(preparationAvailable(vacancy)).toBe(true);expect(preparationAvailable({...vacancy,employer:null})).toBe(false);expect(preparationAvailable({...vacancy,arrangement:null})).toBe(false);expect(preparationAvailable({...vacancy,description:'short'})).toBe(false);});
});
