import {describe,it,expect} from 'vitest';
import source from '../../shared/catalogue.json';
import {urls,resolveRoute,allServices} from './urls';
import type {Category} from './types';
const categories=source as unknown as Category[];
describe('Canonical routing',()=>{
  it('generates the exact direct and nested URLs required by the specification',()=>{
    expect(urls.service({slug:'jobs-careers'},{slug:'resume-building'})).toBe('/service/jobs-careers/service/resume-building');
    expect(urls.service({slug:'civil-construction'},{slug:'retractable-roofing'},{slug:'outdoor-lifestyle-design'})).toBe('/service/civil-construction/outdoor-lifestyle-design/service/retractable-roofing');
    expect(urls.provider({slug:'civil-construction'},{slug:'outdoor-lifestyle-design'},{slug:'glass-systems'},{slug:'company'})).toBe('/service/civil-construction/outdoor-lifestyle-design/glass-systems/companies/company');
  });
  it('resolves every generated category, subcategory, service and request path',()=>{
    const generated=new Set<string>();
    for(const category of categories){const path=urls.category(category);expect(resolveRoute(categories,path.split('/').slice(2))?.kind).toBe('category');generated.add(path);for(const subcategory of category.subcategories){const path=urls.subcategory(category,subcategory);expect(resolveRoute(categories,path.split('/').slice(2))?.kind).toBe('subcategory');generated.add(path);}}
    for(const context of allServices(categories)){const {category,subcategory,service}=context;for(const [path,kind] of [[urls.service(category,service,subcategory),'service'],[urls.request(category,service,subcategory),'request']]){const route=resolveRoute(categories,path.split('/').slice(2));expect(route?.kind).toBe(kind);expect(route&&'service' in route&&route.service.slug).toBe(service.slug);expect(generated.has(path)).toBe(false);generated.add(path);}if(subcategory){expect(resolveRoute(categories,urls.providers(category,subcategory,service).split('/').slice(2))?.kind).toBe('companies');}}
    expect(allServices(categories)).toHaveLength(59);
  });
  it.each([['missing'],['jobs-careers','missing'],['jobs-careers','service','missing'],['jobs-careers','resume-building'],['civil-construction','outdoor-lifestyle-design','glass-systems'],['jobs-careers','service','resume-building','unexpected'],['civil-construction','outdoor-lifestyle-design','service','missing']])('rejects unknown or ambiguous structure %j',(...segments)=>{expect(resolveRoute(categories,segments)).toBeNull();});
  it('handles an empty catalogue',()=>{expect(allServices([])).toEqual([]);expect(resolveRoute([],['jobs-careers'])).toBeNull();});
});
