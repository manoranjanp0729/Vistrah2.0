import {date} from '../lib/format';
import copy from '../lib/interface-copy';
import {Text,View} from 'react-native';
import {router} from 'expo-router';
import {Page,Heading,Action,ErrorPanel,Loading} from '../components/ui';
import {useResource} from '../lib/resource';
import {useSession} from '../lib/session';
import type {Membership,Offer} from '../lib/types';
import {useTheme} from '../lib/theme';
export default function MembershipScreen(){const {styles}=useTheme();
  const {user}=useSession();const plan=useResource<{name:string;amount:number;days:number}>('/membership/plan');const status=useResource<Membership>(user?'/me/membership':null,user?.id??null);const offers=useResource<Offer[]>(user?'/membership/offers':null,user?.id??null);
  return <Page><Heading title={copy.membership.title}/><Text style={styles.text}>{copy.membership.subtitle}</Text><Text style={styles.muted}>{copy.membership.intro}</Text>
    {plan.loading?<Loading/>:plan.error?<ErrorPanel error={plan.error} retry={plan.retry}/>:plan.data&&<View style={styles.card}><Text style={styles.heading}>{plan.data.name}</Text><Text style={styles.title}>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(plan.data.amount/100)}</Text><Text style={styles.muted}>{plan.data.days} days · Sandbox example. No real money.</Text></View>}
    {status.error?<ErrorPanel error={status.error} retry={status.retry}/>:user&&status.loading?<Loading/>:status.data&&<Text style={styles.text}>{status.data.active?'Active membership'+(status.data.expires_at?' · Until '+date(status.data.expires_at):''):'No eligible active membership'}</Text>}
    <Text style={styles.muted}>{copy.membership.notice}</Text>
    <Action label={user?copy.membership.checkout:copy.auth.signIn} onPress={()=>router.push(user?'/checkout':'/auth')}/>
    {user&&<><Heading title={copy.membership.offers}/>{offers.loading?<Loading/>:offers.error?<ErrorPanel error={offers.error} retry={offers.retry}/>:offers.data?.length?offers.data.map(offer=><View style={styles.card} key={offer.id}><Text style={styles.heading}>{offer.title}</Text><Text style={styles.text}>{offer.terms}</Text><Text style={styles.muted}>{offer.scope} · Until {date(offer.ends_at)}</Text></View>):<Text style={styles.muted}>{copy.membership.emptyOffers}</Text>}<Action label={copy.membership.history} secondary onPress={()=>router.push('/payments')}/></>}
  </Page>;
}
