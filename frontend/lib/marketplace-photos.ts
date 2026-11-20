import {resolveCatalogueAsset} from '../../shared/catalogue-images';
type Asset={src:string;alt:string};
export function marketplacePhoto(id:string,parentCategorySlug?:string):Asset|null {
  return resolveCatalogueAsset(id,parentCategorySlug);
}
