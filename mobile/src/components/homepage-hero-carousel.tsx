import {Text} from './typography';
import {UiText,UiElement} from "./localized-ui";
import {useEffect,useRef,useState} from 'react';
import {Pressable,ScrollView,View,useWindowDimensions} from 'react-native';
import {router} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';

const slides=[
  {title:'Digital marketing',subtitle:'Bring your business to more customers.',query:'digital marketing',colors:['#272346','#626099','#bba3db'] as const},
  {title:'Jobs & careers',subtitle:'Explore new opportunities near you.',query:'jobs',colors:['#233651','#467b9c','#a7d8d7'] as const},
  {title:'Property services',subtitle:'Find help for your next move.',query:'property',colors:['#333449','#867e9d','#d9bfd0'] as const},
  {title:'Home services',subtitle:'Make everyday tasks simpler.',query:'home',colors:['#27443e','#589b91','#bfe0c4'] as const},
  {title:'Tax & compliance',subtitle:'Get support with important paperwork.',query:'tax',colors:['#3b3044','#9c7b7a','#e6c9a8'] as const},
];

export function HomepageHeroCarousel(){
  const {width}=useWindowDimensions();
  const cardWidth=Math.max(240,Math.min(width-40,860));
  const scroll=useRef<ScrollView>(null);
  const [active,setActive]=useState(0);
  useEffect(()=>{
    const timer=setInterval(()=>{
      setActive(current=>{
        const next=(current+1)%slides.length;
        scroll.current?.scrollTo({x:next*cardWidth,animated:true});
        return next;
      });
    },5000);
    return()=>clearInterval(timer);
  },[cardWidth]);
  return <UiElement as={View} accessibilityLabel="Featured services" style={{gap:10}}>
    <ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false} nestedScrollEnabled
      onMomentumScrollEnd={event=>setActive(Math.min(slides.length-1,Math.max(0,Math.round(event.nativeEvent.contentOffset.x/cardWidth))))}
      style={{width:cardWidth}} accessibilityRole="adjustable">
      {slides.map((slide,index)=><UiElement as={Pressable} key={slide.title} accessibilityRole="button"
        accessibilityLabel={slide.title+'. '+slide.subtitle+'. Explore services'}
        onPress={()=>router.push({pathname:'/services',params:{q:slide.query}})}
        style={{width:cardWidth,height:205,borderRadius:22,overflow:'hidden'}}>
        <LinearGradient colors={slide.colors} start={{x:0,y:0}} end={{x:1,y:1}}
          style={{flex:1,padding:24,justifyContent:'flex-end',gap:8}}>
          <Text style={{fontSize:11,fontWeight:'700',letterSpacing:1.8,color:'#fff'}}><UiText value={"TOP SERVICES ┬╖ "}/>{index+1} / {slides.length}</Text>
          <Text style={{fontSize:27,fontWeight:'700',color:'#fff'}}>{slide.title}</Text>
          <Text style={{fontSize:14,color:'#fff'}}>{slide.subtitle}</Text>
          <Text style={{fontSize:13,fontWeight:'700',color:'#fff',marginTop:5}}><UiText value={"Explore service ΓåÆ"}/></Text>
        </LinearGradient>
      </UiElement>)}
    </ScrollView>
    <View style={{flexDirection:'row',justifyContent:'center',gap:7}}>
      {slides.map((slide,index)=><UiElement as={Pressable} key={slide.title} accessibilityRole="button"
        accessibilityLabel={'Show '+slide.title} onPress={()=>{setActive(index);scroll.current?.scrollTo({x:index*cardWidth,animated:true});}}
        style={{width:index===active?22:7,height:7,borderRadius:5,backgroundColor:index===active?'#f9aa45':'#777'}}/>)}
    </View>
  </UiElement>;
}
