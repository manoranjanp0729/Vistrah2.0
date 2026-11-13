import {UiElement} from "./localized-ui";
import {useLanguage} from '../lib/language';
import {Pressable} from 'react-native';
import {router,usePathname,useGlobalSearchParams,type Href} from 'expo-router';
import {backFallback} from '../lib/navigation-policy';
import Feather from '@expo/vector-icons/Feather';
import {useTheme} from '../lib/theme';

export function BackButton(){const {colors}=useTheme();const {t}=useLanguage();const pathname=usePathname(),params=useGlobalSearchParams();return <UiElement as={Pressable} accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={()=>router.canGoBack()?router.back():router.replace(backFallback(pathname,params) as Href)} style={({pressed})=>({width:44,height:44,alignItems:'center',justifyContent:'center',opacity:pressed?.7:1})}><Feather name="arrow-left" size={20} color={colors.text}/></UiElement>;}
