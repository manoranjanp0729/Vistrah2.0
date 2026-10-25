import {Text} from '../../components/typography';
import {UiText,UiElement} from "../../components/localized-ui";
import {useState,useEffect} from 'react';
import {Pressable,View} from 'react-native';
import {router} from 'expo-router';
import {Page,Heading,Action,Loading,ErrorPanel} from '../../components/ui';
import {SellerGate} from '../../components/seller-gate';
import {SellerOverview,SellerBusinessFilters} from '../../components/seller-overview';
import {useResource,primeResource} from '../../lib/resource';
import {useSession} from '../../lib/session';
import {useTheme} from '../../lib/theme';
import type {ListingPage,SellerListing} from '../../../../shared/commerce';
import {listingProgress,businessProgress} from '../../../../shared/seller-journey';

type Business={id:number;name:string;company:string;verification_status:string;active:boolean;recent_listings?:ListingPage<SellerListing>};
type SellerHub={businesses:Business[];v_ads_summary:{accounts_count:number;total_ads:number;active_approved:number;pending_review:number;rejected:number;total_views:number};membership:{active:boolean;expires_at?:string|null}};

export default function SellerDashboard(){return <UiElement as={Page} title="Seller dashboard"><SellerGate><Workspace/></SellerGate></UiElement>;}

function Workspace(){
  const {styles}=useTheme();
  const {user}=useSession();
  const [tools,setTools]=useState(false);
  const hub=useResource<SellerHub>('/seller/hub',user?.id??null);
  const businesses=useResource<Business[]>('/seller/businesses',user?.id??null);

  useEffect(()=>{
    if(hub.data?.businesses&&user?.id){
      primeResource('/seller/businesses',hub.data.businesses,user.id);
      for(const b of hub.data.businesses){
        if(b.recent_listings){
          primeResource('/seller/businesses/'+b.id+'/commerce-listings?page=1',b.recent_listings,user.id);
        }
      }
    }
  },[hub.data,user?.id]);

  const activeBusinesses=hub.data?.businesses??businesses.data;
  const loading=(hub.loading||businesses.loading)&&!activeBusinesses;
  const error=!activeBusinesses?(hub.error??businesses.error):undefined;

  return <>
    <SellerOverview hub={hub.data} businesses={activeBusinesses} refreshing={hub.loading||businesses.loading} refresh={()=>{hub.retry();businesses.retry();}}/>
    {hub.error&&activeBusinesses&&<ErrorPanel error="The full dashboard summary is unavailable. Business data is shown below." retry={hub.retry}/>}
    <UiElement as={Heading} title="Your services & businesses"/>
    {loading?<Loading/>:error?<ErrorPanel error={error} retry={()=>{hub.retry();businesses.retry();}}/>:activeBusinesses?.length
      ?<SellerBusinessFilters businesses={activeBusinesses}>{business=><BusinessCard key={business.id} business={business}/>}</SellerBusinessFilters>
      :<View style={styles.card}><Heading title="Start with your first service"/><Text style={styles.muted}><UiText value="Choose a Listing Type, add your business details and save a private draft. Business verification and listing approval happen separately."/></Text><Action label="Choose a Listing Type" onPress={()=>router.dismissTo('/services')}/><Action label="Claim an existing business" secondary onPress={()=>router.push('/seller/ownership')}/></View>}
    <Action label={tools?'Hide account options':'Account & business benefits'} secondary onPress={()=>setTools(value=>!value)}/>
    {tools&&<View style={styles.card}><Action label="Business membership & benefits" secondary onPress={()=>router.push('/membership')}/><Action label="Business ownership requests" secondary onPress={()=>router.push('/seller/ownership')}/><Text style={styles.muted}><UiText value="Each business and listing needs independent review. Account membership does not replace business verification or listing approval."/></Text></View>}
  </>;
}

function BusinessCard({business}:{business:Business}){
  const {styles}=useTheme();
  const {user}=useSession();
  if(business.recent_listings&&user?.id){
    primeResource('/seller/businesses/'+business.id+'/commerce-listings?page=1',business.recent_listings,user.id);
  }
  const result=useResource<ListingPage<SellerListing>>('/seller/businesses/'+business.id+'/commerce-listings?page=1',user?.id??null);
  const listings=business.recent_listings??result.data;
  return <View style={styles.card}><Heading title={business.company||business.name}/><Text style={styles.muted}><UiText value={businessProgress(business)}/></Text>{!listings&&result.loading?<Loading/>:!listings&&result.error?<ErrorPanel error={result.error} retry={result.retry}/>:listings?.items.length?<><Text style={styles.label}><UiText value={"Recent listings"}/></Text>{listings.items.slice(0,3).map(row=><Pressable key={row.id} accessibilityRole="link" accessibilityLabel={row.title+', '+listingProgress(row).label} onPress={()=>router.push({pathname:'/seller/commerce/[id]',params:{id:business.id,focus:row.id}})} style={{gap:4,minHeight:48,justifyContent:'center'}}><Text style={styles.text}>{row.title}</Text><Text style={styles.muted}><UiText value={listingProgress(row).label}/></Text></Pressable>)}</>:<Text style={styles.muted}><UiText value={"No listings yet. Choose a Listing Type using Add service."}/></Text>}<UiElement as={Action} label="Manage services & products" secondary onPress={()=>router.push({pathname:'/seller/commerce/[id]',params:{id:business.id}})}/><UiElement as={Action} label="Business details" secondary onPress={()=>router.push({pathname:'/seller/business/[id]',params:{id:business.id}})}/><Action label="Orders" secondary onPress={()=>router.push({pathname:'/seller/orders/[id]',params:{id:business.id}})}/></View>;
}
