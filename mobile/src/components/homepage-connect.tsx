import {Text} from './typography';
import {UiElement} from "./localized-ui";
import {useLanguage} from '../lib/language';
import {useEffect,useState} from 'react';
import {AccessibilityInfo,Animated,Easing,Image,Platform,Pressable,StyleSheet,View} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {router} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import {connectSections} from '../../../shared/homepage-connect';
import {marketplaceCategories} from '../lib/marketplace';
import {radii, useTheme} from '../lib/theme';

const photos={agri:require('../../assets/connect/agriconnect-tractor-paddy.png'),health:require('../../assets/connect/healthconnect-doctor-patient.png')};
const decorativeHeartbeat=[[0,12],[9,12],[13,8],[17,16],[22,2],[27,22],[31,10],[35,12],[44,12]];
const heartbeat=[[0,7],[4,7],[6,3],[9,11],[12,1],[15,7],[20,7]];

export function HomepageConnect(){
 const {t,label}=useLanguage();
 const {colors}=useTheme();
 const [reducedMotion,setReducedMotion]=useState(true);
 const [paddySway]=useState(()=>new Animated.Value(0));
 const [ecg]=useState(()=>new Animated.Value(1));
 const [failedPhotos,setFailedPhotos]=useState<Record<string,boolean>>({});
 useEffect(()=>{
  let mounted=true;
  AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(mounted)setReducedMotion(value);}).catch(()=>{});
  const subscription=AccessibilityInfo.addEventListener('reduceMotionChanged',setReducedMotion);
  return ()=>{mounted=false;subscription.remove();};
 },[]);
 useEffect(()=>{
  if(reducedMotion){paddySway.setValue(0);ecg.setValue(1);return;}
  ecg.setValue(0);
  paddySway.setValue(-1);
  const breeze=Animated.loop(Animated.sequence([
   Animated.timing(paddySway,{toValue:1,duration:1800,easing:Easing.inOut(Easing.sin),useNativeDriver:Platform.OS!=='web',isInteraction:false}),
   Animated.timing(paddySway,{toValue:-1,duration:1800,easing:Easing.inOut(Easing.sin),useNativeDriver:Platform.OS!=='web',isInteraction:false})
  ]));
  const pulse=Animated.loop(Animated.sequence([
   Animated.timing(ecg,{toValue:1,duration:1800,easing:Easing.linear,useNativeDriver:false,isInteraction:false}),
   Animated.delay(500),Animated.timing(ecg,{toValue:0,duration:0,useNativeDriver:false,isInteraction:false}),Animated.delay(300)
  ]));
  breeze.start();pulse.start();
  return ()=>{breeze.stop();pulse.stop();};
 },[reducedMotion,paddySway,ecg]);
 return <>{connectSections.map(section=>{
  const category=marketplaceCategories.find(value=>value.slug===section.categorySlug);
  if(!category)return null;
  const agri=section.key==='agri';
  return <LinearGradient key={section.key} colors={[colors.surface,colors.elevated,colors.elevated]} locations={[0,.6,1]} start={{x:0,y:0}} end={{x:1,y:1}} style={[s.banner,{backgroundColor:colors.surface,borderColor:colors.borderSubtle}]}>
   {agri?<View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.paddy}>
    <Animated.Image source={require('../../assets/connect/paddy-panicles.png')} resizeMode="contain" style={[s.paddyImage,{transform:[{translateX:-10},{translateY:25},{rotate:paddySway.interpolate({inputRange:[-1,0,1],outputRange:['-3deg','0deg','3deg']})},{translateY:-25},{translateX:10}]}]}/>
   </View>:<View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.medicalDecoration}>
    <View style={s.decorativeEcgClip}>
     <View style={{position:'absolute',width:44,height:24,opacity:.25}}>{decorativeHeartbeat.slice(1).map(([x,y],index)=>{const [px,py]=decorativeHeartbeat[index];return <View key={index} style={{position:'absolute',left:px,top:py,width:Math.hypot(x-px,y-py),height:1.5,borderRadius:1,backgroundColor:colors.accent,transformOrigin:'left center',transform:[{rotate:`${Math.atan2(y-py,x-px)*180/Math.PI}deg`}]}}/>;})}</View>
     <Animated.View style={{width:ecg.interpolate({inputRange:[0,1],outputRange:[0,44]}),height:24,overflow:'hidden'}}>{decorativeHeartbeat.slice(1).map(([x,y],index)=>{const [px,py]=decorativeHeartbeat[index];return <View key={index} style={{position:'absolute',left:px,top:py,width:Math.hypot(x-px,y-py),height:1.5,borderRadius:1,backgroundColor:colors.text,transformOrigin:'left center',transform:[{rotate:`${Math.atan2(y-py,x-px)*180/Math.PI}deg`}]}}/>;})}</Animated.View>
    </View>
   </View>}
   <View style={s.header}>
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.icon}>
     <Ionicons name={agri?'leaf':'heart'} size={agri?25:32} color={agri?colors.success:colors.accent}/>
     {!agri&&<View style={s.ecgClip}><Animated.View style={{width:ecg.interpolate({inputRange:[0,1],outputRange:[0,20]}),height:12,overflow:'hidden'}}>
      {heartbeat.slice(1).map(([x,y],index)=>{const [previousX,previousY]=heartbeat[index];return <View key={index} style={{position:'absolute',left:previousX,top:previousY,width:Math.hypot(x-previousX,y-previousY),height:1.5,borderRadius:1,backgroundColor:colors.brandPrimaryInk,transformOrigin:'left center',transform:[{rotate:`${Math.atan2(y-previousY,x-previousX)*180/Math.PI}deg`}]}}/>;})}
     </Animated.View></View>}
    </View>
    <Text accessibilityRole="header" style={[s.heading,{color:colors.text}]}>{section.heading}</Text>
   </View>
   <UiElement as={Pressable} accessibilityRole="link" accessibilityLabel={label('category/'+category.slug,category.title)} onPress={()=>router.push(agri?'/agri-connect':'/health-connect')} style={({pressed})=>[s.card,{backgroundColor:pressed?colors.elevated:colors.surface,borderColor:colors.borderSubtle}]}>
    <View style={[s.photo,{backgroundColor:colors.background,borderWidth:1,borderColor:colors.borderSubtle}]}>{failedPhotos[section.key]?<Text style={[s.fallback,{color:colors.muted}]}>{t('common.photoUnavailable')}</Text>:<UiElement as={Image} source={photos[section.key]} resizeMode="contain" accessibilityLabel={t(agri?'agri.photoAlt':'health.photoAlt')} onError={()=>setFailedPhotos(value=>({...value,[section.key]:true}))} style={s.photoImage}/>}</View>
    <View style={s.cardBody}>
     <View style={s.copy}><Text style={[s.title,{color:colors.text}]}>{label('category/'+category.slug,category.title)}</Text><Text style={[s.description,{color:colors.muted}]}>{t(section.key==='agri'?'connect.agriCopy':'connect.healthCopy')}</Text></View>
     <View style={[s.ctaPill,{backgroundColor:colors.brandPrimary}]}>
      <Text style={[s.ctaText,{color:colors.brandPrimaryInk}]}>{t('interface.3b73900b8d29')}</Text>
      <Ionicons name="arrow-forward" size={13} color={colors.brandPrimaryInk} accessible={false}/>
     </View>
    </View>
   </UiElement>
  </LinearGradient>;
 })}</>;
}
const s=StyleSheet.create({
 banner:{padding:12,gap:10,borderRadius:radii.surface,borderWidth:1,overflow:'hidden'},
 header:{flexDirection:'row',alignItems:'center',gap:7,zIndex:1},
 icon:{width:32,height:32,alignItems:'center',justifyContent:'center'},
 heading:{flex:1,fontSize:Platform.OS==='android'?19:15,lineHeight:Platform.OS==='android'?25:20,fontWeight:'700'},
 card:{padding:8,borderRadius:radii.surface,zIndex:1,borderWidth:1,gap:9},
 photo:{width:'100%',aspectRatio:2.0,borderRadius:radii.action,overflow:'hidden',alignItems:'center',justifyContent:'center'},
 photoImage:{position:'absolute',top:0,left:0,width:'100%',height:'100%'},
 fallback:{fontSize:10,lineHeight:14,textAlign:'center',padding:4},
 cardBody:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,paddingHorizontal:2,paddingBottom:2},
 copy:{flex:1,minWidth:0,gap:4},
 title:{fontSize:Platform.OS==='android'?16:14,lineHeight:Platform.OS==='android'?22:19,fontWeight:'700'},
 description:{fontSize:Platform.OS==='android'?13:11,lineHeight:Platform.OS==='android'?18:15},
 ctaPill:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:12,paddingVertical:7,borderRadius:radii.pill,flexShrink:0},
 ctaText:{fontSize:12,fontWeight:'700'},
 paddy:{position:'absolute',top:0,right:4,width:90,height:57,opacity:.8},
 paddyImage:{width:90,height:56.25},
 medicalDecoration:{position:'absolute',top:16,right:3,width:44,height:24,opacity:.8},
 decorativeEcgClip:{width:44,height:24,overflow:'hidden'},
 ecgClip:{position:'absolute',left:6,top:9,width:20,height:12,overflow:'hidden'}
});
