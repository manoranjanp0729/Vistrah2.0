import {Tabs} from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import {colors} from '../../lib/theme';
export default function TabLayout(){
  return <Tabs screenOptions={{headerStyle:{backgroundColor:colors.background},headerTintColor:colors.text,headerTitle:'VISTRAH',headerShadowVisible:false,sceneStyle:{backgroundColor:colors.background},tabBarStyle:{backgroundColor:'#111',borderTopColor:colors.border},tabBarActiveTintColor:colors.accent,tabBarInactiveTintColor:colors.muted}}>
    <Tabs.Screen name="index" options={{title:'Discover',tabBarIcon:({color,size})=><Feather name="home" color={color} size={size}/>}}/>
    <Tabs.Screen name="services" options={{title:'Services',tabBarIcon:({color,size})=><Feather name="grid" color={color} size={size}/>}}/>
    <Tabs.Screen name="requests" options={{title:'Requests',tabBarIcon:({color,size})=><Feather name="file-text" color={color} size={size}/>}}/>
    <Tabs.Screen name="account" options={{title:'Account',tabBarIcon:({color,size})=><Feather name="user" color={color} size={size}/>}}/>
  </Tabs>;
}
