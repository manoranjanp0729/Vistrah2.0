import {UiText,UiElement} from "../../components/localized-ui";
import {useState} from 'react';
import {sellerServiceSelection} from '../../../../shared/seller-service-selection';
import {Text,View} from 'react-native';
import {Redirect,router,useLocalSearchParams} from 'expo-router';
import {Page,Heading,Action,Loading,ErrorPanel} from '../../components/ui';
import {SellerGate} from '../../components/seller-gate';
import {CatalogueChoice} from '../../components/catalogue-choice';
import {useResource} from '../../lib/resource';
import {type Category} from '../../lib/catalogue';
import {api} from '../../lib/api';
import {useTheme} from '../../lib/theme';
export default function NewApplication(){
  const params=useLocalSearchParams<{business?:string;category?:string;service?:string}>();
  const positive=(value:unknown)=>typeof value==='string'&&/^[1-9]\d*$/.test(value)&&Number.isSafeInteger(Number(value))?Number(value):undefined;
  const business=positive(params.business),category=positive(params.category),service=positive(params.service);
  if(!business&&!category&&!service)return <Redirect href="/services"/>;
  return <UiElement as={Page} title="Add services"><SellerGate><NewApplicationForm key={(category??'new')+':'+(service??'')} business={business?String(business):undefined} initialService={service} initialCategory={category}/></SellerGate></UiElement>;
}
function NewApplicationForm({business,initialCategory,initialService}:{business?:string;initialCategory?:number;initialService?:number}){const {styles}=useTheme();const catalogue=useResource<Category[]>('/catalogue');const [category,setCategory]=useState<number|null>(initialCategory??null),[subcategory,setSubcategory]=useState<number|null|undefined>(initialService?undefined:null),[selected,setSelected]=useState<number[]>(initialService?[initialService]:[]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const current=catalogue.data?.find(item=>item.id===category);
  const initial=sellerServiceSelection(catalogue.data??[],initialCategory,initialService);
  const shownSubcategory=subcategory===undefined?initial?.subcategoryId??null:subcategory;
  const all=current?[...current.services,...current.subcategories.filter(sub=>sub.active).flatMap(sub=>sub.services)].filter(service=>service.active):[];
  const selectedIds=selected.filter(id=>all.some(service=>service.id===id));
  const services=current?(shownSubcategory===null?current.services:current.subcategories.find(item=>item.id===shownSubcategory)?.services??[]):[];
  async function create(){if(!current||!selectedIds.length){setError('Choose a category and at least one service.');return;}setBusy(true);setError('');try{const result=await api<{id:string}>('/provider-applications',{method:'POST',body:JSON.stringify({category_id:current.id,service_ids:selectedIds,...(business?{provider_id:Number(business)}:{})})});router.replace({pathname:'/provider-applications/[id]',params:{id:result.id}});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <><Text style={styles.muted}><UiText value={business?'Add services to your owned business.':'Start with a category and services. You can complete business details and evidence in the next step.'}/></Text>{Boolean(error)&&<ErrorPanel error={error}/>}{catalogue.loading?<Loading/>:catalogue.error?<ErrorPanel error={catalogue.error} retry={catalogue.retry}/>:<><UiElement as={Heading} title="Choose category"/>{catalogue.data?.map(item=><CatalogueChoice key={item.id} label={item.title} selected={category===item.id} disabled={busy} onPress={()=>{setCategory(item.id);setSubcategory(null);setSelected([]);setError('');}}/>)}{current&&<>{current.subcategories.length>0&&<><UiElement as={Heading} title="Choose subcategory"/><UiElement as={CatalogueChoice} label="Direct category services" selected={shownSubcategory===null} disabled={busy} onPress={()=>setSubcategory(null)}/>{current.subcategories.map(item=><CatalogueChoice key={item.id} label={item.title} selected={shownSubcategory===item.id} disabled={busy} onPress={()=>setSubcategory(item.id)}/>)}</>}<UiElement as={Heading} title="Add services (up to 15)"/>{services.map(service=><CatalogueChoice multiple key={service.id} label={service.title} selected={selectedIds.includes(service.id)} disabled={busy||(!selectedIds.includes(service.id)&&selectedIds.length>=15)} onPress={()=>setSelected(value=>value.includes(service.id)?value.filter(id=>id!==service.id):[...value,service.id])}/>) }{!services.length&&<Text style={styles.muted}><UiText value={"No direct services in this section. Choose a subcategory to see its services."}/></Text>}</>}<Text style={styles.muted}>{selectedIds.length} <UiText value={"services selected. Tap + to add and the minus symbol to remove. Nothing is published before review."}/></Text><View><UiElement as={Action} label={busy?'Creating draft…':'Continue to details form'} disabled={busy||!selectedIds.length} onPress={()=>void create()}/></View></>}</>;
}
