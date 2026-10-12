import {useState} from 'react';
import {Text,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Page,Heading,Action,Loading,ErrorPanel} from '../../components/ui';
import {SellerGate} from '../../components/seller-gate';
import {ToggleChoice} from '../../components/requirement-form';
import {useResource} from '../../lib/resource';
import {allServices,type Category} from '../../lib/catalogue';
import {api} from '../../lib/api';
import {useTheme} from '../../lib/theme';
export default function NewApplication(){const params=useLocalSearchParams<{business?:string}>();return <Page><Heading title="New business / service application"/><SellerGate><NewApplicationForm business={params.business}/></SellerGate></Page>;}
function NewApplicationForm({business}:{business?:string}){const {styles}=useTheme();const catalogue=useResource<Category[]>('/catalogue');const [category,setCategory]=useState<number|null>(null),[selected,setSelected]=useState<number[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const current=catalogue.data?.find(item=>item.id===category);const services=current?allServices([current]):[];
  async function create(){if(!current||!selected.length){setError('Choose a category and at least one service.');return;}setBusy(true);setError('');try{const result=await api<{id:string}>('/provider-applications',{method:'POST',body:JSON.stringify({category_id:current.id,service_ids:selected,...(business?{provider_id:Number(business)}:{})})});router.replace({pathname:'/provider-applications/[id]',params:{id:result.id}});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <><Text style={styles.muted}>{business?'Add services to your owned business.':'Start with a category and services. You can complete business details and evidence in the next step.'}</Text>{Boolean(error)&&<ErrorPanel error={error}/>}{catalogue.loading?<Loading/>:catalogue.error?<ErrorPanel error={catalogue.error} retry={catalogue.retry}/>:<><Heading title="Choose category"/>{catalogue.data?.map(item=><ToggleChoice key={item.id} label={item.title} selected={category===item.id} disabled={busy} onPress={()=>{setCategory(item.id);setSelected([]);setError('');}}/>)}{current&&<><Heading title="Select services (up to 15)"/>{services.map(({service})=><ToggleChoice key={service.id} label={service.title} selected={selected.includes(service.id)} disabled={busy||(!selected.includes(service.id)&&selected.length>=15)} onPress={()=>setSelected(value=>value.includes(service.id)?value.filter(id=>id!==service.id):[...value,service.id])}/>)}</>}<View><Action label={busy?'Creating draft…':'Continue to details form'} disabled={busy||!selected.length} onPress={()=>void create()}/></View></>}</>;
}
