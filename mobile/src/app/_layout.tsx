import {LanguageProvider,useLanguage} from '../lib/language';
import {BackButton} from '../components/back-button';
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
export default function RootLayout(){return <ThemeProvider><LanguageProvider><ThemedRoot/></LanguageProvider></ThemeProvider>;}
function ThemedRoot(){const {colors,mode}=useTheme();const {t}=useLanguage();
  return <SafeAreaProvider><SessionProvider><LocationProvider><View style={{flex:1}}><StatusBar style={mode==='dark'?'light':'dark'}/><Stack screenOptions={{headerStyle:{backgroundColor:colors.background},headerTintColor:colors.text,contentStyle:{backgroundColor:colors.background},headerShadowVisible:false,headerBackVisible:false,headerLeft:()=> <BackButton/>}}>
    <Stack.Screen name="(tabs)" options={{headerShown:false}}/>
    <Stack.Screen name="service/[id]" options={{title:'Service details'}}/>
    <Stack.Screen name="service/find-jobs" options={{title:'Find Jobs'}}/>
    <Stack.Screen name="employer-jobs" options={{title:'Employer job postings'}}/>
    <Stack.Screen name="commerce/cart" options={{title:'Your cart'}}/>
    <Stack.Screen name="commerce/orders" options={{title:'Purchase orders'}}/>
    <Stack.Screen name="seller/orders/[id]" options={{title:'Customer purchase orders'}}/>
    <Stack.Screen name="commerce/index" options={{title:'Products & service packages'}}/>
    <Stack.Screen name="commerce/[id]" options={{title:'Listing details'}}/>
    <Stack.Screen name="seller/commerce/[id]" options={{title:'Your products & packages'}}/>
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
    <Stack.Screen name="health-connect" options={{title:'VISTRAH HealthConnect',headerTitleStyle:{fontSize:16},headerBackButtonDisplayMode:'minimal'}}/>
    <Stack.Screen name="agri-connect" options={{title:'VISTRAH AgriConnect',headerTitleStyle:{fontSize:16},headerBackButtonDisplayMode:'minimal'}}/>
    <Stack.Screen name="marketing-solutions" options={{title:t('marketing.title'),headerTitleStyle:{fontSize:16},headerBackButtonDisplayMode:'minimal'}}/>
    <Stack.Screen name="membership" options={{title:t('account.membership')}}/>
    <Stack.Screen name="location" options={{title:t('nav.location')}}/>
    <Stack.Screen name="provider" options={{title:'Offer your services'}}/>
    <Stack.Screen name="settings" options={{title:t('settings.title')}}/>
    <Stack.Screen name="profile" options={{title:'Your profile'}}/>
    <Stack.Screen name="checkout" options={{title:'Sandbox checkout'}}/><Stack.Screen name="payments" options={{title:'Payment history'}}/><Stack.Screen name="forgot-password" options={{title:'Forgot password'}}/><Stack.Screen name="category/[slug]" options={{title:t('nav.services')}}/><Stack.Screen name="jobs" options={{title:'Public vacancies'}}/>
  </Stack><WebsiteRouteBridge/><StartupLoading/></View></LocationProvider></SessionProvider></SafeAreaProvider>;
}
