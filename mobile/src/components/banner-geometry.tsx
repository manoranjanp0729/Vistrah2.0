import {StyleSheet,View} from 'react-native';

// Quiet, clipped decoration: no layout, pointer or screen-reader participation.
export function BannerGeometry({compact=false}:{compact?:boolean}){
 const size=compact?86:148;
 return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill,{overflow:'hidden',borderRadius:20}]}>
  <View style={{position:'absolute',width:size,height:size,borderRadius:size/2,borderWidth:1.5,borderColor:'#ffffff20',right:-size*.2,top:-size*.3}}/>
  <View style={{position:'absolute',width:size*.68,height:size*.68,borderRadius:size*.34,borderWidth:1,borderColor:'#ffffff12',right:-size*.04,top:-size*.14}}/>
  <View style={{position:'absolute',width:compact?27:44,height:compact?27:44,borderRadius:6,backgroundColor:'#ffffff09',borderWidth:1,borderColor:'#ffffff16',right:compact?82:136,bottom:compact?-12:-18,transform:[{rotate:'28deg'}]}}/>
 </View>;
}
