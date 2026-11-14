import {Text} from './typography';
import {UiText} from "./localized-ui";
import {Pressable,View} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import {radii,typography,useTheme} from '../lib/theme';

export function SellerSignInAction({label,disabled,onPress}:{label:string;disabled:boolean;onPress:()=>void}){
 const {colors,mode}=useTheme();
 return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>({
  minHeight:56,
  paddingVertical:12,
  paddingHorizontal:16,
  borderRadius:radii.action,
  backgroundColor:pressed?colors.brandPrimaryHover:colors.brandPrimary,
  borderWidth:1,
  borderColor:pressed?colors.brandPrimaryHover:colors.brandPrimary,
  flexDirection:'row',
  alignItems:'center',
  gap:12,
  opacity:disabled?0.5:1,
  transform:[{scale:pressed&&!disabled?0.99:1}],
  shadowColor:colors.brandPrimary,
  shadowOffset:{width:0,height:pressed?2:4},
  shadowOpacity:disabled?0:(mode==='light'?0.20:0.28),
  shadowRadius:8,
  elevation:disabled?0:(pressed?2:4),
 })}>
   <View style={{width:34,height:34,borderRadius:radii.action,backgroundColor:'rgba(255,255,255,0.18)',alignItems:'center',justifyContent:'center'}}><Feather name="briefcase" size={18} color="#fff"/></View>
   <Text style={{...typography.action,color:colors.brandPrimaryInk,flex:1}}><UiText value={label}/></Text>
   <Feather name="arrow-right" size={20} color="#fff"/>
 </Pressable>;
}
