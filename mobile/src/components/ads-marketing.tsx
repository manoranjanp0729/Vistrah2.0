import {croppedPhoto} from '../lib/photo-crop';
import {Text} from './typography';
import {useTheme,spacing,typography,radii} from '../lib/theme';
import {UiText,UiElement} from "./localized-ui";
import {useState} from 'react';
import {useLanguage} from '../lib/language';
import {Platform,Image,Pressable,StyleSheet,View} from 'react-native';
import {router} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import {photoCardDesign as design} from '../../../shared/photo-card-design';
import {marketingServicePages} from '../../../shared/marketing-services';
import {marketingVisuals} from '../../../shared/marketing-visuals';
import brandTheme from '../../../shared/brand-theme.json';

const images=[require('../../assets/ads-marketing/performance-marketing.webp'),require('../../assets/ads-marketing/branding-creative.webp'),require('../../assets/ads-marketing/outdoor-signage.jpg'),require('../../assets/ads-marketing/mobility-billboard.jpg')];
const highlights=marketingServicePages;

export function AdsMarketing(){
 const {t,locale}=useLanguage();
 const {colors}=useTheme();
 const [headingWidth,setHeadingWidth]=useState(0);
 const android=Platform.OS==='android';

 const getStarted=<UiElement as={Pressable} accessibilityRole="link" accessibilityLabel={t('marketing.started')} onPress={()=>router.push('/marketing-solutions')} style={({pressed})=>[s.start,{backgroundColor:pressed?colors.brandPrimaryHover:colors.brandPrimary}]}><Text style={[s.startText,{color:colors.brandPrimaryInk}]}>{t('marketing.started')}</Text><Feather name="arrow-right" size={15} color={colors.brandPrimaryInk}/></UiElement>;

 return <LinearGradient testID="ads-marketing" colors={[colors.surface, colors.elevated, colors.elevated]} locations={[0,.52,1]} start={{x:0,y:0}} end={{x:1,y:1}} style={[s.section,{backgroundColor:colors.surface,borderColor:colors.borderSubtle}]}>
  <View pointerEvents="none" accessible={false} style={[s.blueGlow,{backgroundColor:colors.brandPrimary}]}/><View pointerEvents="none" accessible={false} style={[s.pinkGlow,{backgroundColor:colors.accent}]}/>
  <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit onLayout={event=>setHeadingWidth(event.nativeEvent.layout.width)} style={[s.headline,{color:colors.text},headingWidth>0&&{fontSize:Math.min(Platform.OS==='android'?25:21,headingWidth/15.5)}]}><UiText value={"VISTRAH Ads & Marketing"}/></Text>
  <View style={s.hero}>
   <View style={s.heroCopy}>
    <Text style={[s.support,{color:colors.muted}]}>{t('marketing.homeCopy')}</Text>
    {android&&getStarted}
   </View>
   <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.art}>
    <View style={[s.halo,{backgroundColor:colors.elevated,borderColor:colors.borderSubtle}]}/><View style={[s.ground,{backgroundColor:colors.elevated}]}/>
    <View style={[s.chart,{backgroundColor:colors.surface,borderColor:colors.borderSubtle}]}><View style={s.chartBars}>{[12,20,30].map((height,index)=><View key={index} style={{width:10,height,borderRadius:radii.action,backgroundColor:index===2?colors.brandPrimary:colors.elevated}}/>)}</View><Feather name="trending-up" size={31} color={colors.accent} style={{position:'absolute',right:7,top:4}}/></View>
    <View style={[s.shop,{backgroundColor:colors.surface,borderColor:colors.borderSubtle}]}>
     <View style={[s.roof,{backgroundColor:colors.elevated}]}/><View style={s.awning}>{[0,1,2,3,4,5,6].map(index=><View key={index} style={{flex:1,height:12,borderBottomLeftRadius:radii.action,borderBottomRightRadius:radii.action,backgroundColor:index%2?colors.elevated:colors.brandPrimary}}/>)}</View>
     <View style={s.shopFront}><View style={[s.window,{backgroundColor:colors.elevated}]}><View style={[s.windowShine,{backgroundColor:colors.borderSubtle}]}/></View><View style={[s.door,{backgroundColor:colors.accent}]}><View style={[s.doorHandle,{backgroundColor:colors.brandPrimaryInk}]}/></View></View>
    </View>
    <View style={[s.megaphone,{backgroundColor:colors.brandPrimary}]}><Feather name="volume-2" size={23} color={colors.brandPrimaryInk}/></View>
    <View style={s.spark}><Feather name="plus" size={13} color={colors.accent}/></View>
   </View>
  </View>
  {!android&&getStarted}
  <View style={s.grid}>{highlights.map((card,index)=><UiElement as={Pressable} key={card.key} accessibilityRole="link" accessibilityLabel={card.title[locale]} onPress={()=>router.push({pathname:'/marketing-services/[slug]',params:{slug:card.slug}})} style={({pressed})=>[s.card,{backgroundColor:pressed?colors.elevated:colors.surface,borderWidth:1,borderColor:colors.borderSubtle}]}>
    <View style={[s.image,{backgroundColor:colors.elevated}]}><UiElement as={Image} source={croppedPhoto(images[index],'wide')} accessibilityLabel={t('marketing.'+(['photoDigital','photoCreative','photoOutdoor','photoMobility'][index]))} resizeMode="cover" style={s.cardImage}/></View>
    <View style={s.cardContent}><Text style={[s.cardTitle,{color:colors.text}]}>{card.title[locale]}</Text><Text style={[s.cardDescription,{color:colors.muted}]}>{t('marketing.'+(['digitalCopy','brandCopy','outdoorCopy','mobilityCopy'][index]))}</Text></View>
   </UiElement>)}</View>
 </LinearGradient>;
}
const s=StyleSheet.create({
 section:{borderRadius:radii.surface,padding:spacing.pagePadding,gap:spacing.elementGap,overflow:'hidden',borderWidth:1},
 blueGlow:{position:'absolute',right:-65,top:-75,width:210,height:210,borderRadius:radii.pill,opacity:.14},
 pinkGlow:{position:'absolute',left:-70,top:135,width:180,height:180,borderRadius:radii.pill,opacity:.12},
 hero:{flexDirection:'row',alignItems:Platform.OS==='android'?'flex-start':'center',gap:8,padding:Platform.OS==='android'?0:2,marginBottom:Platform.OS==='android'?10:0},
 heroCopy:{flex:1,minWidth:0,gap:Platform.OS==='android'?8:9},
 headline:{fontSize:Platform.OS==='android'?25:21,lineHeight:Platform.OS==='android'?31:25,fontWeight:'700',letterSpacing:-.5},
 support:{fontSize:Platform.OS==='android'?14:12,lineHeight:Platform.OS==='android'?21:17},
 start:{alignSelf:'flex-start',maxWidth:Platform.OS==='android'?'100%':undefined,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,minHeight:44,paddingHorizontal:14,borderRadius:radii.action},
 startText:{flexShrink:1,fontSize:Platform.OS==='android'?13:12,lineHeight:Platform.OS==='android'?19:17,fontWeight:'700'},
 art:{width:104,height:145},
 halo:{position:'absolute',width:100,height:100,top:23,right:-5,borderRadius:radii.pill,borderWidth:1,opacity:.6},
 ground:{position:'absolute',bottom:9,left:0,width:102,height:13,borderRadius:radii.pill,opacity:.5},
 chart:{position:'absolute',top:6,right:0,width:68,height:54,padding:7,borderRadius:radii.surface,borderWidth:1,transform:[{rotate:'8deg'}]},
 chartBars:{flex:1,flexDirection:'row',alignItems:'flex-end',gap:5},
 shop:{position:'absolute',bottom:20,left:4,width:88,height:65,borderRadius:radii.action,borderWidth:1,overflow:'hidden'},
 roof:{height:13},
 awning:{flexDirection:'row'},
 shopFront:{flex:1,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',paddingHorizontal:9,paddingTop:7},
 window:{width:34,height:24,marginBottom:7,borderRadius:radii.action,overflow:'hidden'},
 windowShine:{position:'absolute',left:9,top:-8,width:7,height:40,transform:[{rotate:'30deg'}]},
 door:{width:20,height:31,borderTopLeftRadius:radii.action,borderTopRightRadius:radii.action},
 doorHandle:{position:'absolute',right:3,top:16,width:3,height:3,borderRadius:radii.pill},
 megaphone:{position:'absolute',top:33,left:0,width:39,height:39,borderRadius:radii.surface,alignItems:'center',justifyContent:'center',transform:[{rotate:'-12deg'}]},
 spark:{position:'absolute',right:0,bottom:37},
 gridHeading:{fontSize:14,lineHeight:20,fontWeight:'600',marginTop:3},
 grid:{flexDirection:'row',flexWrap:'wrap',alignItems:'stretch',gap:10},
 card:{width:'47%',flexGrow:1,flexBasis:'45%',minWidth:0,borderRadius:radii.surface,overflow:'hidden'},
 image:{aspectRatio:16/9,marginTop:5,marginHorizontal:5,borderRadius:radii.input,overflow:'hidden'},
 cardImage:{position:'absolute',top:0,left:0,width:'100%',height:'100%'},
 cardContent:{paddingTop:8,paddingHorizontal:9,paddingBottom:10,gap:6},
 cardTitle:{...typography.cardTitle},
 cardDescription:{fontSize:Platform.OS==='android'?13:11,lineHeight:Platform.OS==='android'?20:16},
});
