import {resolveCatalogueAsset,resolveCataloguePhotoKey} from '../../../shared/catalogue-images';
import {marketplacePhotos} from './marketplace-photos';
export function nativeMarketplacePhoto(id:string,parentCategorySlug?:string):number|undefined {
  const key=resolveCataloguePhotoKey(id,parentCategorySlug);
  if(!key)return undefined;
  const source=marketplacePhotos[key];
  if(!source)throw new Error(`Missing bundled marketplace photo: ${id}`);
  return source;
}

export function nativeMarketplaceAlt(id:string,parentCategorySlug?:string):string|undefined {
  return resolveCatalogueAsset(id,parentCategorySlug)?.alt;
}
