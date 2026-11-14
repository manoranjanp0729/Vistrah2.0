import {Text} from '../components/typography';
import {MarketingPricingEntry} from '../components/marketing-pricing-entry';
import {EditVistrahContent} from '../components/edit-vistrah-content';
import {UiText,UiElement} from "../components/localized-ui";
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {AccessibilityInfo,Animated,Easing,Image,Linking,Platform,Pressable,ScrollView,StyleSheet,View,useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router,useFocusEffect,useLocalSearchParams} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import {Loading,ErrorPanel} from '../components/ui';
import {useResource} from '../lib/resource';
import {allServices,type Category} from '../lib/catalogue';
import {radii, tabularNums, useTheme, spacing, typography} from '../lib/theme';
import {useLanguage} from '../lib/language';
import {marketingServicePages} from '../../../shared/marketing-services';


const photographs={
 'performance-marketing':require('../../assets/ads-marketing/performance-marketing.webp'),
 'branding-creative':require('../../assets/ads-marketing/branding-creative.webp'),
 'video-content-production':require('../../assets/ads-marketing/video-content-production.webp'),
 'outdoor-advertising':require('../../assets/ads-marketing/outdoor-signage.jpg'),
 'mobility-billboard':require('../../assets/ads-marketing/mobility-billboard.jpg'),
 'social-media-management':require('../../assets/ads-marketing/social-media-management.webp')
};


function Reveal({children,scrollY,reducedMotion,windowHeight}:{children:ReactNode;scrollY:Animated.Value;reducedMotion:boolean;windowHeight:number}){
 const [top,setTop]=useState(0);
 const start=Math.max(0,top-windowHeight*.9);
 return <Animated.View onLayout={event=>setTop(event.nativeEvent.layout.y)} style={!reducedMotion&&top>windowHeight*.8?{opacity:scrollY.interpolate({inputRange:[start,start+100],outputRange:[.3,1],extrapolate:'clamp'}),transform:[{translateY:scrollY.interpolate({inputRange:[start,start+100],outputRange:[12,0],extrapolate:'clamp'})}]}:undefined}>{children}</Animated.View>;
}

export default function MarketingSolutions(){
 const {t}=useLanguage();
 const marketingCards=[
 {key:'performance-marketing',title:t('marketing.digitalTitle'),description:t('marketing.digitalCopy'),alt:t('marketing.photoDigital'),serviceSlug:'digital-marketing'},
 {key:'branding-creative',title:t('marketing.brandTitle'),description:t('marketing.brandCopy'),alt:t('marketing.photoCreative'),serviceSlug:null},
 {key:'outdoor-advertising',title:t('marketing.outdoorTitle'),description:t('marketing.outdoorCopy'),alt:t('marketing.photoOutdoor'),serviceSlug:'outdoor-advertising'},
 {key:'mobility-billboard',title:t('marketing.mobilityTitle'),description:t('marketing.mobilityCopy'),alt:t('marketing.photoMobility'),serviceSlug:null}
] as const;
 const journey=[
 {title:t('marketing.tell'),icon:'zap',copy:t('marketing.tellCopy')},
 {title:t('marketing.plan'),icon:'pen-tool',copy:t('marketing.planCopy')},
 {title:t('marketing.promote'),icon:'send',copy:t('marketing.promoteCopy')},
 {title:t('marketing.review'),icon:'eye',copy:t('marketing.reviewCopy')}
] as const;
 const {width,height}=useWindowDimensions(),wide=width>=760;
 const {colors}=useTheme();
 const ink=colors.text,muted=colors.muted;
 const {topic}=useLocalSearchParams<{topic?:string}>();
 const catalogue=useResource<Category[]>('/catalogue');
 const services=allServices(catalogue.data??[]).filter(item=>item.category.active&&item.category.slug==='marketing'&&item.service.active&&(!item.subcategory||item.subcategory.active));
 const campaign=services.find(item=>item.service.slug==='digital-marketing');
 const cards=[...marketingCards].sort((a,b)=>Number(b.key===topic)-Number(a.key===topic));
 const [selected]=useState<string|undefined>(topic),[focused,setFocused]=useState<string>();
 const [reducedMotion,setReducedMotion]=useState(true),[hovered,setHovered]=useState<string>();
 const scroll=useRef<ScrollView>(null),positions=useRef<Record<string,number>>({});
 const [scrollY]=useState(()=>new Animated.Value(0)),[float]=useState(()=>new Animated.Value(0)),[entrance]=useState(()=>new Animated.Value(0));
 const goTo=(section:string)=>scroll.current?.scrollTo({y:Math.max(0,(positions.current[section]??0)-16),animated:!reducedMotion});
 const requestMarketingSupport=()=>campaign?router.push({pathname:'/request/[id]',params:{id:campaign.service.id}}):goTo('published');
 useEffect(()=>{
  let alive=true;
  AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(alive)setReducedMotion(value);}).catch(()=>{});
  const subscription=AccessibilityInfo.addEventListener('reduceMotionChanged',setReducedMotion);
  return()=>{alive=false;subscription.remove();};
 },[]);
 useFocusEffect(useCallback(()=>{
  if(reducedMotion){float.setValue(0);entrance.setValue(1);return;}
  entrance.setValue(0);
  const arrival=Animated.timing(entrance,{toValue:1,duration:420,easing:Easing.out(Easing.cubic),useNativeDriver:Platform.OS!=='web',isInteraction:false});
  const drifting=Animated.loop(Animated.sequence([
   Animated.timing(float,{toValue:1,duration:3000,easing:Easing.inOut(Easing.sin),useNativeDriver:Platform.OS!=='web',isInteraction:false}),
   Animated.timing(float,{toValue:0,duration:3000,easing:Easing.inOut(Easing.sin),useNativeDriver:Platform.OS!=='web',isInteraction:false})
  ]));
  arrival.start();drifting.start();return()=>{arrival.stop();drifting.stop();};
 },[reducedMotion,float,entrance]));
 const revealProps={scrollY,reducedMotion,windowHeight:height};
 const activeTheme=marketingCards.find(card=>card.key===selected);
 return <SafeAreaView edges={['left','right','bottom']} style={{flex:1,backgroundColor:colors.background}}>
  <Animated.ScrollView ref={scroll} keyboardShouldPersistTaps="handled" scrollEventThrottle={16} onScroll={Animated.event([{nativeEvent:{contentOffset:{y:scrollY}}}],{useNativeDriver:Platform.OS!=='web'})} contentContainerStyle={s.page}><MarketingPricingEntry/><EditVistrahContent slug="marketing-solutions" replace>
   <LinearGradient colors={[colors.surface,colors.elevated]} start={{x:0,y:0}} end={{x:1,y:1}} style={[s.hero,wide&&s.heroWide,{borderWidth:1,borderColor:colors.borderSubtle}]}>
    <View pointerEvents="none" accessible={false} style={[s.heroLight,{backgroundColor:colors.brandPrimary}]}/>
    <Animated.View style={[s.heroCopy,wide&&{flex:1},{transform:[{translateY:entrance.interpolate({inputRange:[0,1],outputRange:[10,0]})}]}]}>
     <Text accessibilityRole="header" style={[s.heroTitle,{color:ink,fontSize:wide?28:22,lineHeight:wide?34:28}]}><UiText value={"VISTRAH Ads & Marketing"}/></Text>
     <Text style={[s.heroDescription,{color:muted}]}>{t('marketing.homeCopy')}</Text>
     <View style={s.actions}><Pressable accessibilityRole="button" onPress={()=>goTo('solutions')} onFocus={()=>setFocused('explore')} onBlur={()=>setFocused(undefined)} style={({pressed})=>[s.primary,{backgroundColor:pressed?colors.brandPrimaryHover:colors.brandPrimary},focused==='explore'&&[s.focusRing,{outlineColor:colors.accent}]]}><Text style={[s.primaryText,{color:colors.brandPrimaryInk}]}>{t('marketing.started')}</Text><Feather name="arrow-down" size={16} color={colors.brandPrimaryInk}/></Pressable><Pressable accessibilityRole="button" onPress={requestMarketingSupport} style={({pressed})=>[s.heroSecondary,{backgroundColor:pressed?colors.elevated:colors.surface,borderWidth:1,borderColor:colors.borderSubtle}]}><Text style={[s.heroSecondaryText,{color:ink}]}>{t('marketing.support')}</Text><Feather name="arrow-right" size={15} color={colors.accent}/></Pressable></View>
    </Animated.View>
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.art,wide&&{flex:1,minWidth:260}]}>
     <View style={[s.artOrbit,{backgroundColor:colors.elevated,opacity:.45}]}/><View style={[s.artOrbitInner,{borderColor:colors.borderSubtle}]}/>
     <Animated.View style={[s.brandTile,{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.borderSubtle,transform:[{translateY:float.interpolate({inputRange:[0,1],outputRange:[0,-7]})},{rotate:'-9deg'}]}]}><Text style={[s.brandLetters,{color:colors.brandPrimary}]}><UiText value={"Aa."}/></Text><View style={[s.brandRule,{backgroundColor:colors.brandPrimary}]}/><Text style={[s.mockCaption,{color:muted}]}>{t('marketing.mark')}</Text></Animated.View>
     <View style={[s.store,{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.borderSubtle}]}><View style={[s.storeSign,{backgroundColor:colors.elevated}]}><Text style={[s.storeSignText,{color:ink}]}>{t('marketing.chapter')}</Text></View><View style={s.awning}>{[0,1,2,3,4,5,6].map(value=><View key={value} style={{flex:1,height:22,borderBottomLeftRadius:6,borderBottomRightRadius:6,backgroundColor:value%2?colors.elevated:colors.brandPrimary}}/>)}</View><View style={s.storeInterior}><View style={[s.storeWindow,{backgroundColor:colors.elevated}]}><Feather name="sun" size={33} color={colors.brandPrimary}/></View><View style={[s.storeDoor,{backgroundColor:colors.accent,opacity:.45}]}/></View></View>
     <Animated.View style={[s.socialMock,{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.borderSubtle,transform:[{translateY:float.interpolate({inputRange:[0,1],outputRange:[0,6]})},{rotate:'8deg'}]}]}><View style={s.mockPhoto}><Image source={photographs['social-media-management']} resizeMode="contain" style={s.fill}/></View><Text style={[s.mockCaption,{color:muted}]}>{t('marketing.connect')}</Text><View style={{flexDirection:'row',gap:8}}><Feather name="heart" size={13} color={colors.brandPrimary}/><Feather name="message-circle" size={13} color={colors.accent}/></View></Animated.View>
     <View style={[s.trendTile,{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.borderSubtle}]}><Feather name="trending-up" size={33} color={colors.accent}/><View style={s.trendBars}>{[12,20,29].map((bar,index)=><View key={index} style={{width:9,height:bar,borderRadius:3,backgroundColor:[colors.borderSubtle,colors.accent,colors.brandPrimary][index]}}/>)}</View></View>
     <View style={[s.megaphone,{backgroundColor:colors.brandPrimary}]}><Feather name="volume-2" size={24} color={colors.brandPrimaryInk}/></View>
    </View>
   </LinearGradient>

   <View onLayout={event=>{positions.current.solutions=event.nativeEvent.layout.y;}} style={s.anchor}>
    <Text style={[s.eyebrow,{color:colors.brandPrimary}]}>{t('marketing.universe')}</Text><Text accessibilityRole="header" style={[s.sectionTitle,{color:ink}]}>{t('marketing.services')}</Text><Text style={[s.sectionCopy,{color:muted}]}>{t('marketing.servicesIntro')}</Text>
   </View>
   <View style={s.universe}>{cards.map(card=>{
    const performance=card.key==='performance-marketing',branding=card.key==='branding-creative',video=card.key==='outdoor-advertising';
    const destination=marketingServicePages.find(item=>item.key===card.key)!;
    const chosen=selected===card.key;
    return <UiElement as={Pressable} key={card.key} accessibilityRole="link" accessibilityLabel={card.title} onPress={()=>router.push({pathname:'/marketing-services/[slug]',params:{slug:destination.slug}})} onFocus={()=>setFocused(card.key)} onBlur={()=>setFocused(undefined)} onHoverIn={()=>setHovered(card.key)} onHoverOut={()=>setHovered(undefined)} style={({pressed})=>[s.solution,{width:wide&&(branding||video)?'48.8%':'100%',backgroundColor:hovered===card.key||pressed?colors.elevated:colors.surface,borderWidth:1,borderColor:chosen?colors.accent:colors.borderSubtle},(chosen||focused===card.key)&&[s.focusRing,{outlineColor:colors.accent}],{opacity:pressed?.92:1,transform:[{translateY:hovered===card.key&&!reducedMotion?-3:0}]}]}>
     {performance?<><View style={s.servicePhoto}><Image source={photographs[card.key]} resizeMode="contain" accessibilityLabel={card.alt} style={s.fill}/><LinearGradient colors={['transparent','rgba(8,8,13,.88)']} style={s.fill}/><View style={s.photoCaption}><Text style={[s.lightEyebrow,{color:colors.brandPrimary}]}>{t('marketing.ideas')}</Text><Text style={[s.performanceTitle,{color:colors.brandPrimaryInk}]}><UiText value={card.title}/></Text></View></View><View style={s.solutionBody}><Text style={[s.solutionCopy,{color:muted}]}><UiText value={card.description}/></Text><View style={s.solutionFooter}><Text style={[s.solutionLink,{color:colors.accent}]}><UiText value={t('marketing.exploreService')}/></Text><Feather name="arrow-right" size={18} color={colors.accent}/></View></View></>:
      branding?<><View style={s.solutionBody}><View style={s.brandingTop}><Text style={[s.editorialLetters,{color:colors.brandPrimary}]}><UiText value={"Aa"}/></Text><View style={{gap:5}}>{[colors.brandPrimary,colors.accent,colors.elevated].map((color,idx)=><View key={idx} style={{width:22,height:9,borderRadius:radii.pill,backgroundColor:color,borderWidth:1,borderColor:colors.borderSubtle}}/>)}</View></View><Text style={[s.solutionTitle,{color:ink}]}><UiText value={card.title}/></Text><Text style={[s.solutionCopy,{color:muted}]}><UiText value={card.description}/></Text></View><View style={s.servicePhoto}><Image source={photographs[card.key]} resizeMode="cover" accessibilityLabel={card.alt} style={s.fill}/></View><View style={s.solutionBody}><Text style={[s.solutionLink,{color:colors.accent}]}>{t('marketing.visual')}</Text></View></>:
      video?<><View style={[s.servicePhoto,{aspectRatio:982/450,borderRadius:radii.surface}]}><Image source={photographs[card.key]} resizeMode="contain" accessibilityLabel={card.alt} style={s.fill}/><View style={[s.videoBadge,{backgroundColor:colors.brandPrimary}]}><Feather name="map-pin" size={22} color={colors.brandPrimaryInk}/></View></View><View style={s.solutionBody}><Text style={[s.lightEyebrow,{color:colors.brandPrimary}]}>{t('marketing.outdoorLabel')}</Text><Text style={[s.solutionTitle,{color:ink}]}><UiText value={card.title}/></Text><Text style={[s.solutionCopy,{color:muted}]}><UiText value={card.description}/></Text><Text style={[s.solutionLink,{color:colors.accent}]}>{t('marketing.outdoorExplore')}</Text></View></>:
      <View style={[s.socialLayout,{flexDirection:wide?'row':'column'}]}><View style={{flex:1,gap:10}}><Text style={[s.eyebrow,{color:colors.brandPrimary}]}>{t('marketing.further')}</Text><Text style={[s.solutionTitle,{color:ink}]}><UiText value={card.title}/></Text><Text style={[s.solutionCopy,{color:muted}]}><UiText value={card.description}/></Text><Text style={[s.solutionLink,{color:colors.accent}]}>{t('marketing.mobilityExplore')}</Text></View><View style={[s.servicePhoto,s.socialPhoto,{aspectRatio:982/450}]}><Image source={photographs[card.key]} resizeMode="contain" accessibilityLabel={card.alt} style={s.fill}/></View></View>}
    </UiElement>;
   })}</View>
   {activeTheme&&<View style={[s.themeNote,{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.borderSubtle}]}><Text style={[s.noteTitle,{color:ink}]}>{activeTheme.title}</Text><Text style={[s.sectionCopy,{color:muted}]}>{activeTheme.description}{' '}{t('marketing.deliverables')}</Text><Pressable accessibilityRole="button" onPress={()=>goTo('published')} style={s.inlineAction}><Text style={[s.solutionLink,{color:colors.accent}]}>{t('marketing.options')}</Text><Feather name="arrow-down" size={16} color={colors.accent}/></Pressable></View>}

   <Reveal {...revealProps}><View style={s.showcaseIntro}><Text style={[s.eyebrow,{color:colors.brandPrimary}]}>{t('marketing.creative')}</Text><Text accessibilityRole="header" style={[s.sectionTitle,{color:ink}]}>{t('marketing.scroll')}</Text><Text style={[s.sectionCopy,{color:muted}]}>{t('marketing.unforgettable')}</Text><Text style={[s.sectionCopy,{color:muted}]}>{t('marketing.illustrative')}</Text></View><UiElement as={ScrollView} horizontal showsHorizontalScrollIndicator contentContainerStyle={s.showcaseRail} accessibilityLabel={t('marketing.formats')}>
    <View style={[s.showcaseCard,{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.borderSubtle}]}><Text style={[s.exampleTag,{color:colors.brandPrimary}]}>{t('marketing.brandExample')}</Text><Text style={[s.posterTitle,{color:ink}]}>{t('marketing.fresh')}</Text><Text style={[s.posterAa,{color:colors.brandPrimary}]}><UiText value={"Aa."}/></Text><View style={s.swatches}>{[colors.brandPrimary,colors.accent,colors.elevated,colors.muted].map((color,idx)=><View key={idx} style={{width:30,height:13,borderRadius:radii.pill,backgroundColor:color,borderWidth:1,borderColor:colors.borderSubtle}}/>)}</View></View>
    <View style={[s.showcaseCard,{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.borderSubtle}]}><Text style={[s.exampleTag,{color:colors.brandPrimary}]}>{t('marketing.socialExample')}</Text><View style={s.showcasePhoto}><UiElement as={Image} source={photographs['branding-creative']} accessibilityLabel="Creative meeting used in an illustrative social layout" resizeMode="cover" style={s.fill}/></View><Text style={[s.showcaseTitle,{color:ink}]}>{t('marketing.story')}</Text><Text style={[s.exampleCopy,{color:muted}]}>{t('marketing.socialConcept')}</Text></View>
    <View style={[s.showcaseCard,{backgroundColor:colors.elevated,borderWidth:1,borderColor:colors.borderSubtle}]}><Text style={[s.exampleTag,{color:colors.brandPrimary}]}>{t('marketing.videoExample')}</Text><View style={s.showcasePhoto}><UiElement as={Image} source={photographs['video-content-production']} accessibilityLabel="Production studio used in an illustrative video layout" resizeMode="cover" style={s.fill}/></View><View style={s.videoTimeline}>{[44,25,58].map((length,index)=><View key={index} style={{width:length,height:7,borderRadius:radii.pill,backgroundColor:[colors.accent,colors.brandPrimary,colors.muted][index]}}/>)}</View><Text style={[s.showcaseTitle,{color:ink}]}>{t('marketing.frame')}</Text></View>
    <View style={[s.showcaseCard,{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.borderSubtle}]}><Text style={[s.exampleTag,{color:colors.brandPrimary}]}>{t('marketing.adExample')}</Text><Feather name="volume-2" size={58} color={colors.brandPrimary}/><Text style={[s.posterTitle,{color:ink}]}>{t('marketing.message')}</Text><Text style={[s.exampleCopy,{color:muted}]}>{t('marketing.adConcept')}</Text></View>
   </UiElement></Reveal>

   <View style={[s.themeNote,{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.borderSubtle,gap:12}]}>
    <Text style={[s.eyebrow,{color:colors.brandPrimary}]}>{t('marketing.visibilityLabel')}</Text>
    <Text accessibilityRole="header" style={[s.sectionTitle,{color:ink}]}>{t('marketing.visibility')}</Text>
    <Text style={[s.sectionCopy,{color:muted}]}>{t('marketing.visibilityIntro')}</Text>
    {([
     {icon:'search',title:t('marketing.discovered'),copy:t('marketing.discoveredCopy')},
     {icon:'pen-tool',title:t('marketing.build'),copy:t('marketing.buildCopy')},
     {icon:'globe',title:t('marketing.everywhere'),copy:t('marketing.everywhereCopy')}
    ] as const).map((benefit,index)=><View key={benefit.title} style={{flexDirection:'row',alignItems:'flex-start',gap:12,paddingTop:12,borderTopWidth:index?1:0,borderTopColor:colors.borderSubtle}}><View style={[s.stepIcon,{backgroundColor:colors.elevated,borderWidth:1,borderColor:colors.borderSubtle}]}><Feather name={benefit.icon} size={19} color={colors.accent}/></View><View style={{flex:1,minWidth:0,gap:4}}><Text style={[s.noteTitle,{color:ink,fontSize:12,lineHeight:18}]}><UiText value={benefit.title}/></Text><Text style={[s.sectionCopy,{color:muted}]}>{benefit.copy}</Text></View></View>)}
    <Text accessibilityRole="header" style={[s.noteTitle,{color:ink,marginTop:4}]}>{t('marketing.ourSupport')}</Text>
    <Text style={[s.sectionCopy,{color:muted}]}>{t('marketing.join')}</Text>
   </View>

   <Reveal {...revealProps}><View style={[s.journeyPanel,{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.borderSubtle}]}><Text style={[s.eyebrow,{color:colors.brandPrimary}]}>{t('marketing.processLabel')}</Text><Text accessibilityRole="header" style={[s.journeyTitle,{color:ink}]}>{t('marketing.process')}</Text><View style={[s.journey,{flexDirection:wide?'row':'column'}]}>{journey.map((step,index)=><View key={step.title} style={[s.journeyStep,wide?{flex:1}:{width:'100%'}]}><View style={s.stepTop}><View style={[s.stepIcon,{backgroundColor:colors.elevated,borderWidth:1,borderColor:colors.borderSubtle}]}><Feather name={step.icon} size={20} color={colors.accent}/></View><Text style={[s.stepNumber,{color:muted},tabularNums]}>0{index+1}</Text>{index<journey.length-1&&<Feather name={wide?'arrow-right':'arrow-down'} size={18} color={colors.muted}/>}</View><Text style={[s.stepTitle,{color:ink}]}><UiText value={step.title}/></Text><Text style={[s.solutionCopy,{color:muted}]}>{step.copy}</Text></View>)}</View><Text style={[s.journeyNote,{color:muted}]}>{t('marketing.scope')}</Text></View></Reveal>

   <View onLayout={event=>{positions.current.published=event.nativeEvent.layout.y;}} style={s.anchor}><Text style={[s.eyebrow,{color:colors.brandPrimary}]}>{t('marketing.next')}</Text><Text accessibilityRole="header" style={[s.sectionTitle,{color:ink}]}>{t('marketing.available')}</Text><Text style={[s.sectionCopy,{color:muted}]}>{t('marketing.details')}</Text><Text style={[s.sectionCopy,{color:muted}]}>{t('marketing.costs')}</Text></View>
   {catalogue.loading?<Loading/>:catalogue.error?<ErrorPanel error={catalogue.error} retry={catalogue.retry}/>:services.length?<View style={s.publishedList}>{services.map(item=><Pressable key={item.service.id} accessibilityRole="link" onPress={()=>router.push({pathname:'/service/[id]',params:{id:item.service.id}})} onHoverIn={()=>setHovered('published-'+item.service.id)} onHoverOut={()=>setHovered(undefined)} style={({pressed})=>[s.publishedRow,{backgroundColor:hovered==='published-'+item.service.id||pressed?colors.elevated:colors.surface,borderColor:hovered==='published-'+item.service.id?colors.accent:colors.borderSubtle,opacity:pressed?.85:1}]}><Text style={[s.publishedTitle,{color:ink}]}>{item.service.title}</Text><Feather name="arrow-right" size={18} color={colors.accent}/></Pressable>)}</View>:<Text style={[s.sectionCopy,{color:muted}]}>{t('marketing.preparing')}</Text>}

   <Reveal {...revealProps}><LinearGradient colors={[colors.surface,colors.elevated]} start={{x:0,y:0}} end={{x:1,y:1}} style={[s.final,{borderWidth:1,borderColor:colors.borderSubtle}]}><Text style={[s.eyebrow,{color:colors.brandPrimary}]}>{t('marketing.finalLabel')}</Text><Text accessibilityRole="header" style={[s.finalTitle,{color:ink}]}>{t('marketing.finalTitle')}</Text><Text style={[s.finalCopy,{color:muted}]}>{t('marketing.finalCopy')}</Text><View style={[s.actions,{flexDirection:wide?'row':'column'}]}><Pressable accessibilityRole="link" onPress={()=>router.push('/membership')} style={({pressed})=>[s.finalButton,{backgroundColor:pressed?colors.brandPrimaryHover:colors.brandPrimary}]}><Text style={[s.finalButtonText,{color:colors.brandPrimaryInk}]}>{t('marketing.membership')}</Text><Feather name="arrow-right" size={18} color={colors.brandPrimaryInk}/></Pressable><Pressable accessibilityRole="link" onPress={()=>Linking.openURL('mailto:info@vistrah.in?subject=VISTRAH%20Ads%20%26%20Marketing%20Enquiry')} style={({pressed})=>[s.finalButton,{backgroundColor:pressed?colors.elevated:colors.surface,borderWidth:1,borderColor:colors.borderSubtle}]}><Text style={[s.finalButtonText,{color:colors.accent}]}>{t('marketing.contact')}</Text><Feather name="mail" size={18} color={colors.accent}/></Pressable></View><UiElement as={Pressable} accessibilityRole="link" accessibilityLabel={t('marketing.email')} onPress={()=>Linking.openURL('mailto:info@vistrah.in?subject=VISTRAH%20Ads%20%26%20Marketing%20Enquiry')} style={{minHeight:44,justifyContent:'center',alignSelf:'flex-start'}}><Text style={[s.finalCopy,{color:colors.accent,textDecorationLine:'underline'}]}>info@vistrah.in</Text></UiElement></LinearGradient></Reveal>
  </EditVistrahContent></Animated.ScrollView>
 </SafeAreaView>;
}

const s=StyleSheet.create({
 page:{width:'100%',maxWidth:1180,alignSelf:'center',padding:spacing.pagePadding,paddingBottom:spacing.pageBottom,gap:spacing.sectionGap},
 hero:{borderRadius:radii.surface,padding:spacing.sectionPadding,gap:spacing.elementGap,overflow:'hidden'},heroWide:{flexDirection:'row',alignItems:'center',padding:36,gap:26},
 heroLight:{position:'absolute',width:360,height:360,borderRadius:radii.pill,opacity:.14,right:-130,top:-130},
 heroCopy:{gap:spacing.elementGap,minWidth:0},overline:{fontSize:10,lineHeight:15,fontWeight:'600',letterSpacing:1.6},heroTitle:{fontWeight:'700',letterSpacing:-1.1},heroDescription:{fontSize:14,lineHeight:22,maxWidth:470},
 actions:{flexDirection:'row',flexWrap:'wrap',gap:10},primary:{minHeight:48,paddingHorizontal:15,paddingVertical:12,borderRadius:radii.action,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},primaryText:{fontSize:12,lineHeight:18,fontWeight:'700'},heroSecondary:{minHeight:48,paddingHorizontal:15,paddingVertical:12,borderRadius:radii.action,flexDirection:'row',alignItems:'center',gap:8},heroSecondaryText:{fontSize:12,lineHeight:18,fontWeight:'600'},focusRing:{outlineWidth:2,outlineStyle:'solid',outlineOffset:3},
 art:{height:255,width:'100%',alignSelf:'center',maxWidth:390},artOrbit:{position:'absolute',width:220,height:220,borderRadius:radii.pill,alignSelf:'center',top:12},artOrbitInner:{position:'absolute',width:160,height:160,borderRadius:radii.pill,borderWidth:1,alignSelf:'center',top:42},
 brandTile:{position:'absolute',left:2,top:13,width:94,height:99,padding:12,borderRadius:radii.surface},brandLetters:{fontSize:39,lineHeight:46,fontWeight:'700'},brandRule:{width:36,height:4,borderRadius:radii.pill,marginBottom:6},mockCaption:{fontSize:7,lineHeight:11,letterSpacing:.6,fontWeight:'700'},
 store:{position:'absolute',left:'20%',bottom:20,width:'60%',maxWidth:200,height:135,borderRadius:radii.surface,overflow:'hidden'},storeSign:{height:34,alignItems:'center',justifyContent:'center'},storeSignText:{fontSize:8,lineHeight:12,fontWeight:'700',letterSpacing:.4},awning:{flexDirection:'row'},storeInterior:{flex:1,paddingHorizontal:12,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},storeWindow:{width:'48%',height:49,marginBottom:12,borderRadius:radii.action,alignItems:'center',justifyContent:'center'},storeDoor:{width:'31%',height:65,borderTopLeftRadius:radii.action,borderTopRightRadius:radii.action},
 mockPhoto:{width:74,aspectRatio:16/9,borderRadius:radii.action,overflow:'hidden'},socialMock:{position:'absolute',right:2,bottom:37,padding:7,width:88,gap:7,borderRadius:radii.surface},trendTile:{position:'absolute',right:11,top:6,width:78,height:72,padding:10,borderRadius:radii.surface},trendBars:{position:'absolute',bottom:10,right:10,flexDirection:'row',alignItems:'flex-end',gap:4},megaphone:{position:'absolute',left:13,bottom:14,width:46,height:46,borderRadius:radii.pill,alignItems:'center',justifyContent:'center',transform:[{rotate:'-10deg'}]},
 anchor:{gap:spacing.elementGap},eyebrow:{fontSize:9,lineHeight:14,letterSpacing:1.5,fontWeight:'700'},sectionTitle:{...typography.sectionHeading},sectionCopy:{...typography.body},
 universe:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:14},solution:{borderRadius:radii.surface,overflow:'hidden'},servicePhoto:{width:'100%',aspectRatio:16/9,position:'relative',overflow:'hidden'},fill:{position:'absolute',top:0,left:0,width:'100%',height:'100%'},photoCaption:{position:'absolute',bottom:18,left:18,right:18,gap:8},lightEyebrow:{fontSize:9,lineHeight:14,fontWeight:'600',letterSpacing:1.1},performanceTitle:{fontSize:26,lineHeight:31,fontWeight:'700'},solutionBody:{padding:spacing.pagePadding,gap:spacing.elementGap},solutionTitle:{...typography.heading},solutionCopy:{...typography.body},solutionFooter:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12},solutionLink:{fontSize:12,lineHeight:18,fontWeight:'600'},brandingTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},editorialLetters:{fontSize:56,lineHeight:60,fontWeight:'700',letterSpacing:-3},videoBadge:{position:'absolute',left:16,bottom:16,width:46,height:46,borderRadius:radii.pill,alignItems:'center',justifyContent:'center'},socialLayout:{padding:spacing.pagePadding,gap:spacing.elementGap},socialPhoto:{maxWidth:280,borderRadius:radii.surface,alignSelf:'center'},
 themeNote:{padding:spacing.pagePadding,borderRadius:radii.surface,gap:spacing.elementGap},noteTitle:{fontSize:16,lineHeight:22,fontWeight:'600'},inlineAction:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'},
 showcaseIntro:{gap:spacing.elementGap,marginBottom:spacing.elementGap},showcaseRail:{gap:12,paddingVertical:4,paddingRight:4},showcaseCard:{width:248,minHeight:275,borderRadius:radii.surface,padding:17,gap:13,justifyContent:'space-between'},exampleTag:{fontSize:8,lineHeight:12,fontWeight:'700',letterSpacing:1},posterTitle:{fontSize:27,lineHeight:32,fontWeight:'700',letterSpacing:-.7},posterAa:{fontSize:62,lineHeight:66,fontWeight:'700'},swatches:{flexDirection:'row',gap:7},showcasePhoto:{width:'100%',aspectRatio:16/9,borderRadius:radii.action,overflow:'hidden'},showcaseTitle:{...typography.heading},exampleCopy:{fontSize:12,lineHeight:18},videoTimeline:{flexDirection:'row',gap:5},
 journeyPanel:{borderRadius:radii.surface,padding:spacing.sectionPadding,gap:spacing.elementGap},journeyTitle:{fontSize:28,lineHeight:33,fontWeight:'700',letterSpacing:-.6},journey:{gap:spacing.pageGap},journeyStep:{gap:spacing.elementGap,minWidth:0},stepTop:{flexDirection:'row',alignItems:'center',gap:10},stepIcon:{width:40,height:40,borderRadius:radii.action,alignItems:'center',justifyContent:'center'},stepNumber:{fontSize:11,lineHeight:16,fontWeight:'600'},stepTitle:{fontSize:17,lineHeight:22,fontWeight:'600'},journeyNote:{fontSize:11,lineHeight:17},
 publishedList:{gap:spacing.elementGap},publishedRow:{minHeight:54,paddingVertical:14,paddingHorizontal:16,borderRadius:radii.surface,borderWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},publishedTitle:{flex:1,fontSize:14,lineHeight:20,fontWeight:'600'},
 final:{padding:spacing.sectionPadding,borderRadius:radii.surface,gap:spacing.elementGap},finalTitle:{fontSize:30,lineHeight:35,fontWeight:'700',letterSpacing:-.8},finalCopy:{fontSize:13,lineHeight:21,maxWidth:580},finalButton:{alignSelf:'flex-start',minHeight:48,paddingHorizontal:17,paddingVertical:13,borderRadius:radii.action,flexDirection:'row',alignItems:'center',gap:10},finalButtonText:{fontSize:12,lineHeight:18,fontWeight:'600'}
});
