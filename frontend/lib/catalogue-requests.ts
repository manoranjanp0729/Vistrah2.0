export type CatalogueRequestKind='CATEGORY'|'SUBCATEGORY'|'SERVICE';

export type CatalogueRequest={
  id:string;
  user_id:number;
  kind:CatalogueRequestKind;
  category_id:number|null;
  category_title:string|null;
  subcategory_id:number|null;
  subcategory_title:string|null;
  title:string;
  description:string;
  status:'PENDING'|'APPROVED'|'REJECTED';
  review_note:string;
  reviewer_id:number|null;
  catalogue_id:number|null;
  created_at:string;
  reviewed_at:string|null;
};

export function catalogueKindLabel(kind:CatalogueRequestKind){
  return kind==='CATEGORY'?'Category':kind==='SUBCATEGORY'?'Subcategory':'Service';
}
