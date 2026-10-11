import {Pressable,Text} from 'react-native';
import {router} from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import type {Category} from '../lib/catalogue';
import {tones} from '../lib/theme';
export function CategoryCard({category,index}:{category:Category;index:number}){
  const tone=tones[index%tones.length];
  const icon=category.slug==='real-estate'?'home':category.slug==='tax-compliance'?'credit-card':category.slug==='jobs-careers'?'briefcase':category.slug==='marketing'?'volume-2':'grid';
  return <Pressable accessibilityRole="button" accessibilityLabel={category.title} onPress={()=>router.push({pathname:'/services',params:{category:category.slug}})} style={({pressed})=>({width:'48%',flexGrow:1,padding:20,borderRadius:22,backgroundColor:tone.background,gap:14,opacity:pressed?.8:1})}>
    <Feather name={icon} size={28} color={tone.text}/><Text style={{fontSize:21,fontWeight:'600',color:tone.text}}>{category.title}</Text><Text style={{fontSize:13,lineHeight:21,color:tone.text}}>{category.description}</Text>
  </Pressable>;
}
