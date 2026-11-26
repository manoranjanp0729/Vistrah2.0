import {photoCropSources} from './photo-crop-sources';
export type PhotoCrop='wide'|'landscape'|'card'|'square'|'banner';
// Map keys preserve Metro's asset identity on both native and browser builds.
export function croppedPhoto<T>(source:T,profile:PhotoCrop):T|number{
  return photoCropSources.get(source)?.[profile]??source;
}
