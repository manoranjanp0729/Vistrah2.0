import {UiText,UiElement} from "./localized-ui";
import {useEffect,useState} from 'react';
import {ActivityIndicator,Image,Platform,StyleSheet,Text,View} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import {useTheme} from '../lib/theme';
import {useSession} from '../lib/session';

export function StartupLoading(){
  const theme=useTheme();
  const session=useSession();
  const [timedOut,setTimedOut]=useState(false);
  const [finished,setFinished]=useState(false);
  const [logoReady,setLogoReady]=useState(false);
  const [visibleLongEnough,setVisibleLongEnough]=useState(false);
  useEffect(()=>{const timer=setTimeout(()=>setTimedOut(true),7000);return()=>clearTimeout(timer);},[]);
  useEffect(()=>{
    if(!logoReady)return;
    const timer=setTimeout(()=>setVisibleLongEnough(true),1000);
    return()=>clearTimeout(timer);
  },[logoReady]);
  useEffect(()=>{
    if((theme.ready&&session.ready&&visibleLongEnough)||timedOut){
      if(Platform.OS!=='web')void SplashScreen.hideAsync().catch(()=>{});
      const timer=setTimeout(()=>setFinished(true),0);
      return()=>clearTimeout(timer);
    }
  },[theme.ready,session.ready,visibleLongEnough,timedOut]);
  if(finished)return null;
  const logoLoaded=()=>{setLogoReady(true);if(Platform.OS!=='web')void SplashScreen.hideAsync().catch(()=>{});};
  return <UiElement as={View} accessibilityRole="progressbar" accessibilityLabel="Opening VISTRAH" style={[StyleSheet.absoluteFill,{zIndex:100,elevation:100,backgroundColor:theme.colors.background,alignItems:'center',justifyContent:'center',gap:24,padding:32}]}>
    <Image source={theme.mode==='light'?require('../../assets/brand/lockup-light.png'):require('../../assets/brand/lockup-dark.png')} accessibilityLabel="VISTRAH" resizeMode="contain" onLoadEnd={logoLoaded} style={{width:'100%',maxWidth:280,height:70}}/>
    <ActivityIndicator color={theme.colors.accent}/><Text style={theme.styles.muted}><UiText value={"Opening your next possibilities…"}/></Text>
  </UiElement>;
}
