export type CatalogueSelection={category_id:number;subcategory_id:number|null;service_ids:number[]};

export function addCatalogueService(
  selections:CatalogueSelection[],
  categoryId:number,
  subcategoryId:number|null,
  serviceId:number,
):CatalogueSelection[]{
  const existing=selections.find(group=>group.category_id===categoryId&&group.subcategory_id===subcategoryId);
  if(existing){
    if(existing.service_ids.includes(serviceId))return selections;
    return selections.map(group=>group===existing?{...group,service_ids:[...group.service_ids,serviceId]}:group);
  }
  return [...selections,{category_id:categoryId,subcategory_id:subcategoryId,service_ids:[serviceId]}];
}

export function removeCatalogueService(
  selections:CatalogueSelection[],
  categoryId:number,
  subcategoryId:number|null,
  serviceId:number,
):CatalogueSelection[]{
  return selections.flatMap(group=>{
    if(group.category_id!==categoryId||group.subcategory_id!==subcategoryId)return [group];
    const service_ids=group.service_ids.filter(id=>id!==serviceId);
    return service_ids.length?[{...group,service_ids}]:[];
  });
}
