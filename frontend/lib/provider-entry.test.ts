import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({catalogue:vi.fn(async()=>[])}));
vi.mock('@/lib/server',()=>({serverApi:mocks.catalogue}));
vi.mock('@/components/provider-onboarding',()=>({ProviderOnboarding:()=>null}));
vi.mock('next/navigation',()=>({redirect:(path:string)=>{throw new Error('REDIRECT:'+path);}}));
import ProvideService from '../app/(public)/provide-service/page';
beforeEach(()=>mocks.catalogue.mockClear());
it('redirects blank and invalid legacy add-service entries to taxonomy browsing without fetching the old catalogue',async()=>{
  for(const params of [{},{category:'invalid'},{application:'invalid'}]){
    await expect(ProvideService({searchParams:Promise.resolve(params)})).rejects.toThrow('REDIRECT:/services');
  }
  expect(mocks.catalogue).not.toHaveBeenCalled();
});
it('preserves existing application and business-specific review routes',async()=>{
  const application='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const existing=await ProvideService({searchParams:Promise.resolve({application})});
  expect(existing.props.applicationId).toBe(application);
  const business=await ProvideService({searchParams:Promise.resolve({business:'7'})});
  expect(business.props.providerId).toBe(7);
});
