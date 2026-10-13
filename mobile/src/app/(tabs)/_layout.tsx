import copy from '../../lib/interface-copy';
import {Tabs,router} from 'expo-router';
import {Image,Pressable,Text,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useLocation} from '../../lib/location';
import Feather from '@expo/vector-icons/Feather';
import {useTheme} from '../../lib/theme';
export default function TabLayout(){const {colors,mode}=useTheme();
  const {location}=useLocation();
  const insets=useSafeAreaInsets();
  return <Tabs screenOptions={{header:()=> <View style={{paddingTop:insets.top,backgroundColor:colors.background,zIndex:1}}><View style={{height:68,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}><Image source={mode==='light'?require('../../../assets/brand/lockup-light.png'):require('../../../assets/brand/lockup-dark.png')} accessibilityLabel="VISTRAH" resizeMode="contain" style={{width:176,height:44,flexShrink:0}}/><Pressable accessibilityRole="button" accessibilityLabel={location?'Change location: '+location.label:'Choose your location'} onPress={()=>router.push('/location')} style={{flexDirection:'row',alignItems:'center',gap:5,minHeight:44,maxWidth:180,flexShrink:1}}><Feather name="map-pin" size={15} color={colors.accent}/><Text numberOfLines={1} style={{color:colors.muted,fontSize:11,flexShrink:1}}>{location?location.label:copy.nav.location}</Text></Pressable></View></View>,sceneStyle:{backgroundColor:colors.background},tabBarStyle:{backgroundColor:colors.surface,borderTopColor:colors.border},tabBarActiveTintColor:colors.accent,tabBarInactiveTintColor:colors.muted}}>
    <Tabs.Screen name="index" options={{title:copy.nav.discover,tabBarIcon:({color,size})=><Feather name="home" color={color} size={size}/>}}/>
    <Tabs.Screen name="services" options={{title:copy.nav.services,tabBarIcon:({color,size})=><Feather name="grid" color={color} size={size}/>}}/>
    <Tabs.Screen name="requests" options={{title:copy.nav.requests,tabBarIcon:({color,size})=><Feather name="file-text" color={color} size={size}/>}}/>
    <Tabs.Screen name="account" options={{title:copy.nav.account,tabBarIcon:({color,size})=><Feather name="user" color={color} size={size}/>}}/>
  </Tabs>;
}

