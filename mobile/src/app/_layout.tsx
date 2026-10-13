import * as SplashScreen from 'expo-splash-screen';
import {Platform,View} from 'react-native';
import {StartupLoading} from '../components/startup-loading';
import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {SessionProvider} from '../lib/session';
import {LocationProvider} from '../lib/location';
import {ThemeProvider,useTheme} from '../lib/theme';
import {WebsiteRouteBridge} from '../components/website-route-bridge';
if(Platform.OS!=='web')void SplashScreen.preventAutoHideAsync().catch(()=>{});
export default function RootLayout(){return <ThemeProvider><ThemedRoot/></ThemeProvider>;}
function ThemedRoot(){const {colors,mode}=useTheme();
  return <SafeAreaProvider><SessionProvider><LocationProvider><View style={{flex:1}}><StatusBar style={mode==='dark'?'light':'dark'}/><Stack screenOptions={{headerStyle:{backgroundColor:colors.background},headerTintColor:colors.text,contentStyle:{backgroundColor:colors.background},headerShadowVisible:false}}>
    <Stack.Screen name="(tabs)" options={{headerShown:false}}/>
    <Stack.Screen name="service/[id]" options={{title:'Service details'}}/>
    <Stack.Screen name="service/find-jobs" options={{title:'Find Jobs'}}/>
    <Stack.Screen name="employer-jobs" options={{title:'Employer job postings'}}/>
    <Stack.Screen name="seller/index" options={{title:'Seller dashboard'}}/>
    <Stack.Screen name="seller/business/[id]" options={{title:'Business details & listings'}}/>
    <Stack.Screen name="seller/ownership" options={{title:'Business ownership'}}/>
    <Stack.Screen name="seller/leads" options={{title:'Assigned enquiries'}}/>
    <Stack.Screen name="provider-applications/index" options={{title:'Business applications'}}/>
    <Stack.Screen name="provider-applications/new" options={{title:'New application'}}/>
    <Stack.Screen name="provider-applications/[id]" options={{title:'Application details'}}/>
    <Stack.Screen name="finds/index" options={{title:'VISTRAH Finds'}}/>
    <Stack.Screen name="finds/new" options={{title:'New career plan'}}/>
    <Stack.Screen name="finds/[id]" options={{title:'Career plan'}}/>
    <Stack.Screen name="discover-more" options={{title:'More discovery'}}/>
    <Stack.Screen name="estimate/[id]" options={{title:'Get Estimate'}}/>
    <Stack.Screen name="request/[id]" options={{title:'Service enquiry'}}/>
    <Stack.Screen name="reset-password" options={{title:'Reset password'}}/>
    <Stack.Screen name="auth" options={{title:'Your VISTRAH account'}}/>
    <Stack.Screen name="membership" options={{title:'Membership'}}/>
    <Stack.Screen name="location" options={{title:'Choose your location'}}/>
    <Stack.Screen name="provider" options={{title:'Offer your services'}}/>
    <Stack.Screen name="settings" options={{title:'Settings'}}/>
    <Stack.Screen name="profile" options={{title:'Your profile'}}/>
    <Stack.Screen name="checkout" options={{title:'Sandbox checkout'}}/><Stack.Screen name="payments" options={{title:'Payment history'}}/><Stack.Screen name="forgot-password" options={{title:'Forgot password'}}/><Stack.Screen name="category/[slug]" options={{title:'Services'}}/><Stack.Screen name="jobs" options={{title:'Public vacancies'}}/>
  </Stack><WebsiteRouteBridge/><StartupLoading/></View></LocationProvider></SessionProvider></SafeAreaProvider>;
}

