import {UiElement} from "./localized-ui";
import {View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {radii, useTheme} from '../lib/theme';
export function Art(){
  const {colors} = useTheme();
  return <UiElement as={View} accessible accessibilityRole="image" accessibilityLabel="Flowing abstract layers in orange, turquoise and blue" style={{height:180,borderRadius:radii.surface,borderWidth:1,borderColor:colors.borderSubtle,overflow:'hidden'}}>
    <LinearGradient colors={[colors.brandPrimary, colors.accent, colors.surface]} start={{x:0,y:0}} end={{x:1,y:1}} style={{flex:1}}/>
    <LinearGradient colors={[colors.brandPrimaryHover, colors.accent, colors.elevated]} style={{position:'absolute',width:'140%',height:180,left:'-20%',top:80,borderRadius:radii.pill,transform:[{rotate:'-22deg'}]}}/>
    <LinearGradient colors={[colors.accent, colors.elevated, colors.surface]} style={{position:'absolute',width:'140%',height:180,left:'-20%',top:130,borderRadius:radii.pill,transform:[{rotate:'-22deg'}]}}/>
  </UiElement>;
}
