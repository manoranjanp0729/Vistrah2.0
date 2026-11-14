import {Text} from './typography';
import {UiText} from "./localized-ui";
import {Pressable,View} from 'react-native';
import {router} from 'expo-router';
import {HomepageVideoPlayer} from './homepage-video-player';
import {LinearGradient} from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import {homepageVideoCopy as copy} from '../../../shared/homepage-video';
import {radii, useTheme} from '../lib/theme';

export function HomepageVideo(){
 const {colors,styles}=useTheme();
 return <LinearGradient colors={[colors.surface,colors.elevated]} start={{x:0,y:0}} end={{x:1,y:1}} style={{gap:12,padding:16,borderRadius:radii.surface,borderWidth:1,borderColor:colors.borderSubtle}}>
  <View style={{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:6,paddingVertical:7,paddingHorizontal:10,borderRadius:radii.pill,backgroundColor:colors.brandPrimary}}><Feather name="play" size={12} color={colors.brandPrimaryInk}/><Text style={{fontSize:10,fontWeight:'700',letterSpacing:1,color:colors.brandPrimaryInk}}><UiText value={copy.eyebrow}/></Text></View>
  <View style={{gap:6}}><Text accessibilityRole="header" style={[styles.heading,{fontSize:22,lineHeight:28}]}><UiText value={copy.title}/></Text><Text style={[styles.muted,{lineHeight:20}]}><UiText value={copy.description}/></Text></View>
  <HomepageVideoPlayer/>
  <Pressable accessibilityRole="link" onPress={()=>router.push('/services')} style={({pressed})=>({minHeight:44,flexDirection:'row',alignItems:'center',gap:8,opacity:pressed?.7:1})}><Text style={{color:colors.accent,fontSize:14,fontWeight:'600'}}><UiText value={copy.action}/></Text><Feather name="arrow-right" size={17} color={colors.accent}/></Pressable>
 </LinearGradient>;
}
