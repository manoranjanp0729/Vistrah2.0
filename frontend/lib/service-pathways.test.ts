import {describe,it,expect} from 'vitest';
import catalogue from '../../shared/catalogue.json';
import {allServices,resolveRoute} from './urls';
import type {Category} from './types';
import {servicePathways,serviceTabs,serviceTab,serviceTabUrl,enquiryIntent,enquiryModes,enquiryUrl} from './service-pathways';
import {safeDestination} from './destinations';
const categories=catalogue as unknown as Category[];
describe('Service pathways',()=>{
  it('keeps the required order and service-specific destinations across all 59 services',()=>{
    for(const context of allServices(categories)) {
      const paths=servicePathways(context);
      expect(paths.map(path=>path.title)).toEqual(['Find Service Provider','VISTRAH Recommended','VISTRAH Services']);
      expect(paths.map(path=>path.id)).toEqual(serviceTabs);
      expect(paths[1].href).toBe(enquiryUrl(context,'recommendations'));
      expect(paths[2].href).toBe(enquiryUrl(context,'in-house'));
      expect(paths[2].description).toBe('No VISTRAH-managed offering is currently listed for this service. Enquire about delivery options.');
      expect(paths.some(path=>path.href==='/call-vistrah')).toBe(false);
      const directory=resolveRoute(categories,paths[0].href.split('/').slice(2));
      expect(directory?.kind).toBe('companies');
      expect(directory&&'service' in directory&&directory.service.slug).toBe(context.service.slug);
      const detail=resolveRoute(categories,`${paths[0].href}/registered-provider`.split('/').slice(2));
      expect(detail?.kind).toBe('provider');
      for(const tab of serviceTabs)expect(safeDestination(serviceTabUrl(context,tab))).toBe(serviceTabUrl(context,tab));
    }
  });
  it('maps historical enquiry purposes to the right tab without changing prefixes or URLs',()=>{
    expect(serviceTab(undefined,'recommendations')).toBe('recommendations');
    expect(serviceTab(undefined,'in-house')).toBe('in-house');
    expect(serviceTab(undefined,'contact')).toBe('providers');
    expect(serviceTab('providers','in-house')).toBe('providers');
    expect(serviceTab('__proto__')).toBe('providers');
    expect(enquiryModes.recommendations.prefix).toBe('[Recommendation assistance] ');
    expect(enquiryModes['in-house'].prefix).toBe('[Delivery options enquiry] ');
  });
  it('accepts only known enquiry purposes and preserves them in sign-in destinations',()=>{
    for(const value of ['recommendations','contact','in-house','enquiry']) expect(enquiryIntent(value)).toBe(value);
    for(const value of [undefined,['contact'],'__proto__','constructor','ownership=VISTRAH','<script>']) expect(enquiryIntent(value)).toBe('enquiry');
    expect(enquiryModes.recommendations.message).toContain('not an automated recommendation');
    expect(enquiryModes.contact.message).toContain('Live chat is not available');
  });
});

