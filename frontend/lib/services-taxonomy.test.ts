import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
vi.mock('@/components/seller-auth',()=>({SellerEntry:()=>React.createElement('div',null,'Seller entry')}));
vi.mock('@/components/marketplace-browser',()=>({MarketplaceBrowser:({selection}:{selection:{category?:{title:string};subcategory?:{title:string};listingType?:{title:string}}})=>React.createElement('div',null,selection.listingType?.title??selection.subcategory?.title??selection.category?.title??'Categories')}));
vi.mock('next/navigation',()=>({notFound:()=>{throw new Error('NOT_FOUND');}}));
import Services from '../app/(public)/services/page';
import {marketplaceCategories} from './marketplace-taxonomy';

it('renders only taxonomy browsing at every level without requesting the legacy catalogue',async()=>{
  const category=marketplaceCategories[0],subcategory=category.subcategories[0],type=subcategory.listing_types[0];
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  try{
    for(const [params,title] of [
      [{},'Categories'],
      [{category:category.slug},category.title],
      [{category:category.slug,subcategory:subcategory.slug},subcategory.title],
      [{category:category.slug,subcategory:subcategory.slug,type:type.slug},type.title],
    ] as const){
      const html=renderToStaticMarkup(await Services({searchParams:Promise.resolve(params)}));
      expect(html).toContain(title.replaceAll('&','&amp;'));
      expect(html).not.toContain('published-services');
      expect(html).not.toContain('Service catalogue');
    }
    expect(fetcher).not.toHaveBeenCalled();
  }finally{vi.unstubAllGlobals();}
});
