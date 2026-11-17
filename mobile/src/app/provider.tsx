import {Redirect,useLocalSearchParams} from 'expo-router';

export default function ProviderScreen(){
  const params=useLocalSearchParams<{category?:string;type?:string;subcategory?:string;business?:string}>();
  const category=typeof params.category==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.category)?params.category:undefined;
  const type=typeof params.type==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.type)?params.type:typeof params.subcategory==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.subcategory)?params.subcategory:undefined;
  const business=typeof params.business==='string'&&/^[1-9]\d*$/.test(params.business)?params.business:undefined;
  if(category||type||business)return <Redirect href={{pathname:'/seller/onboard',params:{category,type,business}}}/>;
  return <Redirect href="/seller/onboard"/>;
}
