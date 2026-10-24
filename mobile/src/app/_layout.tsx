import {useAppFont} from '../components/typography';
import {BundledFonts} from '../lib/bundled-fonts';
import {LanguageProvider,useLanguage} from '../lib/language';
import {AppHeader} from '../components/app-header';
import * as SplashScreen from 'expo-splash-screen';
import {Platform,View} from 'react-native';
import {StartupLoading} from '../components/startup-loading';
import {Stack} from 'expo-router';
import {appRouteIdentity} from '../lib/navigation-policy';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {SessionProvider} from '../lib/session';
import {LocationProvider} from '../lib/location';
import {ThemeProvider,useTheme} from '../lib/theme';
import {WebsiteRouteBridge} from '../components/website-route-bridge';
if(Platform.OS!=='web')void SplashScreen.preventAutoHideAsync().catch(()=>{});
export default function RootLayout(){return <ThemeProvider><LanguageProvider><BundledFonts><ThemedRoot/></BundledFonts></LanguageProvider></ThemeProvider>;}
function ThemedRoot(){const headerFont=useAppFont(600);const {colors,mode}=useTheme();const {t}=useLanguage();
  return <SafeAreaProvider><SessionProvider><LocationProvider><View style={{flex:1}}><StatusBar style={mode==='dark'?'light':'dark'}/><Stack screenOptions={{header:()=> <AppHeader showBack/>,contentStyle:{backgroundColor:colors.background}}}>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="(tabs)" options={{headerShown:false}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="admin-dashboard" options={{title:'Admin dashboard'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="service/[id]" options={{title:'Service details'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="service/find-jobs" options={{title:'Find Jobs'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="employer-jobs" options={{title:'Employer job postings'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="commerce/cart" options={{title:'Your cart'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="commerce/orders" options={{title:'Purchase orders'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="seller/orders/[id]" options={{title:'Customer purchase orders'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="commerce/index" options={{title:'Products & service packages'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="commerce/[id]" options={{title:'Listing details'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="seller/commerce/[id]" options={{title:'Your products & packages'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="seller/index" options={{title:'Seller dashboard'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="seller/v-ads" options={{title:'V Ads Studio'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="advertiser-profile" options={{title:'Advertiser profile'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="seller/business/[id]" options={{title:'Business details & listings'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="seller/ownership" options={{title:'Business ownership'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="seller/leads" options={{title:'Assigned enquiries'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="provider-applications/index" options={{title:'Business applications'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="provider-applications/new" options={{title:'New application'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="provider-applications/[id]" options={{title:'Application details'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="finds/index" options={{title:'VISTRAH Finds'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="finds/new" options={{title:'New career plan'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="finds/[id]" options={{title:'Career plan'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="discover-more" options={{title:'More discovery'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="estimate/[id]" options={{title:'Get Estimate'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="request/[id]" options={{title:'Service enquiry'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="reset-password" options={{title:'Reset password'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="auth" options={{title:'Your VISTRAH account'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="health-connect" options={{title:'VISTRAH HealthConnect',headerTitleStyle:{fontSize:16,fontFamily:headerFont,fontWeight:Platform.OS==='web'?'600':'normal'},headerBackButtonDisplayMode:'minimal'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="agri-connect" options={{title:'VISTRAH AgriConnect',headerTitleStyle:{fontSize:16,fontFamily:headerFont,fontWeight:Platform.OS==='web'?'600':'normal'},headerBackButtonDisplayMode:'minimal'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="marketing-solutions" options={{title:t('marketing.title'),headerTitleStyle:{fontSize:16,fontFamily:headerFont,fontWeight:Platform.OS==='web'?'600':'normal'},headerBackButtonDisplayMode:'minimal'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="membership" options={{title:t('account.membership')}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="location" options={{title:t('nav.location')}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="provider" options={{title:'Offer your services'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="terms" options={{title:'Terms & Conditions'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="privacy" options={{title:'Privacy Policy'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="settings" options={{title:t('settings.title'),headerShown:false,presentation:'transparentModal',animation:'fade',contentStyle:{backgroundColor:'transparent'}}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="profile" options={{title:'Your profile'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="my-requests" options={{title:'Your requests'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="checkout" options={{title:'Sandbox checkout'}}/><Stack.Screen dangerouslySingular={appRouteIdentity} name="payments" options={{title:'Payment history'}}/><Stack.Screen dangerouslySingular={appRouteIdentity} name="forgot-password" options={{title:'Forgot password'}}/><Stack.Screen dangerouslySingular={appRouteIdentity} name="category/[slug]" options={{title:t('nav.services')}}/><Stack.Screen dangerouslySingular={appRouteIdentity} name="jobs" options={{title:'Public vacancies'}}/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="marketing-pricing/[id]"/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="marketing-pricing/index"/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="marketing-services/[slug]"/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="pages/[slug]"/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="seller/add-service"/>
    <Stack.Screen dangerouslySingular={appRouteIdentity} name="v-essentials"/>
  </Stack><WebsiteRouteBridge/><StartupLoading/></View></LocationProvider></SessionProvider></SafeAreaProvider>;
}
