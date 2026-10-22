import {UiText,UiElement} from "./localized-ui";
import {useState} from 'react';
import {Text,View} from 'react-native';
import {router} from 'expo-router';
import {Action,Heading,Loading,ErrorPanel} from './ui';
import {useTheme} from '../lib/theme';
import {useSession} from '../lib/session';
import {useResource} from '../lib/resource';
import {ApiError} from '../lib/api';
import type {Membership} from '../lib/catalogue';
import {customerListingCopy as copy} from '../../../shared/customer-listing';
import {listingPrice,type CommerceListing,type ListingPage} from '../../../shared/commerce';
import type {ServiceSelection} from '../../../shared/service-listing';

export function ClassifiedServices({selection}:{selection:ServiceSelection}){
  const {styles}=useTheme(),{user,ready}=useSession();
  const membership=useResource<Membership>(user?'/me/membership':null,user?.id??null);
  if(!ready)return <Loading/>;
  if(!user)return <View style={styles.card}><UiElement as={Heading} title="Sign in to view service offers"/><Text style={styles.muted}><UiText value={"Sign in to your customer account, then continue with this service."}/></Text><UiElement as={Action} label="Sign in and continue" onPress={()=>router.push('/auth')}/></View>;
  if(membership.error)return <><ErrorPanel error="We could not check your membership. Please try again." retry={membership.retry}/>{membership.error instanceof ApiError&&membership.error.status===401&&<UiElement as={Action} label="Sign in and continue" onPress={()=>router.push('/auth')}/>}</>;
  if(!membership.data)return <Loading/>;
  if(!membership.data.active)return <View style={styles.card}><UiElement as={Heading} title="Membership is required to view these offers"/><Text style={styles.muted}><UiText value={"Review membership access before deciding how to continue."}/></Text><UiElement as={Action} label="View membership" onPress={()=>router.push('/membership')}/></View>;
  return <ClassifiedList key={JSON.stringify(selection)} selection={selection}/>;
}
function ClassifiedList({selection}:{selection:ServiceSelection}){
  const {styles}=useTheme(),{user}=useSession();const [page,setPage]=useState(1);
  const result=useResource<ListingPage<CommerceListing>>('/commerce/classified-services?'+new URLSearchParams({...selection,page:String(page)}),user?.id??null);
  const related=()=>router.push({pathname:'/services',params:{category:selection.category,subcategory:selection.subcategory}});
  const status=result.error instanceof ApiError?result.error.status:null;
  return <View style={{gap:14}}><Heading title={copy.heading}/><Text style={styles.muted}><UiText value={copy.guidance}/></Text><UiElement as={Action} label="Refresh options" secondary disabled={result.loading} onPress={result.retry}/>
    {result.loading?<Loading/>:result.error?<><ErrorPanel error="We could not load the options. Please try again." retry={result.retry}/>{status===401&&<UiElement as={Action} label="Sign in and continue" onPress={()=>router.push('/auth')}/>}{status===403&&<UiElement as={Action} label="View membership" onPress={()=>router.push('/membership')}/>}<UiElement as={Action} label="Explore related options" secondary onPress={related}/></>:result.data?<>
      {result.data.items.length?<><Text style={styles.muted}>{result.data.total} <UiText value={result.data.total===1?'offer':'offers'}/> <UiText value={"to explore"}/></Text>{result.data.items.map(row=><View key={row.id} style={styles.card}><Text style={styles.label}><UiText value={"Reviewed offer"}/></Text><Heading title={row.title}/><Text style={styles.muted}><UiText value={"Offered by "}/>{row.business}</Text><Text style={styles.heading}>{listingPrice(row.unit_price_paise)} <UiText value={"per package"}/></Text><Text style={styles.text} numberOfLines={4}>{row.description}</Text><UiElement as={Action} label="View service & next steps" onPress={()=>router.push({pathname:'/commerce/[id]',params:{id:row.id}})}/></View>)}</>:<View style={styles.card}><UiElement as={Heading} title={result.data.total===0?copy.emptyTitle:'No options on this page'}/><Text style={styles.muted}><UiText value={result.data.total===0?copy.emptyCopy:'Go back a page to see the remaining offers.'}/></Text><UiElement as={Action} label="Explore related options" secondary onPress={related}/></View>}
      {(page>1||result.data.total>result.data.page_size)&&<><Text style={styles.muted}><UiText value={"Page "}/>{page}</Text><UiElement as={Action} label="Previous" secondary disabled={page===1} onPress={()=>setPage(value=>value-1)}/><UiElement as={Action} label="Next" secondary disabled={page*result.data.page_size>=result.data.total} onPress={()=>setPage(value=>value+1)}/></>}
    </>:null}
  </View>;
}
