import {DiscoveryGuide} from '../../components/discovery-guide';
import {PublishedHomepage,type Homepage} from '../../components/published-homepage';
import copy from '../../lib/interface-copy';
import {useState} from 'react';
import {Image,Pressable,ScrollView,Text,View} from 'react-native';
import {router} from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import {Page,Action,Heading,Loading,ErrorPanel} from '../../components/ui';
import {ServiceCarousel} from '../../components/service-carousel';
import {CategoryCard} from '../../components/category-card';
import {useResource} from '../../lib/resource';
import {allServices,type Category} from '../../lib/catalogue';
import {useTheme} from '../../lib/theme';
export default function Discover(){const {colors,styles}=useTheme();
  const [quickWidth,setQuickWidth]=useState(0);
  const quickCardWidth=quickWidth>0?(quickWidth-36)/3.5:96;
  const catalogue=useResource<Category[]>('/catalogue');
  const homepage=useResource<Homepage>('/homepage');
  const marketing=catalogue.data?.find(category=>category.slug==='marketing');
  const marketingServices=marketing?allServices([marketing]).filter(item=>item.service.active&&(!item.subcategory||item.subcategory.active)):[];
  const categories=catalogue.data?catalogue.data.filter(category=>category.slug!=='marketing').sort((a,b)=>priority(a.slug)-priority(b.slug)):[];
  const marketingSection=marketing?<View style={{gap:12}}><Pressable accessibilityRole="button" accessibilityLabel="View all VISTRAH Ads and Marketing services" onPress={()=>router.push({pathname:'/category/[slug]',params:{slug:'marketing'}})} style={({pressed})=>({flexDirection:'row',alignItems:'center',gap:12,padding:14,borderRadius:14,backgroundColor:'#FFF0E5',borderLeftWidth:5,borderLeftColor:'#F97316',opacity:pressed?.8:1})}><Feather name="volume-2" size={24} color="#B94B09"/><View style={{flex:1}}><Text style={{fontSize:17,fontWeight:'700',color:'#72350F'}}>VISTRAH Ads & Marketing</Text><Text style={{fontSize:12,color:'#72350F'}}>Creative and advertising services for your business</Text></View><Feather name="arrow-right" size={20} color="#B94B09"/></Pressable>{marketingServices.length?<ScrollView horizontal showsHorizontalScrollIndicator accessibilityLabel="VISTRAH Ads and Marketing services; scroll horizontally" contentContainerStyle={{gap:12,paddingVertical:4}}>{marketingServices.map(item=><Pressable key={item.service.id} accessibilityRole="button" accessibilityLabel={item.service.title} onPress={()=>router.push({pathname:'/service/[id]',params:{id:item.service.id}})} style={({pressed})=>[styles.card,{width:220,padding:12,opacity:pressed?.75:1}]}><Image source={require('../../../assets/marketing.webp')} resizeMode="cover" accessibilityLabel="Marketing service" style={{width:'100%',height:105,borderRadius:12}}/><Text numberOfLines={2} style={styles.heading}>{item.service.title}</Text><Text numberOfLines={2} style={styles.muted}>{item.service.description}</Text><Text style={{color:colors.accent}}>Explore service â†’</Text></Pressable>)}</ScrollView>:<Text style={styles.muted}>Marketing services are being prepared.</Text>}</View>:null;
  const shortcuts=allServices(catalogue.data??[]).filter(item=>item.service.active&&item.category.slug!=='marketing').sort((a,b)=>Number(b.service.slug==='digital-marketing')-Number(a.service.slug==='digital-marketing')||Number(b.service.popular)-Number(a.service.popular)).slice(0,10).map(({category,service})=>({key:String(service.id),title:service.title,icon:service.slug==='digital-marketing'?'volume-2' as const:category.slug==='real-estate'?'home' as const:category.slug==='tax-compliance'?'credit-card' as const:'briefcase' as const,open:()=>router.push({pathname:'/service/[id]',params:{id:service.id}})}));
  if(homepage.data?.version&&homepage.data.layout.schema_version===1&&homepage.data.layout.sections.length&&catalogue.data)return <Page><Text style={styles.label}>{copy.home.tagline}</Text><Text accessibilityRole="header" style={styles.title}>{copy.home.title}</Text><Text style={styles.muted}>{copy.home.description}</Text><ServiceCarousel/><PublishedHomepage homepage={homepage.data} categories={catalogue.data}/>{marketingSection}<DiscoveryGuide/><Action label={copy.home.provider} onPress={()=>router.push('/provider')}/></Page>;
  return <Page><Text style={styles.label}>{copy.home.tagline}</Text><Text accessibilityRole="header" style={styles.title}>{copy.home.title}</Text><Text style={styles.muted}>{copy.home.description}</Text>{catalogue.loading?<Loading/>:catalogue.error?<ErrorPanel error={catalogue.error} retry={catalogue.retry}/>:<ServiceCarousel/>}
    <Text style={styles.label}>{copy.home.quick}</Text><ScrollView horizontal onLayout={event=>setQuickWidth(event.nativeEvent.layout.width)} showsHorizontalScrollIndicator accessibilityLabel="Quick access services; scroll horizontally for more" contentContainerStyle={{gap:12,paddingVertical:4}}>{shortcuts.map(item=><Pressable key={item.key} accessibilityRole="button" accessibilityLabel={item.title} onPress={item.open} style={({pressed})=>({width:quickCardWidth,minHeight:90,backgroundColor:colors.surface,padding:8,borderRadius:16,alignItems:'center',justifyContent:'center',gap:8,opacity:pressed?.7:1})}><Feather name={item.icon} size={22} color={colors.text}/><Text style={[styles.text,{fontSize:12,lineHeight:18,textAlign:'center'}]}>{item.title}</Text></Pressable>)}</ScrollView>
    <View style={styles.divider}/><Heading title={copy.home.categories} action="View all" onPress={()=>router.push('/services')}/>
    {catalogue.loading?<Loading/>:catalogue.error?<ErrorPanel error={catalogue.error} retry={catalogue.retry}/>:categories.length?<View style={[styles.grid,{gap:8,justifyContent:'space-between'}]}>{categories.map((category,index)=><CategoryCard key={category.id} category={category} index={index} columns={4} compact/>)}</View>:<Text style={styles.muted}>The catalogue is being prepared.</Text>}
    {marketingSection}<DiscoveryGuide/>
    <View style={styles.divider}/><Heading title={copy.home.featured}/><View style={styles.card}><Image source={require('../../../assets/collaboration.webp')} accessibilityLabel="People collaborating around a sunlit table" style={{height:130,width:'100%',borderRadius:18}}/><Text style={styles.label}>FEATURED</Text><Text style={styles.heading}>{copy.home.business}</Text><Text style={styles.muted}>{copy.home.businessDescription}</Text><Action secondary label={copy.home.more} onPress={()=>router.push('/provider')}/><Text style={styles.muted}>{copy.home.review}</Text></View>
    <Action label={copy.home.provider} onPress={()=>router.push('/provider')}/>
  </Page>;
}
function priority(slug:string){return slug==='real-estate'?0:slug==='tax-compliance'?1:2;}
