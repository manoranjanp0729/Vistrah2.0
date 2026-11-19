import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({catalogue:vi.fn(async()=>[])}));
vi.mock('@/lib/server',()=>({serverApi:mocks.catalogue}));
vi.mock('@/components/provider-onboarding',()=>({ProviderOnboarding:()=>null}));
vi.mock('next/navigation',()=>({redirect:(path:string)=>{throw new Error('REDIRECT:'+path);}}));
import ProvideService from '../app/(public)/provide-service/page';
import ProviderPage from '../app/(public)/provider/page';
import ProviderOnboardingRedirectPage from '../app/(public)/provider/onboarding/page';
import SellerNewRedirectPage from '../app/(public)/seller/new/page';

beforeEach(()=>mocks.catalogue.mockClear());

it('redirects blank and legacy onboarding entries directly to /seller/onboard without fetching the old catalogue',async()=>{
  await expect(ProvideService({searchParams:Promise.resolve({})})).rejects.toThrow('REDIRECT:/seller/onboard');
  await expect(ProvideService({searchParams:Promise.resolve({category:'invalid'})})).rejects.toThrow('REDIRECT:/seller/onboard');
  await expect(ProvideService({searchParams:Promise.resolve({business:'7'})})).rejects.toThrow('REDIRECT:/seller/onboard?business=7');
  await expect(ProvideService({searchParams:Promise.resolve({category:'food-and-dining',type:'restaurant'})})).rejects.toThrow('REDIRECT:/seller/onboard?category=hospitality-restaurants-and-cafes&type=restaurants');
  await expect(ProviderPage({searchParams:Promise.resolve({})})).rejects.toThrow('REDIRECT:/seller/onboard');
  await expect(ProviderOnboardingRedirectPage({searchParams:Promise.resolve({category:'vehicles',type:'driving-school'})})).rejects.toThrow('REDIRECT:/seller/onboard?category=automobiles-and-garages&type=driving-schools');
  await expect(SellerNewRedirectPage({searchParams:Promise.resolve({business:'3'})})).rejects.toThrow('REDIRECT:/seller/onboard?business=3');
  expect(mocks.catalogue).not.toHaveBeenCalled();
});

it('preserves existing application review routes when a valid application UUID is provided',async()=>{
  const application='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const existing=await ProvideService({searchParams:Promise.resolve({application})});
  expect(existing.props.applicationId).toBe(application);
});
