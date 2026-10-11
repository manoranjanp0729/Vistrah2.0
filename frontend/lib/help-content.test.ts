import {describe,it,expect} from 'vitest';
import {helpContent,adminHelp,accountHelp,reviewHelp,statusHelp} from './help-content';
describe('Contextual education contracts',()=>{
  it('covers the actual navigation, service pathways and status domains',()=>{
    expect(Object.keys(adminHelp)).toHaveLength(12);expect(Object.keys(accountHelp)).toHaveLength(8);
    for(const id of [...Object.values(adminHelp),...Object.values(accountHelp),...Object.values(reviewHelp),...Object.values(statusHelp)])expect(helpContent[id].description.length).toBeGreaterThan(40);
    for(const id of ['mail','chat','email','providers','recommendations','in-house'] as const)expect(helpContent[`pathway.${id}`]).toBeTruthy();
  });
  it('explains approval, published version and financial consequences accurately',()=>{
    expect(helpContent['provider.approve'].description).toContain('verified identity');
    expect(helpContent['provider.approve'].description).toContain('active provider');
    expect(helpContent['provider.suspend'].description).toContain('public and lead eligibility');
    expect(helpContent['requirements.publish'].description).toContain('existing applications keep their pinned versions');
    expect(helpContent['requirements.retire'].description).toContain('replacement');
    expect(helpContent['admin.refund'].description).toContain('revoke the membership');
    expect(helpContent['admin.reconcile'].description).toContain('does not settle funds or repair balances');
  });
  it('distinguishes actual fallback and workflow capabilities',()=>{
    expect(helpContent['pathway.chat'].description).toContain('Live chat is unavailable');
    expect(helpContent['pathway.mail'].description).toContain('does not send SMTP email');
    expect(helpContent['pathway.email'].description).toContain('email application');
    expect(helpContent['pathway.in-house'].description).toContain('No confirmed managed');
    expect(helpContent['finds.approve'].description).toContain('not submission to an employer');
    for(const content of Object.values(helpContent)){expect(content.title).toBeTruthy();expect(content.description).toBeTruthy();}
  });
});
