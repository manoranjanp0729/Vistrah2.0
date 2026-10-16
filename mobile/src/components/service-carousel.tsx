import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState,Image,Platform,Pressable,ScrollView,View} from 'react-native';
import {router,useFocusEffect,type Href} from 'expo-router';
import {useTheme} from '../lib/theme';
const bannerAspectRatio=1736/621;
const slides=[
 {key:'users',title:'For Users: Find the right services on VISTRAH. Explore services.',route:'/services',image:require('../../assets/hero-journey/for-users-widescreen.jpg')},
 {key:'businesses',title:'For Businesses: List your business on VISTRAH. Join now.',route:'/provider',image:require('../../assets/hero-journey/for-businesses-widescreen.jpg')},
 {key:'ads',title:'VISTRAH Ads & Marketing: Advertise your business on VISTRAH. Get started.',route:'/marketing-solutions',image:require('../../assets/hero-journey/v-ads-widescreen.jpg')},
 {key:'agri',title:'VISTRAH AgriConnect: Explore agricultural services.',route:'/agri-connect',image:require('../../assets/hero-journey/agriconnect-widescreen.jpg')},
 {key:'health',title:'VISTRAH HealthConnect: Explore health services.',route:{pathname:'/services',params:{category:'health-fitness-and-wellness'}},image:require('../../assets/hero-journey/healthconnect-family-banner.jpg')},
] as const;
export function ServiceCarousel(){
 const {colors}=useTheme();
 const scroll=useRef<ScrollView>(null),frame=useRef<View>(null),current=useRef(0);
 const offset=useRef(0),dragging=useRef(false),settleTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [width,setWidth]=useState(0),[index,setIndex]=useState(0),[interaction,setInteraction]=useState(0),[interacting,setInteracting]=useState(false);
 const [active,setActive]=useState(AppState.currentState!=='background'),[visible,setVisible]=useState(true);
 useEffect(()=>{const subscription=AppState.addEventListener('change',state=>setActive(state==='active'));return()=>subscription.remove();},[]);
 useEffect(()=>{
  if(Platform.OS!=='web'||typeof IntersectionObserver==='undefined'||!frame.current)return;
  const observer=new IntersectionObserver(entries=>setVisible(entries[0]?.isIntersecting??false));
  observer.observe(frame.current as unknown as Element);
  return()=>observer.disconnect();
 },[]);
 const settle=useCallback(()=>{
  if(!width||dragging.current)return;
  const next=Math.max(0,Math.min(slides.length-1,Math.round(offset.current/width)));
  const target=next*width;
  if(Math.abs(offset.current-target)>.1)scroll.current?.scrollTo({x:target,animated:false});
  offset.current=target;current.current=next;setIndex(next);setInteracting(false);setInteraction(value=>value+1);
 },[width]);
 const scheduleSettle=()=>{if(settleTimer.current)clearTimeout(settleTimer.current);settleTimer.current=setTimeout(settle,180);};
 const beginInteraction=()=>{dragging.current=true;if(settleTimer.current)clearTimeout(settleTimer.current);setInteracting(true);};
 const endInteraction=()=>{dragging.current=false;scheduleSettle();};
 useEffect(()=>()=>{if(settleTimer.current)clearTimeout(settleTimer.current);},[width]);
 useFocusEffect(useCallback(()=>{
  if(!width||!active||!visible||interacting)return;
  const timer=setInterval(()=>{setInteracting(true);scroll.current?.scrollTo({x:((current.current+1)%slides.length)*width,animated:true});scheduleSettle();},5000);
  return()=>clearInterval(timer);
 },[width,active,visible,interacting,interaction]));
 const slideSize={width,height:width/bannerAspectRatio};
 useEffect(()=>{if(!width)return;const frame=requestAnimationFrame(()=>{offset.current=current.current*width;scroll.current?.scrollTo({x:offset.current,animated:false});});return()=>cancelAnimationFrame(frame);},[width]);
 return <View ref={frame} style={{gap:8}}><View style={{width:'100%',aspectRatio:bannerAspectRatio}}>
  <ScrollView ref={scroll} onLayout={event=>setWidth(event.nativeEvent.layout.width)} onContentSizeChange={()=>{if(width){offset.current=current.current*width;scroll.current?.scrollTo({x:offset.current,animated:false});}}} style={{flex:1}} contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false} removeClippedSubviews={false} contentContainerStyle={{height:slideSize.height,paddingHorizontal:0,gap:0}} horizontal snapToOffsets={width?slides.map((_,position)=>position*width):undefined} snapToAlignment="start" decelerationRate="fast" showsHorizontalScrollIndicator={false} scrollEventThrottle={16} onTouchStart={beginInteraction} onTouchEnd={endInteraction} onTouchCancel={endInteraction} onScrollBeginDrag={beginInteraction} onScrollEndDrag={endInteraction} onScroll={event=>{offset.current=event.nativeEvent.contentOffset.x;if(!dragging.current)scheduleSettle();}} onMomentumScrollEnd={event=>{offset.current=event.nativeEvent.contentOffset.x;if(settleTimer.current)clearTimeout(settleTimer.current);settle();}}>
   {(width>0?slides:[]).map(slide=><Pressable key={slide.key} accessibilityRole="link" accessibilityLabel={slide.title} onPress={()=>router.push(slide.route as Href)} style={[slideSize,{flexGrow:0,flexShrink:0,alignItems:'center',justifyContent:'center',borderRadius:20,overflow:'hidden'}]}>
    <Image source={slide.image} resizeMode="contain" accessible={false} style={slideSize} accessibilityIgnoresInvertColors/>
   </Pressable>)}
  </ScrollView>
 </View>
 <View pointerEvents="none" accessibilityLabel={'Journey slide '+(index+1)+' of 5'} style={{flexDirection:'row',justifyContent:'center',gap:6}}>{slides.map((slide,position)=><View key={slide.key} style={{width:position===index?18:6,height:6,borderRadius:3,backgroundColor:position===index?colors.accent:colors.muted,opacity:position===index?1:.4}}/>)}</View>
 </View>;
}
