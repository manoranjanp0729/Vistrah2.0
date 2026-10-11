import {date} from '../../lib/format';
import copy from '../../lib/interface-copy';
import {Text,View} from 'react-native';
import {router} from 'expo-router';
import {Page,Heading,Action,Loading,ErrorPanel} from '../../components/ui';
import {useSession} from '../../lib/session';
import {useResource} from '../../lib/resource';
import type {RequestRecord} from '../../lib/catalogue';
import {styles} from '../../lib/theme';
export default function Requests(){
  const {user,ready}=useSession();const result=useResource<RequestRecord[]>(user?'/me/requests':null,user?.id??null);
  return <Page><Heading title={copy.requests.title}/>{!ready?<Loading/>:!user?<><Text style={styles.muted}>{copy.requests.signIn}</Text><Action label="Sign in" onPress={()=>router.push('/auth')}/></>:result.loading?<Loading/>:result.error?<ErrorPanel error={result.error} retry={result.retry}/>:result.data?.length?result.data.map(item=><View key={item.id} style={styles.card}><Text style={styles.heading}>{item.service_title}</Text><Text style={styles.label}>{item.status.replaceAll('_',' ')}</Text><Text style={styles.text}>{item.requirements}</Text><Text style={styles.muted}>{item.location} · {date(item.created_at)}</Text></View>):<><Text style={styles.muted}>{copy.requests.empty}</Text><Action label={copy.requests.explore} onPress={()=>router.push('/services')}/></>}</Page>;
}
