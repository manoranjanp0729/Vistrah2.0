import {useLanguage} from '../../lib/language';
import {useState} from 'react';
import {ServiceBanner} from '../../components/service-banner';
import {Pressable,Text,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Page,Action,ErrorPanel,Heading,Loading,MemberGate} from '../../components/ui';
import {allServices,pathways,type Category,type ServiceContext,type Intent,type Provider} from '../../lib/catalogue';
import {useResource} from '../../lib/resource';
import {useSession} from '../../lib/session';
import {useLocation} from '../../lib/location';
import {api,ApiError} from '../../lib/api';
import {useTheme} from '../../lib/theme';
export default function ServiceDetail(){const {copy}=useLanguage();const {colors,styles}=useTheme();
  const {id}=useLocalSearchParams<{id:string}>();const [tab,setTab]=useState<Intent>('providers');
  const catalogue=useResource<Category[]>('/catalogue');const context=allServices(catalogue.data??[]).find(item=>String(item.service.id)===id);
  return <Page>{catalogue.loading?<Loading/>:catalogue.error?<ErrorPanel error={catalogue.error} retry={catalogue.retry}/>:!context?<Text style={styles.muted}>{copy.service.unavailable}</Text>:<>
    <ServiceBanner context={context}/><Text style={styles.label}>{context.category.title}</Text><Heading title={context.service.title}/><Text style={styles.text}>{context.service.description}</Text>{context.service.includes.map(item=><Text style={styles.muted} key={item}>✓ {item}</Text>)}
    <Action label="Get Estimate" onPress={()=>router.push({pathname:'/estimate/[id]',params:{id:context.service.id}})}/>
    <View style={styles.divider}/><Heading title={copy.service.options}/><Text style={styles.muted}>{copy.service.intro}</Text>
    <View accessibilityRole="tablist" style={{gap:10}}>{pathways.map(path=><Pressable key={path.id} accessibilityRole="tab" accessibilityState={{selected:tab===path.id}} onPress={()=>setTab(path.id)} style={{padding:16,borderRadius:15,backgroundColor:tab===path.id?colors.accent:colors.surface,minHeight:50}}><Text style={{color:tab===path.id?colors.ink:colors.text,fontWeight:'600'}}>{path.title}</Text></Pressable>)}</View>
    <MemberGate><ServiceOptions context={context} tab={tab}/></MemberGate>
  </>}</Page>;
}
function ServiceOptions({context,tab}:{context:ServiceContext;tab:Intent}){const {copy}=useLanguage();const {colors,styles}=useTheme();
  const {user}=useSession();const {location}=useLocation();const path=pathways.find(item=>item.id===tab)!;
  const providers=useResource<Provider[]>(tab==='providers'?'/services/'+context.service.id+'/providers':null,user?.id??null);
  const guide=useResource<{notes:string[]}>('/services/'+context.service.id+'/member-information',user?.id??null);
  const [nearby,setNearby]=useState<{nearby:(Provider&{distance_km:number})[];also_serves:(Provider&{distance_km:number})[];has_more_nearby:boolean;has_more_also_serves:boolean}|null>(null);
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [searched,setSearched]=useState('');
  const searchKey=JSON.stringify({id:context.service.id,location,user:user?.id});const visibleNearby=searched===searchKey?nearby:null;
  async function searchNearby(){if(!location)return;setBusy(true);setError('');try{const result=await api<NonNullable<typeof nearby>>('/services/'+context.service.id+'/nearby',{method:'POST',body:JSON.stringify({latitude:location.latitude,longitude:location.longitude,radius_km:location.radius,page:1})});setNearby(result);setSearched(searchKey);}catch(e){setError(e instanceof ApiError&&[404,405].includes(e.status)?'Nearby discovery is unavailable on this API version. The member directory remains below.':(e as Error).message);}finally{setBusy(false);}}
  return <View style={{gap:18}}><View style={styles.card}><Text style={styles.heading}>{path.title}</Text><Text style={styles.muted}>{path.copy}</Text>
    {tab==='providers'&&<>{providers.loading?<Loading/>:providers.error?<ErrorPanel error={providers.error} retry={providers.retry}/>:providers.data?.length?providers.data.map(provider=><View key={provider.id} style={{gap:8,paddingVertical:12,borderBottomWidth:1,borderBottomColor:colors.border}}><Text style={styles.text}>{provider.company||provider.name}</Text><Text style={styles.muted}>{provider.location} · {provider.verification_status}</Text>{Boolean(provider.description)&&<Text style={styles.muted}>{provider.description}</Text>}</View>):<Text style={styles.muted}>{copy.service.noProviders}</Text>}
      <Action label={location?'Search within '+location.radius+' km':'Choose location for nearby search'} disabled={busy} secondary onPress={()=>{if(location)void searchNearby();else router.push('/location');}}/>
      {Boolean(error)&&<ErrorPanel error={error}/>}
      {visibleNearby&&<><Text style={styles.label}>NEARBY · STRAIGHT-LINE DISTANCE</Text>{visibleNearby.nearby.length?visibleNearby.nearby.map(provider=><Text key={provider.id} style={styles.muted}>{provider.company||provider.name} · {provider.distance_km.toFixed(1)} km</Text>):<Text style={styles.muted}>No providers found in this radius.</Text>}{visibleNearby.also_serves.length>0&&<><Text style={styles.label}>FARTHER AWAY, ALSO SERVES YOUR LOCATION</Text>{visibleNearby.also_serves.map(provider=><Text key={provider.id} style={styles.muted}>{provider.company||provider.name} · {provider.distance_km.toFixed(1)} km</Text>)}</>}{(visibleNearby.has_more_nearby||visibleNearby.has_more_also_serves)&&<Text style={styles.muted}>Showing the first 50 results in each group.</Text>}</>}
    </>}
    <Action label={tab==='recommendations'?copy.service.review:tab==='in-house'?copy.service.delivery:copy.service.send} onPress={()=>router.push({pathname:'/request/[id]',params:{id:context.service.id,intent:tab}})}/>
  </View><Heading title={copy.service.guide}/>{guide.loading?<Loading/>:guide.error?<ErrorPanel error={guide.error} retry={guide.retry}/>:guide.data?.notes.length?guide.data.notes.map(note=><Text key={note} style={styles.muted}>✓ {note}</Text>):<Text style={styles.muted}>{copy.service.noGuide}</Text>}</View>;
}

