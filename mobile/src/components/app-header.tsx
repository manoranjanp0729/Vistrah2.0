import {Image,Pressable,View} from 'react-native';
import {router,usePathname} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {radii,useTheme} from '../lib/theme';
import {useLanguage} from '../lib/language';
import {UiElement} from './localized-ui';
import {BackButton} from './back-button';
import {SettingsButton} from './settings-button';

export function AppHeader({showBack=false}:{showBack?:boolean}){
 const {colors,mode,headerGradient}=useTheme();
 const {t}=useLanguage();
 const insets=useSafeAreaInsets();
 const pathname=usePathname();
 return <View style={{paddingTop:insets.top,backgroundColor:colors.surface,zIndex:1,borderBottomLeftRadius:radii.surface,borderBottomRightRadius:radii.surface,borderBottomWidth:1,borderBottomColor:colors.borderSubtle,overflow:'hidden'}}>
  <LinearGradient pointerEvents="none" colors={headerGradient} start={{x:0,y:0}} end={{x:1,y:1}} style={{position:'absolute',top:0,left:0,right:0,bottom:0}}>
   <View style={{position:'absolute',right:24,top:-52,width:160,height:160,borderRadius:radii.pill,backgroundColor:colors.brandPrimary,opacity:mode==='light'?.08:.07}}/>
  </LinearGradient>
  <View style={{height:66,paddingLeft:8,paddingRight:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}>
   <UiElement as={Pressable} accessibilityRole="link" accessibilityLabel={t('navigation.home')} hitSlop={{top:8,bottom:8,left:8,right:8}} onPress={()=>{if(pathname!=='/')router.dismissTo('/');}} style={{width:196,minHeight:52,justifyContent:'center',flexShrink:1}}>
    {/* Compensate for transparent asset padding to align the wordmark with page content. */}
    <Image source={mode==='light'?require('../../assets/brand/lockup-light.png'):require('../../assets/brand/lockup-dark.png')} accessibilityLabel="VISTRAH" resizeMode="contain" style={{width:'100%',height:52,transform:[{translateX:-30}]}}/>
   </UiElement>
   <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
    {showBack&&<BackButton/>}
    <SettingsButton/>
   </View>
  </View>
 </View>;
}
