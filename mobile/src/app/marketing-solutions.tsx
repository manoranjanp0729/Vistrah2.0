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
import {useTheme,spacing,typography} from '../lib/theme';
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
 const {mode,accentGradient}=useTheme();
 const ink=mode==='dark'?'#f1f5f9':'#0F294A',muted=mode==='dark'?'#cbd5e1':'#475569';
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
 return <SafeAreaView edges={['top','left','right','bottom']} style={{flex:1,backgroundColor:mode==='dark'?'#091526':'#f8fafc'}}>
  <Animated.ScrollView ref={scroll} keyboardShouldPersistTaps="handled" scrollEventThrottle={16} onScroll={Animated.event([{nativeEvent:{contentOffset:{y:scrollY}}}],{useNativeDriver:Platform.OS!=='web'})} contentContainerStyle={s.page}><Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={()=>(router.canGoBack()?router.back():router.replace('/'))} style={({pressed})=>({alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:6,minHeight:36,paddingVertical:4,opacity:pressed?0.72:1})}><Feather name="arrow-left" size={16} color="#EA580C"/><Text style={{color:'#EA580C',fontWeight:'600',fontSize:13.5}}>{t('common.back')}</Text></Pressable><MarketingPricingEntry/><EditVistrahContent slug="marketing-solutions" replace>
   <LinearGradient colors={accentGradient} start={{x:0,y:0}} end={{x:1,y:1}} style={[s.hero,wide&&s.heroWide]}>
    <Animated.View style={[s.heroCopy,wide&&{flex:1},{transform:[{translateY:entrance.interpolate({inputRange:[0,1],outputRange:[10,0]})}]}]}>
     <Text accessibilityRole="header" style={[s.heroTitle,{fontSize:wide?28:22,lineHeight:wide?34:28}]}><UiText value={"VISTRAH Ads & Marketing"}/></Text>
     <Text style={s.heroDescription}>{t('marketing.homeCopy')}</Text>
     <View style={s.actions}><Pressable accessibilityRole="button" onPress={()=>goTo('solutions')} onFocus={()=>setFocused('explore')} onBlur={()=>setFocused(undefined)} style={({pressed})=>[s.primary,focused==='explore'&&s.focusRing,{opacity:pressed?.85:1}]}><Text style={s.primaryText}>{t('marketing.started')}</Text><Feather name="arrow-down" size={16} color="#0F294A"/></Pressable><Pressable accessibilityRole="button" onPress={requestMarketingSupport} style={({pressed})=>[s.heroSecondary,{opacity:pressed?.8:1}]}><Text style={s.heroSecondaryText}>{t('marketing.support')}</Text><Feather name="arrow-right" size={15} color="#fff"/></Pressable></View>
    </Animated.View>
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.art,wide&&{flex:1,minWidth:260}]}>
     <Animated.View style={[s.brandTile,{transform:[{translateY:float.interpolate({inputRange:[0,1],outputRange:[0,-7]})},{rotate:'-9deg'}]}]}><Text style={s.brandLetters}><UiText value={"Aa."}/></Text><View style={s.brandRule}/><Text style={s.mockCaption}>{t('marketing.mark')}</Text></Animated.View>
     <View style={s.store}><View style={s.storeSign}><Text style={s.storeSignText}>{t('marketing.chapter')}</Text></View><View style={s.awning}>{[0,1,2,3,4,5,6].map(value=><View key={value} style={{flex:1,height:22,borderBottomLeftRadius:6,borderBottomRightRadius:6,backgroundColor:value%2?'#fff7ed':'#F97316'}}/>)}</View><View style={s.storeInterior}><View style={s.storeWindow}><Feather name="sun" size={33} color="#ffb45c"/></View><View style={s.storeDoor}/></View></View>
     <Animated.View style={[s.socialMock,{transform:[{translateY:float.interpolate({inputRange:[0,1],outputRange:[0,6]})},{rotate:'8deg'}]}]}><View style={s.mockPhoto}><Image source={photographs['social-media-management']} resizeMode="cover" style={s.fill}/></View><Text style={s.mockCaption}>{t('marketing.connect')}</Text><View style={{flexDirection:'row',gap:8}}><Feather name="heart" size={13} color="#EA580C"/><Feather name="message-circle" size={13} color="#0F294A"/></View></Animated.View>
     <View style={s.trendTile}><Feather name="trending-up" size={33} color="#F97316"/><View style={s.trendBars}>{[12,20,29].map((bar,index)=><View key={index} style={{width:9,height:bar,borderRadius:3,backgroundColor:['#93c5fd','#3b82f6','#0F294A'][index]}}/>)}</View></View>
     <View style={s.megaphone}><Feather name="volume-2" size={24} color="#fff"/></View>
    </View>
   </LinearGradient>

   <View onLayout={event=>{positions.current.solutions=event.nativeEvent.layout.y;}} style={s.anchor}>
    <Text style={s.eyebrow}>{t('marketing.universe')}</Text><Text accessibilityRole="header" style={[s.sectionTitle,{color:ink}]}>{t('marketing.services')}</Text><Text style={[s.sectionCopy,{color:muted}]}>{t('marketing.servicesIntro')}</Text>
   </View>
   <View style={s.universe}>{cards.map(card=>{
    const performance=card.key==='performance-marketing',branding=card.key==='branding-creative',video=card.key==='outdoor-advertising';
    const destination=marketingServicePages.find(item=>item.key===card.key)!;
    const chosen=selected===card.key;
    return <UiElement as={Pressable} key={card.key} accessibilityRole="link" accessibilityLabel={card.title} onPress={()=>router.push({pathname:'/marketing-services/[slug]',params:{slug:destination.slug}})} onFocus={()=>setFocused(card.key)} onBlur={()=>setFocused(undefined)} onHoverIn={()=>setHovered(card.key)} onHoverOut={()=>setHovered(undefined)} style={({pressed})=>[s.solution,{width:wide&&(branding||video)?'48.8%':'100%',backgroundColor:video?'#E3EDF5':branding?'#fff7ed':performance?'#eff6ff':'#f1f5f9'},(chosen||focused===card.key)&&s.focusRing,{opacity:pressed?.9:1,transform:[{translateY:hovered===card.key&&!reducedMotion?-3:0}]}]}>
     {performance?<><View style={s.servicePhoto}><Image source={photographs[card.key]} resizeMode="cover" accessibilityLabel={card.alt} style={s.fill}/><LinearGradient colors={['transparent','rgba(9,27,51,.84)']} style={s.fill}/><View style={s.photoCaption}><Text style={s.lightEyebrow}>{t('marketing.ideas')}</Text><Text style={s.performanceTitle}><UiText value={card.title}/></Text></View></View><View style={s.solutionBody}><Text style={s.solutionCopy}><UiText value={card.description}/></Text><View style={s.solutionFooter}><Text style={s.solutionLink}><UiText value={t('marketing.exploreService')}/></Text><Feather name="arrow-right" size={18} color="#0F294A"/></View></View></>:
      branding?<><View style={s.solutionBody}><View style={s.brandingTop}><Text style={s.editorialLetters}><UiText value={"Aa"}/></Text><View style={{gap:5}}>{['#0F294A','#F97316','#132F54'].map(color=><View key={color} style={{width:22,height:9,borderRadius:5,backgroundColor:color}}/>)}</View></View><Text style={s.solutionTitle}><UiText value={card.title}/></Text><Text style={s.solutionCopy}><UiText value={card.description}/></Text></View><View style={s.servicePhoto}><Image source={photographs[card.key]} resizeMode="cover" accessibilityLabel={card.alt} style={s.fill}/></View><View style={s.solutionBody}><Text style={s.solutionLink}>{t('marketing.visual')}</Text></View></>:
      video?<><View style={[s.servicePhoto,{aspectRatio:4/3,borderRadius:16}]}><Image source={photographs[card.key]} resizeMode="cover" accessibilityLabel={card.alt} style={s.fill}/><View style={s.videoBadge}><Feather name="map-pin" size={22} color="#fff"/></View></View><View style={s.solutionBody}><Text style={[s.lightEyebrow,{color:'#536b80'}]}>{t('marketing.outdoorLabel')}</Text><Text style={[s.solutionTitle,{color:'#123451'}]}><UiText value={card.title}/></Text><Text style={[s.solutionCopy,{color:'#536b80'}]}><UiText value={card.description}/></Text><Text style={{...s.solutionLink,color:'#256087'}}>{t('marketing.outdoorExplore')}</Text></View></>:
      <View style={[s.socialLayout,{flexDirection:wide?'row':'column'}]}><View style={{flex:1,gap:10}}><Text style={s.eyebrow}>{t('marketing.further')}</Text><Text style={s.solutionTitle}><UiText value={card.title}/></Text><Text style={s.solutionCopy}><UiText value={card.description}/></Text><Text style={s.solutionLink}>{t('marketing.mobilityExplore')}</Text></View><View style={[s.servicePhoto,s.socialPhoto,{aspectRatio:4/3}]}><Image source={photographs[card.key]} resizeMode="cover" accessibilityLabel={card.alt} style={s.fill}/></View></View>}
    </UiElement>;
   })}</View>
   {activeTheme&&<View style={[s.themeNote,{backgroundColor:mode==='dark'?'#0f233d':'#f1f5f9'}]}><Text style={[s.noteTitle,{color:ink}]}>{activeTheme.title}</Text><Text style={[s.sectionCopy,{color:muted}]}>{activeTheme.description}{' '}{t('marketing.deliverables')}</Text><Pressable accessibilityRole="button" onPress={()=>goTo('published')} style={s.inlineAction}><Text style={[s.solutionLink,{color:mode==='dark'?'#fb923c':'#0F294A'}]}>{t('marketing.options')}</Text><Feather name="arrow-down" size={16} color={mode==='dark'?'#fb923c':'#0F294A'}/></Pressable></View>}

   <Reveal {...revealProps}><View style={s.showcaseIntro}><Text style={s.eyebrow}>{t('marketing.creative')}</Text><Text accessibilityRole="header" style={[s.sectionTitle,{color:ink}]}>{t('marketing.scroll')}</Text><Text style={[s.sectionCopy,{color:muted}]}>{t('marketing.unforgettable')}</Text><Text style={[s.sectionCopy,{color:muted}]}>{t('marketing.illustrative')}</Text></View><UiElement as={ScrollView} horizontal showsHorizontalScrollIndicator contentContainerStyle={s.showcaseRail} accessibilityLabel={t('marketing.formats')}>
    <View style={[s.showcaseCard,{backgroundColor:'#eff6ff'}]}><Text style={s.exampleTag}>{t('marketing.brandExample')}</Text><Text style={s.posterTitle}>{t('marketing.fresh')}</Text><Text style={s.posterAa}><UiText value={"Aa."}/></Text><View style={s.swatches}>{['#0F294A','#F97316','#132F54','#EA580C'].map(color=><View key={color} style={{width:30,height:13,borderRadius:5,backgroundColor:color}}/>)}</View></View>
    <View style={[s.showcaseCard,{backgroundColor:'#fff7ed'}]}><Text style={s.exampleTag}>{t('marketing.socialExample')}</Text><View style={s.showcasePhoto}><UiElement as={Image} source={photographs['branding-creative']} accessibilityLabel="Creative meeting used in an illustrative social layout" resizeMode="cover" style={s.fill}/></View><Text style={s.showcaseTitle}>{t('marketing.story')}</Text><Text style={s.exampleCopy}>{t('marketing.socialConcept')}</Text></View>
    <View style={[s.showcaseCard,{backgroundColor:'#0F294A'}]}><Text style={[s.exampleTag,{color:'#cbd5e1'}]}>{t('marketing.videoExample')}</Text><View style={s.showcasePhoto}><UiElement as={Image} source={photographs['video-content-production']} accessibilityLabel="Production studio used in an illustrative video layout" resizeMode="cover" style={s.fill}/></View><View style={s.videoTimeline}>{[44,25,58].map((length,index)=><View key={index} style={{width:length,height:7,borderRadius:3,backgroundColor:['#60a5fa','#F97316','#fdba74'][index]}}/>)}</View><Text style={[s.showcaseTitle,{color:'#fff'}]}>{t('marketing.frame')}</Text></View>
    <View style={[s.showcaseCard,{backgroundColor:'#f5dfc8'}]}><Text style={s.exampleTag}>{t('marketing.adExample')}</Text><Feather name="volume-2" size={58} color="#EA580C"/><Text style={s.posterTitle}>{t('marketing.message')}</Text><Text style={s.exampleCopy}>{t('marketing.adConcept')}</Text></View>
   </UiElement></Reveal>

   <View style={[s.themeNote,{backgroundColor:mode==='dark'?'#0f233d':'#f1f5f9',gap:12}]}>
    <Text style={s.eyebrow}>{t('marketing.visibilityLabel')}</Text>
    <Text accessibilityRole="header" style={[s.sectionTitle,{color:ink}]}>{t('marketing.visibility')}</Text>
    <Text style={[s.sectionCopy,{color:muted}]}>{t('marketing.visibilityIntro')}</Text>
    {([
     {icon:'search',title:t('marketing.discovered'),copy:t('marketing.discoveredCopy')},
     {icon:'pen-tool',title:t('marketing.build'),copy:t('marketing.buildCopy')},
     {icon:'globe',title:t('marketing.everywhere'),copy:t('marketing.everywhereCopy')}
    ] as const).map((benefit,index)=><View key={benefit.title} style={{flexDirection:'row',alignItems:'flex-start',gap:12,paddingTop:12,borderTopWidth:index?StyleSheet.hairlineWidth:0,borderTopColor:mode==='dark'?'#1e3a5f':'#cbd5e1'}}><View style={s.stepIcon}><Feather name={benefit.icon} size={19} color="#F97316"/></View><View style={{flex:1,minWidth:0,gap:4}}><Text style={[s.noteTitle,{color:ink,fontSize:12,lineHeight:18}]}><UiText value={benefit.title}/></Text><Text style={[s.sectionCopy,{color:muted}]}>{benefit.copy}</Text></View></View>)}
    <Text accessibilityRole="header" style={[s.noteTitle,{color:ink,marginTop:4}]}>{t('marketing.ourSupport')}</Text>
    <Text style={[s.sectionCopy,{color:muted}]}>{t('marketing.join')}</Text>
   </View>

   <Reveal {...revealProps}><View style={s.journeyPanel}><Text style={s.eyebrow}>{t('marketing.processLabel')}</Text><Text accessibilityRole="header" style={s.journeyTitle}>{t('marketing.process')}</Text><View style={[s.journey,{flexDirection:wide?'row':'column'}]}>{journey.map((step,index)=><View key={step.title} style={[s.journeyStep,wide?{flex:1}:{width:'100%'}]}><View style={s.stepTop}><View style={s.stepIcon}><Feather name={step.icon} size={20} color="#0F294A"/></View><Text style={s.stepNumber}>{['Discover','Plan','Launch','Review'][index]??'Next'}</Text>{index<journey.length-1&&<Feather name={wide?'arrow-right':'arrow-down'} size={18} color="#64748b"/>}</View><Text style={s.stepTitle}><UiText value={step.title}/></Text><Text style={s.solutionCopy}>{step.copy}</Text></View>)}</View><Text style={s.journeyNote}>{t('marketing.scope')}</Text></View></Reveal>

   <View onLayout={event=>{positions.current.published=event.nativeEvent.layout.y;}} style={s.anchor}><Text style={s.eyebrow}>{t('marketing.next')}</Text><Text accessibilityRole="header" style={[s.sectionTitle,{color:ink}]}>{t('marketing.available')}</Text><Text style={[s.sectionCopy,{color:muted}]}>{t('marketing.details')}</Text><Text style={[s.sectionCopy,{color:muted}]}>{t('marketing.costs')}</Text></View>
   {catalogue.loading?<Loading/>:catalogue.error?<ErrorPanel error={catalogue.error} retry={catalogue.retry}/>:services.length?<View style={s.publishedList}>{services.map(item=><Pressable key={item.service.id} accessibilityRole="link" onPress={()=>router.push({pathname:'/service/[id]',params:{id:item.service.id}})} onHoverIn={()=>setHovered('published-'+item.service.id)} onHoverOut={()=>setHovered(undefined)} style={({pressed})=>[s.publishedRow,{backgroundColor:mode==='dark'?'#0f233d':'#fff',opacity:pressed?.8:1},hovered==='published-'+item.service.id&&{borderColor:'#F97316'}]}><Text style={[s.publishedTitle,{color:ink}]}>{item.service.title}</Text><Feather name="arrow-right" size={18} color={mode==='dark'?'#fb923c':'#0F294A'}/></Pressable>)}</View>:<Text style={[s.sectionCopy,{color:muted}]}>{t('marketing.preparing')}</Text>}

   <Reveal {...revealProps}><View style={[s.final,{backgroundColor:mode==='dark'?'#0f233d':'#f8fafc',borderWidth:1,borderColor:mode==='dark'?'#1e3a5f':'#e2e8f0'}]}><Text style={s.eyebrow}>Discover. Connect. Grow.</Text><Text accessibilityRole="header" style={[s.finalTitle,{color:ink}]}>{t('marketing.finalTitle')}</Text><Text style={[s.finalCopy,{color:muted}]}>{t('marketing.finalCopy')}</Text><View style={[s.actions,{flexDirection:wide?'row':'column'}]}><Pressable accessibilityRole="link" onPress={()=>router.push('/seller/onboard')} style={({pressed})=>[s.finalButton,{opacity:pressed?.85:1}]}><Text style={s.finalButtonText}>List Your Business Free</Text><Feather name="arrow-right" size={18} color="#fff"/></Pressable><Pressable accessibilityRole="link" onPress={()=>router.push('/services/nearby')} style={({pressed})=>[s.finalButton,{backgroundColor:'#ffffff',borderWidth:1,borderColor:'#cbd5e1',opacity:pressed?.85:1}]}><Text style={[s.finalButtonText,{color:'#0F294A'}]}>Explore Nearby Services</Text><Feather name="map-pin" size={16} color="#EA580C"/></Pressable></View></View></Reveal>
  </EditVistrahContent></Animated.ScrollView>
 </SafeAreaView>;
}

const s=StyleSheet.create({
 page:{width:'100%',maxWidth:1180,alignSelf:'center',padding:spacing.pagePadding,paddingBottom:spacing.pageBottom,gap:spacing.sectionGap},
 hero:{borderRadius:12,padding:spacing.sectionPadding,gap:spacing.elementGap,overflow:'hidden'},heroWide:{flexDirection:'row',alignItems:'center',padding:32,gap:24},
 heroCopy:{gap:spacing.elementGap,minWidth:0},overline:{fontSize:13,lineHeight:18,fontWeight:'500',color:'#ffe0c4'},heroTitle:{fontWeight:'700',letterSpacing:-1.1,color:'#fff'},heroDescription:{fontSize:14,lineHeight:22,color:'#e2e8f0',maxWidth:470},
 actions:{flexDirection:'row',flexWrap:'wrap',gap:10},primary:{minHeight:48,paddingHorizontal:15,paddingVertical:12,borderRadius:8,backgroundColor:'#fff',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},primaryText:{fontSize:12,lineHeight:18,fontWeight:'700',color:'#0F294A'},heroSecondary:{minHeight:48,paddingHorizontal:4,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:8},heroSecondaryText:{fontSize:12,lineHeight:18,fontWeight:'600',color:'#fff'},focusRing:{outlineWidth:2,outlineStyle:'solid',outlineColor:'#F97316',outlineOffset:3},
 art:{height:255,width:'100%',alignSelf:'center',maxWidth:390},
 brandTile:{position:'absolute',left:2,top:13,width:94,height:99,padding:12,borderRadius:15,backgroundColor:'#fff7ed',boxShadow:'0px 8px 20px rgba(9,27,51,0.2)'},brandLetters:{fontSize:39,lineHeight:46,fontWeight:'700',color:'#0F294A'},brandRule:{width:36,height:4,borderRadius:2,backgroundColor:'#F97316',marginBottom:6},mockCaption:{fontSize:7,lineHeight:11,letterSpacing:.6,fontWeight:'700',color:'#475569'},
 store:{position:'absolute',left:'20%',bottom:20,width:'60%',maxWidth:200,height:135,borderRadius:12,backgroundColor:'#ffdbad',boxShadow:'0px 8px 22px rgba(9,27,51,0.2)'},storeSign:{height:34,alignItems:'center',justifyContent:'center',backgroundColor:'#0F294A',borderTopLeftRadius:12,borderTopRightRadius:12},storeSignText:{fontSize:8,lineHeight:12,fontWeight:'700',letterSpacing:.4,color:'#fff'},awning:{flexDirection:'row'},storeInterior:{flex:1,paddingHorizontal:12,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between'},storeWindow:{width:'48%',height:49,backgroundColor:'#fff2ce',marginBottom:12,borderRadius:4,alignItems:'center',justifyContent:'center'},storeDoor:{width:'31%',height:65,backgroundColor:'#132F54',borderTopLeftRadius:5,borderTopRightRadius:5},
 mockPhoto:{width:74,aspectRatio:16/9,borderRadius:9,overflow:'hidden'},socialMock:{position:'absolute',right:2,bottom:37,padding:7,width:88,gap:7,borderRadius:14,backgroundColor:'#fff',boxShadow:'0px 6px 16px rgba(9,27,51,0.2)'},trendTile:{position:'absolute',right:11,top:6,width:78,height:72,padding:10,borderRadius:15,backgroundColor:'#eff6ff'},trendBars:{position:'absolute',bottom:10,right:10,flexDirection:'row',alignItems:'flex-end',gap:4},megaphone:{position:'absolute',left:13,bottom:14,width:46,height:46,borderRadius:16,backgroundColor:'#F97316',alignItems:'center',justifyContent:'center',transform:[{rotate:'-10deg'}]},
 anchor:{gap:spacing.elementGap},eyebrow:{fontSize:9,lineHeight:14,letterSpacing:1.5,fontWeight:'700',color:'#EA580C'},sectionTitle:{...typography.sectionHeading},sectionCopy:{...typography.body},
 universe:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:14},solution:{borderRadius:22,overflow:'hidden',boxShadow:'0px 4px 16px rgba(15,41,74,0.06)'},servicePhoto:{width:'100%',aspectRatio:4/3,position:'relative',overflow:'hidden'},fill:{position:'absolute',top:0,left:0,width:'100%',height:'100%'},photoCaption:{position:'absolute',bottom:18,left:18,right:18,gap:8},lightEyebrow:{fontSize:9,lineHeight:14,fontWeight:'600',letterSpacing:1.1,color:'#fdba74'},performanceTitle:{fontSize:26,lineHeight:31,fontWeight:'700',color:'#fff'},solutionBody:{padding:spacing.pagePadding,gap:spacing.elementGap},solutionTitle:{...typography.heading,color:'#0F294A'},solutionCopy:{...typography.body,color:'#475569'},solutionFooter:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12},solutionLink:{fontSize:12,lineHeight:18,fontWeight:'600',color:'#0F294A'},brandingTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},editorialLetters:{fontSize:56,lineHeight:60,fontWeight:'700',letterSpacing:-3,color:'#0F294A'},videoBadge:{position:'absolute',left:16,bottom:16,width:46,height:46,borderRadius:23,backgroundColor:'#ffffff26',alignItems:'center',justifyContent:'center'},socialLayout:{padding:spacing.pagePadding,gap:spacing.elementGap},socialPhoto:{maxWidth:280,borderRadius:16,alignSelf:'center'},
 themeNote:{padding:spacing.pagePadding,borderRadius:18,gap:spacing.elementGap},noteTitle:{fontSize:16,lineHeight:22,fontWeight:'600'},inlineAction:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'},
 showcaseIntro:{gap:spacing.elementGap,marginBottom:spacing.elementGap},showcaseRail:{gap:12,paddingVertical:4,paddingRight:4},showcaseCard:{width:248,minHeight:275,borderRadius:20,padding:17,gap:13,justifyContent:'space-between'},exampleTag:{fontSize:8,lineHeight:12,fontWeight:'700',letterSpacing:1,color:'#475569'},posterTitle:{fontSize:27,lineHeight:32,fontWeight:'700',letterSpacing:-.7,color:'#0F294A'},posterAa:{fontSize:62,lineHeight:66,fontWeight:'700',color:'#EA580C'},swatches:{flexDirection:'row',gap:7},showcasePhoto:{width:'100%',aspectRatio:16/9,borderRadius:12,overflow:'hidden'},showcaseTitle:{...typography.heading,color:'#0F294A'},exampleCopy:{fontSize:12,lineHeight:18,color:'#475569'},videoTimeline:{flexDirection:'row',gap:5},
 journeyPanel:{backgroundColor:'#f1f5f9',borderRadius:24,padding:spacing.sectionPadding,gap:spacing.elementGap},journeyTitle:{fontSize:28,lineHeight:33,fontWeight:'700',letterSpacing:-.6,color:'#0F294A'},journey:{gap:spacing.pageGap},journeyStep:{gap:spacing.elementGap,minWidth:0},stepTop:{flexDirection:'row',alignItems:'center',gap:10},stepIcon:{width:40,height:40,borderRadius:14,backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},stepNumber:{fontSize:11,lineHeight:16,fontWeight:'600',color:'#64748b'},stepTitle:{fontSize:17,lineHeight:22,fontWeight:'600',color:'#0F294A'},journeyNote:{fontSize:11,lineHeight:17,color:'#475569'},
 publishedList:{gap:spacing.elementGap},publishedRow:{minHeight:54,paddingVertical:14,paddingHorizontal:16,borderRadius:12,borderWidth:1,borderColor:'#cbd5e1',flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},publishedTitle:{flex:1,fontSize:14,lineHeight:20,fontWeight:'600'},
 final:{padding:spacing.sectionPadding,borderRadius:12,gap:spacing.elementGap},finalTitle:{fontSize:24,lineHeight:30,fontWeight:'700',letterSpacing:-.5,color:'#0F294A'},finalCopy:{fontSize:13,lineHeight:21,color:'#475569',maxWidth:580},finalButton:{alignSelf:'flex-start',minHeight:46,paddingHorizontal:16,paddingVertical:12,borderRadius:8,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#0F294A'},finalButtonText:{fontSize:13,lineHeight:18,fontWeight:'600',color:'#fff'}
});
