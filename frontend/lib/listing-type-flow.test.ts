import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,expect,it,vi} from 'vitest';
const session=vi.hoisted(()=>({user:null as null|{seller_enabled:boolean}}));
vi.mock('@/components/customer',()=>({useUser:()=>session}));
vi.mock('@/components/language-provider',()=>({useLanguage:()=>({t:(key:string)=>key,label:(_key:string,fallback:string)=>fallback})}));
vi.mock('@/components/nearby-service-discovery',()=>({NearbyServiceDiscovery:()=>React.createElement('p',null,'Nearby services')}));
vi.mock('@/components/photo-card',()=>({PhotoCard:({href,title}:{href:string;title:string})=>React.createElement('a',{href},title)}));
vi.mock('@/components/photo-card-rail',()=>({PhotoCardRail:({children}:{children:React.ReactNode})=>React.createElement('div',null,children)}));
vi.mock('@/components/marketplace-categories',()=>({MarketplaceCategories:()=>null}));
vi.mock('next/navigation',()=>({
  notFound:()=>{throw new Error('NOT_FOUND');},
  redirect:(path:string)=>{throw new Error('REDIRECT:'+path);},
}));
import {MarketplaceBrowser} from '../components/marketplace-browser';
import AddServicePage from '../app/(public)/seller/add-service/page';
import {marketplaceCategories,resolveMarketplaceSelection} from './marketplace-taxonomy';
import {addServiceUrl,serviceSelection,serviceListingForm,businessInput,emptyBusiness} from '../../shared/service-listing';
import {listingInput} from '../../shared/commerce';
import {websiteLoginDestination} from './login-destination';

const category=marketplaceCategories[0],sub=category.subcategories[0],type=sub.listing_types[0];
const selection={category:category.slug,subcategory:sub.slug,type:type.slug};
beforeEach(()=>{session.user=null;});
const render=(params:Parameters<typeof resolveMarketplaceSelection>[0],query='')=>renderToStaticMarkup(React.createElement(MarketplaceBrowser,{selection:resolveMarketplaceSelection(params)!,query}));

it('keeps subcategory and search service cards free of plus overlays while retaining detail-page onboarding',()=>{
  expect(render(selection)).not.toContain('Add service:');
  session.user={seller_enabled:false};expect(render(selection)).not.toContain('Add service:');
  session.user={seller_enabled:true};
  expect(render({})).not.toContain('Add service:');
  expect(render({category:category.slug})).not.toContain('Add service:');
  const subHtml=render({category:category.slug,subcategory:sub.slug});
  expect(subHtml).not.toContain('Add service:');
  expect(subHtml).not.toContain('>+<');
  expect(render({},type.title)).not.toContain('Add service:');
  expect(render({},type.title)).not.toContain('>+<');
  expect(addServiceUrl(selection)).toBe(`/seller/onboard?category=${category.slug}&subcategory=${sub.slug}&type=${type.slug}`);
  const detailHtml=render(selection);
  expect(detailHtml).toContain('Nearby services');
  expect(detailHtml).toContain(addServiceUrl(selection).replaceAll('&','&amp;'));
  expect(detailHtml).toContain('Email VISTRAH about this service');
  expect(detailHtml).not.toContain('Browse published products');
});

it('redirects legacy /seller/add-service URLs directly to /seller/onboard with category, subcategory and type preserved',async()=>{
  const form=serviceListingForm(selection,type.title);
  expect(listingInput({...form,description:'A complete test service description.',price:'123.45'})).toMatchObject({kind:'SERVICE_PACKAGE',service_id:null,taxonomy_category_slug:category.slug,taxonomy_subcategory_slug:sub.slug,taxonomy_listing_type_slug:type.slug,unit_price_paise:12345});
  expect(websiteLoginDestination(addServiceUrl(selection))).toBe(`/seller/onboard?category=${category.slug}&subcategory=${sub.slug}&type=${type.slug}`);
  await expect(AddServicePage({searchParams:Promise.resolve(selection)})).rejects.toThrow(`REDIRECT:/seller/onboard?category=${category.slug}&subcategory=${sub.slug}&type=${type.slug}`);
  for(const params of [{},{...selection,type:'invalid'},{...selection,category:['invalid']}])await expect(AddServicePage({searchParams:Promise.resolve(params)})).rejects.toThrow('NOT_FOUND');
  expect(serviceSelection({category:category.slug})).toBeNull();
});

it('requires business contact details before submitting a new business',()=>{
  expect(()=>businessInput(emptyBusiness())).toThrow();
  expect(businessInput({name:' Seller ',company:' Business ',phone:'+91 9000000000',address:' Test address ',location:' Bengaluru '})).toMatchObject({name:'Seller',company:'Business',location:'Bengaluru'});
});
