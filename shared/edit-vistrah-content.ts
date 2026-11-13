import type {PageSection} from './edit-vistrah';
export function sectionCopy(section:PageSection,locale:'en'|'kn'|'hi'){
 const english=section.content?.en,translated=section.content?.[locale];
 return {title:translated?.title||english?.title||section.name,description:translated?.description||english?.description||'',action:translated?.action||english?.action||''};
}
export function contentHref(value:string|undefined){
 if(value?.startsWith('mailto:info@vistrah.in')&&/^mailto:info@vistrah\.in(?:\?[^#\r\n]*)?$/.test(value))return value;
 return value?.startsWith('/')&&!value.startsWith('//')&&!/[\\\r\n]/.test(value)&&!value.includes('..')?value:undefined;
}
export function contentImage(value:string){
 return (/^\/(?!\/)/.test(value)&&!value.includes('..')&&!value.includes('\\'))||/^https:\/\/[^/]+\//.test(value)||/^data:image\/(png|jpeg|webp|gif);base64,/.test(value)?value:undefined;
}
export function featureEnabled(section:PageSection,key:string){return section.features?.find(item=>item.key===key)?.enabled??true;}
export const contentLayouts = [
 {key:'content_grid',name:'Image grid'},
 {key:'content_rail',name:'Horizontal image rail'},
 {key:'content_spotlight',name:'Spotlight border'},
 {key:'content_ribbon',name:'Compact banner'},
] as const;
export function sectionLayout(section:PageSection){
 const key=section.variation;
 if(key==='content_rail'||key.includes('carousel')||key.includes('horizontal'))return 'rail';
 if(key==='content_spotlight'||key==='spotlight_callout')return 'spotlight';
 if(key==='content_ribbon'||key==='countdown_ribbon')return 'ribbon';
 return 'grid';
}
export function pageUsesEditorialContent(path:string){return ['/services','/v-ads','/v-essentials'].includes(path);}
export function contentPageSlug(path:string){
 const routes:Record<string,string>={'/':'home','/services':'services','/v-ads':'v-ads','/v-essentials':'v-essentials','/marketing-solutions':'marketing-solutions'};
 if(routes[path])return routes[path];
 const match=path.match(/^\/(?:pages|marketing-services)\/([a-z0-9-]+)$/);
 return match?.[1]??null;
}
