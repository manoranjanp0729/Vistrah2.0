import {useState} from 'react';
import {Pressable,View,StyleSheet} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import {router} from 'expo-router';
import {Text} from './typography';
import {UiText} from './localized-ui';
import {Heading,Action,Loading,ErrorPanel} from './ui';
import {useResource} from '../lib/resource';
import {useTheme} from '../lib/theme';
import {useSession} from '../lib/session';
import type {ListingPage,SellerListing} from '../../../shared/commerce';
import {listingProgress} from '../../../shared/seller-journey';

type Business={id:number;name:string;company:string;verification_status:string;active:boolean;recent_listings?:ListingPage<SellerListing>};
export type SellerHub={businesses:Business[];v_ads_summary:{total_ads:number;active_approved:number;pending_review:number;rejected:number;total_views:number}};
type Filter='All'|'Active & verified'|'Needs attention';
const verified=(b:Business)=>b.active&&b.verification_status==='VERIFIED';

export function SellerOverview({hub,businesses,refresh,refreshing}:{hub?:SellerHub;businesses?:Business[];refresh:()=>void;refreshing:boolean}){
  const {styles}=useTheme();
  const {user}=useSession();
  const enquiries=useResource<{id:number}[]>('/seller/leads',user?.id??null);
  const attention=businesses?.flatMap(b=>(b.recent_listings?.items??[]).filter(row=>row.status==='DRAFT'||row.status==='REJECTED').map(row=>({business:b,row})))??[];
  const listingTotal=businesses?.every(b=>!!b.recent_listings)?businesses.reduce((sum,b)=>sum+b.recent_listings!.total,0):undefined;
  const ads=hub?.v_ads_summary;
  return <View style={{gap:14}}>
    <Heading title="Your business, at a glance"/>
    <Text style={styles.muted}><UiText value="Manage your listings, follow customer enquiries and see what needs attention."/></Text>
    <View style={s.grid}><View style={{flex:1}}><Action label="+ Add service" onPress={()=>router.dismissTo('/services')}/></View>
      <Action label="Refresh" secondary disabled={refreshing||enquiries.loading} onPress={()=>{refresh();enquiries.retry();}}/></View>
    {refreshing&&!businesses?<Loading/>:<View style={s.grid}>
      <Metric label="Your businesses" value={businesses?.length}/><Metric label="Active & verified" value={businesses?.filter(verified).length}/>
      <Metric label="Total listings" value={listingTotal}/><Metric label="Assigned enquiries" value={enquiries.data?.length}/>
    </View>}
    {enquiries.error&&<ErrorPanel error="Enquiry count is unavailable." retry={enquiries.retry}/>}
    <Text style={styles.muted}><UiText value="Current account totals. Refresh for the latest available data. A dash means a count is unavailable."/></Text>
    <Heading title="Manage your business"/>
    <View style={s.grid}>
      <Tool icon="inbox" title="Enquiries" detail="View assigned customer requests" onPress={()=>router.push('/seller/leads')}/>
      <Tool icon="file-text" title="Applications" detail="Track business and service reviews" onPress={()=>router.push('/provider-applications')}/>
      <Tool icon="play-circle" title="Your V Ads" detail="Manage videos and view activity" onPress={()=>router.push('/seller/v-ads')}/>
      <Tool icon="briefcase" title="Job postings" detail="Manage employer listings" onPress={()=>router.push('/employer-jobs')}/>
    </View>
    {!!attention.length&&<View style={styles.card}><Heading title="Continue where you left off"/>
      <Text style={styles.muted}><UiText value="Drafts and listings needing changes, from the latest 20 listings per business."/></Text>
      {attention.slice(0,4).map(({business,row})=><Tool key={row.id} icon="edit-3" title={row.title}
        detail={(business.company||business.name)+' · '+listingProgress(row).label}
        onPress={()=>router.push({pathname:'/seller/commerce/[id]',params:{id:business.id,focus:row.id}})}/>)}</View>}
    <View style={styles.card}><Heading title="V Ads activity" action="Open V Ads" onPress={()=>router.push('/seller/v-ads')}/>
      <Text style={styles.muted}><UiText value="Recorded activity for your latest 30 non-removed ads. Approved status does not guarantee an ad is currently playing."/></Text>
      <View style={s.grid}><Metric label="Recorded views" value={ads?.total_views}/><Metric label="Approved ads" value={ads?.active_approved}/>
        <Metric label="In review" value={ads?.pending_review}/><Metric label="Needs changes" value={ads?.rejected}/></View>
      <Text style={styles.muted}><UiText value="Revenue, conversion rates and listing-view trends are not available on this dashboard."/></Text>
    </View>
  </View>;
}

export function SellerBusinessFilters({businesses,children}:{businesses:Business[];children:(business:Business)=>React.ReactNode}){
  const {styles,colors}=useTheme();
  const [filter,setFilter]=useState<Filter>('All');
  const visible=businesses.filter(b=>filter==='All'||(filter==='Active & verified'?verified(b):!verified(b)));
  return <View style={{gap:12}}><View style={s.grid}>{(['All','Active & verified','Needs attention'] as const).map(value=><Pressable key={value}
    accessibilityRole="button" accessibilityState={{selected:filter===value}} onPress={()=>setFilter(value)}
    style={[s.chip,{backgroundColor:filter===value?colors.accent:colors.surface,borderColor:colors.border}]}>
    <Text style={{color:filter===value?colors.ink:colors.text,fontSize:12,fontWeight:'600'}}><UiText value={value}/></Text></Pressable>)}</View>
    {visible.length?visible.map(children):<Text style={styles.muted}><UiText value="No businesses match this filter."/></Text>}
  </View>;
}

function Metric({label,value}:{label:string;value?:number}){
  const {styles,colors}=useTheme();
  return <View style={[styles.card,s.tile]}><Text style={[styles.heading,{fontSize:26,lineHeight:34,color:colors.accent}]}>{value===undefined?'—':value.toLocaleString('en-IN')}</Text>
    <Text style={styles.muted}><UiText value={label}/></Text></View>;
}
function Tool({icon,title,detail,onPress}:{icon:React.ComponentProps<typeof Feather>['name'];title:string;detail:string;onPress:()=>void}){
  const {styles,colors}=useTheme();
  return <Pressable accessibilityRole="link" onPress={onPress} style={({pressed})=>[styles.card,s.tile,{opacity:pressed?.75:1}]}>
    <Feather name={icon} size={22} color={colors.accent}/><Text style={[styles.text,{fontWeight:'600'}]}><UiText value={title}/></Text>
    <Text style={styles.muted}><UiText value={detail}/></Text></Pressable>;
}
const s=StyleSheet.create({grid:{flexDirection:'row',flexWrap:'wrap',gap:10},tile:{flexGrow:1,flexBasis:'45%',minWidth:125,gap:8},
  chip:{minHeight:44,paddingHorizontal:12,paddingVertical:10,borderWidth:1,borderRadius:22,justifyContent:'center'}});
