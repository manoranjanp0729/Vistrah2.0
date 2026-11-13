import {UiElement} from "./localized-ui";
import {View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
export function Art(){return <UiElement as={View} accessible accessibilityRole="image" accessibilityLabel="Flowing abstract layers in orange, turquoise and blue" style={{height:180,borderRadius:24,overflow:'hidden'}}>
  <LinearGradient colors={['#f4ba70','#f49e48','#60d2df','#2798c8','#182d70']} start={{x:0,y:0}} end={{x:1,y:1}} style={{flex:1}}/>
  <LinearGradient colors={['#faa34d','#52cbdc','#1e5c9b','#102153']} style={{position:'absolute',width:'140%',height:180,left:'-20%',top:80,borderRadius:90,transform:[{rotate:'-22deg'}]}}/>
  <LinearGradient colors={['#52cbdb','#238abc','#182e70']} style={{position:'absolute',width:'140%',height:180,left:'-20%',top:130,borderRadius:90,transform:[{rotate:'-22deg'}]}}/>
</UiElement>;}
