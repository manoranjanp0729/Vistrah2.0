import {Text} from './typography';
import {UiText} from './localized-ui';
import {Action} from './ui';
import {useState} from 'react';
import {Pressable,View} from 'react-native';
import {router} from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import copy from '../lib/interface-copy';
import {useTheme,spacing,radii,controlHeights} from '../lib/theme';

const shortcuts={jobs:'/service/find-jobs',discovery:'/discover-more',employer:'/employer-jobs'} as const;
export function DiscoveryGuide(){
 const {colors,styles}=useTheme();
 const [expanded,setExpanded]=useState(false);
 const [journey,setJourney]=useState<'customer'|'provider'>('customer');
 const [openQuestion,setOpenQuestion]=useState<string|null>(null);
 const content=copy.engagement,selected=content[journey];
 return <View style={{gap:spacing.pageGap,borderTopWidth:1,borderColor:colors.border,paddingTop:spacing.regular}}>
  <Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={()=>setExpanded(!expanded)} style={{minHeight:controlHeights.standard,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.fieldGap}}><Text style={[styles.heading,{flex:1}]}><UiText value={content.title}/></Text><Feather name={expanded?'chevron-up':'chevron-down'} size={18} color={colors.muted}/></Pressable>
  {expanded&&<View style={{gap:spacing.sectionGap}}>
   <Text style={styles.muted}><UiText value={content.intro}/></Text>
   <View style={styles.row}>{(['customer','provider'] as const).map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:journey===value}} onPress={()=>setJourney(value)} style={{minHeight:controlHeights.standard,padding:spacing.controlPadding,borderWidth:1,borderColor:journey===value?colors.accent:colors.border,borderRadius:radii.action,backgroundColor:journey===value?colors.highlight:colors.surface}}><Text style={styles.text}><UiText value={value==='customer'?content.customerLabel:content.providerLabel}/></Text></Pressable>)}</View>
   <View style={{gap:spacing.regular}}><Text accessibilityRole="header" style={styles.heading}><UiText value={selected.title}/></Text><Text style={styles.text}><UiText value={selected.description}/></Text>
    {selected.steps.map(step=><View key={step.title} style={{paddingVertical:spacing.regular,borderBottomWidth:1,borderColor:colors.border,gap:spacing.fieldGap}}><Text style={styles.cardTitle}><UiText value={step.title}/></Text><Text style={styles.muted}><UiText value={step.description}/></Text></View>)}
    <Action label={selected.action} onPress={()=>router.push(journey==='customer'?'/services':'/seller/onboard')}/><Text style={styles.muted}><UiText value={selected.note}/></Text>
   </View>
   <View style={{gap:spacing.regular}}><Text accessibilityRole="header" style={styles.heading}><UiText value={content.shortcutsTitle}/></Text>{content.shortcuts.map(item=><Pressable key={item.key} accessibilityRole="link" onPress={()=>router.push(shortcuts[item.key as keyof typeof shortcuts])} style={{paddingVertical:spacing.regular,borderBottomWidth:1,borderColor:colors.border,gap:spacing.fieldGap}}><Text style={styles.cardTitle}><UiText value={item.title}/></Text><Text style={styles.muted}><UiText value={item.description}/></Text></Pressable>)}</View>
   <View style={{gap:spacing.regular}}><Text accessibilityRole="header" style={styles.heading}><UiText value={content.faqTitle}/></Text>{content.faq.map(item=><View key={item.question} style={{borderBottomWidth:1,borderColor:colors.border,paddingVertical:spacing.regular,gap:spacing.fieldGap}}><Pressable accessibilityRole="button" accessibilityState={{expanded:openQuestion===item.question}} onPress={()=>setOpenQuestion(openQuestion===item.question?null:item.question)} style={{minHeight:controlHeights.standard,justifyContent:'center'}}><Text style={styles.text}><UiText value={item.question}/></Text></Pressable>{openQuestion===item.question&&<Text style={styles.muted}><UiText value={item.answer}/></Text>}</View>)}</View>
  </View>}
 </View>;
}
