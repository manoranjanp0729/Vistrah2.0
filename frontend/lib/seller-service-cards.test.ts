import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,expect,it,vi} from 'vitest';
import {sellerServiceSelection} from '../../shared/seller-service-selection';
const session=vi.hoisted(()=>({seller:false}));
vi.mock('@/components/customer',()=>({useUser:()=>({user:session.seller?{seller_enabled:true}:null})}));
vi.mock('@/components/language-provider',()=>({useLanguage:()=>({label:(_key:string,title:string)=>title,t:(key:string)=>key})}));
vi.mock('@/components/photo-card',()=>({PhotoCard:({title,href}:{title:string;href:string})=>React.createElement('a',{href},title)}));
vi.mock('@/components/photo-card-rail',()=>({PhotoCardRail:({children}:{children:React.ReactNode})=>React.createElement('div',null,children)}));
import {MarketplaceCategories} from '../components/marketplace-categories';
beforeEach(()=>{session.seller=false;});
it('keeps category cards free of add actions even for sellers',()=>{
  session.seller=true;
  const html=renderToStaticMarkup(React.createElement(MarketplaceCategories));
  expect(html).not.toContain('aria-label="Add ');
});
it('preselects only an active service belonging to the chosen category',()=>{
  const rows=[{id:1,services:[{id:10}],subcategories:[{id:2,services:[{id:20}]}]}];
  expect(sellerServiceSelection(rows,1,10)).toEqual({categoryId:1,subcategoryId:null,serviceId:10});
  expect(sellerServiceSelection(rows,1,20)).toEqual({categoryId:1,subcategoryId:2,serviceId:20});
  expect(sellerServiceSelection(rows,9,20)).toBeNull();
  expect(sellerServiceSelection(rows,1,99)).toBeNull();
  expect(sellerServiceSelection([{...rows[0],active:false}],1,10)).toBeNull();
});
