import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {SessionProvider} from '../lib/session';
import {LocationProvider} from '../lib/location';
import {ThemeProvider,useTheme} from '../lib/theme';
export default function RootLayout(){return <ThemeProvider><ThemedRoot/></ThemeProvider>;}
function ThemedRoot(){const {colors,mode}=useTheme();
  return <SafeAreaProvider><SessionProvider><LocationProvider><StatusBar style={mode==='dark'?'light':'dark'}/><Stack screenOptions={{headerStyle:{backgroundColor:colors.background},headerTintColor:colors.text,contentStyle:{backgroundColor:colors.background},headerShadowVisible:false}}>
    <Stack.Screen name="(tabs)" options={{headerShown:false}}/>
    <Stack.Screen name="service/[id]" options={{title:'Service details'}}/>
    <Stack.Screen name="service/find-jobs" options={{title:'Find Jobs'}}/>
    <Stack.Screen name="estimate/[id]" options={{title:'Get Estimate'}}/>
    <Stack.Screen name="request/[id]" options={{title:'Service enquiry'}}/>
    <Stack.Screen name="auth" options={{title:'Your VISTRAH account'}}/>
    <Stack.Screen name="membership" options={{title:'Membership'}}/>
    <Stack.Screen name="location" options={{title:'Choose your location'}}/>
    <Stack.Screen name="provider" options={{title:'Offer your services'}}/>
    <Stack.Screen name="settings" options={{title:'Settings'}}/>
    <Stack.Screen name="profile" options={{title:'Your profile'}}/>
    <Stack.Screen name="checkout" options={{title:'Sandbox checkout'}}/><Stack.Screen name="payments" options={{title:'Payment history'}}/><Stack.Screen name="forgot-password" options={{title:'Forgot password'}}/><Stack.Screen name="category/[slug]" options={{title:'Services'}}/><Stack.Screen name="jobs" options={{title:'Public vacancies'}}/>
  </Stack></LocationProvider></SessionProvider></SafeAreaProvider>;
}

