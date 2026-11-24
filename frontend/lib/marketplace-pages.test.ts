import {createElement,type ReactNode} from 'react';
import {renderToStaticMarkup as renderMarkup} from 'react-dom/server';
import english from '../../shared/locales/en.json';
import {LanguageProvider} from '../components/language-provider';
const renderToStaticMarkup=(node:ReactNode)=>renderMarkup(createElement(LanguageProvider,null,node));
import {beforeEach,describe,expect,it,vi} from 'vitest';
import source from '../../shared/catalogue.json';
import type {Category} from './types';
import {allServices,urls} from './urls';

const {serverApi}=vi.hoisted(()=>({serverApi:vi.fn()}));
vi.mock('@/lib/server',()=>({serverApi}));
vi.mock('next/link',()=>({default:({children,...props}:React.ComponentProps<'a'>)=>createElement('a',props,children)}));
vi.mock('@/lib/urls',async()=>import('./urls'));
vi.mock('@/lib/imagery',async()=>import('./imagery'));
vi.mock('@/lib/interface-copy.json',async()=>({default:(await import('./interface-copy.json')).default}));
vi.mock('@/components/marketplace-categories',async()=>import('../components/marketplace-categories'));
vi.mock('@/components/published-homepage',async()=>import('../components/published-homepage'));
vi.mock('@/components/ui',async()=>import('../components/ui'));
vi.mock('@/components/visual',async()=>import('../components/visual'));
vi.mock('@/components/horizontal-carousel',async()=>import('../components/horizontal-carousel'));
vi.mock('@/components/reference-hero-carousel',()=>({ReferenceHeroCarousel:()=>createElement('div',null,'Hero carousel')}));
vi.mock('@/components/discovery-guide',()=>({DiscoveryGuide:()=>createElement('div',null,'Discovery guide')}));
import Home from '../app/(public)/page';
import Services from '../app/(public)/services/page';

// Seed definitions omit API IDs/active flags; populate only this in-memory fixture.
let serviceId=0;
const categories=source.map((category,index)=>({
  ...category,id:index+1,active:true,
  services:category.services.map(service=>({...service,id:++serviceId,active:true})),
  subcategories:category.subcategories.map((sub,subIndex)=>({...sub,id:subIndex+1,active:true,
    services:sub.services.map(service=>({...service,id:++serviceId,active:true}))})),
})) as unknown as Category[];
describe('Public taxonomy page behavior',()=>{
  beforeEach(()=>{
    serverApi.mockReset();
    serverApi.mockImplementation(async(path:string)=>path==='/edit-vistrah/pages/home'?null:path==='/catalogue'?categories:{version:null});
  });
  it('keeps admin-published sections ahead of taxonomy and suppresses fallback content',async()=>{
    const service=allServices(categories).find(c=>c.category.active&&c.service.active&&(!c.subcategory||c.subcategory.active))!;
    serverApi.mockImplementation(async(path:string)=>path==='/edit-vistrah/pages/home'?null:path==='/catalogue'?categories:{version:7,layout:{schema_version:1,sections:[{id:'published',template:'service_grid',title:'Published priority',subtitle:'',size:'wide',service_ids:[service.service.id]}]}});
    const html=renderToStaticMarkup(await Home());
    expect(html.indexOf('Published priority')).toBeGreaterThan(-1);
    expect(html.indexOf('Published priority')).toBeLessThan(html.indexOf('Services Near You'));
    expect(html).not.toContain('Services for you');
    expect(html).not.toContain('data-marketplace-category="vibe-finder"');
    expect(html).not.toContain('Quick access services');
    expect(html).not.toContain('reference-feature');
    expect(html).toContain(urls.service(service.category,service.service,service.subcategory));
  });
  it('keeps canonical navigation when the homepage endpoint is unavailable',async()=>{
    serverApi.mockImplementation(async(path:string)=>{if(path==='/catalogue')return categories;throw new Error('Unavailable');});
    const html=renderToStaticMarkup(await Home());
    expect(html).toContain('Services Near You');expect(html).not.toContain('Services for you');expect(html).not.toContain('14 categories');
    expect(html).not.toContain('data-marketplace-category="vibe-finder"');
    expect(html).toContain('reference-feature');
    expect(html).toContain('/services?category=restaurants-and-dining');
  });
  it('shows taxonomy even when the published-service API fails',async()=>{
    serverApi.mockRejectedValue(new Error('Unavailable'));
    const html=renderToStaticMarkup(await Services({searchParams:Promise.resolve({})}));
    expect(html.match(/data-marketplace-category=/g)).toHaveLength(10);
    expect(serverApi.mock.calls).toEqual([['/marketplace/service-types']]);
  });
  it('searches the final direct types and points results at nearby discovery',async()=>{
    const html=renderToStaticMarkup(await Services({searchParams:Promise.resolve({q:'Restaurant'})}));
    expect(html).toContain('Restaurant');
    expect(html).toContain('/services/nearby?category=restaurants-and-dining');
    expect(serverApi.mock.calls).toEqual([['/marketplace/service-types']]);
  });
  it('does not expose removed business types through search',async()=>{
    const html=renderToStaticMarkup(await Services({searchParams:Promise.resolve({q:'dog walking'})}));
    expect(html).not.toContain('/services?category=pet-care');
    expect(html).not.toContain('/service/pet-care');
    expect(html).not.toContain('data-marketplace-result=');
  });
  it('keeps final categories available when the dynamic catalogue cannot load',async()=>{
    serverApi.mockRejectedValue(new Error('Unavailable'));
    const html=renderToStaticMarkup(await Services({searchParams:Promise.resolve({category:'restaurants-and-dining'})}));
    expect(html).toContain('Restaurant');
    expect(html).toContain('/services/nearby?category=restaurants-and-dining');
    expect(html).not.toContain('class="service-card"');
  });
});
