import {useCallback,useRef,useState} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {router,useFocusEffect} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import {useTheme} from '../lib/theme';
const slides=[
 {step:'01 · DISCOVER',title:'Find the right services for your needs',description:'Explore services for home, work and business.',action:'Explore services',route:'/services',icons:['home','tool','briefcase'],labels:['Home','Repairs','Careers']},
 {step:'02 · CONNECT',title:'Find and connect with service providers',description:'Explore provider options and choose who to contact.',action:'Find a provider',route:'/services',icons:['search','users','check-circle'],labels:['Search','Providers','Connect']},
 {step:'03 · PROVIDE',title:'Have a service to offer?',description:'Showcase your expertise and reach customers.',action:'Provide a service',route:'/provider',icons:['briefcase','shield','users'],labels:['Create','Review','Reach']},
 {step:'04 · PROMOTE',title:'Make your business more visible',description:'Explore VISTRAH Ads & Marketing services.',action:'Explore Ads & Marketing',route:'/services',icons:['volume-2','trending-up','users'],labels:['Promote','Create','Reach']},
 {step:'05 · GROW',title:'More opportunities. One platform.',description:'Find services, offer expertise and explore ways to grow.',action:'Get started',route:'/services',icons:['users','trending-up','check-circle'],labels:['Connect','Grow','Forward']},
] as const;
export function ServiceCarousel(){const {colors,styles}=useTheme();
 const scroll=useRef<ScrollView>(null);const current=useRef(0);
 const [width,setWidth]=useState(0);const [index,setIndex]=useState(0);
 useFocusEffect(useCallback(()=>{if(!width)return;const timer=setInterval(()=>{current.current=(current.current+1)%slides.length;setIndex(current.current);scroll.current?.scrollTo({x:current.current*width,animated:true});},4000);return()=>clearInterval(timer);},[width]));
 return <View><View onLayout={event=>{const next=event.nativeEvent.layout.width;setWidth(next);scroll.current?.scrollTo({x:current.current*next,animated:false});}} style={{borderRadius:20,overflow:'hidden'}}>
  <ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={event=>{const next=Math.max(0,Math.min(4,Math.round(event.nativeEvent.contentOffset.x/(width||1))));current.current=next;setIndex(next);}}>
   {slides.map((slide,position)=><Pressable key={slide.step} accessibilityRole="button" accessibilityLabel={slide.title} onPress={()=>router.push(slide.route)} style={{width:width||300}}>
    <LinearGradient colors={['#18394b','#17202e']} style={{height:176,padding:18,paddingBottom:30,justifyContent:'center'}}>
     <View style={{width:'65%',gap:6,zIndex:1}}><Text style={[styles.label,{color:'#c5d9e6',fontSize:10}]}>{slide.step}</Text><Text style={[styles.heading,{color:'#fff',fontSize:18,lineHeight:21}]} numberOfLines={3}>{slide.title}</Text><Text style={[styles.muted,{color:'#dce4e9',fontSize:11,lineHeight:14}]} numberOfLines={2}>{slide.description}</Text><Text style={{color:'#ffad36',fontSize:12,fontWeight:'700'}}>{slide.action} →</Text></View>
     <View pointerEvents="none" style={{position:'absolute',right:8,top:26,bottom:30,width:'34%',flexDirection:'row',alignItems:'center',gap:3}}>{slide.icons.map((icon,i)=><View key={icon} style={{flex:1,backgroundColor:'#f5f8fb',borderRadius:10,paddingVertical:12,alignItems:'center',gap:5,transform:[{translateY:i===1?-12:8}]}}><Feather name={icon} size={19} color={i===1?'#f79027':'#2977b2'}/><Text style={{color:'#173b54',fontSize:8,fontWeight:'700',textAlign:'center'}} numberOfLines={2}>{slide.labels[i]}</Text></View>)}</View>
    </LinearGradient>
   </Pressable>)}
  </ScrollView>
  <View pointerEvents="none" accessibilityLabel={'Journey slide '+(index+1)+' of 5'} style={{position:'absolute',bottom:12,left:0,right:0,flexDirection:'row',justifyContent:'center',gap:6}}>{slides.map((slide,position)=><View key={slide.step} style={{width:position===index?18:6,height:6,borderRadius:3,backgroundColor:position===index?colors.accent:'rgba(255,255,255,0.45)'}}/>)}</View>
 </View></View>;
}
