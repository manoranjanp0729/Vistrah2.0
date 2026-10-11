import copy from '../../lib/interface-copy';
import {Tabs,router} from 'expo-router';
import {Image,Pressable,Text,View} from 'react-native';
import {useLocation} from '../../lib/location';
import Feather from '@expo/vector-icons/Feather';
import {useTheme} from '../../lib/theme';
export default function TabLayout(){const {colors,mode}=useTheme();
  const {location}=useLocation();
  return <Tabs screenOptions={{headerStyle:{backgroundColor:mode==='light'?'#F8F7F3':colors.background},headerTintColor:colors.text,headerTitle:()=>mode==='light'?<View style={{width:144,height:36,overflow:'hidden'}}><Image source={require('../../../assets/vistrah-logo-light.png')} accessibilityLabel="VISTRAH" resizeMode="contain" style={{position:'absolute',top:-18,width:144,height:72}}/></View>:<Text style={{color:colors.text,fontSize:18,fontWeight:'600'}}>VISTRAH</Text>,headerTitleStyle:{fontSize:18},headerRight:()=><Pressable accessibilityRole="button" accessibilityLabel={location?'Change location: '+location.label:'Choose your location'} onPress={()=>router.push('/location')} style={{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:12,minHeight:44,maxWidth:180}}><Feather name="map-pin" size={15} color={colors.accent}/><Text numberOfLines={1} style={{color:colors.muted,fontSize:11,flexShrink:1}}>{location?location.label:copy.nav.location}</Text></Pressable>,headerShadowVisible:false,sceneStyle:{backgroundColor:colors.background},tabBarStyle:{backgroundColor:colors.surface,borderTopColor:colors.border},tabBarActiveTintColor:colors.accent,tabBarInactiveTintColor:colors.muted}}>
    <Tabs.Screen name="index" options={{title:copy.nav.discover,tabBarIcon:({color,size})=><Feather name="home" color={color} size={size}/>}}/>
    <Tabs.Screen name="services" options={{title:copy.nav.services,tabBarIcon:({color,size})=><Feather name="grid" color={color} size={size}/>}}/>
    <Tabs.Screen name="requests" options={{title:copy.nav.requests,tabBarIcon:({color,size})=><Feather name="file-text" color={color} size={size}/>}}/>
    <Tabs.Screen name="account" options={{title:copy.nav.account,tabBarIcon:({color,size})=><Feather name="user" color={color} size={size}/>}}/>
  </Tabs>;
}
