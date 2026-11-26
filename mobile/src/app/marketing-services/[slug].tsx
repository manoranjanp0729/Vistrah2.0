import {Text} from '../../components/typography';
import {EditVistrahContent} from '../../components/edit-vistrah-content';
import {useRef,useState} from 'react';
import {Image,Linking,Pressable,ScrollView,StyleSheet,View,useWindowDimensions} from 'react-native';
import {Stack,router,useLocalSearchParams} from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import {useLanguage} from '../../lib/language';
import {useTheme,spacing,typography,radii,controlHeights,layout} from '../../lib/theme';
import {getMarketingService,marketingServicePages,marketingPageLabels as labels,marketingEnquiryHref} from '../../../../shared/marketing-services';

const photos={
 'performance-marketing':require('../../../assets/ads-marketing/performance-marketing.webp'),
 'branding-creative':require('../../../assets/ads-marketing/branding-creative.webp'),
 'outdoor-advertising':require('../../../assets/ads-marketing/outdoor-signage.jpg'),
 'mobility-billboard':require('../../../assets/ads-marketing/mobility-billboard.jpg'),
};
const icons=['compass','edit-3','play-circle','send'] as const;

export default function MarketingServiceLanding(){
 const {slug}=useLocalSearchParams<{slug?:string|string[]}>();
 const page=getMarketingService(typeof slug==='string'?slug:'');
 const {locale}=useLanguage();const {colors}=useTheme();const buttonInk=colors.ink;const {width}=useWindowDimensions();
 const wide=width>=760;const scroll=useRef<ScrollView>(null),capabilitiesY=useRef(0);const [error,setError]=useState('');
 if(!page)return <View style={[s.content,{backgroundColor:colors.background}]}><Text style={{color:colors.text}}>{labels.back[locale]}</Text><Pressable accessibilityRole="link" onPress={()=>router.dismissTo('/marketing-solutions')} style={s.button}><Feather name="arrow-left" color={colors.accent} size={20}/><Text style={{color:colors.text}}>{labels.back[locale]}</Text></Pressable></View>;
 const heroInk=colors.text;
 async function enquire(){setError('');try{await Linking.openURL(marketingEnquiryHref(page!,locale));}catch{setError(labels.emailError[locale]);}}
 const enquiryButton=<Pressable accessibilityRole="link" onPress={()=>void enquire()} style={({pressed})=>[s.button,{backgroundColor:colors.accent,opacity:pressed?.8:1}]}><Text style={[s.buttonText,{color:buttonInk}]}>{labels.discuss[locale]}</Text><Feather name="arrow-up-right" color={buttonInk} size={18}/></Pressable>;
 return <><Stack.Screen options={{title:'VISTRAH Ads & Marketing'}}/><ScrollView ref={scroll} style={{flex:1,backgroundColor:colors.background}} contentContainerStyle={s.content}><EditVistrahContent slug={page.slug} replace>
  <View style={{gap:spacing.elementGap}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:10,paddingVertical:3,borderRadius:radii.surface,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface}}><Pressable accessibilityRole="link" onPress={()=>router.dismissTo('/marketing-solutions')} style={{minHeight:controlHeights.standard,flexDirection:'row',alignItems:'center',gap:6,flexShrink:1}}><Feather name="arrow-left" size={15} color={heroInk}/><Text numberOfLines={1} style={{color:heroInk,fontSize:12,flexShrink:1,lineHeight:18}}>{labels.back[locale]}</Text></Pressable><Feather name="chevron-right" size={13} color={heroInk}/><Text numberOfLines={1} style={{color:heroInk,fontSize:12,flex:1,lineHeight:18,fontWeight:'600'}}>{page.title[locale]}</Text></View>
  <View style={s.hero}>
   <View style={[s.heroCopy,{padding:spacing.sectionPadding}]}><View style={s.eyebrowRow}><Text style={[s.eyebrow,{color:colors.accent}]}>Vistrah Ads &amp; Marketing</Text></View><Text style={[s.serviceName,{color:colors.accent}]}>{page.title[locale]}</Text><Text accessibilityRole="header" style={[s.headline,{...typography.title,color:heroInk}]}>{page.headline[locale]}</Text><Text style={[s.intro,{color:heroInk}]}>{page.intro[locale]}</Text><View style={{gap:10,alignItems:'stretch'}}>{enquiryButton}<Pressable accessibilityRole="button" onPress={()=>scroll.current?.scrollTo({y:capabilitiesY.current,animated:true})} style={[s.button,{borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface}]}><Text style={{color:colors.text,...typography.action}}>{labels.explore[locale]}</Text><Feather name="arrow-right" size={17} color={colors.text}/></Pressable></View></View>
   <View style={{height:wide?420:340,marginHorizontal:20,position:'relative'}}>
    <View style={{position:'absolute',top:12,left:0,right:0,bottom:64,borderRadius:radii.surface,overflow:'hidden'}}><Image source={photos[page.key]} accessibilityLabel={page.title[locale]} resizeMode="cover" style={StyleSheet.absoluteFill}/></View>
    <View style={{position:'absolute',bottom:12,left:16,right:16,padding:16,borderRadius:radii.surface,backgroundColor:colors.soft}}><Text style={{color:colors.accent,fontSize:12,fontWeight:'600',marginBottom:4}}>Vistrah Studio</Text><Text style={{color:colors.text,fontSize:20,lineHeight:28,fontWeight:'600'}}>{page.concept[locale]}</Text></View>
   </View>
  </View>
  </View>
  <View onLayout={event=>{capabilitiesY.current=event.nativeEvent.layout.y;}} style={s.section}><Text style={{color:colors.accent,fontSize:13,fontWeight:'500',lineHeight:20}}>{page.title[locale]}</Text><Text accessibilityRole="header" style={[s.heading,{color:colors.text}]}>{labels.capabilities[locale]}</Text><View style={s.grid}>{page.capabilities.map(([title,description],i)=><View key={title.en} style={[s.card,{flexBasis:wide?(i===0||i===3?'60%':'30%'):'100%',backgroundColor:i===0?(colors.surface):colors.surface,borderColor:colors.border}]}><View style={s.cardTop}><Feather name={icons[i]} size={22} color={colors.accent}/></View><Text style={[s.cardTitle,{color:i===0?heroInk:colors.text}]}>{title[locale]}</Text><Text style={[s.body,{color:i===0?heroInk:colors.muted}]}>{description[locale]}</Text></View>)}</View></View>
  <View style={[s.card,{backgroundColor:colors.surface,borderColor:colors.border,gap:18}]}><Text accessibilityRole="header" style={[s.heading,{color:colors.text}]}>{labels.includes[locale]}</Text>{page.outputs.map(item=><View key={item.en} style={s.checkRow}><Feather name="check" size={20} color={colors.accent}/><Text style={[s.body,{color:colors.text,flex:1}]}>{item[locale]}</Text></View>)}</View>
  <View style={s.section}><Text accessibilityRole="header" style={[s.heading,{color:colors.text}]}>{labels.process[locale]}</Text>{labels.steps.map((step,i)=><View key={step.en} style={{flexDirection:'row',gap:14,paddingVertical:12,borderBottomWidth:1,borderColor:colors.border}}><View style={[s.step,{backgroundColor:colors.soft}]}><Text style={{color:colors.accent,fontSize:11,fontWeight:'600'}}>{['Discover','Plan','Launch','Review'][i]??'Next'}</Text></View><View style={{flex:1,gap:6}}><Text style={[s.cardTitle,{color:colors.text}]}>{step[locale]}</Text><Text style={[s.body,{color:colors.muted}]}>{labels.stepCopy[i][locale]}</Text></View></View>)}</View>
  <View style={[s.card,{borderWidth:0,gap:spacing.elementGap,padding:spacing.sectionPadding}]}><Text accessibilityRole="header" style={[s.heading,{color:heroInk}]}>{labels.brief[locale]}</Text>{page.brief.map(item=><View key={item.en} style={s.checkRow}><Feather name="check" color={colors.accent} size={18}/><Text style={[s.body,{color:heroInk,flex:1}]}>{item[locale]}</Text></View>)}{enquiryButton}<Text style={{color:heroInk,fontSize:12,lineHeight:20}}>{labels.note[locale]}</Text>{!!error&&<Text accessibilityRole="alert" style={{color:heroInk,lineHeight:22}}>{error}</Text>}</View>
  <View style={s.section}><Text accessibilityRole="header" style={[s.heading,{color:colors.text}]}>{labels.related[locale]}</Text>{marketingServicePages.filter(item=>item.slug!==page.slug).map(item=><Pressable accessibilityRole="link" key={item.slug} onPress={()=>router.push({pathname:'/marketing-services/[slug]',params:{slug:item.slug}})} style={({pressed})=>[s.related,{backgroundColor:colors.surface,borderColor:colors.border,opacity:pressed?.8:1}]}><Text style={[s.body,{color:colors.text,fontWeight:'600',flex:1}]}>{item.title[locale]}</Text><Feather name="arrow-up-right" size={20} color={colors.accent}/></Pressable>)}</View>
 </EditVistrahContent></ScrollView></>;
}

const s=StyleSheet.create({
 content:{padding:spacing.pagePadding,paddingBottom:spacing.pageBottom,gap:spacing.sectionGap,width:'100%',maxWidth:layout.pageMaxWidth,alignSelf:'center'},
 hero:{borderRadius:radii.surface,overflow:'hidden'},heroCopy:{gap:spacing.elementGap},eyebrowRow:{flexDirection:'row',justifyContent:'space-between',gap:12},eyebrow:{fontSize:13,lineHeight:18,fontWeight:'500',flexShrink:1},serviceName:{fontSize:14,lineHeight:22,fontWeight:'600'},headline:{fontWeight:'600',letterSpacing:-.6},intro:{color:'#e2e8f0',fontSize:15,lineHeight:24},
 button:{minHeight:controlHeights.standard,paddingHorizontal:18,paddingVertical:12,borderRadius:radii.action,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10},buttonText:{fontSize:14,lineHeight:22,fontWeight:'600',flexShrink:1},
 section:{gap:spacing.elementGap},heading:{...typography.sectionHeading},grid:{flexDirection:'row',flexWrap:'wrap',gap:16},card:{flexGrow:1,padding:spacing.pagePadding,borderRadius:radii.surface,borderWidth:1,gap:12},cardTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:0},cardTitle:{...typography.cardTitle},body:{...typography.body},checkRow:{flexDirection:'row',alignItems:'flex-start',gap:12},step:{paddingHorizontal:10,paddingVertical:5,borderRadius:9999,justifyContent:'center',alignItems:'center'},related:{flexDirection:'row',alignItems:'center',gap:16,padding:spacing.pagePadding,minHeight:64,borderRadius:radii.surface,borderWidth:1},
});
