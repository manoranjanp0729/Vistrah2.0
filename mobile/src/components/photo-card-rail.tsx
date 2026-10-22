import {UiElement} from "./localized-ui";
import {useLanguage} from '../lib/language';
import {useRef,useState,type ReactElement} from 'react';
import {Pressable,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import {photoCardDesign,twoRowColumns} from '../../../shared/photo-card-design';
import {useTheme} from '../lib/theme';
export function PhotoCardRail({label,cards,vertical=false,cardWidth=photoCardDesign.width,gap=photoCardDesign.gap,compact=cards.some(card=>(card.props as {discovery?:boolean}).discovery)}:{label:string;cards:ReactElement[];compact?:boolean;cardWidth?:number;gap?:number;vertical?:boolean}) {
  const {width}=useWindowDimensions();const {t}=useLanguage();
  const {colors}=useTheme(),scroll=useRef<ScrollView>(null);
  const [geometry,setGeometry]=useState({width:0,content:0,x:0});
  const previous=geometry.x>1,next=geometry.x+geometry.width<geometry.content-1;
  function move(direction:number){scroll.current?.scrollTo({x:Math.max(0,geometry.x+direction*geometry.width*.85),animated:true});}
  if(vertical)return <View accessibilityLabel={label} testID={`photo-rail-${label}`} style={{gap:10,minWidth:0}}>{twoRowColumns(cards).map((row,index)=><View key={index} style={{flexDirection:'row',alignItems:'stretch',gap:10}}>{row.map(card=><View key={card.key} style={{flex:1,minWidth:0}}>{card}</View>)}{row.length===1&&<View style={{flex:1}}/>}</View>)}</View>;
  return <View style={{gap:8,minWidth:0}} testID={`photo-rail-${label}`}>
    {(!compact||(width>=768&&(previous||next)))&&<View style={{flexDirection:'row',alignItems:'center',justifyContent:compact?'flex-end':'space-between',gap:8}}>{!compact&&<Text style={{fontSize:10,color:colors.muted}}>{t('discovery.swipe')}</Text>}<View style={{flexDirection:'row',gap:4}}>{(['left','right'] as const).map((side,index)=>{const disabled=index===0?!previous:!next;return <UiElement as={Pressable} key={side} accessibilityRole="button" accessibilityLabel={t(index===0?'discovery.previous':'discovery.next',{name:label})} accessibilityState={{disabled}} disabled={disabled} hitSlop={compact?6:0} onPress={()=>move(index===0?-1:1)} style={{width:compact?32:44,height:compact?32:44,borderRadius:22,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center',opacity:disabled?.35:1}}><Feather name={`chevron-${side}`} size={18} color={colors.accent}/></UiElement>;})}</View></View>}
    <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator accessibilityLabel={label} onLayout={event=>setGeometry(value=>({...value,width:event.nativeEvent.layout.width}))} onContentSizeChange={width=>setGeometry(value=>({...value,content:width}))} onScroll={event=>{const x=event.nativeEvent.contentOffset.x;setGeometry(value=>({...value,x}));}} scrollEventThrottle={32} decelerationRate="fast" snapToInterval={cardWidth+gap} contentContainerStyle={{gap,paddingHorizontal:3,paddingTop:compact?2:4,paddingBottom:12}}>
      {twoRowColumns(cards).map((column,index)=><View key={index} style={{gap,width:cardWidth}}>{column}</View>)}
    </ScrollView>
  </View>;
}
