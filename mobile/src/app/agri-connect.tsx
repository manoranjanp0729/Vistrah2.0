import {Text} from '../components/typography';
import {UiText,UiElement} from "../components/localized-ui";
import {useLanguage} from '../lib/language';
import {useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Image,Pressable,ScrollView,StyleSheet,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import {marketplaceCategories,marketplaceItemId} from '../lib/marketplace';
import {nativeMarketplacePhoto,nativeMarketplaceAlt} from '../lib/marketplace-photo';
import {PhotoCardRail} from '../components/photo-card-rail';
import {radii, useTheme} from '../lib/theme';

const category=marketplaceCategories.find(item=>item.slug==='agriculture-and-farming');
const farmerBenefits=[
 {title:'agri.markets.title',icon:'map-pin',copy:'agri.markets.description'},
 {title:'agri.rates.title',icon:'bar-chart-2',copy:'agri.rates.description'},
 {title:'agri.buyers.title',icon:'users',copy:'agri.buyers.description'}
] as const;

export default function AgriConnect(){
 const {t,label}=useLanguage();
 const {colors}=useTheme();
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
 if(!category)return <SafeAreaView style={[s.screen,{backgroundColor:colors.background}]}><Text style={[s.description,{color:colors.muted}]}>{t('agri.unavailable')}</Text></SafeAreaView>;
 return <SafeAreaView edges={['left','right','bottom']} style={[s.screen,{backgroundColor:colors.background}]}><ScrollView ref={scroll} contentInsetAdjustmentBehavior="never" contentContainerStyle={s.page}>
  <LinearGradient colors={[colors.surface,colors.elevated,colors.elevated]} start={{x:0,y:0}} end={{x:1,y:1}} style={[s.hero,{borderColor:colors.borderSubtle}]}>
   <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.leaves}>{[0,1,2].map(leaf=><Ionicons key={leaf} name="leaf" size={24+leaf*7} color={colors.success} style={{opacity:.18,transform:[{rotate:`${leaf*18-20}deg`}]}}/>)}</View>
   <View style={s.heroCopy}><View style={s.heroLabel}><Ionicons name="leaf" size={17} color={colors.success}/><Text style={[s.heroLabelText,{color:colors.muted}]}><UiText value={"VISTRAH AgriConnect"}/></Text></View><Text accessibilityRole="header" style={[s.heroTitle,{color:colors.text}]}>{t('agri.headline')}</Text><Text style={[s.heroDescription,{color:colors.muted}]}>{t('agri.description')}</Text><View style={[s.farmerOffer,{backgroundColor:colors.elevated,borderColor:colors.borderSubtle}]}><Text style={[s.offerTitle,{color:colors.text}]}>{t('agri.membership')}</Text><Text style={[s.offerNote,{color:colors.success}]}>{t('common.comingSoon')}</Text></View></View>
   <View style={[s.heroPhoto,{backgroundColor:colors.background,borderWidth:1,borderColor:colors.borderSubtle}]}>{failed.hero?<Text style={[s.fallback,{color:colors.muted}]}>{t('common.photoUnavailable')}</Text>:<UiElement as={Image} source={require('../../assets/connect/agriconnect-tractor-paddy.png')} resizeMode="cover" accessibilityLabel={t('agri.photoAlt')} onError={()=>setFailed(value=>({...value,hero:true}))} style={s.fill}/>}</View>
   <Pressable accessibilityRole="link" onPress={scrollToCategories} style={({pressed})=>[s.heroButton,{backgroundColor:pressed?colors.brandPrimaryHover:colors.brandPrimary}]}><Text style={[s.heroButtonText,{color:colors.brandPrimaryInk}]}>{t('agri.cta')}</Text><Feather name="arrow-right" size={16} color={colors.brandPrimaryInk}/></Pressable>
  </LinearGradient>

  <View style={[s.purpose,{backgroundColor:colors.surface,borderColor:colors.borderSubtle}]}><Text accessibilityRole="header" style={[s.sectionTitle,{color:colors.text}]}>{t('agri.purposeTitle')}</Text><Text style={[s.description,{color:colors.muted}]}>{t('agri.purposeDescription')}</Text>
   {farmerBenefits.map(benefit=><View key={benefit.title} style={[s.benefit,{backgroundColor:colors.elevated,borderColor:colors.borderSubtle}]}><View style={[s.stepIcon,{backgroundColor:colors.surface,borderColor:colors.borderSubtle}]}><Feather name={benefit.icon} size={18} color={colors.success}/></View><View style={{flex:1,minWidth:0,gap:3}}><Text style={[s.benefitTitle,{color:colors.text}]}>{t(benefit.title)}</Text><Text style={[s.description,{color:colors.muted}]}>{t(benefit.copy)}</Text></View></View>)}
   <Text style={[s.smallPrint,{color:colors.muted}]}>{t('agri.upcoming')}</Text>
  </View>
  <View onLayout={event=>{categoriesY.current=event.nativeEvent.layout.y;}} style={s.headingGroup}><Text style={[s.eyebrow,{color:colors.accent}]}>{t('agri.available')}</Text><Text accessibilityRole="header" style={[s.sectionTitle,{color:colors.text}]}>{t('agri.servicesTitle')}</Text><Text style={[s.description,{color:colors.muted}]}>{t('agri.servicesDescription')}</Text></View>
  <UiElement as={PhotoCardRail} vertical label={t('agri.subcategories')} cards={category.subcategories.map(subcategory=>{
   const id=marketplaceItemId(category.slug,subcategory.slug),photo=nativeMarketplacePhoto(id);
   return <Pressable key={subcategory.slug} accessibilityRole="link" accessibilityLabel={label(id,subcategory.title)} onPress={()=>explore(subcategory.slug)} style={({pressed})=>[s.discoveryCard,{backgroundColor:pressed?colors.elevated:colors.surface,borderColor:colors.borderSubtle}]}><View style={[s.discoveryPhoto,{backgroundColor:colors.elevated}]} >{photo&&!failed[id]?<Image source={photo} resizeMode="cover" accessibilityLabel={nativeMarketplaceAlt(id)??subcategory.title} onError={()=>setFailed(value=>({...value,[id]:true}))} style={s.fill}/>:<Text style={[s.fallback,{color:colors.muted}]}>{t('common.photoUnavailable')}</Text>}</View><Text style={[s.discoveryTitle,{color:colors.text}]}>{label(id,subcategory.title)}</Text></Pressable>;
  })}/>

  <LinearGradient colors={[colors.surface,colors.elevated,colors.elevated]} start={{x:0,y:0}} end={{x:1,y:1}} style={[s.final,{borderColor:colors.borderSubtle}]}><Ionicons name="leaf" size={25} color={colors.success} accessible={false}/><Text accessibilityRole="header" style={[s.sectionTitle,{color:colors.text}]}>{t('agri.finalTitle')}</Text><Text style={[s.finalDescription,{color:colors.muted}]}>{t('agri.finalDescription')}</Text><Pressable accessibilityRole="link" onPress={scrollToCategories} style={({pressed})=>[s.finalButton,{backgroundColor:pressed?colors.brandPrimaryHover:colors.brandPrimary}]}><Text style={[s.finalButtonText,{color:colors.brandPrimaryInk}]}>{t('agri.cta')}</Text><Feather name="arrow-right" size={16} color={colors.brandPrimaryInk}/></Pressable></LinearGradient>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 screen:{flex:1},page:{width:'100%',maxWidth:1080,alignSelf:'center',padding:16,paddingBottom:32,gap:16},
 hero:{borderRadius:radii.surface,borderWidth:1,padding:12,gap:7,overflow:'hidden'},heroCopy:{minWidth:0,gap:6},heroLabel:{flexDirection:'row',alignItems:'center',gap:7},heroLabelText:{fontSize:12,lineHeight:17,fontWeight:'600'},heroTitle:{fontSize:21,lineHeight:25,fontWeight:'700',letterSpacing:-.5},heroDescription:{fontSize:12,lineHeight:18},heroButton:{alignSelf:'flex-start',marginTop:5,minHeight:44,paddingHorizontal:12,paddingVertical:9,borderRadius:radii.action,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},heroButtonText:{fontSize:12,lineHeight:18,fontWeight:'600',flexShrink:1,textAlign:'center',includeFontPadding:false},heroPhoto:{width:'100%',aspectRatio:2.2,borderRadius:radii.surface,overflow:'hidden',alignSelf:'center',alignItems:'center',justifyContent:'center'},leaves:{position:'absolute',top:7,right:3,flexDirection:'row',gap:2},
 fill:{position:'absolute',left:0,top:0,width:'100%',height:'100%'},headingGroup:{gap:8},eyebrow:{fontSize:9,lineHeight:14,fontWeight:'700',letterSpacing:1},sectionTitle:{fontSize:23,lineHeight:29,fontWeight:'700',letterSpacing:-.4},description:{fontSize:13,lineHeight:20},
 discoveryCard:{width:'100%',flexGrow:1,borderRadius:radii.surface,overflow:'hidden',borderWidth:1},discoveryPhoto:{margin:6,aspectRatio:16/9,borderRadius:radii.action,overflow:'hidden',alignItems:'center',justifyContent:'center'},discoveryTitle:{fontSize:13,lineHeight:18,fontWeight:'600',paddingHorizontal:10,paddingBottom:11,paddingTop:3},fallback:{fontSize:10,lineHeight:14,textAlign:'center',padding:6},
 farmerOffer:{padding:8,gap:3,borderRadius:radii.surface,borderWidth:1},offerTitle:{fontSize:13,lineHeight:18,fontWeight:'600'},offerNote:{fontSize:10,lineHeight:14,fontWeight:'600'},
 purpose:{padding:13,gap:9,borderRadius:radii.surface,borderWidth:1},benefit:{flexDirection:'row',alignItems:'flex-start',gap:8,padding:9,borderRadius:radii.surface,borderWidth:1},stepIcon:{width:32,height:32,borderRadius:radii.action,borderWidth:1,alignItems:'center',justifyContent:'center'},benefitTitle:{fontSize:11,lineHeight:16,fontWeight:'700'},smallPrint:{fontSize:11,lineHeight:17},
 final:{padding:20,gap:12,borderRadius:radii.surface,borderWidth:1},finalDescription:{fontSize:13,lineHeight:20},finalButton:{alignSelf:'flex-start',minHeight:48,paddingHorizontal:13,paddingVertical:12,borderRadius:radii.action,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,flexWrap:'wrap'},finalButtonText:{fontSize:12,lineHeight:18,fontWeight:'600',flexShrink:1}
});
