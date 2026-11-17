import {Redirect,useLocalSearchParams} from 'expo-router';
import {resolveMarketplaceSelection,legacyMarketplaceSelection} from '../../lib/marketplace';
import {serviceSelection} from '../../../../shared/service-listing';

export default function AddService(){
  const params=useLocalSearchParams<{category?:string;subcategory?:string;type?:string}>();
  const selection=serviceSelection(params);
  const resolved=selection&&(resolveMarketplaceSelection(selection)||(legacyMarketplaceSelection(selection)?resolveMarketplaceSelection(legacyMarketplaceSelection(selection)!):null));
  if(resolved?.category&&resolved?.subcategory){
    return <Redirect href={{pathname:'/seller/onboard',params:{category:resolved.category.slug,type:resolved.subcategory.slug}}}/>;
  }
  return <Redirect href="/seller/onboard"/>;
}
