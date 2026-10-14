import {useCallback,useRef,useState} from 'react';
import {Image,Pressable,ScrollView,Text,View} from 'react-native';
import {router,useFocusEffect} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import {useTheme} from '../lib/theme';
const slides=[
 {step:'01 · DISCOVER',title:'Find the right services for your needs',description:'Explore services for home, work and business.',action:'Explore services',route:'/services',image:require('../../assets/hero-journey/step-1.webp')},
 {step:'02 · CONNECT',title:'Find and connect with service providers',description:'Explore provider options and choose who to contact.',action:'Find a provider',route:'/services',image:require('../../assets/hero-journey/step-2.webp')},
 {step:'03 · PROVIDE',title:'Have a service to offer?',description:'Showcase your expertise and reach customers.',action:'Provide a service',route:'/provider',image:require('../../assets/hero-journey/step-3.webp')},
 {step:'04 · PROMOTE',title:'Make your business more visible',description:'Explore VISTRAH Ads & Marketing services.',action:'Explore Ads & Marketing',route:'/services',image:require('../../assets/hero-journey/step-4.webp')},
 {step:'05 · GROW',title:'More opportunities. One platform.',description:'Find services, offer expertise and explore ways to grow.',action:'Get started',route:'/services',image:require('../../assets/hero-journey/step-5.webp')},
] as const;
export function ServiceCarousel(){const {colors,styles}=useTheme();const scroll=useRef<ScrollView>(null);const current=useRef(0);const [width,setWidth]=useState(0);const [index,setIndex]=useState(0);
 useFocusEffect(useCallback(()=>{if(!width)return;const timer=setInterval(()=>{current.current=(current.current+1)%slides.length;setIndex(current.current);scroll.current?.scrollTo({x:current.current*width,animated:true});},4000);return()=>clearInterval(timer);},[width]));
 return <View><View onLayout={event=>{const next=event.nativeEvent.layout.width;setWidth(next);scroll.current?.scrollTo({x:current.current*next,animated:false});}} style={{borderRadius:20,overflow:'hidden'}}>
  <ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={event=>{const next=Math.max(0,Math.min(4,Math.round(event.nativeEvent.contentOffset.x/(width||1))));current.current=next;setIndex(next);}}>
   {slides.map(slide=><Pressable key={slide.step} accessibilityRole="button" accessibilityLabel={slide.title} onPress={()=>router.push(slide.route)} style={{width:width||300}}>
    <LinearGradient colors={['#12344a','#17202e']} style={{height:176,padding:18,paddingBottom:30,justifyContent:'center',overflow:'hidden'}}>
     <Image source={slide.image} resizeMode="cover" style={{position:'absolute',right:0,top:0,bottom:0,width:'58%',height:176}} accessibilityIgnoresInvertColors/>
     <LinearGradient pointerEvents="none" colors={['#12344a','#12344a','rgba(18,52,74,.15)']} start={{x:0,y:0}} end={{x:1,y:0}} style={{position:'absolute',left:0,top:0,bottom:0,width:'83%'}}/>
     <View style={{width:'64%',gap:6,zIndex:1}}><Text style={[styles.label,{color:'#c5d9e6',fontSize:10}]}>{slide.step}</Text><Text style={[styles.heading,{color:'#fff',fontSize:18,lineHeight:21}]} numberOfLines={3}>{slide.title}</Text><Text style={[styles.muted,{color:'#dce4e9',fontSize:11,lineHeight:14}]} numberOfLines={2}>{slide.description}</Text><Text style={{color:'#ffad36',fontSize:12,fontWeight:'700'}}>{slide.action} →</Text></View>
    </LinearGradient>
   </Pressable>)}
  </ScrollView>
  <View pointerEvents="none" accessibilityLabel={'Journey slide '+(index+1)+' of 5'} style={{position:'absolute',bottom:12,left:0,right:0,flexDirection:'row',justifyContent:'center',gap:6}}>{slides.map((slide,position)=><View key={slide.step} style={{width:position===index?18:6,height:6,borderRadius:3,backgroundColor:position===index?colors.accent:'rgba(255,255,255,0.45)'}}/>)}</View>
 </View></View>;
}
