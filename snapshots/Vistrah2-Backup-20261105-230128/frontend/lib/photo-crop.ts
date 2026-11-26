import sources from './photo-crop-sources.json';
export function croppedPhoto(src:string,profile:'card'|'landscape'|'wide'|'square'|'banner'):string{
  return (sources as Record<string,Partial<Record<string,string>>>)[src]?.[profile]??src;
}
