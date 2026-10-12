import {useState} from 'react';
import {Text,View} from 'react-native';
import {router} from 'expo-router';
import {Page,Heading,Action,Loading,ErrorPanel} from '../../components/ui';
import {SellerGate} from '../../components/seller-gate';
import {useSession} from '../../lib/session';
import {useResource} from '../../lib/resource';
import {useTheme} from '../../lib/theme';
import type {ApplicationSummary} from '../../lib/provider-requirements';
export default function ProviderApplications(){return <Page><Heading title="Business & service applications"/><SellerGate><Applications/></SellerGate></Page>;}
function Applications(){const {styles}=useTheme();const {user}=useSession();const [page,setPage]=useState(1);const rows=useResource<ApplicationSummary[]>('/provider-applications?page='+page,user?.id??null);
  return <><Text style={styles.muted}>Register your business, select the services you offer and submit details and evidence for independent review.</Text><Action label="New business / service application" onPress={()=>router.push('/provider-applications/new')}/>{rows.loading?<Loading/>:rows.error?<ErrorPanel error={rows.error} retry={rows.retry}/>:<>{!rows.data?.length&&<Text style={styles.muted}>No applications yet.</Text>}{rows.data?.map(item=><View key={item.id} style={styles.card}><Text style={styles.heading}>{item.business||'Business application'}</Text><Text style={styles.muted}>{item.status} · Revision {item.revision}</Text><Action label="View / continue application" secondary onPress={()=>router.push({pathname:'/provider-applications/[id]',params:{id:item.id}})}/></View>)}<View style={styles.row}>{page>1&&<Action label="Previous" secondary onPress={()=>setPage(value=>value-1)}/>}<Text style={styles.muted}>Page {page}</Text>{rows.data?.length===30&&<Action label="Next" secondary onPress={()=>setPage(value=>value+1)}/>}</View></>}</>;
}
