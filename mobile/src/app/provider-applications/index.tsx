import {Text} from '../../components/typography';
import {UiText,UiElement} from "../../components/localized-ui";
import {useState} from 'react';
import {View} from 'react-native';
import {router} from 'expo-router';
import {Page,Action,Loading,ErrorPanel} from '../../components/ui';
import {SellerGate} from '../../components/seller-gate';
import {useSession} from '../../lib/session';
import {useResource} from '../../lib/resource';
import {useTheme} from '../../lib/theme';
import type {ApplicationSummary} from '../../lib/provider-requirements';
export default function ProviderApplications(){return <UiElement as={Page} title="Business & service applications"><SellerGate><Applications/></SellerGate></UiElement>;}
function Applications(){const {styles}=useTheme();const {user}=useSession();const [page,setPage]=useState(1);const rows=useResource<ApplicationSummary[]>('/provider-applications?page='+page,user?.id??null);
  return <><Text style={styles.muted}><UiText value={"Register your business, select the services you offer and submit details and evidence for independent review."}/></Text><UiElement as={Action} label="New business / service application" onPress={()=>router.push('/services')}/>{rows.loading?<Loading/>:rows.error?<ErrorPanel error={rows.error} retry={rows.retry}/>:<>{!rows.data?.length&&<Text style={styles.muted}><UiText value={"No applications yet."}/></Text>}{rows.data?.map(item=><View key={item.id} style={styles.card}><Text style={styles.heading}>{item.business||'Business application'}</Text><Text style={styles.muted}>{item.status} <UiText value={"· Revision "}/>{item.revision}</Text><UiElement as={Action} label="View / continue application" secondary onPress={()=>router.push({pathname:'/provider-applications/[id]',params:{id:item.id}})}/></View>)}<View style={styles.row}>{page>1&&<UiElement as={Action} label="Previous" secondary onPress={()=>setPage(value=>value-1)}/>}<Text style={styles.muted}><UiText value={"Page "}/>{page}</Text>{rows.data?.length===30&&<UiElement as={Action} label="Next" secondary onPress={()=>setPage(value=>value+1)}/>}</View></>}</>;
}
