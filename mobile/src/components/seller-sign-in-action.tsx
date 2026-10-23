import {BannerGeometry} from './banner-geometry';
import {useBannerTheme} from '../lib/banner-theme';
import {Text} from './typography';
import {UiText} from "./localized-ui";
import {Pressable,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import {typography,useTheme} from '../lib/theme';

export function SellerSignInAction({label,disabled,onPress}:{label:string;disabled:boolean;onPress:()=>void}){
 const {mode}=useTheme();const banner=useBannerTheme();
 return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>({borderRadius:20,opacity:disabled?.5:pressed?.9:1,transform:[{scale:pressed?.99:1}],shadowColor:banner.shadow,shadowOffset:{width:0,height:pressed?2:5},shadowOpacity:mode==='light'?.18:.28,shadowRadius:10,elevation:pressed?2:4})}>
  <LinearGradient colors={banner.gradient} start={{x:0,y:0}} end={{x:1,y:1}} style={{minHeight:60,paddingVertical:12,paddingHorizontal:16,borderRadius:20,borderWidth:1,borderColor:'#ffffff30',flexDirection:'row',alignItems:'center',gap:12}}>
   <BannerGeometry compact/>
   <View style={{width:34,height:34,borderRadius:12,backgroundColor:'#ffffff20',alignItems:'center',justifyContent:'center'}}><Feather name="briefcase" size={18} color="#fff"/></View>
   <Text style={{...typography.action,color:'#fff',flex:1}}><UiText value={label}/></Text><Feather name="arrow-right" size={20} color="#fff"/>
  </LinearGradient>
 </Pressable>;
}
