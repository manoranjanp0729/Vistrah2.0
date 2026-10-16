import {useState} from 'react';
import {useLanguage} from '../lib/language';
import {Platform,Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {router} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import {photoCardDesign as design} from '../../../shared/photo-card-design';
import {allServices,type Category} from '../lib/catalogue';
const images=[require('../../assets/ads-marketing/performance-marketing.webp'),require('../../assets/ads-marketing/branding-creative.webp'),require('../../assets/ads-marketing/outdoor-signage.jpg'),require('../../assets/ads-marketing/mobility-billboard.jpg')];
const highlights=[
 {key:'performance-marketing',title:'Digital Advertising',description:'Digital campaigns, online promotion and performance marketing.',alt:'A marketer reviewing a digital campaign dashboard',serviceSlug:'digital-marketing'},
 {key:'branding-creative',title:'Branding & Creative Production',description:'Brand identity, graphic design, promotional videos and content creation.',alt:'Creative team meeting in a sunlit studio',serviceSlug:null},
 {key:'outdoor-advertising',title:'Outdoor Advertising & Signage',description:'Hoardings, outdoor billboards, shop signboards and display solutions.',alt:'Large outdoor billboard beside illuminated commercial storefront signage',serviceSlug:'outdoor-advertising'},
 {key:'mobility-billboard',title:'Mobility Billboard Advertising',description:'Mobile advertising displays, branded vehicles and location-based promotional campaigns.',alt:'Commercial LED advertising truck displaying a fashion campaign',serviceSlug:null}
];
export function AdsMarketing({categories}:{categories:Category[]}){
 const {t}=useLanguage();
 const [headingWidth,setHeadingWidth]=useState(0);
 const android=Platform.OS==='android';
 const getStarted=<Pressable accessibilityRole="link" accessibilityLabel={t('marketing.started')} onPress={()=>router.push('/marketing-solutions')} style={({pressed})=>[s.start,{opacity:pressed?.85:1}]}><Text style={s.startText}>{t('marketing.started')}</Text><Feather name="arrow-right" size={15} color="#6340b8"/></Pressable>;
 const services=allServices(categories).filter(item=>item.category.active&&item.category.slug==='marketing'&&item.service.active&&(!item.subcategory||item.subcategory.active));
 return <LinearGradient testID="ads-marketing" colors={['#283db6','#7741c4','#b63b8d']} locations={[0,.52,1]} start={{x:0,y:0}} end={{x:1,y:1}} style={s.section}>
  <View pointerEvents="none" accessible={false} style={s.blueGlow}/><View pointerEvents="none" accessible={false} style={s.pinkGlow}/>
  <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit onLayout={event=>setHeadingWidth(event.nativeEvent.layout.width)} style={[s.headline,headingWidth>0&&{fontSize:Math.min(Platform.OS==='android'?25:21,headingWidth/15.5)}]}>VISTRAH Ads &amp; Marketing</Text>
  <View style={s.hero}>
   <View style={s.heroCopy}>
    <Text style={s.support}>{t('marketing.homeCopy')}</Text>
    {android&&getStarted}
   </View>
   <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.art}>
    <View style={s.halo}/><View style={s.ground}/>
    <View style={s.chart}><View style={s.chartBars}>{[12,20,30].map((height,index)=><View key={index} style={{width:10,height,borderRadius:3,backgroundColor:['#d0bcff','#a98bea','#7350d0'][index]}}/>)}</View><Feather name="trending-up" size={31} color="#d1479c" style={{position:'absolute',right:7,top:4}}/></View>
    <View style={s.shop}>
     <View style={s.roof}/><View style={s.awning}>{[0,1,2,3,4,5,6].map(index=><View key={index} style={{flex:1,height:12,borderBottomLeftRadius:4,borderBottomRightRadius:4,backgroundColor:index%2?'#fff2fa':'#f28ab6'}}/>)}</View>
     <View style={s.shopFront}><View style={s.window}><View style={s.windowShine}/></View><View style={s.door}><View style={s.doorHandle}/></View></View>
    </View>
    <View style={s.megaphone}><Feather name="volume-2" size={23} color="#fff"/></View>
    <View style={s.spark}><Feather name="plus" size={13} color="#ffe0ef"/></View>
   </View>
  </View>
  {!android&&getStarted}
  <View style={s.grid}>{highlights.map((card,index)=>{
   const match=services.find(item=>item.service.slug===card.serviceSlug);
   return <Pressable key={card.key} accessibilityRole="link" accessibilityLabel={t('marketing.'+(['digitalTitle','brandTitle','outdoorTitle','mobilityTitle'][index]))} onPress={()=>match?router.push({pathname:'/service/[id]',params:{id:match.service.id}}):router.push('/marketing-solutions')} style={({pressed})=>[s.card,{backgroundColor:index%2?'#fff5fb':'#f7f5ff',opacity:pressed?.85:1}]}>
    <View style={s.image}><Image source={images[index]} accessibilityLabel={t('marketing.'+(['photoDigital','photoCreative','photoOutdoor','photoMobility'][index]))} resizeMode="cover" style={s.cardImage}/></View>
    <View style={s.cardContent}><Text style={s.cardTitle}>{t('marketing.'+(['digitalTitle','brandTitle','outdoorTitle','mobilityTitle'][index]))}</Text><Text style={s.cardDescription}>{t('marketing.'+(['digitalCopy','brandCopy','outdoorCopy','mobilityCopy'][index]))}</Text></View>
   </Pressable>;
  })}</View>
 </LinearGradient>;
}
const s=StyleSheet.create({
 section:{backgroundColor:'#7741c4',borderRadius:20,padding:12,paddingTop:Platform.OS==='android'?18:12,paddingBottom:10,gap:Platform.OS==='android'?8:12,overflow:'hidden'},
 blueGlow:{position:'absolute',right:-65,top:-75,width:210,height:210,borderRadius:105,backgroundColor:'#bca5ff',opacity:.22},
 pinkGlow:{position:'absolute',left:-70,top:135,width:180,height:180,borderRadius:90,backgroundColor:'#ffc5e3',opacity:.18},
 hero:{flexDirection:'row',alignItems:Platform.OS==='android'?'flex-start':'center',gap:8,padding:Platform.OS==='android'?0:2,marginBottom:Platform.OS==='android'?10:0},
 heroCopy:{flex:1,minWidth:0,gap:Platform.OS==='android'?8:9},
 headline:{fontSize:Platform.OS==='android'?25:21,lineHeight:Platform.OS==='android'?31:25,fontWeight:'700',letterSpacing:-.5,color:'#fff'},
 support:{fontSize:Platform.OS==='android'?14:12,lineHeight:Platform.OS==='android'?21:17,color:'#d3deea'},
 start:{alignSelf:'flex-start',maxWidth:Platform.OS==='android'?'100%':undefined,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,minHeight:44,paddingHorizontal:13,borderRadius:12,backgroundColor:'#fff',boxShadow:'0px 4px 10px rgba(65,24,129,0.16)'},
 startText:{flexShrink:1,fontSize:Platform.OS==='android'?13:12,lineHeight:Platform.OS==='android'?19:17,fontWeight:'700',color:'#6340b8'},
 art:{width:104,height:145},
 halo:{position:'absolute',width:100,height:100,top:23,right:-5,borderRadius:50,backgroundColor:'#ffffff12'},
 ground:{position:'absolute',bottom:9,left:0,width:102,height:13,borderRadius:50,backgroundColor:'#f3b5ef40'},
 chart:{position:'absolute',top:6,right:0,width:68,height:54,padding:7,borderRadius:10,backgroundColor:'#fff4fe',transform:[{rotate:'8deg'}],boxShadow:'0px 4px 10px rgba(63,25,123,0.14)'},
 chartBars:{flex:1,flexDirection:'row',alignItems:'flex-end',gap:5},
 shop:{position:'absolute',bottom:20,left:4,width:88,height:65,borderRadius:8,backgroundColor:'#ffe8f3',boxShadow:'0px 5px 12px rgba(63,25,123,0.2)'},
 roof:{height:13,borderTopLeftRadius:7,borderTopRightRadius:7,backgroundColor:'#f9b7db'},
 awning:{flexDirection:'row'},
 shopFront:{flex:1,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',paddingHorizontal:9,paddingTop:7},
 window:{width:34,height:24,marginBottom:7,borderRadius:3,backgroundColor:'#b4b6f7',overflow:'hidden'},
 windowShine:{position:'absolute',left:9,top:-8,width:7,height:40,backgroundColor:'#e5e8ff',transform:[{rotate:'30deg'}]},
 door:{width:20,height:31,borderTopLeftRadius:3,borderTopRightRadius:3,backgroundColor:'#8976cc'},
 doorHandle:{position:'absolute',right:3,top:16,width:3,height:3,borderRadius:2,backgroundColor:'#fff'},
 megaphone:{position:'absolute',top:33,left:0,width:39,height:39,borderRadius:13,backgroundColor:'#aa59d5',alignItems:'center',justifyContent:'center',transform:[{rotate:'-12deg'}],boxShadow:'0px 3px 8px rgba(63,25,123,0.16)'},
 spark:{position:'absolute',right:0,bottom:37},
 gridHeading:{fontSize:14,lineHeight:20,fontWeight:'600',color:'#fff',marginTop:3},
 grid:{flexDirection:'row',flexWrap:'wrap',alignItems:'stretch',gap:10},
 card:{width:'47%',flexGrow:1,flexBasis:'45%',minWidth:0,borderRadius:design.radius,overflow:'hidden',boxShadow:'0px 3px 8px rgba(67,27,104,0.12)'},
 image:{aspectRatio:16/9,marginTop:5,marginHorizontal:5,borderRadius:design.imageRadius,overflow:'hidden'},
 cardImage:{position:'absolute',top:0,left:0,width:'100%',height:'100%'},
 cardContent:{paddingTop:8,paddingHorizontal:9,paddingBottom:10,gap:6},
 cardTitle:{fontSize:design.titleSize+(Platform.OS==='android'?3:0),lineHeight:Platform.OS==='android'?22:design.titleLineHeight,fontWeight:'600',color:'#382448'},
 cardDescription:{fontSize:Platform.OS==='android'?13:11,lineHeight:Platform.OS==='android'?20:16,color:'#665a73'},
});
