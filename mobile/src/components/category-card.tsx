import {Image,Pressable,Text} from 'react-native';
import {router} from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import type {Category} from '../lib/catalogue';
const photos:Record<string,number>={
  'jobs-careers':require('../../assets/resume.webp'),
  'real-estate':require('../../assets/property.webp'),
  'civil-construction':require('../../assets/construction.webp'),
  marketing:require('../../assets/marketing.webp'),
  'tax-compliance':require('../../assets/finance.webp'),
  'it-technology':require('../../assets/technology.webp'),
  'business-services':require('../../assets/collaboration.webp'),
  'local-professional-services':require('../../assets/home-maintenance.webp'),
};
export function CategoryCard({category,columns=2,compact=false}:{category:Category;index:number;columns?:number;compact?:boolean}){
  const tone={background:'#202124',text:'#ededee'};
  const icon=category.slug==='real-estate'?'home':category.slug==='tax-compliance'?'credit-card':category.slug==='jobs-careers'?'briefcase':category.slug==='marketing'?'volume-2':'grid';
  return <Pressable accessibilityRole="button" accessibilityLabel={category.title} onPress={()=>router.push({pathname:'/category/[slug]',params:{slug:category.slug}})} style={({pressed})=>({minHeight:compact?112:undefined,alignItems:compact?'center':undefined,width:compact?'23%':columns===4?'22%':columns===2?'47%':'100%',flexGrow:0,flexBasis:compact?'23%':columns===4?'22%':columns===2?'47%':'100%',padding:compact?6:16,borderRadius:compact?16:22,backgroundColor:tone.background,borderWidth:compact?1:0,borderColor:'#383a3e',gap:compact?10:14,opacity:pressed?.8:1})}>
    {photos[category.slug]?<Image source={photos[category.slug]} accessibilityLabel={category.title+' category illustration'} resizeMode="cover" style={{width:'100%',height:compact?48:96,borderRadius:compact?10:14}}/>:<Feather name={icon} size={compact?22:28} color={tone.text}/> }<Text style={{fontSize:compact?11:16,lineHeight:compact?15:21,textAlign:compact?'center':'left',fontWeight:'600',color:tone.text}}>{category.title}</Text>{!compact&&<Text style={{fontSize:13,lineHeight:21,color:tone.text}}>{category.description}</Text>}
  </Pressable>;
}
