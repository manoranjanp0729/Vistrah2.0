import assets from './photo-assets.json';
import registry from './image-registry.json';
import type {Category,ServiceContext,Subcategory} from './types';

export type PhotoKey=keyof typeof assets;
export type PhotoVariant='hero'|'card'|'editorial'|'compact'|'thumbnail';
export const photos=assets;
export const imageVariants={
  hero:{ratio:'16 / 9',sizes:'(max-width: 900px) calc(100vw - 40px), (max-width: 1100px) 45vw, 560px'},
  card:{ratio:'4 / 3',sizes:'(max-width: 600px) calc((100vw - 62px) / 2), (max-width: 900px) calc((100vw - 62px) / 2), (max-width: 1100px) calc((100vw - 130px) / 4), 294px'},
  editorial:{ratio:'3 / 2',sizes:'(max-width: 768px) calc(100vw - 40px), (max-width: 1100px) 42vw, 540px'},
  compact:{ratio:'3 / 2',sizes:'(max-width: 600px) 112px, 156px'},
  thumbnail:{ratio:'1 / 1',sizes:'80px'},
} as const;

export type ImageEntry={
  id:string;kind:string;page:string;subject:string;photo:PhotoKey|null;
  alt:string;aspectRatio:string;position:string;surfaces:string[];missingReason?:string;
};
export const imageRegistry:Readonly<Record<string,ImageEntry>>=registry as Record<string,ImageEntry>;

/** Presentation only. Composite catalogue slugs are stable across database IDs and title edits.
 * Legacy API image paths must not override a curated subject or become a generic fallback.
 * Provenance, local src and fit are inherited from the referenced photo asset.
 */
export function imageFor(id:string,subject=id):ImageEntry {
  return Object.hasOwn(imageRegistry,id)?imageRegistry[id]:{
    id,kind:'missing',page:'',subject,photo:null,alt:`${subject}: photograph not available`,
    aspectRatio:'3 / 2',position:'50% 50%',surfaces:[],
    missingReason:'This stable identifier has no curated image registry entry.',
  };
}
export function categoryPhoto(category:Pick<Category,'slug'|'image'>):ImageEntry {
  return imageFor(`category/${category.slug}`);
}
export function subcategoryPhoto(category:Pick<Category,'slug'>,subcategory:Pick<Subcategory,'slug'>):ImageEntry {
  return imageFor(`subcategory/${category.slug}/${subcategory.slug}`);
}
export function servicePhoto(context:ServiceContext):ImageEntry {
  return imageFor(`service/${context.category.slug}/${context.subcategory?context.subcategory.slug+'/':''}${context.service.slug}`,context.service.title);
}
export function pagePhoto(page:string):ImageEntry {return imageFor(`page/${page}`);}
export function accountPhoto(section:string):ImageEntry {return imageFor(`account/${section||'overview'}`);}
export function adminPhoto(section:string):ImageEntry {return imageFor(`admin/${section||'overview'}`);}
