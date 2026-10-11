import copy from '../../lib/interface-copy';
import {Tabs,router} from 'expo-router';
import {Pressable,Text} from 'react-native';
import {useLocation} from '../../lib/location';
import Feather from '@expo/vector-icons/Feather';
import {colors} from '../../lib/theme';
export default function TabLayout(){
  const {location}=useLocation();
  return <Tabs screenOptions={{headerStyle:{backgroundColor:colors.background},headerTintColor:colors.text,headerTitle:'VISTRAH',headerTitleStyle:{fontSize:18},headerRight:()=><Pressable accessibilityRole="button" accessibilityLabel={location?'Change location: '+location.label:'Choose your location'} onPress={()=>router.push('/location')} style={{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:12,minHeight:44,maxWidth:180}}><Feather name="map-pin" size={15} color={colors.accent}/><Text numberOfLines={1} style={{color:colors.muted,fontSize:11,flexShrink:1}}>{location?location.label:copy.nav.location}</Text></Pressable>,headerShadowVisible:false,sceneStyle:{backgroundColor:colors.background},tabBarStyle:{backgroundColor:'#111',borderTopColor:colors.border},tabBarActiveTintColor:colors.accent,tabBarInactiveTintColor:colors.muted}}>
    <Tabs.Screen name="index" options={{title:copy.nav.discover,tabBarIcon:({color,size})=><Feather name="home" color={color} size={size}/>}}/>
    <Tabs.Screen name="services" options={{title:copy.nav.services,tabBarIcon:({color,size})=><Feather name="grid" color={color} size={size}/>}}/>
    <Tabs.Screen name="requests" options={{title:copy.nav.requests,tabBarIcon:({color,size})=><Feather name="file-text" color={color} size={size}/>}}/>
    <Tabs.Screen name="account" options={{title:copy.nav.account,tabBarIcon:({color,size})=><Feather name="user" color={color} size={size}/>}}/>
  </Tabs>;
}
