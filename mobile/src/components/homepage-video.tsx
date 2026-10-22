import {UiText} from "./localized-ui";
import {Pressable,Text,View} from 'react-native';
import {router} from 'expo-router';
import {HomepageVideoPlayer} from './homepage-video-player';
import {LinearGradient} from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import brandTheme from '../../../shared/brand-theme.json';
import {homepageVideoCopy as copy} from '../../../shared/homepage-video';
import {useTheme} from '../lib/theme';

export function HomepageVideo(){
 const {colors,styles,mode}=useTheme();
 const surface=mode==='light'?brandTheme.headerLight:brandTheme.headerDark;
 return <LinearGradient colors={[surface[0],surface[1],surface[2]]} start={{x:0,y:0}} end={{x:1,y:1}} style={{gap:12,padding:16,borderRadius:24,borderWidth:1,borderColor:colors.border}}>
  <LinearGradient colors={[brandTheme.gradient[0],brandTheme.gradient[1],brandTheme.gradient[2]]} start={{x:0,y:0}} end={{x:1,y:1}} style={{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:6,paddingVertical:7,paddingHorizontal:10,borderRadius:20}}><Feather name="play" size={12} color="#fff"/><Text style={{fontSize:10,fontWeight:'700',letterSpacing:1,color:'#fff'}}><UiText value={copy.eyebrow}/></Text></LinearGradient>
  <View style={{gap:6}}><Text accessibilityRole="header" style={[styles.heading,{fontSize:22,lineHeight:28}]}><UiText value={copy.title}/></Text><Text style={[styles.muted,{lineHeight:20}]}><UiText value={copy.description}/></Text></View>
  <HomepageVideoPlayer/>
  <Pressable accessibilityRole="link" onPress={()=>router.push('/services')} style={({pressed})=>({minHeight:44,flexDirection:'row',alignItems:'center',gap:8,opacity:pressed?.7:1})}><Text style={{color:colors.accent,fontSize:14,fontWeight:'600'}}><UiText value={copy.action}/></Text><Feather name="arrow-right" size={17} color={colors.accent}/></Pressable>
 </LinearGradient>;
}
