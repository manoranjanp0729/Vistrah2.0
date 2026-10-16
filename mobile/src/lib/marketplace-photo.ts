import manifest from '../../../shared/marketplace-imagery.json';
import {marketplacePhotos} from './marketplace-photos';
const items:Record<string,{photo:string|null}>=manifest.items;
export function nativeMarketplacePhoto(id:string):number|undefined {
  const key=items[id]?.photo;
  if(key===null)return undefined;
  const source=key&&marketplacePhotos[key];
  if(!source)throw new Error(`Missing bundled marketplace photo: ${id}`);
  return source;
}

export function nativeMarketplaceAlt(id:string):string|undefined {
 const key=items[id]?.photo;
 return key?(manifest.assets as Record<string,{alt:string}>)[key]?.alt:undefined;
}
