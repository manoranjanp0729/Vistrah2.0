import {Text} from '../components/typography';
import {UiText,UiElement} from "../components/localized-ui";
import {useState} from 'react';
import {Pressable,StyleSheet,View} from 'react-native';
import {router} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import {Page,SelectionFill} from '../components/ui';
import {useLanguage} from '../lib/language';
import {radii, tabularNums, useTheme} from '../lib/theme';
import {benefitText,membershipTextKeys,planDetailText,selectedMembership,publicMembershipCatalogue,type PlanKey,type BillingPeriod} from '../../../shared/business-membership';
const money=(amount:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(amount/100);
const identities={
 BASIC:{copy:'business.basicCopy',icon:'compass'},
 PLUS:{copy:'business.plusCopy',icon:'layers'},
 PREMIUM:{copy:'business.premiumCopy',icon:'award'}
} as const;
export default function MembershipScreen(){
 const {colors}=useTheme();
 const {t}=useLanguage();
 const [planKey,setPlanKey]=useState<PlanKey>('PLUS'),[period,setPeriod]=useState<BillingPeriod>('MONTHLY');
 const [expanded,setExpanded]=useState<Record<string,boolean>>({});
 const selection=selectedMembership(publicMembershipCatalogue,planKey,period),plan=selection.plan;
 const identity=identities[planKey];
 const accent=colors.accent,ink=colors.text,muted=colors.muted;
 const marketing=plan?.sections?.find(section=>section.title==='VISTRAH Ads & Marketing');
 const groups=[
  {title:'Business Visibility',icon:'eye',items:marketing?.items.slice(0,2)??[]},
  {title:'VISTRAH Ads & Marketing',icon:'pen-tool',items:marketing?.items.slice(2)??[]},
  {title:'Hiring & Job Postings',icon:'briefcase',items:plan?.sections?.find(section=>section.title==='Job Opportunities')?.items??[]},
  {title:'Leads & Enquiries',icon:'message-circle',items:plan?.sections?.find(section=>section.title==='Reporting')?.items??[]},
  {title:'Membership & Billing',icon:'shield',items:plan?.sections?.find(section=>section.title==='Plan Conditions')?.items??[]}
 ] as const;
 const explore=()=>router.push('/services');
 function toggle<T extends string>(label:string,values:readonly T[],value:T,select:(value:T)=>void){return <View accessibilityLabel={label} style={[s.segment,{backgroundColor:colors.surface,borderColor:colors.borderSubtle}]}>{values.map(item=>{
  const active=value===item;
  return <UiElement as={Pressable} key={item} accessibilityRole="button" accessibilityState={{selected:active}} accessibilityLabel={item==='MONTHLY'?t('business.monthly'):item==='ANNUAL'?t('business.yearly'):item[0]+item.slice(1).toLowerCase()} onPress={()=>select(item)} style={({pressed})=>[s.segmentItem,{backgroundColor:active?colors.elevated:'transparent',opacity:pressed?.8:1}]}><SelectionFill selected={active}/><Text style={{fontSize:13,lineHeight:18,fontWeight:active?'700':'500',color:active?colors.brandPrimaryInk:muted}}><UiText value={item==='MONTHLY'?t('business.monthly'):item==='ANNUAL'?t('business.yearly'):item[0]+item.slice(1).toLowerCase()}/></Text>{active&&<View style={{width:16,height:2,borderRadius:radii.pill,backgroundColor:colors.brandPrimaryInk}}/>}</UiElement>;
 })}</View>;}
 return <Page>
  <LinearGradient colors={[colors.surface,colors.elevated]} start={{x:0,y:0}} end={{x:1,y:1}} style={[s.hero,{borderColor:colors.borderSubtle}]}>
   <View accessible={false} pointerEvents="none" style={[s.glow,{backgroundColor:colors.brandPrimary}]}/>
   <Text style={[s.eyebrow,{color:colors.brandPrimary}]}>{t('business.grow')}</Text>
   <Text accessibilityRole="header" style={[s.heroTitle,{color:ink}]}>{t('business.hero')}</Text>
   <Text style={[s.body,{color:muted}]}>{t('business.intro')}</Text>
   <View style={s.highlights}>{([{icon:'eye',title:'Business Visibility'},{icon:'pen-tool',title:'Ads & Marketing'},{icon:'briefcase',title:'Hiring Opportunities'}] as const).map(item=><View key={item.title} style={s.heroHighlight}><Feather name={item.icon} size={15} color={colors.accent}/><Text style={[s.highlightText,{color:ink}]}>{t(item.title==='Business Visibility'?'business.visibility':item.title==='Ads & Marketing'?'business.ads':'business.hiring')}</Text></View>)}</View>
  </LinearGradient>
  <View style={{gap:6}}>
   {toggle(t('business.billing'),['MONTHLY','ANNUAL'] as const,period,setPeriod)}
   {toggle(t('business.plan'),['BASIC','PLUS','PREMIUM'] as const,planKey,setPlanKey)}
   <UiElement as={View} accessibilityLabel={t('business.selected')} style={[s.plan,{backgroundColor:colors.surface,borderColor:colors.borderSubtle}]}>
    <LinearGradient colors={[colors.elevated,colors.surface]} start={{x:0,y:0}} end={{x:1,y:1}} style={s.planHeader}>
     <View style={s.titleRow}><View style={[s.planIcon,{backgroundColor:colors.surface,borderColor:colors.borderSubtle}]}><Feather name={identity.icon} size={22} color={colors.brandPrimary}/></View><View style={{flex:1,gap:3}}><Text style={[s.eyebrow,{color:accent}]}>{t('business.title')}</Text><Text accessibilityRole="header" style={[s.planName,{color:ink}]}>{plan?.name}</Text></View></View>
     <Text style={[s.price,{color:ink},tabularNums]}><UiText value={selection.billing?.amount!=null?money(selection.billing.amount):t('business.soon')}/>{selection.billing?.amount!=null&&<Text style={[s.body,{color:muted}]}> / <UiText value={period==='MONTHLY'?t('business.month'):t('business.year')}/></Text>}</Text>
     {planKey==='BASIC'&&<View style={[s.offer,{backgroundColor:colors.surface,borderColor:colors.borderSubtle}]}><View style={s.titleRow}><Feather name="gift" size={18} color={colors.success}/><Text style={[s.eyebrow,{color:colors.success}]}>{t('business.upcoming')}</Text></View><Text style={[s.offerTitle,{color:ink}]}>{t('business.offer')}</Text><Text style={[s.body,{color:muted},tabularNums]}>{t('business.offerPrice',{free:money(0),price:money(publicMembershipCatalogue.plans.find(item=>item.key==='BASIC')!.periods.MONTHLY.amount!)})}</Text><Text style={[s.caption,{color:muted}]}>{t('business.offerTerms')}</Text></View>}
     {period==='ANNUAL'&&<><Text style={[s.caption,{color:muted}]}>{t('business.annual')}</Text><Text style={[s.caption,{color:muted}]}>{t('business.annualReference')}</Text></>}
     <Text style={[s.body,{color:muted}]}>{t(identity.copy)}</Text>
    </LinearGradient>
    <View style={s.planBody}>
     <Text style={[s.eyebrow,{color:accent}]}>{t('business.highlights')}</Text>
     {plan?.benefits.slice(0,5).map(benefit=><View key={benefit.kind} style={s.benefitRow}><Feather name="check-circle" size={16} color={colors.brandPrimary}/><Text style={[s.body,{color:ink,flex:1},tabularNums]}>{t('business.benefit.'+benefit.kind,benefit.kind==='SOCIAL_PAISE'?{amount:money(benefit.quantity)}:{quantity:benefit.quantity},benefitText(benefit))}</Text></View>)}
     <Text style={[s.caption,{color:muted}]}>{t('business.noGuarantee')}</Text>
     <Pressable accessibilityRole="link" onPress={explore} style={({pressed})=>[s.button,{backgroundColor:pressed?colors.brandPrimaryHover:colors.brandPrimary}]}><Text style={[s.buttonText,{color:colors.brandPrimaryInk}]}>{t('requests.explore')}</Text><Feather name="arrow-right" size={16} color={colors.brandPrimaryInk}/></Pressable>
    </View>
   </UiElement>
  </View>
  <View style={{gap:10}}><Text accessibilityRole="header" style={[s.sectionTitle,{color:ink}]}>{t('business.glance')}</Text><Text style={[s.caption,{color:muted}]}>{t('business.creditCycle')}</Text><View style={s.comparison}>{publicMembershipCatalogue.plans.map(item=><UiElement as={Pressable} key={item.key} accessibilityRole="button" accessibilityLabel={`${item.name}: ${t('business.jobSummary',{quantity:item.allowances.JOB})}`} accessibilityState={{selected:item.key===planKey}} onPress={()=>setPlanKey(item.key)} style={({pressed})=>[s.compareCard,{backgroundColor:item.key===planKey||pressed?colors.elevated:colors.surface,borderColor:item.key===planKey?accent:colors.borderSubtle}]}><Text style={[s.compareLabel,{color:ink}]}><UiText value={item.name}/></Text><Text style={[s.compareNumber,{color:colors.brandPrimary},tabularNums]}>{item.allowances.JOB}</Text><Text style={[s.caption,{color:muted}]}>{t('business.credits')}</Text></UiElement>)}</View><Text style={[s.caption,{color:muted}]}>{t('business.creditRule')}</Text></View>
  <View style={{gap:10}}><Text accessibilityRole="header" style={[s.sectionTitle,{color:ink}]}>{t('business.explained')}</Text>
   {groups.map(group=>{
    const open=!!expanded[group.title],visibility=group.title==='Business Visibility';
    const summary=visibility?(planKey==='BASIC'?t('business.standard'):t('business.plannedVisibility')):group.title==='VISTRAH Ads & Marketing'?(planKey==='BASIC'?t('business.separate'):t('business.allowances')):group.title==='Hiring & Job Postings'?t('business.jobSummary',{quantity:plan?.allowances.JOB??0}):group.title==='Leads & Enquiries'?t('business.reporting'):t('business.conditions');
    return <View key={group.title} style={[s.detailCard,{backgroundColor:colors.surface,borderColor:colors.borderSubtle}]}><Pressable accessibilityRole="button" accessibilityState={{expanded:open}} onPress={()=>setExpanded(value=>({...value,[group.title]:!value[group.title]}))} style={({pressed})=>[s.detailToggle,{backgroundColor:pressed?colors.elevated:'transparent'}]}><View style={[s.detailIcon,{backgroundColor:colors.elevated,borderColor:colors.borderSubtle}]}><Feather name={group.icon} size={17} color={colors.brandPrimary}/></View><View style={{flex:1,minWidth:0,gap:3}}><Text style={[s.detailTitle,{color:ink}]}><UiText value={group.title==='Business Visibility'?t('business.visibility'):group.title==='VISTRAH Ads & Marketing'?group.title:t(group.title==='Hiring & Job Postings'?'business.jobsGroup':group.title==='Leads & Enquiries'?'business.enquiriesGroup':'business.billingGroup')}/></Text><Text style={[s.caption,{color:muted},tabularNums]}>{summary}</Text></View><Feather name={open?'chevron-up':'chevron-down'} size={17} color={muted}/></Pressable>
     {open&&<View style={[s.details,{borderTopColor:colors.borderSubtle}]}>{group.items.map((item,index)=>{
      const text=plan?planDetailText(plan,item):'',planned=text.startsWith('Planned:');
      const benefit=plan?.benefits.find(value=>value.kind===item.benefit);
      const display=benefit?t('business.benefit.'+benefit.kind,benefit.kind==='SOCIAL_PAISE'?{amount:money(benefit.quantity)}:{quantity:benefit.quantity},text):t(membershipTextKeys[item.text??'']??'',{monthlyPrice:money(plan?.periods.MONTHLY.amount??0)},text);
      return <View key={index} style={s.benefitRow}><Feather name={planned?'clock':item.included===true?'check':'minus'} size={14} color={planned?colors.warning:colors.brandPrimary}/><Text style={[s.body,{color:muted,flex:1},tabularNums]}>{display}</Text></View>;
     })}{group.title==='Membership & Billing'&&<><Text style={[s.detailTitle,{color:ink}]}>{t('business.rulesTitle')}</Text>{publicMembershipCatalogue.rules?.map(rule=><Text key={rule} style={[s.caption,{color:muted}]}>{t(membershipTextKeys[rule],{},rule)}</Text>)}</>}</View>}
    </View>;
   })}
  </View>
  <LinearGradient colors={[colors.surface,colors.elevated]} start={{x:0,y:0}} end={{x:1,y:1}} style={[s.final,{borderColor:colors.borderSubtle}]}><Text accessibilityRole="header" style={[s.sectionTitle,{color:ink}]}>{t('business.final')}</Text><Text style={[s.body,{color:muted}]}>{t('business.finalCopy')}</Text><Pressable accessibilityRole="link" onPress={explore} style={({pressed})=>[s.button,{backgroundColor:pressed?colors.brandPrimaryHover:colors.brandPrimary}]}><Text style={[s.buttonText,{color:colors.brandPrimaryInk}]}>{t('requests.explore')}</Text><Feather name="arrow-right" size={16} color={colors.brandPrimaryInk}/></Pressable></LinearGradient>
 </Page>;
}
const s=StyleSheet.create({
 hero:{borderRadius:radii.surface,borderWidth:1,padding:14,gap:7,overflow:'hidden'},glow:{position:'absolute',right:-40,top:-70,width:200,height:200,borderRadius:radii.pill,opacity:.14},eyebrow:{fontSize:9,lineHeight:13,fontWeight:'700',letterSpacing:1},heroTitle:{fontSize:22,lineHeight:26,fontWeight:'700',letterSpacing:-.6},body:{fontSize:13,lineHeight:20},caption:{fontSize:11,lineHeight:17},highlights:{flexDirection:'row',flexWrap:'wrap',gap:8,paddingTop:1},heroHighlight:{flexDirection:'row',alignItems:'center',gap:5},highlightText:{fontSize:10,lineHeight:15,fontWeight:'600'},
 segment:{flexDirection:'row',padding:2,borderRadius:radii.pill,borderWidth:1,gap:4},segmentItem:{flex:1,minWidth:0,minHeight:44,borderRadius:radii.pill,overflow:'hidden',alignItems:'center',justifyContent:'center',gap:4},plan:{borderRadius:radii.surface,borderWidth:1,overflow:'hidden'},planHeader:{padding:16,gap:8},titleRow:{flexDirection:'row',alignItems:'center',gap:10},planIcon:{width:44,height:44,borderRadius:radii.action,borderWidth:1,alignItems:'center',justifyContent:'center'},planName:{fontSize:23,lineHeight:29,fontWeight:'700'},price:{fontSize:32,lineHeight:40,fontWeight:'700',letterSpacing:-.8},planBody:{padding:16,gap:10},benefitRow:{flexDirection:'row',alignItems:'flex-start',gap:9},button:{minHeight:46,paddingVertical:12,paddingHorizontal:14,borderRadius:radii.action,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:8},buttonText:{fontSize:13,lineHeight:19,fontWeight:'600'},offer:{padding:10,borderRadius:radii.surface,borderWidth:1,gap:6},offerTitle:{fontSize:15,lineHeight:21,fontWeight:'600'},
 sectionTitle:{fontSize:20,lineHeight:26,fontWeight:'700',letterSpacing:-.3},comparison:{flexDirection:'row',gap:8},compareCard:{flex:1,minWidth:0,borderWidth:1,padding:10,borderRadius:radii.surface,gap:3},compareLabel:{fontSize:12,lineHeight:18,fontWeight:'600'},compareNumber:{fontSize:27,lineHeight:33,fontWeight:'700'},detailCard:{borderRadius:radii.surface,borderWidth:1,overflow:'hidden'},detailToggle:{flexDirection:'row',alignItems:'center',gap:10,padding:13,minHeight:60},detailIcon:{width:32,height:32,borderRadius:radii.action,borderWidth:1,alignItems:'center',justifyContent:'center'},detailTitle:{fontSize:13,lineHeight:19,fontWeight:'600'},details:{padding:14,borderTopWidth:1,gap:11},final:{padding:18,borderRadius:radii.surface,borderWidth:1,gap:12}
});
