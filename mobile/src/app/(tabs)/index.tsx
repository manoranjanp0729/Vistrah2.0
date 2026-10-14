import {Image,Pressable,Text,View} from 'react-native';
import {router} from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import {Page,Action,Heading,Loading,ErrorPanel} from '../../components/ui';
import {Art} from '../../components/art';
import {CategoryCard} from '../../components/category-card';
import {useResource} from '../../lib/resource';
import {allServices,type Category} from '../../lib/catalogue';
import {colors,styles} from '../../lib/theme';
import {useLocation} from '../../lib/location';
const shortcuts=[{title:'Jobs',q:'jobs',icon:'briefcase'},{title:'Property',q:'property',icon:'home'},{title:'Tax',q:'tax',icon:'credit-card'},{title:'Marketing',q:'marketing',icon:'volume-2'}] as const;
export default function Discover(){
  const catalogue=useResource<Category[]>('/catalogue');const {location}=useLocation();
  const marketing=catalogue.data?.find(category=>category.slug==='marketing');
  const marketingServices=marketing?allServices([marketing]):[];
  const categories=catalogue.data?catalogue.data.filter(category=>category.slug!=='marketing').sort((a,b)=>priority(a.slug)-priority(b.slug)):[];
  return <Page><Text style={styles.label}>DISCOVER. CONNECT. GROW.</Text><Text accessibilityRole="header" style={styles.title}>Discover VISTRAH</Text><Text style={[styles.text,{fontSize:23,lineHeight:34}]}>Explore services, products, and opportunities in one place.</Text><Action label="Explore services →" onPress={()=>router.push('/services')}/><Art/>
    <Action secondary label={location?location.label+' · Change location':'Choose your location'} onPress={()=>router.push('/location')}/>
    <View style={styles.divider}/><Text style={styles.label}>QUICK ACCESS</Text><View style={styles.grid}>{shortcuts.map(item=><Pressable key={item.title} accessibilityRole="button" onPress={()=>item.title==='Jobs'?router.push('/jobs'):router.push({pathname:'/services',params:{q:item.q}})} style={({pressed})=>({width:'22%',flexGrow:1,backgroundColor:colors.surface,padding:12,borderRadius:18,alignItems:'center',gap:12,opacity:pressed?.7:1})}><Feather name={item.icon} size={28} color={colors.text}/><Text style={[styles.text,{fontSize:12}]}>{item.title}</Text></Pressable>)}</View>
    <View style={styles.divider}/><Heading title="Services for you" action="View all" onPress={()=>router.push('/services')}/>
    {catalogue.loading?<Loading/>:catalogue.error?<ErrorPanel error={catalogue.error} retry={catalogue.retry}/>:categories.length?<View style={styles.grid}>{categories.map((category,index)=><CategoryCard key={category.id} category={category} index={index}/>)}</View>:<Text style={styles.muted}>The catalogue is being prepared.</Text>}
    {marketing&&<><View style={styles.divider}/><Heading title="VISTRAH Ads & Marketing" action="View all" onPress={()=>router.push({pathname:'/services',params:{category:'marketing'}})}/><Text style={styles.muted}>Explore advertising, creative and marketing services for your business.</Text>{marketingServices.length?<View style={{gap:12}}>{marketingServices.map(item=><Pressable key={item.service.id} accessibilityRole="button" onPress={()=>router.push({pathname:'/service/[id]',params:{id:item.service.id}})} style={({pressed})=>[styles.card,{opacity:pressed?.75:1}]}><Text style={styles.label}>{item.subcategory?.title??'VISTRAH Ads & Marketing'}</Text><Text style={styles.heading}>{item.service.title}</Text><Text style={styles.muted}>{item.service.description}</Text><Text style={{color:colors.accent}}>Explore service →</Text></Pressable>)}</View>:<Text style={styles.muted}>Marketing services are being prepared.</Text>}</>}
    <View style={styles.divider}/><Heading title="Featured opportunities"/><View style={styles.card}><Image source={require('../../../assets/consultation.webp')} accessibilityLabel="People discussing a plan beside a laptop" style={{height:160,width:'100%',borderRadius:18}}/><Text style={styles.label}>FEATURED</Text><Text style={styles.heading}>Grow your business</Text><Text style={styles.muted}>Connect with customers and present your services through VISTRAH.</Text><Action secondary label="Discover more →" onPress={()=>router.push('/provider')}/><Text style={styles.muted}>Business ownership and service listings require review.</Text></View>
    <Action label="I provide a service" secondary onPress={()=>router.push('/provider')}/>
  </Page>;
}
function priority(slug:string){return slug==='real-estate'?0:slug==='tax-compliance'?1:2;}
