import type {ReactNode} from 'react';
import {Pressable,Text,View} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import {useTheme} from '../lib/theme';

export function SellerAddCard({children,label,onAdd}:{children:ReactNode;label:string;onAdd:()=>void}){
  const {colors}=useTheme();
  return <View style={{flex:1,minWidth:0,gap:5}}>
    {children}
    <Pressable accessibilityRole="button" accessibilityLabel={`Add ${label} to my business`} onPress={onAdd} style={({pressed})=>({minHeight:40,borderWidth:1,borderColor:colors.accent,borderRadius:12,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,opacity:pressed?.7:1})}>
      <Feather name="plus-circle" size={17} color={colors.accent}/>
      <Text style={{color:colors.accent,fontWeight:'700',fontSize:12}}>Add to my business</Text>
    </Pressable>
  </View>;
}
