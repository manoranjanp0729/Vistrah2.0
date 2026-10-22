import {UiText} from "../components/localized-ui";
import {useLanguage} from '../lib/language';
import {date} from '../lib/format';
import {Text,View} from 'react-native';
import {router} from 'expo-router';
import {Page,Action,Loading,ErrorPanel} from '../components/ui';
import {useSession} from '../lib/session';
import {useResource} from '../lib/resource';
import type {Payment} from '../lib/types';
import {useTheme} from '../lib/theme';
export default function Payments(){const {copy}=useLanguage();const {styles}=useTheme();const {user,ready}=useSession();const result=useResource<Payment[]>(user?'/me/payments':null,user?.id??null);return <Page title={copy.account.history}><Text style={styles.muted}><UiText value={"Membership transactions in sandbox mode. Service purchases are not collected through this version."}/></Text>{!ready?<Loading/>:!user?<Action label={copy.auth.signIn} onPress={()=>router.push('/auth')}/>:result.loading?<Loading/>:result.error?<ErrorPanel error={result.error} retry={result.retry}/>:result.data?.length?result.data.map(payment=><View style={styles.card} key={payment.id}><Text style={styles.heading}>{payment.title||'Membership'}</Text><Text style={styles.text}>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(payment.amount/100)} · {payment.status.replaceAll('_',' ')}</Text><Text style={styles.muted}>{date(payment.created_at)} · {payment.id}</Text></View>):<Text style={styles.muted}><UiText value={"No payments yet. Your membership transaction history will appear here."}/></Text>}</Page>;}
