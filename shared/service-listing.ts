import type {ListingForm} from './commerce';
import type {MarketplaceSelection} from './marketplace';

export type ServiceSelection={category:string;subcategory:string;type:string};
export function serviceSelection(params:MarketplaceSelection):ServiceSelection|null{
  const {category,subcategory,type}=params;
  return [category,subcategory,type].every(value=>typeof value==='string'&&value.length<=100&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))?{category:category!,subcategory:subcategory!,type:type!}:null;
}
export function addServiceUrl(selection:ServiceSelection){return '/seller/add-service?'+new URLSearchParams(selection).toString();}
export function serviceListingForm(selection:ServiceSelection,title:string):ListingForm{
  return {kind:'SERVICE_PACKAGE',service_id:'',title,description:'',price:'',available:true,
    taxonomy_category_slug:selection.category,taxonomy_subcategory_slug:selection.subcategory,taxonomy_listing_type_slug:selection.type};
}
export type SellerBusiness={id:number;name:string;company:string;verification_status:string;active:boolean};
export const emptyBusiness=()=>({name:'',company:'',phone:'',address:'',location:''});
export type BusinessForm=ReturnType<typeof emptyBusiness>;
export function businessInput(form:BusinessForm){
  const value=Object.fromEntries(Object.entries(form).map(([key,text])=>[key,text.trim()])) as BusinessForm;
  if(value.name.length<2||value.company.length<2||value.location.length<2||value.address.length<5)throw new Error('Complete the contact name, business name, address and locality.');
  if(!/^\+?[\d\s()-]+$/.test(value.phone)||value.phone.replace(/\D/g,'').length<7||value.phone.replace(/\D/g,'').length>15)throw new Error('Enter a valid business phone number.');
  return value;
}
