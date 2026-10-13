import {describe,it,expect} from 'vitest';
import {emptyListing,listingInput,priceInPaise,listingForm,type SellerListing} from '../../shared/commerce';
describe('shared commerce input contract',()=>{
 it.each([['0.01',1],['12.30',1230],[' 25.5 ',2550],['10000000',1000000000],['0.29',29]])('converts %s to exact integer paise',(value,paise)=>{expect(priceInPaise(value)).toBe(paise);});
 it.each(['','0','-1','1.001','1e2','Infinity','NaN','₹100','1,000','10000000.01','9007199254740991','.50','1.'])('rejects ambiguous, fractional or out-of-range price %s',value=>{expect(()=>priceInPaise(value)).toThrow();});
 it('binds only packages to services and removes stale product service choices',()=>{
  const form={...emptyListing(),title:'  Reviewed product  ',description:'  A complete description of the seller product.  ',price:'499.99',service_id:'7',available:false};
  expect(listingInput(form)).toEqual({kind:'PRODUCT',service_id:null,title:'Reviewed product',description:'A complete description of the seller product.',unit_price_paise:49999,currency:'INR',available:false});
  expect(listingInput({...form,kind:'SERVICE_PACKAGE'}).service_id).toBe(7);
  for(const service_id of ['', '0','-1','1.5','1e3','9007199254740992'])expect(()=>listingInput({...form,kind:'SERVICE_PACKAGE',service_id})).toThrow();
 });
 it('keeps an approved price exact when prepared for editing; sends no approval fields',()=>{
  const row={...listingInput({...emptyListing(),title:'Reviewed product',description:'A complete description of the seller product.',price:'0.29'}),id:'synthetic',business:'Synthetic',revision:4,status:'APPROVED',review_note:'Reviewed'} as SellerListing;
  expect(listingForm(row).price).toBe('0.29');
  expect(listingInput(listingForm(row))).toEqual({kind:'PRODUCT',service_id:null,title:row.title,description:row.description,unit_price_paise:29,currency:'INR',available:true});
  expect(listingInput(listingForm(row))).not.toHaveProperty('status');
 });
 it('validates visible seller fields before any write',()=>{
  expect(()=>listingInput({...emptyListing(),title:' ',description:'Too short',price:'10'})).toThrow('Title');
  expect(()=>listingInput({...emptyListing(),title:'A valid title',description:'   ',price:'10'})).toThrow('Description');
 });
});
