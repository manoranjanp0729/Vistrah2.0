import {useState} from 'react';
import {Image,Pressable,ScrollView,Text,View} from 'react-native';
import {router} from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import {Page,Action,Heading,Loading,ErrorPanel} from '../../components/ui';
import {ServiceCarousel} from '../../components/service-carousel';
import {CategoryCard} from '../../components/category-card';
import {useResource} from '../../lib/resource';
import {allServices,type Category} from '../../lib/catalogue';
import {colors,styles} from '../../lib/theme';
export default function Discover(){
  const [quickWidth,setQuickWidth]=useState(0);
  const quickCardWidth=quickWidth>0?(quickWidth-36)/3.5:96;
  const catalogue=useResource<Category[]>('/catalogue');
  const categories=catalogue.data?[...catalogue.data].sort((a,b)=>priority(a.slug)-priority(b.slug)):[];
  const shortcuts=allServices(catalogue.data??[]).filter(item=>item.service.active).sort((a,b)=>Number(b.service.slug==='digital-marketing')-Number(a.service.slug==='digital-marketing')||Number(b.service.popular)-Number(a.service.popular)).slice(0,10).map(({category,service})=>({key:String(service.id),title:service.title,icon:service.slug==='digital-marketing'?'volume-2' as const:category.slug==='real-estate'?'home' as const:category.slug==='tax-compliance'?'credit-card' as const:'briefcase' as const,open:()=>router.push({pathname:'/service/[id]',params:{id:service.id}})}));
  return <Page><Text style={styles.label}>DISCOVER. CONNECT. GROW.</Text><Text accessibilityRole="header" style={styles.title}>Discover VISTRAH</Text><Text style={styles.muted}>Explore services, products, and opportunities in one place.</Text>{catalogue.loading?<Loading/>:catalogue.error?<ErrorPanel error={catalogue.error} retry={catalogue.retry}/>:<ServiceCarousel categories={catalogue.data??[]}/>}
    <View style={styles.divider}/><Text style={styles.label}>QUICK ACCESS</Text><ScrollView horizontal onLayout={event=>setQuickWidth(event.nativeEvent.layout.width)} showsHorizontalScrollIndicator accessibilityLabel="Quick access services; scroll horizontally for more" contentContainerStyle={{gap:12,paddingVertical:4}}>{shortcuts.map(item=><Pressable key={item.key} accessibilityRole="button" accessibilityLabel={item.title} onPress={item.open} style={({pressed})=>({width:quickCardWidth,minHeight:90,backgroundColor:colors.surface,padding:8,borderRadius:16,alignItems:'center',justifyContent:'center',gap:8,opacity:pressed?.7:1})}><Feather name={item.icon} size={22} color={colors.text}/><Text style={[styles.text,{fontSize:12,lineHeight:18,textAlign:'center'}]}>{item.title}</Text></Pressable>)}</ScrollView>
    <View style={styles.divider}/><Heading title="Services for you" action="View all" onPress={()=>router.push('/services')}/>
    {catalogue.loading?<Loading/>:catalogue.error?<ErrorPanel error={catalogue.error} retry={catalogue.retry}/>:categories.length?<View style={[styles.grid,{gap:8,justifyContent:'space-between'}]}>{categories.map((category,index)=><CategoryCard key={category.id} category={category} index={index} columns={4} compact/>)}</View>:<Text style={styles.muted}>The catalogue is being prepared.</Text>}
    <View style={styles.divider}/><Heading title="Featured opportunities"/><View style={styles.card}><Image source={require('../../../assets/collaboration.webp')} accessibilityLabel="People collaborating around a sunlit table" style={{height:130,width:'100%',borderRadius:18}}/><Text style={styles.label}>FEATURED</Text><Text style={styles.heading}>Grow your business</Text><Text style={styles.muted}>Connect with customers and present your services through VISTRAH.</Text><Action secondary label="Discover more →" onPress={()=>router.push('/provider')}/><Text style={styles.muted}>Business ownership and service listings require review.</Text></View>
    <Action label="I provide a service" secondary onPress={()=>router.push('/provider')}/>
  </Page>;
}
function priority(slug:string){return slug==='real-estate'?0:slug==='tax-compliance'?1:2;}
