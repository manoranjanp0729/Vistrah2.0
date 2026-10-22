import {UiText,UiElement} from "../../components/localized-ui";
import {useState} from 'react';
import {Text} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Page,Heading,Action,Field,Loading,ErrorPanel} from '../../components/ui';
import {SellerGate} from '../../components/seller-gate';
import {useResource} from '../../lib/resource';
import {useSession} from '../../lib/session';
import {useTheme} from '../../lib/theme';
import {api} from '../../lib/api';
import {resolveMarketplaceSelection} from '../../lib/marketplace';
import {serviceJourneySteps} from '../../../../shared/seller-journey';
import {listingInput} from '../../../../shared/commerce';
import {addServiceUrl,businessInput,emptyBusiness,serviceListingForm,serviceSelection,type ServiceSelection,type SellerBusiness} from '../../../../shared/service-listing';

export default function AddService(){
  const params=useLocalSearchParams<{category?:string;subcategory?:string;type?:string}>();
  const selection=serviceSelection(params),resolved=selection&&resolveMarketplaceSelection(selection);
  if(!selection||!resolved?.listingType)return <UiElement as={Page} title="Listing type unavailable"><UiElement as={Action} label="Back to Services" onPress={()=>router.replace('/services')}/></UiElement>;
  return <UiElement as={Page} title="Add your service"><SellerGate nextPath={addServiceUrl(selection)}><ServiceForm key={JSON.stringify(selection)} selection={selection} title={resolved.listingType.title} pathLabel={[resolved.category!.title,resolved.subcategory!.title,resolved.listingType.title].join(' / ')}/></SellerGate></UiElement>;
}
function ServiceForm({selection,title,pathLabel}:{selection:ServiceSelection;title:string;pathLabel:string}){
  const {styles}=useTheme(),{user}=useSession(),businesses=useResource<SellerBusiness[]>('/seller/businesses',user?.id??null);
  const [business,setBusiness]=useState(''),[created,setCreated]=useState<SellerBusiness|null>(null),[profile,setProfile]=useState(emptyBusiness);
  const [form,setForm]=useState(()=>serviceListingForm(selection,title)),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState<{businessId:string;listingId:string}|null>(null);
  async function save(){if(busy)return;setBusy(true);setError('');try{
    const payload=listingInput(form);let id=created?String(created.id):business;
    if(id==='new'){const row=await api<SellerBusiness>('/seller/businesses',{method:'POST',body:JSON.stringify(businessInput(profile))});setCreated(row);id=String(row.id);}
    if(!id)throw new Error('Choose your business.');
    const row=await api<{id:string}>('/seller/businesses/'+id+'/commerce-listings',{method:'POST',body:JSON.stringify(payload)});
    setSaved({businessId:id,listingId:row.id});
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  if(saved)return <><UiElement as={Heading} title="Draft saved"/><Text accessibilityRole="alert" style={styles.text}><UiText value={"Your service is private. Review the saved details and select Submit for review when ready."}/></Text>{serviceJourneySteps.map((step,index)=><Text key={step} style={index===1?styles.heading:styles.muted}>{index+1}. {step}</Text>)}<UiElement as={Action} label="Review and submit draft" onPress={()=>router.replace({pathname:'/seller/commerce/[id]',params:{id:saved.businessId,focus:saved.listingId}})}/><Text style={styles.muted}><UiText value={"Business verification and an independent admin approval are required before your service can go live."}/></Text><UiElement as={Action} label="Seller dashboard" secondary onPress={()=>router.replace('/seller')}/></>;
  return <><Text style={styles.muted}>{pathLabel}</Text><Text style={styles.muted}>{serviceJourneySteps.join(' > ')}</Text><Text style={styles.muted}><UiText value={"Save a private draft, then submit it from your listings. An independent admin must approve it before customers can see it. New businesses also need verification and activation."}/></Text>{Boolean(error)&&<ErrorPanel error={error}/>}{businesses.loading?<Loading/>:businesses.error?<ErrorPanel error={businesses.error} retry={businesses.retry}/>:<>{created?<Text style={styles.text}>{created.company} <UiText value={"- awaiting business verification"}/></Text>:<><UiElement as={Heading} title="Choose your business"/>{businesses.data?.map(row=><Action key={row.id} label={(row.company||row.name)+' - '+row.verification_status} secondary={business!==String(row.id)} disabled={busy} onPress={()=>setBusiness(String(row.id))}/>)}<UiElement as={Action} label="Add a new business" secondary={business!=='new'} disabled={busy} onPress={()=>setBusiness('new')}/></>}{!created&&business==='new'&&(['name','company','phone','address','location'] as const).map(key=><UiElement as={Field} key={key} label={({name:'Contact name',company:'Business name',phone:'Business phone',address:'Business address',location:'Locality'})[key]} value={profile[key]} maxLength={key==='address'?1000:key==='phone'?20:150} editable={!busy} onChangeText={value=>setProfile(current=>({...current,[key]:value}))}/>)}<UiElement as={Field} label="Service title" value={form.title} maxLength={150} editable={!busy} onChangeText={value=>setForm(current=>({...current,title:value}))}/><UiElement as={Field} label="Description" value={form.description} multiline maxLength={6000} editable={!busy} onChangeText={value=>setForm(current=>({...current,description:value}))}/><UiElement as={Field} label="Price in rupees" value={form.price} keyboardType="decimal-pad" editable={!busy} onChangeText={value=>setForm(current=>({...current,price:value}))}/><UiElement as={Action} label={busy?'Saving...':'Save service draft'} disabled={busy||(!business&&!created)} onPress={()=>void save()}/></>}<UiElement as={Action} label="Back to listing type" secondary disabled={busy} onPress={()=>router.push({pathname:'/services',params:selection})}/><UiElement as={Action} label="Seller dashboard" secondary disabled={busy} onPress={()=>router.push('/seller')}/></>;
}
