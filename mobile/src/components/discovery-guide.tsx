import {useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {router} from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import copy from '../lib/interface-copy';
import {useTheme} from '../lib/theme';
import {Action} from './ui';

const shortcuts={jobs:{route:'/service/find-jobs',icon:'briefcase'},discovery:{route:'/discover-more',icon:'compass'},employer:{route:'/employer-jobs',icon:'users'}} as const;
export function DiscoveryGuide(){
  const {colors,styles}=useTheme();
  const [journey,setJourney]=useState<'customer'|'provider'>('customer');
  const [openQuestion,setOpenQuestion]=useState<string|null>(null);
  const content=copy.engagement;
  const selected=content[journey];
  return <View style={{gap:16,marginVertical:12}}>
    <View style={{gap:6}}><Text accessibilityRole="header" style={styles.heading}>{content.title}</Text><Text style={styles.muted}>{content.intro}</Text></View>
    <View style={[styles.row,{gap:8}]}>{(['customer','provider'] as const).map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:journey===value}} onPress={()=>setJourney(value)} style={({pressed})=>({flex:1,minWidth:130,minHeight:48,padding:12,borderRadius:24,justifyContent:'center',alignItems:'center',backgroundColor:journey===value?colors.accent:colors.surface,borderWidth:1,borderColor:journey===value?colors.accent:colors.border,opacity:pressed?.75:1})}><Text style={[styles.text,{fontSize:13,fontWeight:'600',textAlign:'center',color:journey===value?colors.ink:colors.text}]}>{value==='customer'?content.customerLabel:content.providerLabel}</Text></Pressable>)}</View>
    <View style={[styles.card,{gap:14,borderWidth:1,borderColor:colors.border}]} accessibilityLiveRegion="polite">
      <Text style={styles.label}>{selected.eyebrow}</Text><Text accessibilityRole="header" style={styles.heading}>{selected.title}</Text><Text style={styles.muted}>{selected.description}</Text>
      {selected.steps.map((step,index)=><View key={step.title} style={{flexDirection:'row',gap:12,alignItems:'flex-start'}}><Text style={[styles.text,{fontWeight:'600',fontSize:12,borderBottomWidth:2,borderBottomColor:colors.accent,paddingBottom:4}]}>0{index+1}</Text><View style={{flex:1,gap:4}}><Text style={[styles.text,{fontWeight:'600'}]}>{step.title}</Text><Text style={styles.muted}>{step.description}</Text></View></View>)}
      <Action label={selected.action} onPress={()=>router.push(journey==='customer'?'/services':'/provider')}/><Text style={styles.muted}>{selected.note}</Text>
    </View>
    <Text accessibilityRole="header" style={styles.heading}>{content.shortcutsTitle}</Text>
    {content.shortcuts.map(item=>{const target=shortcuts[item.key];return <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={item.title+'. '+item.action} onPress={()=>router.push(target.route)} style={({pressed})=>[styles.card,{opacity:pressed?.75:1,borderWidth:1,borderColor:colors.border}]}><Feather name={target.icon} size={24} color={colors.text}/><Text style={[styles.text,{fontWeight:'600'}]}>{item.title}</Text><Text style={styles.muted}>{item.description}</Text><View style={styles.row}><Text style={[styles.text,{fontSize:13,fontWeight:'600'}]}>{item.action}</Text><Feather name="arrow-right" size={16} color={colors.text}/></View></Pressable>;})}
    <Text accessibilityRole="header" style={styles.heading}>{content.faqTitle}</Text>
    {content.faq.map(item=>{const expanded=openQuestion===item.question;return <View key={item.question} style={{borderBottomWidth:1,borderBottomColor:colors.border,paddingBottom:12,gap:4}}><Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={()=>setOpenQuestion(expanded?null:item.question)} style={{minHeight:48,flexDirection:'row',alignItems:'center',gap:8}}><Text style={[styles.text,{flex:1,fontWeight:'600'}]}>{item.question}</Text><Feather name={expanded?'minus':'plus'} size={18} color={colors.text}/></Pressable>{expanded&&<Text style={styles.muted}>{item.answer}</Text>}</View>;})}
  </View>;
}
