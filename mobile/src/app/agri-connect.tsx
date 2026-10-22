import {UiText,UiElement} from "../components/localized-ui";
import {useLanguage} from '../lib/language';
import {useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Image,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import {marketplaceCategories,marketplaceItemId} from '../lib/marketplace';
import {nativeMarketplacePhoto,nativeMarketplaceAlt} from '../lib/marketplace-photo';
import {PhotoCardRail} from '../components/photo-card-rail';

const category=marketplaceCategories.find(item=>item.slug==='agriculture-and-farming');
const farmerBenefits=[
 {title:'agri.markets.title',icon:'map-pin',copy:'agri.markets.description'},
 {title:'agri.rates.title',icon:'bar-chart-2',copy:'agri.rates.description'},
 {title:'agri.buyers.title',icon:'users',copy:'agri.buyers.description'}
] as const;

export default function AgriConnect(){
 const {t,label}=useLanguage();
 const [failed,setFailed]=useState<Record<string,boolean>>({});
 const scroll=useRef<ScrollView>(null),categoriesY=useRef<number|null>(null);
 const [reducedMotion,setReducedMotion]=useState(true);
 useEffect(()=>{
  let mounted=true;
  AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(mounted)setReducedMotion(value);}).catch(()=>{});
  const subscription=AccessibilityInfo.addEventListener('reduceMotionChanged',setReducedMotion);
  return()=>{mounted=false;subscription.remove();};
 },[]);
 // The navigation header sits outside this ScrollView; layout y is content-relative.
 const scrollToCategories=()=>{if(categoriesY.current!==null)scroll.current?.scrollTo({y:categoriesY.current,animated:!reducedMotion});};
 const explore=(subcategory?:string)=>router.push({pathname:'/services',params:{category:category!.slug,...(subcategory?{subcategory}:{})}});
 if(!category)return <SafeAreaView style={s.screen}><Text style={s.description}>{t('agri.unavailable')}</Text></SafeAreaView>;
 return <SafeAreaView edges={['left','right','bottom']} style={s.screen}><ScrollView ref={scroll} contentInsetAdjustmentBehavior="never" contentContainerStyle={s.page}>
  <LinearGradient colors={['#24452f','#397337','#7eaa6b']} start={{x:0,y:0}} end={{x:1,y:1}} style={s.hero}>
   <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.leaves}>{[0,1,2].map(leaf=><Ionicons key={leaf} name="leaf" size={24+leaf*7} color="#d4e6a8" style={{opacity:.18,transform:[{rotate:`${leaf*18-20}deg`}]}}/>)}</View>
   <View style={s.heroCopy}><View style={s.heroLabel}><Ionicons name="leaf" size={17} color="#d4e6a8"/><Text style={s.heroLabelText}><UiText value={"VISTRAH AgriConnect"}/></Text></View><Text accessibilityRole="header" style={s.heroTitle}>{t('agri.headline')}</Text><Text style={s.heroDescription}>{t('agri.description')}</Text><View style={s.farmerOffer}><Text style={s.offerTitle}>{t('agri.membership')}</Text><Text style={s.offerNote}>{t('common.comingSoon')}</Text></View></View>
   <View style={s.heroPhoto}>{failed.hero?<Text style={s.fallback}>{t('common.photoUnavailable')}</Text>:<UiElement as={Image} source={require('../../assets/connect/agriconnect-tractor-paddy.png')} resizeMode="cover" accessibilityLabel={t('agri.photoAlt')} onError={()=>setFailed(value=>({...value,hero:true}))} style={s.fill}/>}</View>
   <Pressable accessibilityRole="link" onPress={scrollToCategories} style={({pressed})=>[s.heroButton,{opacity:pressed?.85:1}]}><Text style={s.heroButtonText}>{t('agri.cta')}</Text><Feather name="arrow-right" size={16} color="#24452f"/></Pressable>
  </LinearGradient>

  <View style={s.purpose}><Text accessibilityRole="header" style={s.sectionTitle}>{t('agri.purposeTitle')}</Text><Text style={s.description}>{t('agri.purposeDescription')}</Text>
   {farmerBenefits.map(benefit=><View key={benefit.title} style={s.benefit}><View style={s.stepIcon}><Feather name={benefit.icon} size={18} color="#397337"/></View><View style={{flex:1,minWidth:0,gap:3}}><Text style={s.benefitTitle}>{t(benefit.title)}</Text><Text style={s.description}>{t(benefit.copy)}</Text></View></View>)}
   <Text style={s.smallPrint}>{t('agri.upcoming')}</Text>
  </View>
  <View onLayout={event=>{categoriesY.current=event.nativeEvent.layout.y;}} style={s.headingGroup}><Text style={s.eyebrow}>{t('agri.available')}</Text><Text accessibilityRole="header" style={s.sectionTitle}>{t('agri.servicesTitle')}</Text><Text style={s.description}>{t('agri.servicesDescription')}</Text></View>
  <UiElement as={PhotoCardRail} vertical label={t('agri.subcategories')} cards={category.subcategories.map(subcategory=>{
   const id=marketplaceItemId(category.slug,subcategory.slug),photo=nativeMarketplacePhoto(id);
   return <Pressable key={subcategory.slug} accessibilityRole="link" accessibilityLabel={label(id,subcategory.title)} onPress={()=>explore(subcategory.slug)} style={({pressed})=>[s.discoveryCard,{opacity:pressed?.85:1}]}><View style={s.discoveryPhoto}>{photo&&!failed[id]?<Image source={photo} resizeMode="cover" accessibilityLabel={nativeMarketplaceAlt(id)??subcategory.title} onError={()=>setFailed(value=>({...value,[id]:true}))} style={s.fill}/>:<Text style={s.fallback}>{t('common.photoUnavailable')}</Text>}</View><Text style={s.discoveryTitle}>{label(id,subcategory.title)}</Text></Pressable>;
  })}/>

  <LinearGradient colors={['#b8e2c5','#a5cbb1','#d4e6a8']} start={{x:0,y:0}} end={{x:1,y:1}} style={s.final}><Ionicons name="leaf" size={25} color="#397337" accessible={false}/><Text accessibilityRole="header" style={s.sectionTitle}>{t('agri.finalTitle')}</Text><Text style={s.finalDescription}>{t('agri.finalDescription')}</Text><Pressable accessibilityRole="link" onPress={scrollToCategories} style={({pressed})=>[s.finalButton,{opacity:pressed?.85:1}]}><Text style={s.finalButtonText}>{t('agri.cta')}</Text><Feather name="arrow-right" size={16} color="#fff"/></Pressable></LinearGradient>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:'#f6f9f3'},page:{width:'100%',maxWidth:1080,alignSelf:'center',padding:16,paddingBottom:32,gap:16},
 hero:{borderRadius:22,padding:12,gap:7,overflow:'hidden'},heroCopy:{minWidth:0,gap:6},heroLabel:{flexDirection:'row',alignItems:'center',gap:7},heroLabelText:{fontSize:12,lineHeight:17,fontWeight:'600',color:'#edf5e7'},heroTitle:{fontSize:21,lineHeight:25,fontWeight:'700',letterSpacing:-.5,color:'#fff'},heroDescription:{fontSize:12,lineHeight:18,color:'#e5eedf'},heroButton:{alignSelf:'flex-start',marginTop:5,minHeight:44,paddingHorizontal:12,paddingVertical:9,borderRadius:22,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:'#f6faef'},heroButtonText:{fontSize:12,lineHeight:18,fontWeight:'600',color:'#24452f',flexShrink:1,textAlign:'center',includeFontPadding:false},heroPhoto:{width:'100%',aspectRatio:2.2,borderRadius:15,overflow:'hidden',alignSelf:'center',backgroundColor:'#a5cbb1',alignItems:'center',justifyContent:'center'},leaves:{position:'absolute',top:7,right:3,flexDirection:'row',gap:2},
 fill:{position:'absolute',left:0,top:0,width:'100%',height:'100%'},headingGroup:{gap:8},eyebrow:{fontSize:9,lineHeight:14,fontWeight:'700',letterSpacing:1,color:'#8a7441'},sectionTitle:{fontSize:23,lineHeight:29,fontWeight:'700',letterSpacing:-.4,color:'#24452f'},description:{fontSize:13,lineHeight:20,color:'#5c6a58'},
 discoveryCard:{width:'100%',flexGrow:1,borderRadius:16,overflow:'hidden',backgroundColor:'#fff',borderWidth:1,borderColor:'#e0e9db'},discoveryPhoto:{margin:6,aspectRatio:16/9,borderRadius:11,overflow:'hidden',backgroundColor:'#edf3e8',alignItems:'center',justifyContent:'center'},discoveryTitle:{fontSize:13,lineHeight:18,fontWeight:'600',color:'#24452f',paddingHorizontal:10,paddingBottom:11,paddingTop:3},fallback:{fontSize:10,lineHeight:14,color:'#5c6a58',textAlign:'center',padding:6},
 farmerOffer:{padding:8,gap:3,borderRadius:12,backgroundColor:'#ffffff15',borderWidth:1,borderColor:'#d4e6a838'},offerTitle:{fontSize:13,lineHeight:18,fontWeight:'600',color:'#fff'},offerNote:{fontSize:10,lineHeight:14,fontWeight:'600',color:'#d4e6a8'},
 purpose:{padding:13,gap:9,borderRadius:20,backgroundColor:'#e7f0df'},benefit:{flexDirection:'row',alignItems:'flex-start',gap:8,padding:9,borderRadius:13,backgroundColor:'#f2f7ed'},stepIcon:{width:32,height:32,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:'#fff'},benefitTitle:{fontSize:11,lineHeight:16,fontWeight:'700',color:'#24452f'},smallPrint:{fontSize:11,lineHeight:17,color:'#5c6a58'},
 final:{padding:20,gap:12,borderRadius:22},finalDescription:{fontSize:13,lineHeight:20,color:'#425d42'},finalButton:{alignSelf:'flex-start',minHeight:48,paddingHorizontal:13,paddingVertical:12,borderRadius:13,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,flexWrap:'wrap',backgroundColor:'#397337'},finalButtonText:{fontSize:12,lineHeight:18,fontWeight:'600',color:'#fff',flexShrink:1}
});
