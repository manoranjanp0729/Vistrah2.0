import {HomepageHeroCarousel} from '../../components/homepage-hero-carousel';
import {useState} from 'react';
import Feather from '@expo/vector-icons/Feather';
import {HomepageConnect} from '../../components/homepage-connect';
import {connectCategorySlugs} from '../../../../shared/homepage-connect';
import {DiscoveryGuide} from '../../components/discovery-guide';
import {PublishedHomepage,type Homepage} from '../../components/published-homepage';
import {useLanguage} from '../../lib/language';
import {PhotoCard} from '../../components/photo-card';
import {servicePhotos} from '../../lib/service-photos';
import {Platform,Image,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {router} from 'expo-router';
import {AdsMarketing} from '../../components/ads-marketing';
import {Page,Action,Heading,Loading,ErrorPanel} from '../../components/ui';
import {ServiceCarousel} from '../../components/service-carousel';
import {MarketplaceCategories} from '../../components/marketplace-categories';
import {useResource} from '../../lib/resource';
import {allServices,type Category} from '../../lib/catalogue';
import {useTheme} from '../../lib/theme';
export default function Discover(){const {styles,mode}=useTheme();const {copy,t}=useLanguage();
  const catalogue=useResource<Category[]>('/catalogue');
  const homepage=useResource<Homepage>('/homepage');
  const [search,setSearch]=useState(''),[searchFocused,setSearchFocused]=useState(false);
  const searchInput=<View style={{flexDirection:'row',alignItems:'center',gap:9,borderRadius:17,borderWidth:1,borderColor:'#dce3eb',backgroundColor:'#fff',paddingHorizontal:12}}><Feather name="search" size={18} color="#7d8995"/><TextInput accessibilityLabel={t('home.search.placeholder')} placeholder={searchFocused?'':t('home.search.placeholder')} placeholderTextColor="#8c98a4" value={search} onChangeText={setSearch} onFocus={()=>setSearchFocused(true)} onBlur={()=>setSearchFocused(false)} returnKeyType="search" onSubmitEditing={()=>router.push({pathname:'/services',params:{q:search.trim()}})} style={{flex:1,minWidth:0,minHeight:46,paddingVertical:10,fontSize:14,lineHeight:20,color:'#203445'}}/></View>;
  const providerBanner=<Pressable accessibilityRole="link" accessibilityLabel={[t('home.providerTitle'),t('home.providerOffer'),t('home.membershipPlans')].join('. ')} onPress={()=>router.push('/membership')} style={({pressed})=>({flexDirection:'row',alignItems:'flex-start',gap:8,padding:10,borderRadius:18,backgroundColor:mode==='dark'?'#29243d':'#E9E7F7',opacity:pressed?.85:1})}>
    <View accessible={false} style={{width:26,height:26,borderRadius:8,backgroundColor:mode==='dark'?'#39304f':'#f7f5ff',alignItems:'center',justifyContent:'center'}}><Feather name="briefcase" size={15} color={mode==='dark'?'#cdb5f2':'#7545ad'}/></View>
    <View style={{flex:1,minWidth:0,gap:3}}><Text style={{fontSize:10,lineHeight:13,fontWeight:'700',letterSpacing:1,color:mode==='dark'?'#cdb5f2':'#745296'}}>{t('home.providerEyebrow')}</Text><Text accessibilityRole="header" style={{fontSize:Platform.OS==='android'?18:15,lineHeight:Platform.OS==='android'?24:20,fontWeight:'700',color:mode==='dark'?'#f4edff':'#382448'}}>{t('home.providerTitle')}</Text><Text style={{fontSize:Platform.OS==='android'?14:12,lineHeight:Platform.OS==='android'?21:17,color:mode==='dark'?'#d1c7df':'#655975'}}>{t('home.providerCopy')}</Text><Text style={{fontSize:11,lineHeight:16,fontWeight:'600',color:mode==='dark'?'#e0c9ff':'#78549b'}}>{t('home.providerOffer')}</Text><View style={{flexDirection:'row',alignItems:'center',gap:6,paddingTop:2}}><Text style={{fontSize:Platform.OS==='android'?13:12,lineHeight:18,fontWeight:'700',color:mode==='dark'?'#d4b8ff':'#7545ad'}}>{t('home.membershipPlans')}</Text><Feather name="arrow-right" size={15} color={mode==='dark'?'#d4b8ff':'#7545ad'}/></View></View>
  </Pressable>;
  const marketingSection=<AdsMarketing categories={catalogue.data??[]}/>;
  const shortcuts=allServices(catalogue.data??[]).filter(item=>item.service.active&&item.category.slug!=='marketing').sort((a,b)=>Number(b.service.slug==='digital-marketing')-Number(a.service.slug==='digital-marketing')||Number(b.service.popular)-Number(a.service.popular)).slice(0,10).map(({category,service})=>({key:String(service.id),title:service.title,photo:servicePhotos[service.slug]?.source,icon:service.slug==='digital-marketing'?'volume-2' as const:category.slug==='real-estate'?'home' as const:category.slug==='tax-compliance'?'credit-card' as const:'briefcase' as const,open:()=>router.push({pathname:'/service/[id]',params:{id:service.id}})}));
  if(homepage.data?.version&&homepage.data.layout.schema_version===1&&homepage.data.layout.sections.length&&catalogue.data)return <Page><Text style={styles.label}>{copy.home.tagline}</Text>{searchInput}<ServiceCarousel/><PublishedHomepage homepage={homepage.data} categories={catalogue.data}/><View testID="homepage-categories" style={{gap:4}}><Heading title={copy.home.categories} action="View all" onPress={()=>router.push('/services')}/><MarketplaceCategories compact homepage exclude={connectCategorySlugs}/></View>{providerBanner}{marketingSection}<HomepageConnect/><DiscoveryGuide/><Action label={copy.home.provider} onPress={()=>router.push('/provider')}/></Page>;
  return <Page><Text style={styles.label}>{copy.home.tagline}</Text>{searchInput}{<ServiceCarousel/>}
    <View style={styles.divider}/><View testID="homepage-categories" style={{gap:4}}><Heading title={copy.home.categories} action="View all" onPress={()=>router.push('/services')}/>
    <MarketplaceCategories compact homepage exclude={connectCategorySlugs}/></View>
    {providerBanner}{marketingSection}<HomepageConnect/>
    <Text style={styles.label}>{copy.home.quick}</Text><ScrollView horizontal showsHorizontalScrollIndicator accessibilityLabel={t('home.quickAccessibility')} contentContainerStyle={{gap:12,paddingVertical:4}}>{shortcuts.map(item=><PhotoCard key={item.key} title={item.title} meta="Service" source={item.photo} onPress={item.open}/>)}</ScrollView>
    <DiscoveryGuide/>
    <View style={styles.divider}/><Heading title={copy.home.featured}/><View style={styles.card}><Image source={require('../../../assets/collaboration.webp')} accessibilityLabel="People collaborating around a sunlit table" style={{height:130,width:'100%',borderRadius:18}}/><Text style={styles.label}>{t('home.badge')}</Text><Text style={[styles.heading,Platform.OS==='android'&&{fontSize:21,lineHeight:27}]}>{copy.home.business}</Text><Text style={[styles.muted,Platform.OS==='android'&&{fontSize:14,lineHeight:21}]}>{copy.home.businessDescription}</Text><Action secondary label={copy.home.more} onPress={()=>router.push('/provider')}/><Text style={[styles.muted,Platform.OS==='android'&&{fontSize:14,lineHeight:21}]}>{copy.home.review}</Text></View>
    <Action label={copy.home.provider} onPress={()=>router.push('/provider')}/>
  </Page>;
}