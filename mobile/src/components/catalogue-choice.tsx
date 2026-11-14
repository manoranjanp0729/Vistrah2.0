import {Text} from './typography';
import {UiText} from "./localized-ui";
import {Pressable,View} from 'react-native';
import {useTheme} from '../lib/theme';

export function CatalogueChoice({label,selected,onPress,disabled=false,multiple=false}:{label:string;selected:boolean;onPress:()=>void;disabled?:boolean;multiple?:boolean}){
  const {colors,styles}=useTheme();
  return <Pressable accessibilityRole={multiple?'checkbox':'radio'} accessibilityLabel={label} accessibilityState={{checked:selected,disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>({minHeight:84,padding:16,borderRadius:16,borderWidth:1,borderColor:selected?colors.accent:colors.border,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',gap:14,opacity:disabled?.5:pressed?.75:1})}>
    <Text style={[styles.text,{flex:1,fontWeight:'600'}]}><UiText value={label}/></Text>
    <View accessible={false} style={{width:48,height:48,borderRadius:24,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center'}}><Text style={{color:colors.ink,fontSize:28,lineHeight:34}}>{multiple?(selected?'−':'+'):'›'}</Text></View>
  </Pressable>;
}
