import {Text,useAppFont} from '../../components/typography';
import {MarketingPricingEntry} from '../../components/marketing-pricing-entry';
import {EditVistrahContent} from '../../components/edit-vistrah-content';
import {useRef,useState} from 'react';
import {Image,Linking,Platform,Pressable,ScrollView,StyleSheet,View,useWindowDimensions} from 'react-native';
import {Stack,router,useLocalSearchParams} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import {useLanguage} from '../../lib/language';
import {useTheme,accentPresets} from '../../lib/theme';
import {themedMarketingVisuals} from '../../../../shared/marketing-visuals';
import {getMarketingService,marketingServicePages,marketingPageLabels as labels,marketingEnquiryHref} from '../../../../shared/marketing-services';

const photos={
 'performance-marketing':require('../../../assets/ads-marketing/performance-marketing.webp'),
 'branding-creative':require('../../../assets/ads-marketing/branding-creative.webp'),
 'outdoor-advertising':require('../../../assets/ads-marketing/outdoor-signage.jpg'),
 'mobility-billboard':require('../../../assets/ads-marketing/mobility-billboard.jpg'),
};
const icons=['compass','edit-3','play-circle','send'] as const;

export default function MarketingServiceLanding(){
 const headerFont=useAppFont(600);
 const {slug}=useLocalSearchParams<{slug?:string|string[]}>();
 const page=getMarketingService(typeof slug==='string'?slug:'');
 const {locale}=useLanguage();const {colors,mode,accent}=useTheme();const buttonInk=accentPresets.find(p=>p.id===accent)?.light??colors.accent;const {width}=useWindowDimensions();
 const wide=width>=760;const scroll=useRef<ScrollView>(null),capabilitiesY=useRef(0);const [error,setError]=useState('');
 if(!page)return <View style={[s.content,{backgroundColor:colors.background}]}><Text style={{color:colors.text}}>{labels.back[locale]}</Text><Pressable accessibilityRole="link" onPress={()=>router.replace('/marketing-solutions')} style={s.button}><Feather name="arrow-left" color={colors.accent} size={20}/><Text style={{color:colors.text}}>{labels.back[locale]}</Text></Pressable></View>;
 const index=marketingServicePages.indexOf(page);const visual=themedMarketingVisuals(page.key,colors.accent);const heroInk=mode==='dark'?'#edf3f8':visual.ink;
 async function enquire(){setError('');try{await Linking.openURL(marketingEnquiryHref(page!,locale));}catch{setError(labels.emailError[locale]);}}
 const enquiryButton=<Pressable accessibilityRole="link" onPress={()=>void enquire()} style={({pressed})=>[s.button,{backgroundColor:'#fff',opacity:pressed?.8:1}]}><Text style={[s.buttonText,{color:buttonInk}]}>{labels.discuss[locale]}</Text><Feather name="arrow-up-right" color={buttonInk} size={18}/></Pressable>;
 return <><Stack.Screen options={{title:'VISTRAH Ads & Marketing',headerTitleStyle:{fontSize:15,fontFamily:headerFont,fontWeight:Platform.OS==='web'?'600':'normal'},headerStyle:{backgroundColor:mode==='dark'?colors.background:visual.paper},headerBackground:()=> <View style={{flex:1,backgroundColor:mode==='dark'?colors.background:visual.paper}}/>}}/><ScrollView ref={scroll} style={{flex:1,backgroundColor:colors.background}} contentContainerStyle={s.content}><MarketingPricingEntry/><EditVistrahContent slug={page.slug} replace>
  <View style={{gap:10}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:10,paddingVertical:3,borderRadius:12,borderWidth:1,borderColor:mode==='dark'?colors.border:visual.wash,backgroundColor:mode==='dark'?colors.surface:visual.paper}}><Pressable accessibilityRole="link" onPress={()=>router.navigate('/marketing-solutions')} style={{minHeight:36,flexDirection:'row',alignItems:'center',gap:6,flexShrink:1}}><Feather name="arrow-left" size={15} color={heroInk}/><Text numberOfLines={1} style={{color:heroInk,fontSize:12,flexShrink:1,lineHeight:18}}>{labels.back[locale]}</Text></Pressable><Feather name="chevron-right" size={13} color={heroInk}/><Text numberOfLines={1} style={{color:heroInk,fontSize:12,flex:1,lineHeight:18,fontWeight:'600'}}>{page.title[locale]}</Text></View>
  <LinearGradient colors={mode==='dark'?[visual.dark,visual.dark]:[visual.paper,visual.paper]} start={{x:0,y:0}} end={{x:1,y:1}} style={s.hero}>
   <View style={[s.heroCopy,{padding:wide?32:24}]}><View style={s.eyebrowRow}><Text style={[s.eyebrow,{color:heroInk}]}>VISTRAH ADS & MARKETING</Text><Text style={[s.eyebrow,{color:colors.accent}]}>0{index+1} / 04</Text></View><Text style={[s.serviceName,{color:colors.accent}]}>{page.title[locale]}</Text><Text accessibilityRole="header" style={[s.headline,{color:heroInk,fontFamily:'serif',fontWeight:'400',fontSize:wide?52:38,lineHeight:locale==='en'?(wide?60:48):(wide?72:56)}]}>{page.headline[locale]}</Text><Text style={[s.intro,{color:heroInk}]}>{page.intro[locale]}</Text><View style={{gap:10,alignItems:'stretch'}}>{enquiryButton}<Pressable accessibilityRole="button" onPress={()=>scroll.current?.scrollTo({y:capabilitiesY.current,animated:true})} style={[s.button,{borderWidth:1,borderColor:'#fff',backgroundColor:'#fff'}]}><Text style={{color:buttonInk,fontSize:14,fontWeight:'600'}}>{labels.explore[locale]}</Text><Feather name="arrow-right" size={17} color={buttonInk}/></Pressable></View></View>
   <View style={{height:wide?460:370,marginHorizontal:20,position:'relative'}}>
    <View style={{position:'absolute',top:18,left:12,right:24,bottom:76,borderTopLeftRadius:70,borderTopRightRadius:16,borderBottomRightRadius:70,borderBottomLeftRadius:16,overflow:'hidden',transform:[{rotate:'-3deg'}]}}><Image source={photos[page.key]} accessibilityLabel={page.title[locale]} resizeMode="cover" style={StyleSheet.absoluteFill}/></View>
    <View accessible={false} style={{position:'absolute',top:0,left:0,padding:16,borderRadius:16,backgroundColor:visual.wash,transform:[{rotate:'7deg'}]}}><Text style={{fontFamily:'serif',fontSize:32,color:colors.accent}}>{visual.mark}</Text></View>
    <View style={{position:'absolute',bottom:18,left:36,right:4,padding:20,borderRadius:16,backgroundColor:visual.wash,transform:[{rotate:'2deg'}]}}><Text style={{color:colors.accent,fontSize:11,letterSpacing:2,marginBottom:8}}>VISTRAH / 0{index+1}</Text><Text style={{color:visual.ink,fontSize:25,lineHeight:34,fontWeight:'700'}}>{page.concept[locale]}</Text></View>
   </View>
  </LinearGradient>
  </View>
  <View onLayout={event=>{capabilitiesY.current=event.nativeEvent.layout.y;}} style={s.section}><Text style={{color:colors.accent,fontSize:12,lineHeight:20}}>{page.title[locale]}</Text><Text accessibilityRole="header" style={[s.heading,{color:colors.text}]}>{labels.capabilities[locale]}</Text><View style={s.grid}>{page.capabilities.map(([title,description],i)=><View key={title.en} style={[s.card,{flexBasis:wide?(i===0||i===3?'60%':'30%'):'100%',backgroundColor:i===0?(mode==='dark'?visual.dark:visual.paper):colors.surface,borderColor:colors.border}]}><View style={s.cardTop}><Feather name={icons[i]} size={23} color={colors.accent}/><Text style={{color:colors.muted,fontSize:12}}>0{i+1}</Text></View><Text style={[s.cardTitle,{fontSize:22,lineHeight:30,color:i===0?heroInk:colors.text}]}>{title[locale]}</Text><Text style={[s.body,{color:i===0?heroInk:colors.muted}]}>{description[locale]}</Text></View>)}</View></View>
  <View style={[s.card,{backgroundColor:mode==='dark'?visual.dark:visual.paper,borderColor:colors.border,gap:18}]}><Text accessibilityRole="header" style={[s.heading,{color:colors.text}]}>{labels.includes[locale]}</Text>{page.outputs.map(item=><View key={item.en} style={s.checkRow}><Feather name="check" size={20} color={colors.accent}/><Text style={[s.body,{color:colors.text,flex:1}]}>{item[locale]}</Text></View>)}</View>
  <View style={s.section}><Text accessibilityRole="header" style={[s.heading,{color:colors.text}]}>{labels.process[locale]}</Text>{labels.steps.map((step,i)=><View key={step.en} style={{flexDirection:'row',gap:16,paddingVertical:12,borderBottomWidth:1,borderColor:colors.border}}><View style={[s.step,{backgroundColor:colors.soft}]}><Text style={{color:colors.accent,fontWeight:'700'}}>0{i+1}</Text></View><View style={{flex:1,gap:6}}><Text style={[s.cardTitle,{color:colors.text}]}>{step[locale]}</Text><Text style={[s.body,{color:colors.muted}]}>{labels.stepCopy[i][locale]}</Text></View></View>)}</View>
  <LinearGradient colors={mode==='dark'?[visual.dark,visual.dark]:[visual.paper,visual.wash]} start={{x:0,y:0}} end={{x:1,y:1}} style={[s.card,{borderWidth:0,gap:20,padding:24}]}><Text accessibilityRole="header" style={[s.heading,{color:heroInk}]}>{labels.brief[locale]}</Text>{page.brief.map(item=><View key={item.en} style={s.checkRow}><Feather name="check" color={colors.accent} size={18}/><Text style={[s.body,{color:heroInk,flex:1}]}>{item[locale]}</Text></View>)}{enquiryButton}<Text style={{color:heroInk,fontSize:12,lineHeight:20}}>{labels.note[locale]}</Text>{!!error&&<Text accessibilityRole="alert" style={{color:heroInk,lineHeight:22}}>{error}</Text>}</LinearGradient>
  <View style={s.section}><Text accessibilityRole="header" style={[s.heading,{color:colors.text}]}>{labels.related[locale]}</Text>{marketingServicePages.filter(item=>item.slug!==page.slug).map(item=><Pressable accessibilityRole="link" key={item.slug} onPress={()=>router.push({pathname:'/marketing-services/[slug]',params:{slug:item.slug}})} style={({pressed})=>[s.related,{backgroundColor:colors.surface,borderColor:colors.border,opacity:pressed?.8:1}]}><Text style={[s.body,{color:colors.text,fontWeight:'600',flex:1}]}>{item.title[locale]}</Text><Feather name="arrow-up-right" size={20} color={colors.accent}/></Pressable>)}</View>
 </EditVistrahContent></ScrollView></>;
}

const s=StyleSheet.create({
 content:{padding:18,paddingTop:6,paddingBottom:40,gap:24,width:'100%',maxWidth:1120,alignSelf:'center'},
 hero:{borderRadius:26,overflow:'hidden'},heroCopy:{gap:20},eyebrowRow:{flexDirection:'row',justifyContent:'space-between',gap:12},eyebrow:{fontSize:10,lineHeight:16,letterSpacing:1,color:'#dbd3ef',flexShrink:1},serviceName:{fontSize:14,lineHeight:22,fontWeight:'600'},headline:{color:'#fff',fontWeight:'800',letterSpacing:-.8},intro:{color:'#e1d9ef',fontSize:15,lineHeight:26},
 button:{minHeight:48,paddingHorizontal:18,paddingVertical:12,borderRadius:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10},buttonText:{color:'#fff',fontSize:14,lineHeight:22,fontWeight:'700',flexShrink:1},
 section:{gap:16},heading:{fontSize:25,lineHeight:35,fontWeight:'700'},grid:{flexDirection:'row',flexWrap:'wrap',gap:14},card:{flexGrow:1,padding:22,borderRadius:22,borderWidth:1,gap:12},cardTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},cardTitle:{fontSize:18,lineHeight:26,fontWeight:'700'},body:{fontSize:15,lineHeight:25},checkRow:{flexDirection:'row',alignItems:'flex-start',gap:12},step:{width:36,height:36,borderRadius:18,justifyContent:'center',alignItems:'center'},related:{flexDirection:'row',alignItems:'center',gap:16,padding:18,minHeight:72,borderRadius:18,borderWidth:1},
});
