import {useEffect,useState,type ReactNode} from 'react';
import {ActivityIndicator,Pressable,Text,View} from 'react-native';
import {useFonts} from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {useLanguage} from './language';
import {FontLocaleContext} from './font-context';
import {fontLoadingCopy} from './font-policy';

// SDK 57 requires static native faces. Explicit aliases avoid OEM font choices
// and platform-dependent family-name/weight inference. Assets are local/offline.
const fonts={
 Montserrat_400Regular:require('../../assets/fonts/native/Montserrat_400Regular.ttf'),
 Montserrat_500Medium:require('../../assets/fonts/native/Montserrat_500Medium.ttf'),
 Montserrat_600SemiBold:require('../../assets/fonts/native/Montserrat_600SemiBold.ttf'),
 Montserrat_700Bold:require('../../assets/fonts/native/Montserrat_700Bold.ttf'),
 NotoSansKannada_400Regular:require('../../assets/fonts/native/NotoSansKannada_400Regular.ttf'),
 NotoSansKannada_500Medium:require('../../assets/fonts/native/NotoSansKannada_500Medium.ttf'),
 NotoSansKannada_600SemiBold:require('../../assets/fonts/native/NotoSansKannada_600SemiBold.ttf'),
 NotoSansKannada_700Bold:require('../../assets/fonts/native/NotoSansKannada_700Bold.ttf'),
 NotoSansDevanagari_400Regular:require('../../assets/fonts/native/NotoSansDevanagari_400Regular.ttf'),
 NotoSansDevanagari_500Medium:require('../../assets/fonts/native/NotoSansDevanagari_500Medium.ttf'),
 NotoSansDevanagari_600SemiBold:require('../../assets/fonts/native/NotoSansDevanagari_600SemiBold.ttf'),
 NotoSansDevanagari_700Bold:require('../../assets/fonts/native/NotoSansDevanagari_700Bold.ttf'),
};
function FontLoader({children,retry}:{children:ReactNode;retry:()=>void}){
 const [loaded,error]=useFonts(fonts);
 const {locale}=useLanguage();
 useEffect(()=>{if(error)void SplashScreen.hideAsync().catch(()=>{});},[error]);
 if(error)return <View style={{flex:1,alignItems:'center',justifyContent:'center',padding:24,gap:16}}><Text accessibilityRole="alert">{fontLoadingCopy[locale].error}</Text><Pressable accessibilityRole="button" onPress={retry}><Text>{fontLoadingCopy[locale].retry}</Text></Pressable></View>;
 if(!loaded)return <View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator accessibilityLabel={fontLoadingCopy[locale].loading}/></View>;
 return <FontLocaleContext.Provider value={locale}>{children}</FontLocaleContext.Provider>;
}
// A retry remounts only the font loader; unrelated render errors are not swallowed.
export function BundledFonts({children}:{children:ReactNode}){
 const [attempt,setAttempt]=useState(0);
 return <FontLoader key={attempt} retry={()=>setAttempt(value=>value+1)}>{children}</FontLoader>;
}
