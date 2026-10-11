import {Text,View} from 'react-native';
import {router} from 'expo-router';
import {Page,Heading,Action,Loading,ErrorPanel} from '../../components/ui';
import {useSession} from '../../lib/session';
import {useResource} from '../../lib/resource';
import type {RequestRecord} from '../../lib/catalogue';
import {styles} from '../../lib/theme';
export default function Requests(){
  const {user,ready}=useSession();const result=useResource<RequestRecord[]>(user?'/me/requests':null,user?.id??null);
  return <Page><Heading title="Your service enquiries"/>{!ready?<Loading/>:!user?<><Text style={styles.muted}>Sign in to see your saved enquiries.</Text><Action label="Sign in" onPress={()=>router.push('/auth')}/></>:result.loading?<Loading/>:result.error?<ErrorPanel error={result.error} retry={result.retry}/>:result.data?.length?result.data.map(item=><View key={item.id} style={styles.card}><Text style={styles.heading}>{item.service_title}</Text><Text style={styles.label}>{item.status.replaceAll('_',' ')}</Text><Text style={styles.text}>{item.requirements}</Text><Text style={styles.muted}>{item.location} · {new Date(item.created_at).toLocaleDateString('en-IN')}</Text></View>):<><Text style={styles.muted}>You have no saved enquiries yet. An enquiry requests human review; it is not a booking.</Text><Action label="Explore services" onPress={()=>router.push('/services')}/></>}</Page>;
}
