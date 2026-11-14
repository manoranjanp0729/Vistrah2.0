import {Pressable} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import {router} from 'expo-router';
import {radii,useTheme} from '../lib/theme';
import {useLanguage} from '../lib/language';

export function SettingsButton(){
 const {colors}=useTheme();const {t}=useLanguage();
 return <Pressable accessibilityRole="button" accessibilityLabel={t('settings.title')} onPress={()=>router.navigate('/settings')} style={({pressed})=>({width:44,height:44,borderRadius:radii.pill,borderWidth:1,borderColor:colors.borderSubtle,alignItems:'center',justifyContent:'center',backgroundColor:colors.elevated,opacity:pressed?.75:1})}><Feather name="settings" size={21} color={colors.accent}/></Pressable>;
}
