import {api,usesBrowserCookies,validateBase} from './api';
import {mediaUrl,vAdsClient,type Reel} from '../../../shared/v-ads';
export const vAds=vAdsClient(api);
export type PlayableReel=Reel & {url:string;account:string};
export function playableReel(reel:Reel):PlayableReel {
  return {...reel,account:reel.advertiser.name,url:mediaUrl(reel.video_url,
    usesBrowserCookies?'/api':validateBase(process.env.EXPO_PUBLIC_API_URL??'',__DEV__),
    process.env.EXPO_PUBLIC_V_ADS_VIDEO_BASE_URL||process.env.EXPO_PUBLIC_WEB_URL||'')};
}
export function publicVideoLink(path:string) {
  const base=process.env.EXPO_PUBLIC_WEB_URL;
  if(base)return validateBase(base,__DEV__)+path;
  if(typeof window!=='undefined')return window.location.origin+path;
  throw new Error('Sharing is unavailable until the public website address is configured.');
}
