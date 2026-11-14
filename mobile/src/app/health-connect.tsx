import {Text} from '../components/typography';
import {UiText,UiElement} from "../components/localized-ui";
import {useLanguage} from '../lib/language';
import {useCallback,useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Easing,Image,Pressable,ScrollView,StyleSheet,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router,useFocusEffect} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import {marketplaceCategories,marketplaceItemId} from '../lib/marketplace';
import {nativeMarketplacePhoto,nativeMarketplaceAlt} from '../lib/marketplace-photo';
import {PhotoCardRail} from '../components/photo-card-rail';
import {radii, useTheme} from '../lib/theme';

const category=marketplaceCategories.find(item=>item.slug==='health-fitness-and-wellness');
const heartbeat=[[0,8],[6,8],[10,3],[14,15],[20,1],[25,8],[32,8]];
const discoveryHighlights=[
 {slug:'doctors-and-specialists',title:'health.care.title',icon:'users',copy:'health.care.description'},
 {slug:'fitness-centres',title:'health.fitness.title',icon:'activity',copy:'health.fitness.description'},
 {slug:'mental-wellbeing',title:'health.wellness.title',icon:'sun',copy:'health.wellness.description'}
] as const;

export default function HealthConnect(){
 const {t,label,locale}=useLanguage();
 const {colors}=useTheme();
 const [failed,setFailed]=useState<Record<string,boolean>>({}),[reducedMotion,setReducedMotion]=useState(true);
 const [ecg]=useState(()=>new Animated.Value(1));
 const scroll=useRef<ScrollView>(null),categoriesY=useRef<number|null>(null);
 // The route header is outside the ScrollView; section layout is content-relative.
 const scrollToCategories=()=>{if(categoriesY.current!==null)scroll.current?.scrollTo({y:categoriesY.current,animated:!reducedMotion});};
 const explore=(subcategory?:string)=>router.push({pathname:'/services',params:{category:category!.slug,...(subcategory?{subcategory}:{})}});
 useEffect(()=>{
  let alive=true;
  AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(alive)setReducedMotion(value);}).catch(()=>{});
  const subscription=AccessibilityInfo.addEventListener('reduceMotionChanged',setReducedMotion);
  return()=>{alive=false;subscription.remove();};
 },[]);
 useFocusEffect(useCallback(()=>{
  if(reducedMotion){ecg.setValue(1);return;}
  ecg.setValue(0);
  const animation=Animated.loop(Animated.sequence([
   Animated.timing(ecg,{toValue:1,duration:1800,easing:Easing.linear,useNativeDriver:false,isInteraction:false}),
   Animated.delay(600),Animated.timing(ecg,{toValue:0,duration:0,useNativeDriver:false,isInteraction:false}),Animated.delay(200)
  ]));
  animation.start();return()=>animation.stop();
 },[reducedMotion,ecg]));
 if(!category)return <SafeAreaView style={[s.screen,{backgroundColor:colors.background}]}><Text style={[s.description,{color:colors.muted}]}>{t('health.unavailable')}</Text></SafeAreaView>;
 const highlights=discoveryHighlights.flatMap(item=>{const found=category.subcategories.find(value=>value.slug===item.slug);return found?[{...item,category:found}]:[];});
 return <SafeAreaView edges={['left','right','bottom']} style={[s.screen,{backgroundColor:colors.background}]}><ScrollView ref={scroll} contentInsetAdjustmentBehavior="never" contentContainerStyle={s.page}>
  <LinearGradient colors={[colors.surface,colors.elevated,colors.elevated]} locations={[0,.6,1]} start={{x:0,y:0}} end={{x:1,y:1}} style={[s.hero,{borderColor:colors.borderSubtle}]}>
   <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.medicalMotif}><Feather name="plus" size={62} color={colors.accent}/><View style={[s.motifCircle,{borderColor:colors.borderSubtle}]}/></View>
   <View style={s.heroCopy}><View style={s.heroLabel}>
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.heart}><Ionicons name="heart" size={52} color={colors.accent}/><View style={s.ecgClip}><Animated.View style={{height:18,width:ecg.interpolate({inputRange:[0,1],outputRange:[0,32]}),overflow:'hidden'}}>{heartbeat.slice(1).map(([x,y],index)=>{const [previousX,previousY]=heartbeat[index];return <View key={index} style={{position:'absolute',left:previousX,top:previousY,width:Math.hypot(x-previousX,y-previousY),height:2,borderRadius:1,backgroundColor:colors.brandPrimaryInk,transformOrigin:'left center',transform:[{rotate:`${Math.atan2(y-previousY,x-previousX)*180/Math.PI}deg`}]}}/>;})}</Animated.View></View></View>
    <Text style={[s.heroLabelText,{color:colors.muted}]}><UiText value={"VISTRAH HealthConnect"}/></Text>
   </View><Text accessibilityRole="header" style={[s.heroTitle,{color:colors.text}]}>{t('health.headline')}</Text><Text style={[s.heroDescription,{color:colors.muted}]}>{t('health.description')}</Text><View style={[s.heroHighlight,{backgroundColor:colors.elevated,borderColor:colors.borderSubtle}]}><Text style={[s.heroHighlightTitle,{color:colors.text}]}>{t('health.highlight')}</Text><Text style={[s.heroHighlightCopy,{color:colors.muted}]}>{t('health.highlightDescription')}</Text></View></View>
   <View style={[s.heroPhoto,{backgroundColor:colors.background,borderWidth:1,borderColor:colors.borderSubtle}]}>{failed.hero?<Text style={[s.fallback,{color:colors.muted}]}>{t('common.photoUnavailable')}</Text>:<UiElement as={Image} source={require('../../assets/connect/healthconnect-doctor-patient.png')} resizeMode="cover" accessibilityLabel={t('health.photoAlt')} onError={()=>setFailed(value=>({...value,hero:true}))} style={s.fill}/>}</View>
   <Pressable accessibilityRole="link" onPress={scrollToCategories} style={({pressed})=>[s.heroButton,{backgroundColor:pressed?colors.brandPrimaryHover:colors.brandPrimary}]}><Text style={[s.heroButtonText,{color:colors.brandPrimaryInk}]}>{t('health.cta')}</Text><Feather name="arrow-right" size={16} color={colors.brandPrimaryInk}/></Pressable>
  </LinearGradient>

  <View style={[s.purpose,{backgroundColor:colors.surface,borderColor:colors.borderSubtle}]}><Text accessibilityRole="header" style={[s.sectionTitle,{color:colors.text}]}>{t('health.purposeTitle')}</Text><Text style={[s.description,{color:colors.muted}]}>{t('health.purposeDescription')}</Text>
   {highlights.map(item=><Pressable key={item.slug} accessibilityRole="link" accessibilityLabel={label(marketplaceItemId(category.slug,item.slug),item.category.title)} onPress={()=>explore(item.slug)} style={({pressed})=>[s.benefit,{backgroundColor:pressed?colors.surface:colors.elevated,borderColor:colors.borderSubtle}]}><View style={[s.stepIcon,{backgroundColor:colors.surface,borderColor:colors.borderSubtle}]}><Feather name={item.icon} size={18} color={colors.accent}/></View><View style={{flex:1,minWidth:0,gap:3}}><Text style={[s.benefitTitle,{color:colors.text}]}>{t(item.title)}</Text><Text style={[s.description,{color:colors.muted}]}>{t(item.copy)}</Text></View></Pressable>)}
  </View>
  <View onLayout={event=>{categoriesY.current=event.nativeEvent.layout.y;}} style={s.headingGroup}><Text style={[s.eyebrow,{color:colors.accent}]}>{t('health.explore')}</Text><Text accessibilityRole="header" style={[s.sectionTitle,{color:colors.text}]}>{t('health.servicesTitle')}</Text><Text style={[s.description,{color:colors.muted}]}>{t('health.servicesDescription')}</Text></View>
  <UiElement as={PhotoCardRail} vertical label={t('health.subcategories')} cards={category.subcategories.map(subcategory=>{
   const id=marketplaceItemId(category.slug,subcategory.slug),photo=nativeMarketplacePhoto(id);
   return <Pressable key={subcategory.slug} accessibilityRole="link" accessibilityLabel={label(id,subcategory.title)} onPress={()=>explore(subcategory.slug)} style={({pressed})=>[s.discoveryCard,{backgroundColor:pressed?colors.elevated:colors.surface,borderColor:colors.borderSubtle}]}><View style={[s.discoveryPhoto,{backgroundColor:colors.elevated}]} >{photo&&!failed[id]?<Image source={photo} resizeMode="cover" accessibilityLabel={nativeMarketplaceAlt(id)??subcategory.title} onError={()=>setFailed(value=>({...value,[id]:true}))} style={s.fill}/>:<Text style={[s.fallback,{color:colors.muted}]}>{t('common.photoUnavailable')}</Text>}</View><Text numberOfLines={locale==='en'?2:undefined} style={[s.discoveryTitle,{color:colors.text},locale!=='en'&&{height:undefined,lineHeight:21}]}>{label(id,subcategory.title)}</Text></Pressable>;
  })}/>

  <LinearGradient colors={[colors.surface,colors.elevated]} start={{x:0,y:0}} end={{x:1,y:1}} style={[s.final,{borderColor:colors.borderSubtle}]}><Text accessibilityRole="header" style={[s.sectionTitle,{color:colors.text}]}>{t('health.finalTitle')}</Text><Text style={[s.description,{color:colors.muted}]}>{t('health.finalDescription')}</Text><Pressable accessibilityRole="link" onPress={scrollToCategories} style={({pressed})=>[s.primary,{backgroundColor:pressed?colors.brandPrimaryHover:colors.brandPrimary}]}><Text style={[s.primaryText,{color:colors.brandPrimaryInk}]}>{t('health.finalCta')}</Text><Feather name="arrow-right" size={16} color={colors.brandPrimaryInk}/></Pressable></LinearGradient>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 screen:{flex:1},page:{width:'100%',maxWidth:1080,alignSelf:'center',padding:16,paddingBottom:32,gap:16},
 hero:{borderRadius:radii.surface,borderWidth:1,padding:12,gap:7,overflow:'hidden'},heroCopy:{minWidth:0,gap:6},heroLabel:{flexDirection:'row',alignItems:'center',gap:8},heroLabelText:{flex:1,fontSize:12,lineHeight:18,fontWeight:'600'},heroTitle:{fontSize:21,lineHeight:25,fontWeight:'700',letterSpacing:-.5},heroDescription:{fontSize:12,lineHeight:18},primary:{alignSelf:'flex-start',minHeight:48,paddingHorizontal:15,paddingVertical:12,borderRadius:radii.action,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,flexWrap:'wrap'},primaryText:{fontSize:12,lineHeight:18,fontWeight:'600',flexShrink:1},heroPhoto:{width:'100%',aspectRatio:2.2,borderRadius:radii.surface,overflow:'hidden',alignSelf:'center',alignItems:'center',justifyContent:'center'},medicalMotif:{position:'absolute',top:0,right:6,opacity:.22},motifCircle:{position:'absolute',width:120,height:120,borderRadius:radii.pill,borderWidth:1,top:15,right:-48},
 heart:{width:52,height:52,alignItems:'center',justifyContent:'center'},ecgClip:{position:'absolute',left:10,top:16,width:32,height:18,overflow:'hidden'},
 fill:{position:'absolute',left:0,top:0,width:'100%',height:'100%'},headingGroup:{gap:8},eyebrow:{fontSize:9,lineHeight:14,fontWeight:'700',letterSpacing:1},sectionTitle:{fontSize:23,lineHeight:29,fontWeight:'700',letterSpacing:-.4},description:{fontSize:13,lineHeight:20},
 discoveryCard:{width:'100%',flexGrow:1,borderRadius:radii.surface,overflow:'hidden',borderWidth:1},discoveryPhoto:{margin:6,aspectRatio:16/9,borderRadius:radii.action,overflow:'hidden',alignItems:'center',justifyContent:'center'},discoveryTitle:{fontSize:13,lineHeight:18,height:36,fontWeight:'600',marginHorizontal:10,marginTop:3,marginBottom:11},fallback:{fontSize:10,lineHeight:14,textAlign:'center',padding:6},
 heroHighlight:{padding:8,gap:3,borderRadius:radii.surface,borderWidth:1},heroHighlightTitle:{fontSize:13,lineHeight:18,fontWeight:'600'},heroHighlightCopy:{fontSize:11,lineHeight:16},heroButton:{alignSelf:'flex-start',marginTop:5,minHeight:44,paddingHorizontal:12,paddingVertical:9,borderRadius:radii.action,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},heroButtonText:{fontSize:12,lineHeight:18,fontWeight:'600',flexShrink:1,textAlign:'center',includeFontPadding:false},
 purpose:{padding:13,gap:9,borderRadius:radii.surface,borderWidth:1},benefit:{flexDirection:'row',alignItems:'flex-start',gap:8,padding:9,borderRadius:radii.surface,borderWidth:1},stepIcon:{width:32,height:32,borderRadius:radii.action,borderWidth:1,alignItems:'center',justifyContent:'center'},benefitTitle:{fontSize:11,lineHeight:16,fontWeight:'700'},
 final:{padding:20,gap:12,borderRadius:radii.surface,borderWidth:1}
});
