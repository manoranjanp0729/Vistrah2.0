import {Pressable,Text} from 'react-native';
import {router} from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import type {Category} from '../lib/catalogue';
import {tones} from '../lib/theme';
export function CategoryCard({category,index,columns=2,compact=false}:{category:Category;index:number;columns?:number;compact?:boolean}){
  const tone=tones[index%tones.length];
  const icon=category.slug==='real-estate'?'home':category.slug==='tax-compliance'?'credit-card':category.slug==='jobs-careers'?'briefcase':category.slug==='marketing'?'volume-2':'grid';
  return <Pressable accessibilityRole="button" accessibilityLabel={category.title} onPress={()=>router.push({pathname:'/category/[slug]',params:{slug:category.slug}})} style={({pressed})=>({minHeight:compact?112:undefined,alignItems:compact?'center':undefined,width:compact?'23%':columns===4?'22%':columns===2?'47%':'100%',flexGrow:0,flexBasis:compact?'23%':columns===4?'22%':columns===2?'47%':'100%',padding:compact?6:20,borderRadius:compact?16:22,backgroundColor:tone.background,gap:compact?10:14,opacity:pressed?.8:1})}>
    <Feather name={icon} size={compact?22:28} color={tone.text}/><Text style={{fontSize:compact?11:21,lineHeight:compact?15:27,textAlign:compact?'center':'left',fontWeight:'600',color:tone.text}}>{category.title}</Text>{!compact&&<Text style={{fontSize:13,lineHeight:21,color:tone.text}}>{category.description}</Text>}
  </Pressable>;
}
