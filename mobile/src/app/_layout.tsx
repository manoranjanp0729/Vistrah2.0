import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {SessionProvider} from '../lib/session';
import {LocationProvider} from '../lib/location';
import {colors} from '../lib/theme';
export default function RootLayout(){
  return <SafeAreaProvider><SessionProvider><LocationProvider><StatusBar style="light"/><Stack screenOptions={{headerStyle:{backgroundColor:colors.background},headerTintColor:colors.text,contentStyle:{backgroundColor:colors.background},headerShadowVisible:false}}>
    <Stack.Screen name="(tabs)" options={{headerShown:false}}/>
    <Stack.Screen name="service/[id]" options={{title:'Service details'}}/>
    <Stack.Screen name="request/[id]" options={{title:'Service enquiry'}}/>
    <Stack.Screen name="auth" options={{title:'Your VISTRAH account'}}/>
    <Stack.Screen name="membership" options={{title:'Membership'}}/>
    <Stack.Screen name="location" options={{title:'Choose your location'}}/>
    <Stack.Screen name="provider" options={{title:'Offer your services'}}/>
    <Stack.Screen name="profile" options={{title:'Your profile'}}/>
    <Stack.Screen name="checkout" options={{title:'Sandbox checkout'}}/><Stack.Screen name="payments" options={{title:'Payment history'}}/><Stack.Screen name="forgot-password" options={{title:'Forgot password'}}/><Stack.Screen name="category/[slug]" options={{title:'Services'}}/><Stack.Screen name="jobs" options={{title:'Public vacancies'}}/>
  </Stack></LocationProvider></SessionProvider></SafeAreaProvider>;
}
