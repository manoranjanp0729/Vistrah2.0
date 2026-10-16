import {useLanguage} from '../lib/language';
import {Pressable} from 'react-native';
import {router} from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import {useTheme} from '../lib/theme';

export function BackButton(){const {colors}=useTheme();const {t}=useLanguage();return <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={()=>router.canGoBack()?router.back():router.replace('/')} style={({pressed})=>({width:44,height:44,alignItems:'center',justifyContent:'center',opacity:pressed?.7:1})}><Feather name="arrow-left" size={20} color={colors.text}/></Pressable>;}
