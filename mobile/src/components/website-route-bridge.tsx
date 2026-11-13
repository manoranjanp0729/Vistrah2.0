import {useEffect} from 'react';
import {router,usePathname,useRootNavigationState,type Href} from 'expo-router';
import {usesBrowserCookies} from '../lib/api';
import {useResource} from '../lib/resource';
import type {Category} from '../lib/catalogue';
import {needsWebsiteCatalogue,websiteRoute} from '../lib/website-routes';

export function WebsiteRouteBridge(){
  const pathname=usePathname();const state=useRootNavigationState();
  const catalogue=useResource<Category[]>(usesBrowserCookies&&needsWebsiteCatalogue(pathname)?'/catalogue':null);
  useEffect(()=>{
    if(!usesBrowserCookies||!state?.key)return;
    const destination=websiteRoute(pathname,window.location.search,catalogue.data??[]);
    if(destination)router.replace(destination as Href);
  },[pathname,state?.key,catalogue.data]);
  return null;
}
