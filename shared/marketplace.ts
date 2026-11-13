export type ListingType={slug:string;title:string};
export type MarketplaceSubcategory={slug:string;title:string;listing_types:ListingType[]};
export type MarketplaceCategory={slug:string;title:string;subcategories:MarketplaceSubcategory[]};
export type MarketplaceSelection={category?:string;subcategory?:string;type?:string;q?:string};
export const marketplaceItemId=(category:string,subcategory?:string,type?:string)=>type?`type/${category}/${subcategory}/${type}`:subcategory?`subcategory/${category}/${subcategory}`:`category/${category}`;
export function marketplaceUrl(selection:MarketplaceSelection={}) {
  const params=new URLSearchParams();
  for(const key of ['category','subcategory','type','q'] as const)if(selection[key])params.set(key,selection[key]!);
  return `/services${params.size?'?'+params.toString():''}`;
}
export const marketplaceCategoryUrl=(slug:string)=>marketplaceUrl({category:slug});
export function createMarketplace(taxonomy:{categories:MarketplaceCategory[]}) {
  const marketplaceCategories=taxonomy.categories;
  const taxonomyCounts={categories:marketplaceCategories.length,subcategories:marketplaceCategories.flatMap(c=>c.subcategories).length,listingTypes:marketplaceCategories.flatMap(c=>c.subcategories.flatMap(s=>s.listing_types)).length};
  function resolveMarketplaceSelection(selection:MarketplaceSelection) {
    const category=selection.category?marketplaceCategories.find(c=>c.slug===selection.category):undefined;
    const subcategory=selection.subcategory?category?.subcategories.find(s=>s.slug===selection.subcategory):undefined;
    const listingType=selection.type?subcategory?.listing_types.find(t=>t.slug===selection.type):undefined;
    if((selection.category&&!category)||(selection.subcategory&&!subcategory)||(selection.type&&!listingType))return null;
    return {category,subcategory,listingType};
  }
  function searchMarketplace(query='') {
    const needle=query.trim().toLocaleLowerCase();
    return marketplaceCategories.filter(category=>[category.title,...category.subcategories.flatMap(sub=>[sub.title,...sub.listing_types.map(type=>type.title)])].some(title=>title.toLocaleLowerCase().includes(needle)));
  }
  function searchMarketplaceEntries(query:string) {
    const needle=query.trim().toLocaleLowerCase();if(!needle)return [];
    return marketplaceCategories.flatMap(category=>[
      ...(category.title.toLocaleLowerCase().includes(needle)?[{id:marketplaceItemId(category.slug),title:category.title,path:category.title,href:marketplaceCategoryUrl(category.slug),selection:{category:category.slug},level:'Category'}]:[]),
      ...category.subcategories.flatMap(sub=>[
        ...(sub.title.toLocaleLowerCase().includes(needle)?[{id:marketplaceItemId(category.slug,sub.slug),title:sub.title,path:category.title,href:marketplaceUrl({category:category.slug,subcategory:sub.slug}),selection:{category:category.slug,subcategory:sub.slug},level:'Subcategory'}]:[]),
        ...sub.listing_types.filter(type=>type.title.toLocaleLowerCase().includes(needle)).map(type=>({id:marketplaceItemId(category.slug,sub.slug,type.slug),title:type.title,path:`${category.title} / ${sub.title}`,href:marketplaceUrl({category:category.slug,subcategory:sub.slug,type:type.slug}),selection:{category:category.slug,subcategory:sub.slug,type:type.slug},level:'Listing type'})),
      ]),
    ]);
  }
  return {marketplaceCategories,taxonomyCounts,resolveMarketplaceSelection,searchMarketplace,searchMarketplaceEntries};
}
