export type ListingType={slug:string;title:string};
export type MarketplaceSubcategory={slug:string;title:string;listing_types:ListingType[];description?:string;keywords?:string[];regulated?:string};
export type MarketplaceCategory={slug:string;title:string;description?:string;subcategories:MarketplaceSubcategory[]};
export type MarketplaceSelection={category?:string;subcategory?:string;type?:string;q?:string};
export type MarketplaceLegacyMap={categories:Record<string,string>;subcategories:Record<string,[string,string]|string[]>};
export const marketplaceItemId=(category:string,subcategory?:string,type?:string)=>type?`type/${category}/${subcategory}/${type}`:subcategory?`subcategory/${category}/${subcategory}`:`category/${category}`;
export function marketplaceUrl(selection:MarketplaceSelection={}) {
  const params=new URLSearchParams();
  for(const key of ['category','subcategory','type','q'] as const)if(selection[key])params.set(key,selection[key]!);
  return `/services${params.size?'?'+params.toString():''}`;
}
export const marketplaceCategoryUrl=(slug:string)=>marketplaceUrl({category:slug});
/** A business type has a single implicit listing type, so customers never need a third navigation level. */
export const isSingleTypeSubcategory=(subcategory:MarketplaceSubcategory)=>subcategory.listing_types.length===1&&subcategory.listing_types[0].slug===subcategory.slug;
export function createMarketplace(taxonomy:{categories:MarketplaceCategory[]},legacy?:MarketplaceLegacyMap) {
  const marketplaceCategories=taxonomy.categories;
  const taxonomyCounts={categories:marketplaceCategories.length,subcategories:marketplaceCategories.flatMap(c=>c.subcategories).length,listingTypes:marketplaceCategories.flatMap(c=>c.subcategories.flatMap(s=>s.listing_types)).length};
  function resolveMarketplaceSelection(selection:MarketplaceSelection) {
    const category=selection.category?marketplaceCategories.find(c=>c.slug===selection.category):undefined;
    const subcategory=selection.subcategory?category?.subcategories.find(s=>s.slug===selection.subcategory):undefined;
    let listingType=selection.type?subcategory?.listing_types.find(t=>t.slug===selection.type):undefined;
    if((selection.category&&!category)||(selection.subcategory&&!subcategory)||(selection.type&&!listingType))return null;
    if(subcategory&&!listingType&&isSingleTypeSubcategory(subcategory))listingType=subcategory.listing_types[0];
    return {category,subcategory,listingType};
  }
  /** Maps bookmarks and older links (v1 14/126/749 taxonomy) onto the current business types. */
  function legacyMarketplaceSelection(selection:MarketplaceSelection):MarketplaceSelection|null {
    if(!legacy||resolveMarketplaceSelection(selection))return null;
    const mapped=selection.subcategory?legacy.subcategories[selection.subcategory]:undefined;
    if(mapped&&mapped.length===2)return {category:mapped[0],subcategory:mapped[1],...(selection.q?{q:selection.q}:{})};
    const category=selection.category?legacy.categories[selection.category]:undefined;
    if(category&&marketplaceCategories.some(c=>c.slug===category))return {category,...(selection.q?{q:selection.q}:{})};
    return null;
  }
  const haystack=(sub:MarketplaceSubcategory)=>[sub.title,...(sub.keywords??[]),...sub.listing_types.map(type=>type.title)];
  function searchMarketplace(query='') {
    const needle=query.trim().toLocaleLowerCase();
    return marketplaceCategories.filter(category=>[category.title,...category.subcategories.flatMap(haystack)].some(title=>title.toLocaleLowerCase().includes(needle)));
  }
  function searchMarketplaceEntries(query:string) {
    const needle=query.trim().toLocaleLowerCase();if(!needle)return [];
    return marketplaceCategories.flatMap(category=>[
      ...(category.title.toLocaleLowerCase().includes(needle)?[{id:marketplaceItemId(category.slug),title:category.title,path:category.title,href:marketplaceCategoryUrl(category.slug),selection:{category:category.slug},level:'Category'}]:[]),
      ...category.subcategories.flatMap(sub=>[
        ...(haystack(sub).some(word=>word.toLocaleLowerCase().includes(needle))?[{id:marketplaceItemId(category.slug,sub.slug),title:sub.title,path:category.title,href:marketplaceUrl({category:category.slug,subcategory:sub.slug}),selection:{category:category.slug,subcategory:sub.slug,...(isSingleTypeSubcategory(sub)?{type:sub.slug}:{})},level:'Business type'}]:[]),
        ...sub.listing_types.filter(type=>type.slug!==sub.slug&&type.title.toLocaleLowerCase().includes(needle)).map(type=>({id:marketplaceItemId(category.slug,sub.slug,type.slug),title:type.title,path:`${category.title} / ${sub.title}`,href:marketplaceUrl({category:category.slug,subcategory:sub.slug,type:type.slug}),selection:{category:category.slug,subcategory:sub.slug,type:type.slug},level:'Listing type'})),
      ]),
    ]);
  }
  return {marketplaceCategories,taxonomyCounts,resolveMarketplaceSelection,legacyMarketplaceSelection,searchMarketplace,searchMarketplaceEntries};
}
