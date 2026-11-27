import {Text} from './typography';
import {useTheme,spacing,radii,typography,controlHeights} from '../lib/theme';
import {UiText,UiElement} from './localized-ui';
import {useLanguage} from '../lib/language';
import {Image,Pressable,View} from 'react-native';
import {router} from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import {marketingServicePages} from '../../../shared/marketing-services';

const images=[require('../../assets/ads-marketing/performance-marketing.webp'),require('../../assets/ads-marketing/branding-creative.webp'),require('../../assets/ads-marketing/outdoor-signage.jpg'),require('../../assets/ads-marketing/mobility-billboard.jpg')];
const photoKeys=['photoDigital','photoCreative','photoOutdoor','photoMobility'];

export function AdsMarketing(){
 const {t,locale}=useLanguage();
 const {colors,styles}=useTheme();
 return <View testID="ads-marketing" style={{gap:spacing.pageGap}}>
  <View style={{gap:spacing.fieldGap}}>
   <Text accessibilityRole="header" style={styles.heading}><UiText value="VISTRAH Ads & Marketing"/></Text>
   <Text style={styles.muted}>{t('marketing.homeCopy')}</Text>
   <UiElement as={Pressable} accessibilityRole="link" accessibilityLabel={t('marketing.started')} onPress={()=>router.push('/marketing-solutions')} style={({pressed})=>({alignSelf:'flex-start',minHeight:controlHeights.standard,flexDirection:'row',alignItems:'center',gap:spacing.fieldGap,opacity:pressed?.85:1})}>
    <Text style={{...typography.action,color:colors.accent}}>{t('marketing.started')}</Text><Feather name="arrow-right" size={16} color={colors.accent}/>
   </UiElement>
  </View>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:spacing.regular}}>
   {marketingServicePages.map((card,index)=><UiElement as={Pressable} key={card.key} testID={`ads-marketing-card-${card.slug}`} accessibilityRole="link" accessibilityLabel={card.title[locale]} onPress={()=>router.push({pathname:'/marketing-services/[slug]',params:{slug:card.slug}})} style={({pressed})=>({flexGrow:1,flexBasis:'47%',minWidth:0,borderRadius:radii.surface,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,overflow:'hidden',opacity:pressed?.85:1})}>
    <View testID={`ads-marketing-media-${card.slug}`} style={{width:'100%',aspectRatio:4/3,position:'relative',overflow:'hidden',backgroundColor:colors.soft}}>
     <UiElement as={Image} source={images[index]} accessibilityLabel={t('marketing.'+photoKeys[index])} resizeMode="cover" style={{position:'absolute',top:0,left:0,width:'100%',height:'100%'}}/>
    </View>
    <View style={{padding:12,gap:4}}>
     <Text numberOfLines={2} ellipsizeMode="tail" style={[styles.cardTitle,{fontSize:14,lineHeight:20,fontWeight:'500',color:colors.text}]}>{card.title[locale]}</Text>
    </View>
   </UiElement>)}
  </View>
 </View>;
}
