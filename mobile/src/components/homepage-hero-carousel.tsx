import {Text} from './typography';
import {UiText,UiElement} from "./localized-ui";
import {useEffect,useRef,useState} from 'react';
import {Pressable,ScrollView,View,useWindowDimensions} from 'react-native';
import {router} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import {radii, tabularNums, useTheme} from '../lib/theme';

const slides=[
  {title:'Digital marketing',subtitle:'Bring your business to more customers.',query:'digital marketing'},
  {title:'Jobs & careers',subtitle:'Explore new opportunities near you.',query:'jobs'},
  {title:'Property services',subtitle:'Find help for your next move.',query:'property'},
  {title:'Home services',subtitle:'Make everyday tasks simpler.',query:'home'},
  {title:'Tax & compliance',subtitle:'Get support with important paperwork.',query:'tax'},
];

export function HomepageHeroCarousel(){
  const {width}=useWindowDimensions();
  const {colors}=useTheme();
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
        style={{width:cardWidth,height:205,borderRadius:radii.surface,borderWidth:1,borderColor:colors.borderSubtle,overflow:'hidden'}}>
        <LinearGradient colors={[colors.surface, colors.elevated]} start={{x:0,y:0}} end={{x:1,y:1}}
          style={{flex:1,padding:24,justifyContent:'flex-end',gap:8}}>
          <Text style={[{fontSize:11,fontWeight:'700',letterSpacing:1.8,color:colors.accent},tabularNums]}><UiText value={"TOP SERVICES · "}/>{index+1} / {slides.length}</Text>
          <Text style={{fontSize:27,fontWeight:'700',color:colors.text}}>{slide.title}</Text>
          <Text style={{fontSize:14,color:colors.muted}}>{slide.subtitle}</Text>
          <Text style={{fontSize:13,fontWeight:'700',color:colors.brandPrimary,marginTop:5}}><UiText value={"Explore service →"}/></Text>
        </LinearGradient>
      </UiElement>)}
    </ScrollView>
    <View style={{flexDirection:'row',justifyContent:'center',gap:7}}>
      {slides.map((slide,index)=><UiElement as={Pressable} key={slide.title} accessibilityRole="button"
        accessibilityLabel={'Show '+slide.title} onPress={()=>{setActive(index);scroll.current?.scrollTo({x:index*cardWidth,animated:true});}}
        style={{width:index===active?22:7,height:7,borderRadius:radii.pill,backgroundColor:index===active?colors.brandPrimary:colors.elevated,borderWidth:1,borderColor:colors.borderSubtle}}/>)}
    </View>
  </UiElement>;
}
