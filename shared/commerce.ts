export type ListingInput={taxonomy_category_slug:string|null;taxonomy_subcategory_slug:string|null;taxonomy_listing_type_slug:string|null;kind:'PRODUCT'|'SERVICE_PACKAGE';service_id:number|null;title:string;description:string;unit_price_paise:number;currency:'INR';available:boolean};
import type {OrderTerms} from './commerce-orders';
export type CommerceListing=ListingInput&{id:string;business:string;revision:number;taxonomy_selection?:{category:{title:string};subcategory:{title:string};listing_type:{title:string}}|null;fulfilment_operator?:'SELLER'|'VISTRAH';order_terms?:OrderTerms};
export type SellerListing=CommerceListing&{status:'DRAFT'|'SUBMITTED'|'APPROVED'|'REJECTED'|'ARCHIVED';review_note:string;business_active?:boolean;business_verification_status?:string};
export type ListingPage<T>={items:T[];total:number;page:number;page_size:number};
export type ListingForm={taxonomy_category_slug:string;taxonomy_subcategory_slug:string;taxonomy_listing_type_slug:string;kind:ListingInput['kind'];service_id:string;title:string;description:string;price:string;available:boolean};
export function emptyListing():ListingForm{return {taxonomy_category_slug:'',taxonomy_subcategory_slug:'',taxonomy_listing_type_slug:'',kind:'PRODUCT',service_id:'',title:'',description:'',price:'',available:true};}
export function priceInPaise(value:string):number {
  const match=/^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if(!match)throw new Error('Enter a rupee price with at most two decimal places.');
  const paise=Number(match[1])*100+Number((match[2]??'').padEnd(2,'0'));
  if(!Number.isSafeInteger(paise)||paise<1||paise>1000000000)throw new Error('Price must be between ₹0.01 and ₹1,00,00,000.');
  return paise;
}
export function listingInput(form:ListingForm):ListingInput {
  const title=form.title.trim(),description=form.description.trim();
  if(title.length<2||title.length>150)throw new Error('Title must contain 2–150 characters.');
  if(description.length<20||description.length>6000)throw new Error('Description must contain 20–6,000 characters.');
  let service_id:number|null=null;
  if(form.kind==='SERVICE_PACKAGE'&&form.service_id){
    if(!/^[1-9]\d*$/.test(form.service_id)||!Number.isSafeInteger(Number(form.service_id)))throw new Error('Choose an approved catalogue service.');
    service_id=Number(form.service_id);
  }
  const selected=[form.taxonomy_category_slug,form.taxonomy_subcategory_slug,form.taxonomy_listing_type_slug];
  if(selected.some(Boolean)&&!selected.every(Boolean))throw new Error('Choose all three classification levels.');
  if(form.kind==='SERVICE_PACKAGE'&&service_id===null&&!selected.every(Boolean))throw new Error('Choose an approved catalogue service or a complete listing type.');
  return {taxonomy_category_slug:form.taxonomy_category_slug||null,taxonomy_subcategory_slug:form.taxonomy_subcategory_slug||null,taxonomy_listing_type_slug:form.taxonomy_listing_type_slug||null,kind:form.kind,service_id,title,description,unit_price_paise:priceInPaise(form.price),currency:'INR',available:form.available};
}
export function listingForm(row:SellerListing):ListingForm {
  return {taxonomy_category_slug:row.taxonomy_category_slug??'',taxonomy_subcategory_slug:row.taxonomy_subcategory_slug??'',taxonomy_listing_type_slug:row.taxonomy_listing_type_slug??'',kind:row.kind,service_id:row.service_id===null?'':String(row.service_id),title:row.title,description:row.description,price:(row.unit_price_paise/100).toFixed(2),available:row.available};
}
export function listingPrice(paise:number):string{return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(paise/100);}
