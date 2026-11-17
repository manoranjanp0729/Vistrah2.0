import {Platform} from 'react-native';

export const googleMapsAndroidKey=(process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY??'').trim();
export const googleMapsWebKey=(process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY??'').trim();

export const googleMapsEnabled=Platform.OS==='web'
  ? Boolean(googleMapsWebKey)
  : Platform.OS==='android'
    ? (Boolean(googleMapsAndroidKey)||process.env.EXPO_PUBLIC_GOOGLE_MAPS_ENABLED==='1')
    : Boolean(googleMapsAndroidKey);

export function googleMapsDirectionsUrl(latitude:number,longitude:number,label?:string):string{
  const params=new URLSearchParams({api:'1',destination:`${latitude},${longitude}`});
  if(label?.trim())params.set('destination_place_id','');
  if(!params.get('destination_place_id'))params.delete('destination_place_id');
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
