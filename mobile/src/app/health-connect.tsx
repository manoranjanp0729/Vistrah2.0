import {useLanguage} from '../lib/language';
import {useCallback,useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Easing,Image,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router,useFocusEffect} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import {marketplaceCategories,marketplaceItemId} from '../lib/marketplace';
import {nativeMarketplacePhoto,nativeMarketplaceAlt} from '../lib/marketplace-photo';
import {PhotoCardRail} from '../components/photo-card-rail';

const category=marketplaceCategories.find(item=>item.slug==='health-fitness-and-wellness');
const heartbeat=[[0,8],[6,8],[10,3],[14,15],[20,1],[25,8],[32,8]];
const discoveryHighlights=[
 {slug:'doctors-and-specialists',title:'health.care.title',icon:'users',copy:'health.care.description'},
 {slug:'fitness-centres',title:'health.fitness.title',icon:'activity',copy:'health.fitness.description'},
 {slug:'mental-wellbeing',title:'health.wellness.title',icon:'sun',copy:'health.wellness.description'}
] as const;

export default function HealthConnect(){
 const {t,label,locale}=useLanguage();
 const [failed,setFailed]=useState<Record<string,boolean>>({}),[reducedMotion,setReducedMotion]=useState(true);
 const ecg=useRef(new Animated.Value(1)).current;
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
 if(!category)return <SafeAreaView style={s.screen}><Text style={s.description}>{t('health.unavailable')}</Text></SafeAreaView>;
 const highlights=discoveryHighlights.flatMap(item=>{const found=category.subcategories.find(value=>value.slug===item.slug);return found?[{...item,category:found}]:[];});
 return <SafeAreaView edges={['left','right','bottom']} style={s.screen}><ScrollView ref={scroll} contentInsetAdjustmentBehavior="never" contentContainerStyle={s.page}>
  <LinearGradient colors={['#add6f2','#8fcfe0','#b6e4df']} locations={[0,.6,1]} start={{x:0,y:0}} end={{x:1,y:1}} style={s.hero}>
   <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.medicalMotif}><Feather name="plus" size={62} color="#fff"/><View style={s.motifCircle}/></View>
   <View style={s.heroCopy}><View style={s.heroLabel}>
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.heart}><Ionicons name="heart" size={52} color="#298bca"/><View style={s.ecgClip}><Animated.View style={{height:18,width:ecg.interpolate({inputRange:[0,1],outputRange:[0,32]}),overflow:'hidden'}}>{heartbeat.slice(1).map(([x,y],index)=>{const [previousX,previousY]=heartbeat[index];return <View key={index} style={{position:'absolute',left:previousX,top:previousY,width:Math.hypot(x-previousX,y-previousY),height:2,borderRadius:1,backgroundColor:'#fff',transformOrigin:'left center',transform:[{rotate:`${Math.atan2(y-previousY,x-previousX)*180/Math.PI}deg`}]}}/>;})}</Animated.View></View></View>
    <Text style={s.heroLabelText}>VISTRAH HealthConnect</Text>
   </View><Text accessibilityRole="header" style={s.heroTitle}>{t('health.headline')}</Text><Text style={s.heroDescription}>{t('health.description')}</Text><View style={s.heroHighlight}><Text style={s.heroHighlightTitle}>{t('health.highlight')}</Text><Text style={s.heroHighlightCopy}>{t('health.highlightDescription')}</Text></View></View>
   <View style={s.heroPhoto}>{failed.hero?<Text style={s.fallback}>{t('common.photoUnavailable')}</Text>:<Image source={require('../../assets/connect/healthconnect-doctor-patient.png')} resizeMode="cover" accessibilityLabel={t('health.photoAlt')} onError={()=>setFailed(value=>({...value,hero:true}))} style={s.fill}/>}</View>
   <Pressable accessibilityRole="link" onPress={scrollToCategories} style={({pressed})=>[s.heroButton,{opacity:pressed?.85:1}]}><Text style={s.heroButtonText}>{t('health.cta')}</Text><Feather name="arrow-right" size={16} color="#173c58"/></Pressable>
  </LinearGradient>

  <View style={s.purpose}><Text accessibilityRole="header" style={s.sectionTitle}>{t('health.purposeTitle')}</Text><Text style={s.description}>{t('health.purposeDescription')}</Text>
   {highlights.map(item=><Pressable key={item.slug} accessibilityRole="link" accessibilityLabel={label(marketplaceItemId(category.slug,item.slug),item.category.title)} onPress={()=>explore(item.slug)} style={({pressed})=>[s.benefit,{opacity:pressed?.85:1}]}><View style={s.stepIcon}><Feather name={item.icon} size={18} color="#23649d"/></View><View style={{flex:1,minWidth:0,gap:3}}><Text style={s.benefitTitle}>{t(item.title)}</Text><Text style={s.description}>{t(item.copy)}</Text></View></Pressable>)}
  </View>
  <View onLayout={event=>{categoriesY.current=event.nativeEvent.layout.y;}} style={s.headingGroup}><Text style={s.eyebrow}>{t('health.explore')}</Text><Text accessibilityRole="header" style={s.sectionTitle}>{t('health.servicesTitle')}</Text><Text style={s.description}>{t('health.servicesDescription')}</Text></View>
  <PhotoCardRail vertical label={t('health.subcategories')} cards={category.subcategories.map(subcategory=>{
   const id=marketplaceItemId(category.slug,subcategory.slug),photo=nativeMarketplacePhoto(id);
   return <Pressable key={subcategory.slug} accessibilityRole="link" accessibilityLabel={label(id,subcategory.title)} onPress={()=>explore(subcategory.slug)} style={({pressed})=>[s.discoveryCard,{opacity:pressed?.85:1}]}><View style={s.discoveryPhoto}>{photo&&!failed[id]?<Image source={photo} resizeMode="cover" accessibilityLabel={nativeMarketplaceAlt(id)??subcategory.title} onError={()=>setFailed(value=>({...value,[id]:true}))} style={s.fill}/>:<Text style={s.fallback}>{t('common.photoUnavailable')}</Text>}</View><Text numberOfLines={locale==='en'?2:undefined} style={[s.discoveryTitle,locale!=='en'&&{height:undefined,lineHeight:21}]}>{label(id,subcategory.title)}</Text></Pressable>;
  })}/>

  <LinearGradient colors={['#e1f0fb','#c4e8ec']} start={{x:0,y:0}} end={{x:1,y:1}} style={s.final}><Text accessibilityRole="header" style={s.sectionTitle}>{t('health.finalTitle')}</Text><Text style={s.description}>{t('health.finalDescription')}</Text><Pressable accessibilityRole="link" onPress={scrollToCategories} style={({pressed})=>[s.primary,{opacity:pressed?.85:1}]}><Text style={s.primaryText}>{t('health.finalCta')}</Text><Feather name="arrow-right" size={16} color="#fff"/></Pressable></LinearGradient>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:'#f5fafc'},page:{width:'100%',maxWidth:1080,alignSelf:'center',padding:16,paddingBottom:32,gap:16},
 hero:{borderRadius:22,padding:12,gap:7,overflow:'hidden'},heroCopy:{minWidth:0,gap:6},heroLabel:{flexDirection:'row',alignItems:'center',gap:8},heroLabelText:{flex:1,fontSize:12,lineHeight:18,fontWeight:'600',color:'#236086'},heroTitle:{fontSize:21,lineHeight:25,fontWeight:'700',letterSpacing:-.5,color:'#173c58'},heroDescription:{fontSize:12,lineHeight:18,color:'#335d71'},primary:{alignSelf:'flex-start',minHeight:48,paddingHorizontal:15,paddingVertical:12,borderRadius:13,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,flexWrap:'wrap',backgroundColor:'#23649d'},primaryText:{fontSize:12,lineHeight:18,fontWeight:'600',color:'#fff',flexShrink:1},heroPhoto:{width:'100%',aspectRatio:2.2,borderRadius:15,overflow:'hidden',alignSelf:'center',backgroundColor:'#c5e6ed',alignItems:'center',justifyContent:'center'},medicalMotif:{position:'absolute',top:0,right:6,opacity:.22},motifCircle:{position:'absolute',width:120,height:120,borderRadius:60,borderWidth:1,borderColor:'#fff',top:15,right:-48},
 heart:{width:52,height:52,alignItems:'center',justifyContent:'center'},ecgClip:{position:'absolute',left:10,top:16,width:32,height:18,overflow:'hidden'},
 fill:{position:'absolute',left:0,top:0,width:'100%',height:'100%'},headingGroup:{gap:8},eyebrow:{fontSize:9,lineHeight:14,fontWeight:'700',letterSpacing:1,color:'#347f90'},sectionTitle:{fontSize:23,lineHeight:29,fontWeight:'700',letterSpacing:-.4,color:'#173c58'},description:{fontSize:13,lineHeight:20,color:'#567182'},
 discoveryCard:{width:'100%',flexGrow:1,borderRadius:16,overflow:'hidden',backgroundColor:'#fff',borderWidth:1,borderColor:'#deebf2'},discoveryPhoto:{margin:6,aspectRatio:16/9,borderRadius:11,overflow:'hidden',backgroundColor:'#edf5f9',alignItems:'center',justifyContent:'center'},discoveryTitle:{fontSize:13,lineHeight:18,height:36,fontWeight:'600',color:'#173c58',marginHorizontal:10,marginTop:3,marginBottom:11},fallback:{fontSize:10,lineHeight:14,color:'#567182',textAlign:'center',padding:6},
 heroHighlight:{padding:8,gap:3,borderRadius:12,backgroundColor:'#ffffff55'},heroHighlightTitle:{fontSize:13,lineHeight:18,fontWeight:'600',color:'#173c58'},heroHighlightCopy:{fontSize:11,lineHeight:16,color:'#335d71'},heroButton:{alignSelf:'flex-start',marginTop:5,minHeight:44,paddingHorizontal:12,paddingVertical:9,borderRadius:22,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:'#f2f9fc'},heroButtonText:{fontSize:12,lineHeight:18,fontWeight:'600',color:'#173c58',flexShrink:1,textAlign:'center',includeFontPadding:false},
 purpose:{padding:13,gap:9,borderRadius:20,backgroundColor:'#e8f3f7'},benefit:{flexDirection:'row',alignItems:'flex-start',gap:8,padding:9,borderRadius:13,backgroundColor:'#f3f9fc'},stepIcon:{width:32,height:32,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:'#fff'},benefitTitle:{fontSize:11,lineHeight:16,fontWeight:'700',color:'#173c58'},
 final:{padding:20,gap:12,borderRadius:22}
});
