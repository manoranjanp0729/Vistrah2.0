import {useState} from 'react';
import {Text,View} from 'react-native';
import {router} from 'expo-router';
import {Page,Heading,Action,ErrorPanel,Loading} from '../components/ui';
import {useResource} from '../lib/resource';
import {useSession} from '../lib/session';
import {openWebsite} from '../lib/web';
import type {Membership} from '../lib/catalogue';
import {styles} from '../lib/theme';
export default function MembershipScreen(){
  const {user}=useSession();const plan=useResource<{name:string;price:number;duration_days:number}>('/membership/plan');const status=useResource<Membership>(user?'/me/membership':null,user?.id??null);const [error,setError]=useState('');
  return <Page><Heading title="VISTRAH membership"/><Text style={styles.text}>Service access for members.</Text><Text style={styles.muted}>Public catalogue browsing is open to everyone. Provider information, preparation guides and service enquiries require eligible active membership. Service costs are separate.</Text>
    {plan.loading?<Loading/>:plan.error?<ErrorPanel error={plan.error} retry={plan.retry}/>:plan.data&&<View style={styles.card}><Text style={styles.heading}>{plan.data.name}</Text><Text style={styles.title}>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(plan.data.price/100)}</Text><Text style={styles.muted}>{plan.data.duration_days} days · Sandbox example. No real money.</Text></View>}
    {status.error?<ErrorPanel error={status.error} retry={status.retry}/>:user&&status.loading?<Loading/>:status.data&&<Text style={styles.text}>{status.data.active?'Active membership'+(status.data.expires_at?' · Until '+new Date(status.data.expires_at).toLocaleDateString('en-IN'):''):'No eligible active membership'}</Text>}
    <Text style={styles.muted}>Genuine paid access is not configured. Membership checkout remains on the website and is sandbox-only. You may need to sign in again in your browser.</Text>
    {!user&&<Action label="Sign in" onPress={()=>router.push('/auth')}/>}
    <Action label="Review membership on website ↗" secondary onPress={()=>{void openWebsite('/membership').catch(e=>setError(e.message));}}/>{Boolean(error)&&<ErrorPanel error={error}/>}
  </Page>;
}
