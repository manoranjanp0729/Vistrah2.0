import manifest from '../../shared/marketplace-imagery.json';
type Asset={src:string;alt:string};
const items:Record<string,{photo:string|null}>=manifest.items;
const assets:Record<string,Asset>=manifest.assets;
export function marketplacePhoto(id:string):Asset|null {
  const item=items[id];
  if(item?.photo===null)return null;
  const photo=item&&assets[item.photo];
  if(!photo)throw new Error(`Missing curated marketplace photo: ${id}`);
  return photo;
}
