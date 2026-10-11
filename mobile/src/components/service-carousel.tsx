import {useCallback,useRef,useState} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {router,useFocusEffect} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import {allServices,type Category} from '../lib/catalogue';
import {useTheme} from '../lib/theme';
export function ServiceCarousel({categories}:{categories:Category[]}){const {colors,styles}=useTheme();
  const slides=allServices(categories).filter(item=>item.service.active).sort((a,b)=>Number(b.service.popular)-Number(a.service.popular)).slice(0,5);
  const scroll=useRef<ScrollView>(null);const current=useRef(0);
  const [width,setWidth]=useState(0);const [index,setIndex]=useState(0);
  useFocusEffect(useCallback(()=>{
    if(!width||slides.length<2)return;
    const timer=setInterval(()=>{current.current=(current.current+1)%slides.length;setIndex(current.current);scroll.current?.scrollTo({x:current.current*width,animated:true});},4000);
    return()=>clearInterval(timer);
  },[width,slides.length]));
  if(!slides.length)return <Text style={styles.muted}>Featured services will appear when the catalogue is available.</Text>;
  return <View>
    <View onLayout={event=>{const next=event.nativeEvent.layout.width;setWidth(next);scroll.current?.scrollTo({x:current.current*next,animated:false});}} style={{borderRadius:20,overflow:'hidden'}}>
      <ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={event=>{const next=Math.max(0,Math.min(slides.length-1,Math.round(event.nativeEvent.contentOffset.x/(width||1))));current.current=next;setIndex(next);}}>
        {slides.map(({category,service},position)=><Pressable key={service.id} accessibilityRole="button" accessibilityLabel={service.title+', '+category.title} onPress={()=>router.push({pathname:'/service/[id]',params:{id:service.id}})} style={{width:width||300}}>
          <LinearGradient colors={position%2?['#452b1d','#211c29']:['#18394b','#17202e']} style={{minHeight:176,padding:18,paddingBottom:34,gap:8,justifyContent:'center'}}>
            <Text style={[styles.label,{color:'#c5d9e6'}]}>{category.title}</Text>
            <Text style={[styles.heading,{color:'#fafafa',fontSize:21,lineHeight:25}]} numberOfLines={2}>{service.title}</Text>
            <Text style={[styles.muted,{color:'#d2d5db',fontSize:12,lineHeight:17}]} numberOfLines={2}>{service.description}</Text>
            <Text style={{color:colors.accent,fontSize:12,fontWeight:'600'}}>Explore service →</Text>
          </LinearGradient>
        </Pressable>)}
      </ScrollView>
      <View pointerEvents="none" accessibilityLabel={'Service slide '+(index+1)+' of '+slides.length} style={{position:'absolute',bottom:12,left:0,right:0,flexDirection:'row',justifyContent:'center',gap:6}}>{slides.map((slide,position)=><View key={slide.service.id} style={{width:position===index?18:6,height:6,borderRadius:3,backgroundColor:position===index?colors.accent:'rgba(255,255,255,0.45)'}}/>)}</View>
    </View>
  </View>;
}
