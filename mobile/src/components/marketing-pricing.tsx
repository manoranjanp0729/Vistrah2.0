import {Text} from './typography';
import {useEffect,useRef,useState} from 'react';
import {View,Pressable,Modal,ScrollView,Image} from 'react-native';
import {router} from 'expo-router';
import {Feather} from '@expo/vector-icons';
import {Page,Action,Field} from './ui';
import {useTheme} from '../lib/theme';
import {useSession} from '../lib/session';
import {api} from '../lib/api';
import {
 pricingCatalogue,
 searchPricing,
 servicePrice,
 formatPricingMoney,
 baseEstimate,
 emptyQuote,
 quoteKey,
 quotePayload,
 marketingPricingClient,
 pricingHref,
 defaultHydratedPricing,
 hydrateLivePricing,
 computeTierBoostEstimate,
 serviceFeeClarity,
 PRICING_COMPARISON_ROWS,
 type PricingIntent,
 type QuoteDraft,
 type MarketingQuote,
 type PricingCapabilities,
} from '../../../shared/marketing-pricing';

const client=marketingPricingClient(api);
const fields:[keyof QuoteDraft,string][]=[
 ['business_name','Business name'],
 ['contact_name','Contact name'],
 ['email','Contact email'],
 ['phone','Contact phone'],
 ['city','City'],
 ['area','Preferred area'],
 ['media_format','Media format'],
 ['campaign_duration','Campaign duration'],
 ['quantity','Quantity'],
 ['budget','Budget in INR (optional)'],
];

const PRICING_IMAGES={
 heroFree:require('../../../assets/ads-marketing/free-forever-hero.jpg'),
 creative:require('../../../assets/ads-marketing/branding-creative.webp'),
 video:require('../../../assets/ads-marketing/video-content-production.webp'),
 digital:require('../../../assets/ads-marketing/website-automation.jpg'),
 performance:require('../../../assets/ads-marketing/performance-marketing.webp'),
 social:require('../../../assets/ads-marketing/social-media-management.webp'),
 outdoor:require('../../../assets/ads-marketing/outdoor-signage.jpg'),
 mobility:require('../../../assets/ads-marketing/mobility-billboard.jpg'),
} as const;

function mobileDetailImage(categoryId?:string){
 if(categoryId==='websites')return PRICING_IMAGES.digital;
 if(categoryId==='video')return PRICING_IMAGES.video;
 if(categoryId==='branding')return PRICING_IMAGES.creative;
 if(categoryId==='social'||categoryId==='influencer')return PRICING_IMAGES.social;
 if(categoryId==='mobility')return PRICING_IMAGES.mobility;
 if(categoryId==='outdoor'||categoryId==='screens'||categoryId==='cinema')return PRICING_IMAGES.outdoor;
 return PRICING_IMAGES.performance;
}

export function MarketingPricing({serviceId,initialPackage=''}:{serviceId?:string;initialPackage?:string}){
 const {styles,colors}=useTheme(),{user}=useSession(false);
 const [hydrated,setHydrated]=useState(defaultHydratedPricing);
 const {catalogue,promo,vAdsTiers,pillars,faqs,serviceFeeLabels}=hydrated;
 const [live,setLive]=useState(false),[notice,setNotice]=useState(''),[cap,setCap]=useState<PricingCapabilities|null>(null);
 const [intent,setIntent]=useState<PricingIntent>('boosts');
 const [selectedTierId,setSelectedTierId]=useState<string>('v-ads-5km');
 const [query,setQuery]=useState(''),[category,setCategory]=useState(''),[billing,setBilling]=useState('all'),[compare,setCompare]=useState(false),[requestOpen,setRequestOpen]=useState(false);
 const [openFaq,setOpenFaq]=useState<number|null>(0);
 const defaultPlanServiceId=serviceId??'digital-campaign';
 const [draft,setDraft]=useState(()=>({...emptyQuote(defaultPlanServiceId),package_id:pricingCatalogue.services.find(s=>s.id===defaultPlanServiceId)?.starting_price_paise===null?'':initialPackage}));
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[confirmation,setConfirmation]=useState<MarketingQuote|null>(null),[history,setHistory]=useState<MarketingQuote[]>([]),[historyError,setHistoryError]=useState('');
 const key=useRef('');
 const [categoryOpen,setCategoryOpen]=useState(false),[servicePickerOpen,setServicePickerOpen]=useState(false);

 const items=searchPricing(catalogue,query,category,billing),selectedCategory=catalogue.categories.find(c=>c.id===category);
 const selectedTier=vAdsTiers.find(t=>t.id===selectedTierId)??vAdsTiers[0];
 const boostEstimate=computeTierBoostEstimate(selectedTier,30);
 const feeLabel=(svc:typeof catalogue.services[number])=>serviceFeeLabels[svc.id]??serviceFeeClarity(svc);

 function selectCategory(id:string){setCategory(id);setBilling('all');setQuery('');setCategoryOpen(false);}

 useEffect(()=>{
  let active=true;
  void Promise.allSettled([client.livePricing(),client.capabilities()]).then(async([liveRes,availability])=>{
   if(!active)return;
   if(liveRes.status==='fulfilled'){setHydrated(hydrateLivePricing(liveRes.value));setLive(true);}
   else{
    try{
     const cat=await client.catalogue();
     if(!active)return;
     setHydrated(prev=>({...prev,catalogue:cat}));setLive(true);
    }catch{
     if(active)setNotice('Live pricing could not load. Showing indicative proposals only.');
    }
   }
   if(availability.status==='fulfilled')setCap(availability.value);
  });
  return()=>{active=false;};
 },[]);

 useEffect(()=>{
  let active=true;
  if(user)void client.requests().then(value=>{if(active)setHistory(value.items);}).catch(()=>{if(active)setHistoryError('Quotation history is unavailable on this server.');});
  return()=>{active=false;};
 },[user,confirmation]);

 const detailService=serviceId?catalogue.services.find(s=>s.id===serviceId&&s.enabled):undefined;
 const activeQuoteService=detailService??catalogue.services.find(s=>s.id===draft.service_id&&s.enabled)??catalogue.services.find(s=>s.enabled);
 const pack=activeQuoteService?.starting_price_paise===null?undefined:catalogue.packages.find(p=>p.id===draft.package_id);

 const choice=(label:string,selected:boolean,onPress:()=>void)=>(
  <Pressable
   key={label}
   accessibilityRole="button"
   accessibilityState={{selected}}
   onPress={onPress}
   style={{
    minHeight:40,
    paddingVertical:8,
    paddingHorizontal:12,
    borderRadius:8,
    borderWidth:1,
    borderColor:selected?colors.accent:colors.border,
    backgroundColor:selected?colors.soft:colors.surface,
    justifyContent:'center',
   }}
  >
   <Text style={{color:selected?colors.text:colors.muted,fontWeight:selected?'700':'500',fontSize:13}}>{label}</Text>
  </Pressable>
 );

 const change=(field:keyof QuoteDraft,value:string)=>setDraft(current=>({...current,[field]:value}));

 function selectPlanService(nextId:string,presetBrief?:string){
  const nextSvc=catalogue.services.find(s=>s.id===nextId);
  key.current='';setError('');setConfirmation(null);
  setDraft(current=>({
   ...current,
   service_id:nextId,
   package_id:nextSvc?.starting_price_paise===null?'':current.package_id,
   requirements:presetBrief&&!current.requirements.trim()?presetBrief:current.requirements,
  }));
  setServicePickerOpen(false);
 }

 function openCustomPlan(targetId:string,presetBrief?:string){
  setIntent('studio');
  selectPlanService(targetId,presetBrief);
  setRequestOpen(true);
 }

 function reset(){key.current='';setError('');setConfirmation(null);setDraft(emptyQuote(serviceId??draft.service_id??'digital-campaign'));}

 async function submit(){
  if(!activeQuoteService||!user||!cap?.quote_requests_available)return;
  setError('');setBusy(true);
  try{
   if(activeQuoteService.starting_price_paise===null&&(!draft.area.trim()||!draft.media_format.trim()||!draft.campaign_duration.trim()))
    throw new Error('Enter preferred area, media format and campaign duration.');
   if(!key.current)key.current=quoteKey();
   setConfirmation(await client.submit(quotePayload({...draft,service_id:activeQuoteService.id},key.current)));
  }catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
 }

 const months=Number(draft.months),estimate=activeQuoteService&&Number.isInteger(months)&&months>=1&&months<=24?baseEstimate(activeQuoteService,pack,months):null;

 if(serviceId&&!detailService)return <Page title="Service unavailable"><Text style={styles.muted}>This service is not in the current public catalogue.</Text><Action label="Back to pricing" onPress={()=>router.dismissTo('/marketing-pricing')}/></Page>;

 return (
  <Page title={detailService?.name}>
   <Pressable
    accessibilityRole="link"
    onPress={()=>router.dismissTo(detailService?'/marketing-pricing':'/marketing-solutions')}
    style={{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,borderBottomWidth:1,borderColor:colors.border,paddingBottom:8}}
   >
    <Feather name="arrow-left" size={17} color={colors.accent}/>
    <Text style={{color:colors.accent,fontWeight:'600',fontSize:13}}>{detailService?'Back to pricing':'Ads & Marketing'}</Text>
   </Pressable>

   {detailService?(
    <>
     <View style={{borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:colors.border,backgroundColor:colors.soft}}>
      <Image source={mobileDetailImage(detailService.category_ids[0])} accessibilityLabel={detailService.name} resizeMode="cover" style={{width:'100%',height:190}}/>
      <View style={{padding:16,gap:8}}>
       <Feather name={(catalogue.categories.find(c=>c.id===detailService.category_ids[0])?.icon??'briefcase') as React.ComponentProps<typeof Feather>['name']} size={22} color={colors.accent}/>
       <Text style={[styles.heading,styles.tabular,{fontSize:22,letterSpacing:-0.55}]}>{servicePrice(detailService)}</Text>
       <Text style={{color:colors.text,fontSize:13,fontWeight:'600'}}>{feeLabel(detailService)}</Text>
       <Text style={styles.muted}>{detailService.description}</Text>
       <Text style={styles.muted}>{catalogue.notice}</Text>
       {Boolean(notice)&&<Text accessibilityRole="alert" style={styles.muted}>{notice}</Text>}
      </View>
     </View>
     <Action secondary label={compare?'Hide package comparison':'Compare marketing packages'} onPress={()=>setCompare(v=>!v)}/>
    </>
   ):(
    <>
     {/* Editorial Hero: ₹0 / Free Forever Platform */}
     <View style={{borderRadius:18,overflow:'hidden',borderWidth:1,borderColor:colors.border,backgroundColor:colors.soft}}>
      <View style={{position:'relative'}}>
       <Image source={PRICING_IMAGES.heroFree} accessibilityLabel="Free Forever Business Listing and Any-Radius V Ads on VISTRAH" resizeMode="cover" style={{width:'100%',height:200}}/>
       <View style={{position:'absolute',left:12,bottom:12,paddingHorizontal:10,paddingVertical:5,borderRadius:999,backgroundColor:'rgba(15,23,42,0.82)'}}>
        <Text style={{color:'#ffffff',fontSize:10,fontWeight:'700',letterSpacing:0.7}}>₹0 / FREE FOREVER · ANY RADIUS</Text>
       </View>
      </View>
      <View style={{padding:16,gap:12}}>
       <Text style={[styles.label,{fontWeight:'700',letterSpacing:0.8}]}>VISTRAH PRICING · ₹0 / FREE FOREVER PLATFORM</Text>
       <Text accessibilityRole="header" style={[styles.title,{fontSize:24,lineHeight:29,letterSpacing:-0.6}]}>
        {promo.headline}
       </Text>
       <Text style={styles.muted}>
        {promo.subheadline}
       </Text>
       <View style={{gap:8,marginTop:2}}>
        <Action label={promo.primaryCta} onPress={()=>router.push('/seller/v-ads')}/>
        <Action secondary label={promo.secondaryCtaLabel} onPress={()=>router.push('/seller/onboard')}/>
        <Action secondary label="Explore Paid Studio & Website Quotes" onPress={()=>openCustomPlan(pillars[0]?.defaultServiceId??'promotional-reel',pillars[0]?.defaultBrief)}/>
        <Text style={[styles.muted,styles.tabular,{fontSize:12,marginTop:2}]}>{promo.microcopy}</Text>
       </View>

       <View style={{padding:14,borderRadius:14,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,gap:8}}>
        <Text style={[styles.label,{fontWeight:'700',letterSpacing:0.6}]}>{promo.anchorBadge}</Text>
        <View style={{flexDirection:'row',alignItems:'baseline',gap:8,flexWrap:'wrap'}}>
         <Text style={[styles.tabular,{fontSize:28,lineHeight:32,fontWeight:'700',color:colors.accent,letterSpacing:-0.6}]}>{promo.anchorPriceLabel}</Text>
         <Text style={[styles.heading,{fontSize:16}]}>{promo.anchorTitle}</Text>
        </View>
        <Text style={styles.muted}>{promo.anchorSummary}</Text>
        <View style={{gap:8,marginTop:4}}>
         <Action secondary label={promo.secondaryCtaLabel} onPress={()=>router.push('/seller/onboard')}/>
         <Action secondary label="Request Website" onPress={()=>router.push('/contact?intent=request-website' as never)}/>
        </View>
       </View>
      </View>
     </View>

     {Boolean(notice)&&<Text accessibilityRole="alert" style={styles.muted}>{notice}</Text>}

     {/* Segmented Buyer-Intent Switcher */}
     <View accessibilityRole="tablist" style={{flexDirection:'row',gap:6,padding:5,borderRadius:12,borderWidth:1,borderColor:colors.border,backgroundColor:colors.soft}}>
      <Pressable
       accessibilityRole="tab"
       accessibilityState={{selected:intent==='boosts'}}
       onPress={()=>setIntent('boosts')}
       style={{
        flex:1,
        minHeight:52,
        padding:10,
        borderRadius:8,
        borderWidth:1,
        borderColor:intent==='boosts'?colors.border:'transparent',
        backgroundColor:intent==='boosts'?colors.surface:'transparent',
        gap:2,
       }}
      >
       <Text style={{color:intent==='boosts'?colors.text:colors.muted,fontWeight:'600',fontSize:13}}>Free Forever Platform</Text>
       <Text style={[styles.tabular,{color:colors.muted,fontSize:11}]}>₹0 Listing &amp; Any-Radius V Ads</Text>
      </Pressable>
      <Pressable
       accessibilityRole="tab"
       accessibilityState={{selected:intent==='studio'}}
       onPress={()=>setIntent('studio')}
       style={{
        flex:1,
        minHeight:52,
        padding:10,
        borderRadius:8,
        borderWidth:1,
        borderColor:intent==='studio'?colors.border:'transparent',
        backgroundColor:intent==='studio'?colors.surface:'transparent',
        gap:2,
       }}
      >
       <Text style={{color:intent==='studio'?colors.text:colors.muted,fontWeight:'600',fontSize:13}}>Studio, Web &amp; Tech</Text>
       <Text style={[styles.tabular,{color:colors.muted,fontSize:11}]}>Paid Ads, Websites &amp; Automation</Text>
      </Pressable>
     </View>

     {intent==='boosts'?(
      <View style={{padding:16,borderRadius:12,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,gap:16}}>
       <View style={{gap:4}}>
        <Text style={[styles.label,{fontWeight:'700',letterSpacing:0.6}]}>₹0 / FREE FOREVER · ZERO PER-RADIUS FEES</Text>
        <Text accessibilityRole="header" style={[styles.heading,{fontSize:19,letterSpacing:-0.45}]}>Free Business Listing &amp; Free V Ads for Any Radius</Text>
       </View>

       <View style={{gap:8}}>
        <Text style={[styles.label,{fontWeight:'700',letterSpacing:0.6}]}>PREVIEW TARGET RADIUS — FREE FOR ANY RADIUS ON VISTRAH</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
         {vAdsTiers.map(tier=>{
          const active=selectedTier.id===tier.id;
          return (
           <Pressable
            key={tier.id}
            accessibilityRole="button"
            accessibilityState={{selected:active}}
            onPress={()=>setSelectedTierId(tier.id)}
            style={{
             width:'48%',
             flexGrow:1,
             minHeight:62,
             padding:10,
             borderRadius:8,
             borderWidth:1,
             borderColor:active?colors.accent:colors.border,
             backgroundColor:active?colors.soft:colors.surface,
             gap:2,
            }}
           >
            <Text style={[styles.tabular,{color:colors.accent,fontWeight:'700',fontSize:11}]}>{(tier.promoBadge||'₹0 Free Forever').toUpperCase()}</Text>
            <Text style={[styles.tabular,{color:colors.text,fontWeight:'700',fontSize:15}]}>{tier.label}</Text>
            <Text style={[styles.tabular,{color:colors.muted,fontSize:11}]}>₹0 / Free Forever · {tier.zoneLabel}</Text>
           </Pressable>
          );
         })}
        </View>
       </View>

       {/* Hairline Ledger Readout */}
       <View style={{padding:14,borderRadius:12,borderWidth:1,borderColor:colors.border,backgroundColor:colors.soft,gap:2}}>
        <Text style={[styles.label,{fontWeight:'700',letterSpacing:0.6,marginBottom:4}]}>SELF-SERVE PLATFORM SUMMARY</Text>
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'baseline',gap:12,paddingVertical:10,borderBottomWidth:1,borderColor:colors.border}}>
         <View style={{flex:1,gap:2}}>
          <Text style={{color:colors.text,fontWeight:'700',fontSize:15}}>₹0 / Free Forever</Text>
          <Text style={[styles.muted,styles.tabular,{fontSize:11}]}>Free for any radius on VISTRAH ({selectedTier.label} · {boostEstimate.reachFormatted} est. monthly views)</Text>
         </View>
         <Text style={[styles.tabular,{color:colors.accent,fontWeight:'700',fontSize:26,letterSpacing:-0.55}]}>₹0</Text>
        </View>

        {[
         ['Business listing (808+ service types)','₹0 / Free Forever'],
         [`Self-serve V Ads (${selectedTier.label} or any radius)`,'₹0 / Free Forever'],
         ['Customer call & lead commission','0% (Direct to you)'],
        ].map(([k,v])=>(
         <View key={k} style={{flexDirection:'row',justifyContent:'space-between',gap:12,paddingVertical:8,borderBottomWidth:1,borderColor:colors.border}}>
          <Text style={[styles.muted,{flex:1}]}>{k}</Text>
          <Text style={[styles.tabular,{color:colors.text,fontWeight:'600',fontSize:13,flexShrink:0}]}>{v}</Text>
         </View>
        ))}
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'baseline',gap:12,paddingTop:10}}>
         <Text style={{color:colors.text,fontWeight:'600',fontSize:14}}>Due today &amp; every month</Text>
         <Text style={[styles.tabular,{color:colors.accent,fontWeight:'700',fontSize:22,letterSpacing:-0.45}]}>₹0</Text>
        </View>
       </View>

       <Action label={promo.primaryCta} onPress={()=>router.push('/seller/v-ads')}/>
       <Action secondary label="List Your Business Free (808+ Services)" onPress={()=>router.push('/seller/onboard')}/>

       <View style={{borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:colors.border,backgroundColor:colors.soft}}>
        <View style={{position:'relative'}}>
         <Image source={PRICING_IMAGES.video} accessibilityLabel="VISTRAH Ads and Marketing Studio commercial video shoot" resizeMode="cover" style={{width:'100%',height:165}}/>
         <View style={{position:'absolute',left:10,bottom:10,paddingHorizontal:10,paddingVertical:4,borderRadius:999,backgroundColor:'rgba(15,23,42,0.82)'}}>
          <Text style={{color:'#ffffff',fontSize:10,fontWeight:'700',letterSpacing:0.6}}>CREATIVES ₹499+ · REELS ₹2,999</Text>
         </View>
        </View>
        <View style={{padding:14,gap:8}}>
         <Text style={[styles.label,{fontWeight:'700',letterSpacing:0.6}]}>PAID AGENCY TRACK 01</Text>
         <Text style={[styles.heading,{fontSize:16}]}>VISTRAH Ads &amp; Marketing Studio</Text>
         <Text style={styles.muted}>Custom commercial video shoots (Reels, Shorts, brand films), graphic/brochure design, and managed Meta/Google/social/outdoor campaigns.</Text>
         <Action secondary label="View Studio Rates & Request Quote" onPress={()=>openCustomPlan('promotional-reel','Looking for custom commercial video ad production, graphic/brochure design, or managed Meta/Google marketing: ')}/>
        </View>
       </View>

       <View style={{borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:colors.border,backgroundColor:colors.soft}}>
        <View style={{position:'relative'}}>
         <Image source={PRICING_IMAGES.digital} accessibilityLabel="Custom business website design and workflow automation" resizeMode="cover" style={{width:'100%',height:165}}/>
         <View style={{position:'absolute',left:10,bottom:10,paddingHorizontal:10,paddingVertical:4,borderRadius:999,backgroundColor:'rgba(15,23,42,0.82)'}}>
          <Text style={{color:'#ffffff',fontSize:10,fontWeight:'700',letterSpacing:0.6}}>WEBSITES ₹4,999+ · WORKFLOW AUTOMATION</Text>
         </View>
        </View>
        <View style={{padding:14,gap:8}}>
         <Text style={[styles.label,{fontWeight:'700',letterSpacing:0.6}]}>PAID TECH TRACK 02</Text>
         <Text style={[styles.heading,{fontSize:16}]}>Website &amp; Digital Setup (VISTRAH Tech / Automation)</Text>
         <Text style={styles.muted}>Custom mobile-first business website design &amp; launch (with Call &amp; WhatsApp capture) and custom business workflow automation.</Text>
         <Action secondary label="Explore Website & Automation Plans" onPress={()=>{setCategory('websites');setIntent('studio');}}/>
        </View>
       </View>

       <Text style={[styles.muted,{fontSize:11}]}>
        {promo.microcopy}. Video uploads and geo-radius targeting are 100% free on VISTRAH and go live after standard moderation approval.
       </Text>
      </View>
     ):(
      <View style={{gap:14}}>
       <View style={{padding:12,borderRadius:8,borderWidth:1,borderColor:colors.border,backgroundColor:colors.soft}}>
        <Text style={styles.muted}>{promo.studioBoundary}</Text>
       </View>
       <View style={{gap:4}}>
        <Text style={[styles.label,{fontWeight:'700',letterSpacing:0.6}]}>FULL-STACK AGENCY &amp; CITY MEDIA</Text>
        <Text accessibilityRole="header" style={[styles.heading,{fontSize:20,letterSpacing:-0.45}]}>VISTRAH Ads &amp; Marketing Studio</Text>
        <Text style={styles.muted}>Compare starting fees across 4 agency pillars. Third-party ad spend, printing, and 18% GST are itemised separately.</Text>
       </View>

       <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose pricing category"
        accessibilityState={{expanded:categoryOpen}}
        onPress={()=>setCategoryOpen(true)}
        style={{
         backgroundColor:colors.soft,
         borderRadius:8,
         borderWidth:1,
         borderColor:colors.border,
         minHeight:52,
         flexDirection:'row',
         alignItems:'center',
         gap:12,
         paddingHorizontal:14,
         paddingVertical:10,
        }}
       >
        <Feather name={(selectedCategory?.icon??'grid') as React.ComponentProps<typeof Feather>['name']} size={19} color={colors.accent}/>
        <View style={{flex:1,gap:2}}>
         <Text style={[styles.label,{fontWeight:'700'}]}>CATEGORY FILTER</Text>
         <Text style={[styles.heading,{fontSize:14}]}>{selectedCategory?.name??'All categories'}</Text>
        </View>
        <Feather name="chevron-down" size={19} color={colors.accent}/>
       </Pressable>

       <Modal visible={categoryOpen} transparent animationType="fade" onRequestClose={()=>setCategoryOpen(false)}>
        <View style={{flex:1,backgroundColor:'#00000066',justifyContent:'center',padding:20}}>
         <Pressable accessibilityRole="button" accessibilityLabel="Dismiss category selector" onPress={()=>setCategoryOpen(false)} style={{position:'absolute',top:0,bottom:0,left:0,right:0}}/>
         <View accessibilityViewIsModal style={{backgroundColor:colors.surface,borderRadius:12,padding:16,maxHeight:'80%',width:'100%',maxWidth:540,alignSelf:'center',gap:10}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
           <Text accessibilityRole="header" style={styles.heading}>Choose a category</Text>
           <Pressable accessibilityRole="button" accessibilityLabel="Close category selector" onPress={()=>setCategoryOpen(false)} style={{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'}}>
            <Feather name="x" size={20} color={colors.text}/>
           </Pressable>
          </View>
          <ScrollView contentContainerStyle={{gap:6}}>
           {[{id:'',name:'All categories',icon:'grid'},...catalogue.categories].map(c=>(
            <Pressable
             key={c.id}
             accessibilityRole="button"
             accessibilityLabel={c.name}
             accessibilityState={{selected:category===c.id}}
             onPress={()=>selectCategory(c.id)}
             style={{minHeight:46,padding:12,borderRadius:8,borderWidth:1,borderColor:category===c.id?colors.accent:colors.border,flexDirection:'row',alignItems:'center',gap:12}}
            >
             <Feather name={c.icon as React.ComponentProps<typeof Feather>['name']} color={colors.accent} size={18}/>
             <Text style={{color:colors.text,flex:1}}>{c.name}</Text>
             {category===c.id&&<Feather name="check" size={18} color={colors.accent}/>}
            </Pressable>
           ))}
          </ScrollView>
         </View>
        </View>
       </Modal>

       <Field label="Search services" hideLabel placeholder="Search websites, reels, SEO, hoardings..." value={query} onChangeText={setQuery}/>

       <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}} style={{flexGrow:0}}>
        {[['all','All pricing'],['one-time','One-time'],['month','Monthly'],['quote','Quotation only']].map(([id,label])=>choice(label,billing===id,()=>setBilling(id)))}
       </ScrollView>

       <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
        <Text style={[styles.heading,{fontSize:15}]}>{selectedCategory?.name??'4 Agency Pillars'}</Text>
        <Text accessibilityLiveRegion="polite" style={[styles.muted,styles.tabular]}>{items.length} options</Text>
       </View>

       {pillars.map(pillar=>{
        const pillarItems=items.filter(item=>item.category_ids.some(cid=>pillar.categoryIds.includes(cid)));
        if(!pillarItems.length)return null;
        const pillarImg=PRICING_IMAGES[pillar.id as keyof typeof PRICING_IMAGES]??PRICING_IMAGES.creative;
        return (
         <View key={pillar.id} style={{borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:colors.border,backgroundColor:colors.soft}}>
          <Image source={pillarImg} accessibilityLabel={pillar.title} resizeMode="cover" style={{width:'100%',height:165}}/>
          <View style={{padding:14,gap:8}}>
           <Text style={[styles.label,styles.tabular,{color:colors.accent,fontWeight:'700',letterSpacing:0.8}]}>PILLAR {pillar.step}</Text>
           <Text style={[styles.heading,{fontSize:18,letterSpacing:-0.45}]}>{pillar.title}</Text>
           <Text style={styles.muted}>{pillar.subtitle}</Text>
           <Text style={{color:colors.text,fontSize:12,fontWeight:'600'}}>{pillar.feeNote}</Text>
           <Action secondary label="Request Custom Media Plan" onPress={()=>openCustomPlan(pillar.defaultServiceId,pillar.defaultBrief)}/>

           <View style={{borderTopWidth:1,borderColor:colors.border,marginTop:4}}>
            {pillarItems.map(item=>(
             <Pressable
              key={item.id}
              accessibilityRole="link"
              onPress={()=>router.push(pricingHref(item.id) as never)}
              style={{paddingVertical:14,borderBottomWidth:1,borderColor:colors.border,gap:4}}
             >
              <View style={{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
               <Text style={[styles.heading,{flex:1,fontSize:16}]}>{item.name}</Text>
               <Feather name="arrow-up-right" size={17} color={colors.accent}/>
              </View>
              <Text style={[styles.tabular,{color:colors.accent,fontWeight:'700',fontSize:16}]}>{servicePrice(item)}</Text>
              <Text style={[styles.muted,{fontSize:12}]}>{feeLabel(item)}</Text>
              <Text numberOfLines={2} style={styles.muted}>Deliverables: {item.deliverables.slice(0,3).join(' · ')}</Text>
             </Pressable>
            ))}
           </View>
          </View>
         </View>
        );
       })}

       {!items.length&&<Text style={styles.muted}>No services match these filters.</Text>}
       <Text style={styles.muted}>{catalogue.notice}</Text>
       <Action secondary label={compare?'Hide package comparison':'Compare monthly retainers'} onPress={()=>setCompare(v=>!v)}/>
       <Action label={requestOpen?'Hide custom media plan form':'Request Custom Media Plan'} onPress={()=>setRequestOpen(v=>!v)}/>
      </View>
     )}
    </>
   )}

   {detailService&&(
    <>
     <View style={{paddingVertical:14,borderTopWidth:1,borderBottomWidth:1,borderColor:colors.border,gap:8}}>
      <Text style={styles.heading}>Proposed inclusions</Text>
      {detailService.deliverables.map(item=><Text key={item} style={styles.muted}>• {item}</Text>)}
      <Text style={[styles.heading,{marginTop:6}]}>Delivery</Text>
      <Text style={styles.muted}>{detailService.delivery_note??'Delivery duration will be confirmed after reviewing your brief.'}</Text>
      <Text style={[styles.heading,{marginTop:6}]}>Exclusions &amp; terms</Text>
      {detailService.exclusions.map(item=><Text key={item} style={styles.muted}>• {item}</Text>)}
     </View>
     {detailService.studio_related&&(
      <View style={{padding:14,borderRadius:12,borderWidth:1,borderColor:colors.border,backgroundColor:colors.soft,gap:8}}>
       <Text style={styles.muted}>Creating your own ad? Existing upload review and moderation still apply.</Text>
       <Action secondary label="Open V Ads Studio" onPress={()=>router.push('/seller/v-ads')}/>
      </View>
     )}
    </>
   )}

   {compare&&(
    <View style={{gap:12,borderTopWidth:1,borderColor:colors.border,paddingTop:14}}>
     <Text style={styles.heading}>Standalone monthly retainers</Text>
     <Text style={styles.muted}>Separate from seller membership Basic, Plus and Premium. Ad media spend and 18% GST are extra.</Text>
     {catalogue.packages.map(p=>(
      <View key={p.id} style={{padding:16,borderRadius:12,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,gap:8}}>
       <Text style={[styles.heading,styles.tabular]}>{p.name} — {formatPricingMoney(p.monthly_price_paise)}/month</Text>
       {p.features.map(f=><Text key={f} style={styles.muted}>• {f}</Text>)}
       <Text style={styles.muted}>{p.note}</Text>
       <Action
        label={'Choose '+p.name}
        onPress={()=>
         activeQuoteService&&activeQuoteService.starting_price_paise!==null
          ?(change('package_id',p.id),setRequestOpen(true))
          :router.push((pricingHref('social-management')+'?package='+p.id) as never)
        }
       />
      </View>
     ))}
    </View>
   )}

   {detailService&&<Action label={requestOpen?'Hide quotation form':'Get Quote / Request Service'} onPress={()=>setRequestOpen(v=>!v)}/>}

   {activeQuoteService&&requestOpen&&(detailService||intent==='studio')&&(
    <View style={{padding:16,borderRadius:12,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,gap:12}}>
     <Text accessibilityRole="header" style={styles.heading}>{detailService?'Tell us about your project':'Request Custom Media Plan'}</Text>
     <Text style={styles.muted}>A request is not an order, payment or confirmed placement. Management/production fees, pass-through media spend, and 18% GST are itemised in your proposal.</Text>
     {!cap?.quote_requests_available&&<Text accessibilityRole="alert" style={styles.muted}>{cap?.message??'Quotation submission is unavailable on this server. Nothing has been submitted.'}</Text>}

     {!detailService&&(
      <>
       <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose primary service"
        onPress={()=>setServicePickerOpen(true)}
        style={{padding:12,borderRadius:8,borderWidth:1,borderColor:colors.border,backgroundColor:colors.soft,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}
       >
        <View style={{flex:1,gap:2}}>
         <Text style={[styles.label,{fontWeight:'700'}]}>PRIMARY SERVICE / VERTICAL</Text>
         <Text style={[styles.heading,{fontSize:14}]}>{activeQuoteService.name} — {servicePrice(activeQuoteService)}</Text>
        </View>
        <Feather name="chevron-down" size={18} color={colors.accent}/>
       </Pressable>
       <Modal visible={servicePickerOpen} transparent animationType="fade" onRequestClose={()=>setServicePickerOpen(false)}>
        <View style={{flex:1,backgroundColor:'#00000066',justifyContent:'center',padding:20}}>
         <Pressable accessibilityRole="button" accessibilityLabel="Dismiss service selector" onPress={()=>setServicePickerOpen(false)} style={{position:'absolute',top:0,bottom:0,left:0,right:0}}/>
         <View accessibilityViewIsModal style={{backgroundColor:colors.surface,borderRadius:12,padding:16,maxHeight:'80%',width:'100%',maxWidth:540,alignSelf:'center',gap:10}}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
           <Text accessibilityRole="header" style={styles.heading}>Select primary service</Text>
           <Pressable accessibilityRole="button" accessibilityLabel="Close service selector" onPress={()=>setServicePickerOpen(false)} style={{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'}}>
            <Feather name="x" size={20} color={colors.text}/>
           </Pressable>
          </View>
          <ScrollView contentContainerStyle={{gap:6}}>
           {catalogue.services.filter(s=>s.enabled).map(s=>(
            <Pressable
             key={s.id}
             accessibilityRole="button"
             accessibilityState={{selected:activeQuoteService.id===s.id}}
             onPress={()=>selectPlanService(s.id)}
             style={{padding:12,borderRadius:8,borderWidth:1,borderColor:activeQuoteService.id===s.id?colors.accent:colors.border,gap:2}}
            >
             <Text style={{color:colors.text,fontWeight:'600',fontSize:14}}>{s.name}</Text>
             <Text style={[styles.tabular,{color:colors.accent,fontSize:12}]}>{servicePrice(s)}</Text>
            </Pressable>
           ))}
          </ScrollView>
         </View>
        </View>
       </Modal>
      </>
     )}

     {activeQuoteService.starting_price_paise!==null&&(
      <>
       <Text style={styles.heading}>Package</Text>
       <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
        {choice('Service scope only',!draft.package_id,()=>change('package_id',''))}
        {catalogue.packages.map(p=>choice(p.name,draft.package_id===p.id,()=>change('package_id',p.id)))}
       </View>
      </>
     )}

     {(pack||activeQuoteService.billing==='month')&&(
      <Field label="Number of months (1 to 24)" value={draft.months} onChangeText={v=>change('months',v)} keyboardType="number-pad" editable={!busy&&!confirmation}/>
     )}

     {fields.filter(([f])=>activeQuoteService.starting_price_paise===null||!['media_format','campaign_duration','quantity'].includes(f)).map(([f,label])=>(
      <Field
       key={f}
       label={label}
       value={draft[f] as string}
       onChangeText={v=>change(f,v)}
       maxLength={f==='contact_name'?100:150}
       autoCapitalize={f==='email'?'none':'sentences'}
       keyboardType={f==='email'?'email-address':f==='phone'?'phone-pad':['quantity','budget'].includes(f)?'numeric':'default'}
       editable={!busy&&!confirmation}
      />
     ))}

     <Field label="Requirements (at least 20 characters)" multiline value={draft.requirements} onChangeText={v=>change('requirements',v)} maxLength={5000} editable={!busy&&!confirmation}/>

     <Text style={styles.heading}>Optional add-ons (quoted separately)</Text>
     {activeQuoteService.addons.map(addon=>(
      <Pressable
       key={addon}
       accessibilityRole="checkbox"
       accessibilityState={{checked:draft.addons.includes(addon),disabled:busy||Boolean(confirmation)}}
       disabled={busy||Boolean(confirmation)}
       onPress={()=>setDraft(current=>({...current,addons:current.addons.includes(addon)?current.addons.filter(v=>v!==addon):[...current.addons,addon]}))}
       style={{minHeight:42,flexDirection:'row',alignItems:'center',gap:10}}
      >
       <Feather name={draft.addons.includes(addon)?'check-square':'square'} color={colors.accent} size={20}/>
       <Text style={[styles.muted,{flex:1}]}>{addon}</Text>
      </Pressable>
     ))}

     <Text style={[styles.heading,styles.tabular]}>Indicative base: {estimate===null?'Quotation required':formatPricingMoney(estimate)}</Text>
     <Text style={styles.muted}>Excludes add-ons, ad spend, 18% GST and third-party charges. Packages replace the service-only base; they are not added twice.</Text>

     {Boolean(error)&&(
      <>
       <Text accessibilityRole="alert" style={{color:colors.error}}>{error}</Text>
       <Action secondary label="Membership details" onPress={()=>router.push('/membership')}/>
       <Action secondary label="Start a new request" onPress={reset}/>
      </>
     )}

     {confirmation?(
      <>
       <Text accessibilityRole="alert" style={styles.heading}>Quote request received: {confirmation.id}</Text>
       <Text style={styles.muted}>Status: {confirmation.status}. No payment or booking has been made.</Text>
       <Action secondary label="Start another request" onPress={reset}/>
      </>
     ):user?(
      <Action disabled={busy||!live||!cap?.quote_requests_available} label={busy?'Submitting...':'Submit quotation request'} onPress={()=>void submit()}/>
     ):(
      <Action auth label="Sign in as customer to request a quote" onPress={()=>router.push(('/auth?next='+encodeURIComponent(detailService?pricingHref(detailService.id):'/marketing-pricing')) as never)}/>
     )}
    </View>
   )}

   {!detailService&&(
    <>
     {/* Hairline Track Comparison */}
     <View style={{borderTopWidth:1,borderColor:colors.border,paddingTop:16,gap:8}}>
      <Text style={[styles.label,{fontWeight:'700',letterSpacing:0.6}]}>FREE PLATFORM VS. PAID SOLUTIONS</Text>
      <Text accessibilityRole="header" style={[styles.heading,{fontSize:19,letterSpacing:-0.45}]}>Compare ₹0 Business Listing, Free V Ads &amp; Paid Studio / Tech</Text>
      <View style={{borderTopWidth:1,borderColor:colors.border,marginTop:4}}>
       {PRICING_COMPARISON_ROWS.map(row=>(
        <View key={row.criteria} style={{paddingVertical:12,borderBottomWidth:1,borderColor:colors.border,gap:4}}>
         <Text style={{color:colors.text,fontWeight:'700',fontSize:13}}>{row.criteria}</Text>
         <Text style={[styles.muted,styles.tabular]}><Text style={{color:colors.text,fontWeight:'600'}}>₹0 Business Listing (Free Forever): </Text>{row.free}</Text>
         <Text style={[styles.muted,styles.tabular]}><Text style={{color:colors.text,fontWeight:'600'}}>Self-Serve V Ads (Free Any Radius): </Text>{row.boosts}</Text>
         <Text style={[styles.muted,styles.tabular]}><Text style={{color:colors.text,fontWeight:'600'}}>Studio, Website &amp; Automation: </Text>{row.studio}</Text>
        </View>
       ))}
      </View>
     </View>

     {/* Hairline Merchant FAQs */}
     <View style={{borderTopWidth:1,borderColor:colors.border,paddingTop:16,gap:8}}>
      <Text style={[styles.label,{fontWeight:'700',letterSpacing:0.6}]}>BILLING, GST &amp; CAMPAIGN RULES</Text>
      <Text accessibilityRole="header" style={[styles.heading,{fontSize:19,letterSpacing:-0.45}]}>Frequently asked questions</Text>
      <View style={{borderTopWidth:1,borderColor:colors.border,marginTop:4}}>
       {faqs.map((faq,idx)=>{
        const expanded=openFaq===idx;
        return (
         <View key={faq.id} style={{borderBottomWidth:1,borderColor:colors.border}}>
          <Pressable
           accessibilityRole="button"
           accessibilityState={{expanded}}
           onPress={()=>setOpenFaq(expanded?null:idx)}
           style={{minHeight:48,paddingVertical:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}
          >
           <Text style={{color:colors.text,fontWeight:'600',fontSize:14,flex:1}}>{faq.question}</Text>
           <Feather name={expanded?'chevron-up':'chevron-down'} size={18} color={colors.muted}/>
          </Pressable>
          {expanded&&<Text style={[styles.muted,{paddingBottom:12}]}>{faq.answer}</Text>}
         </View>
        );
       })}
      </View>
     </View>
    </>
   )}

   {user&&(
    <View style={{borderTopWidth:1,borderColor:colors.border,paddingTop:14,gap:8}}>
     <Text style={styles.heading}>Your recent marketing requests</Text>
     {Boolean(historyError)&&<Text style={styles.muted}>{historyError}</Text>}
     {history.map(q=>(
      <View key={q.id} style={{paddingVertical:10,borderBottomWidth:1,borderColor:colors.border,gap:2}}>
       <Text style={styles.heading}>{q.service_name}</Text>
       <Text style={styles.muted}>{q.status} - {q.id}</Text>
       {Boolean(q.customer_note)&&<Text style={styles.muted}>{q.customer_note}</Text>}
      </View>
     ))}
     {!history.length&&!historyError&&<Text style={styles.muted}>No marketing quotation requests yet.</Text>}
    </View>
   )}
  </Page>
 );
}
