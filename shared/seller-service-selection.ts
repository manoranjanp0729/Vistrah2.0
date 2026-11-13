type Service={id:number;active?:boolean};
type Category={id:number;active?:boolean;services:Service[];subcategories:{id:number;active?:boolean;services:Service[]}[]};
export function sellerServiceSelection(categories:Category[],categoryId?:number,serviceId?:number){
  const category=categories.find(item=>item.id===categoryId&&item.active!==false);
  if(!category||!serviceId)return null;
  if(category.services.some(item=>item.id===serviceId&&item.active!==false))return {categoryId:category.id,subcategoryId:null,serviceId};
  const subcategory=category.subcategories.find(sub=>sub.active!==false&&sub.services.some(item=>item.id===serviceId&&item.active!==false));
  return subcategory?{categoryId:category.id,subcategoryId:subcategory.id,serviceId}:null;
}
