import {describe,it,expect} from 'vitest';
import {addCatalogueService,removeCatalogueService,type CatalogueSelection} from './catalogue-selection';

describe('seller catalogue selection',()=>{
  it('preserves selections across category and subcategory navigation',()=>{
    const groups:CatalogueSelection[]=[];
    const afterFirst=addCatalogueService(groups,1,10,101);
    const afterNavigation=addCatalogueService(afterFirst,2,20,202);
    expect(addCatalogueService(afterNavigation,1,10,101)).toBe(afterNavigation);
    expect(afterNavigation).toEqual([
      {category_id:1,subcategory_id:10,service_ids:[101]},
      {category_id:2,subcategory_id:20,service_ids:[202]},
    ]);
  });

  it('supports multiple services in a section and removes empty sections',()=>{
    const first=addCatalogueService([],1,null,101);
    const second=addCatalogueService(first,1,null,102);
    expect(second[0].service_ids).toEqual([101,102]);
    expect(removeCatalogueService(second,1,null,101)).toEqual([
      {category_id:1,subcategory_id:null,service_ids:[102]},
    ]);
    expect(removeCatalogueService(second,1,null,102)).toEqual([
      {category_id:1,subcategory_id:null,service_ids:[101]},
    ]);
    expect(removeCatalogueService(first,1,null,101)).toEqual([]);
  });
});
