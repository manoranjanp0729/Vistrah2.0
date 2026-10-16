import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
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
    serverApi.mockImplementation(async(path:string)=>path==='/catalogue'?categories:{version:null});
  });
  it('keeps admin-published sections ahead of taxonomy and suppresses fallback content',async()=>{
    const service=allServices(categories).find(c=>c.category.active&&c.service.active&&(!c.subcategory||c.subcategory.active))!;
    serverApi.mockImplementation(async(path:string)=>path==='/catalogue'?categories:{version:7,layout:{schema_version:1,sections:[{id:'published',template:'service_grid',title:'Published priority',subtitle:'',size:'wide',service_ids:[service.service.id]}]}});
    const html=renderToStaticMarkup(await Home());
    expect(html.indexOf('Published priority')).toBeGreaterThan(-1);
    expect(html.indexOf('Published priority')).toBeLessThan(html.indexOf('Services for you'));
    expect(html).not.toContain('Quick access services');
    expect(html).not.toContain('reference-feature');
    expect(html).toContain(urls.service(service.category,service.service,service.subcategory));
  });
  it('keeps canonical navigation when the homepage endpoint is unavailable',async()=>{
    serverApi.mockImplementation(async(path:string)=>{if(path==='/catalogue')return categories;throw new Error('Unavailable');});
    const html=renderToStaticMarkup(await Home());
    expect(html).toContain('Services for you');expect(html).not.toContain('14 categories');
    expect(html).toContain('reference-feature');
    expect(html).toContain('/services?category=pet-care');
  });
  it('shows taxonomy even when the published-service API fails',async()=>{
    serverApi.mockRejectedValue(new Error('Unavailable'));
    const html=renderToStaticMarkup(await Services({searchParams:Promise.resolve({})}));
    expect(html.match(/data-marketplace-category=/g)).toHaveLength(14);
    expect(html).toContain('Published services are temporarily unavailable');
    expect(serverApi.mock.calls).toEqual([['/catalogue']]);
  });
  it('searches published services while retaining their original URLs and photos',async()=>{
    const service=allServices(categories).find(c=>c.category.active&&c.service.active&&(!c.subcategory||c.subcategory.active))!;
    const html=renderToStaticMarkup(await Services({searchParams:Promise.resolve({q:`  ${service.service.title.toUpperCase()}  `})}));
    expect(html).toContain(urls.service(service.category,service.service,service.subcategory));
    expect(html).toContain(`data-image-id="service/${service.category.slug}/${service.subcategory?service.subcategory.slug+'/':''}${service.service.slug}"`);
    expect(serverApi.mock.calls).toEqual([['/catalogue']]);
  });
  it('never advertises inactive records or turns classification into a published service',async()=>{
    const rows=structuredClone(categories);
    rows.forEach(c=>{c.active=false;});
    serverApi.mockResolvedValue(rows);
    const html=renderToStaticMarkup(await Services({searchParams:Promise.resolve({q:'dog walking'})}));
    expect(html).toContain('Dog walking');
    expect(html).not.toContain('class="service-card"');
    expect(html).not.toContain('/service/pet-care');
  });
  it('preserves category-description search and marketing service links',async()=>{
    const category=categories.find(c=>c.services.length&&c.description)!;
    const html=renderToStaticMarkup(await Services({searchParams:Promise.resolve({q:category.description})}));
    expect(html).toContain(urls.service(category,category.services[0]));
    const marketing=categories.find(c=>c.slug==='marketing')!;
    const marketingHtml=renderToStaticMarkup(await Services({searchParams:Promise.resolve({q:marketing.title})}));
    expect(marketingHtml).toContain(urls.service(marketing,marketing.services[0]));
  });
  it('keeps classification journeys compact and independent of catalogue availability',async()=>{
    serverApi.mockRejectedValue(new Error('Unavailable'));
    const html=renderToStaticMarkup(await Services({searchParams:Promise.resolve({category:'pet-care',subcategory:'pet-walking-and-sitting',type:'dog-walking'})}));
    expect(html).toContain('cannot be booked or requested');
    expect(html).toContain('/services#published-services');
    expect(html).not.toContain('class="service-card"');
    expect(serverApi).not.toHaveBeenCalled();
  });
});
