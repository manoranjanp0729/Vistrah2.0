import {forwardRef,useContext} from 'react';
import {Platform,StyleSheet,Text as NativeText,TextInput as NativeTextInput,type TextProps,type TextInputProps} from 'react-native';
import {FontLocaleContext,TextWeightContext} from '../lib/font-context';
import {fontFace,isStandardFamily,standardWeight,type FontWeight} from '../lib/font-policy';
import {webFontFamily} from '../lib/web-fonts';

export function useAppFont(weight:FontWeight=400){
 const locale=useContext(FontLocaleContext);
 return Platform.OS==='web'?webFontFamily:fontFace(locale,weight);
}
export const Text=forwardRef<NativeText,TextProps>(function Text({style,...props},ref){
 const locale=useContext(FontLocaleContext),inherited=useContext(TextWeightContext);
 const flattened=StyleSheet.flatten(style);
 const weight=standardWeight(flattened?.fontWeight,inherited);
 const standard=isStandardFamily(flattened?.fontFamily);
 const fontStyle=Platform.OS==='web'?{fontFamily:webFontFamily}:{fontFamily:fontFace(locale,weight),fontWeight:'normal' as const};
 return <TextWeightContext.Provider value={weight}><NativeText {...props} ref={ref} style={standard?[style,fontStyle]:style}/></TextWeightContext.Provider>;
});
export const TextInput=forwardRef<NativeTextInput,TextInputProps>(function TextInput({style,...props},ref){
 const locale=useContext(FontLocaleContext);
 const flattened=StyleSheet.flatten(style);
 const weight=standardWeight(flattened?.fontWeight);
 const standard=isStandardFamily(flattened?.fontFamily);
 const fontStyle=Platform.OS==='web'?{fontFamily:webFontFamily}:{fontFamily:fontFace(locale,weight),fontWeight:'normal' as const};
 return <NativeTextInput {...props} ref={ref} style={standard?[style,fontStyle]:style}/>;
});
