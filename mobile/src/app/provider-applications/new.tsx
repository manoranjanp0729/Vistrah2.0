import {Redirect,useLocalSearchParams} from 'expo-router';

export default function NewApplication(){
  const params=useLocalSearchParams<{business?:string}>();
  const business=typeof params.business==='string'&&/^[1-9]\d*$/.test(params.business)?params.business:undefined;
  return <Redirect href={business?{pathname:'/seller/onboard',params:{business}}:'/seller/onboard'}/>;
}
