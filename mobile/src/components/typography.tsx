import {forwardRef,useContext} from 'react';
import {Platform,StyleSheet,Text as NativeText,TextInput as NativeTextInput,type TextProps,type TextInputProps} from 'react-native';
import {FontLocaleContext,TextWeightContext} from '../lib/font-context';
import {fontFace,isStandardFamily,standardWeight,type FontWeight,type FontLocale,type FontChoice} from '../lib/font-policy';
import {useFontPreference} from '../lib/font-preference';
import {webFontFamily} from '../lib/web-fonts';

export function useAppFont(weight:FontWeight=400){
 const locale=useContext(FontLocaleContext),{activeFont}=useFontPreference();
 return resolvedFontStyle(locale,weight,activeFont).fontFamily;
}
function resolvedFontStyle(locale:FontLocale,weight:FontWeight,font:FontChoice){
 if(Platform.OS==='web'&&(font==='montserrat'||locale!=='en'))return {fontFamily:webFontFamily};
 return {fontFamily:fontFace(locale,weight,font),fontWeight:'normal' as const};
}
export const Text=forwardRef<NativeText,TextProps>(function Text({style,...props},ref){
 const locale=useContext(FontLocaleContext),inherited=useContext(TextWeightContext);
 const {activeFont}=useFontPreference();
 const flattened=StyleSheet.flatten(style);
 const weight=standardWeight(flattened?.fontWeight,inherited);
 const standard=isStandardFamily(flattened?.fontFamily);
 const fontStyle=resolvedFontStyle(locale,weight,activeFont);
 return <TextWeightContext.Provider value={weight}><NativeText {...props} ref={ref} style={standard?[style,fontStyle]:style}/></TextWeightContext.Provider>;
});
export const TextInput=forwardRef<NativeTextInput,TextInputProps>(function TextInput({style,...props},ref){
 const locale=useContext(FontLocaleContext);
 const {activeFont}=useFontPreference();
 const flattened=StyleSheet.flatten(style);
 const weight=standardWeight(flattened?.fontWeight);
 const standard=isStandardFamily(flattened?.fontFamily);
 const fontStyle=resolvedFontStyle(locale,weight,activeFont);
 return <NativeTextInput {...props} ref={ref} style={standard?[style,fontStyle]:style}/>;
});
