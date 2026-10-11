import {useRef,useState} from 'react';
import {Text,View} from 'react-native';
import {router} from 'expo-router';
import {Page,Heading,Action,ErrorPanel,Loading} from '../components/ui';
import {useSession} from '../lib/session';
import {useResource} from '../lib/resource';
import {api} from '../lib/api';
import type {Payment} from '../lib/types';
import {styles} from '../lib/theme';
import copy from '../lib/interface-copy';
export default function Checkout(){const {user,ready}=useSession();return <Page>{!ready?<Loading/>:!user?<Action label={copy.auth.signIn} onPress={()=>router.push('/auth')}/>:<CheckoutForm key={user.id}/>}</Page>;}
function CheckoutForm(){const plan=useResource<{amount:number;days:number}>('/membership/plan');const key=useRef('');const [payment,setPayment]=useState<Payment|null>(null);const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function create(){if(!key.current)key.current='mobile_'+Date.now()+'_'+Math.random().toString(36).slice(2);setBusy(true);setError('');try{setPayment(await api<Payment>('/payments/checkout',{method:'POST',body:JSON.stringify({idempotency_key:key.current})}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function simulate(outcome:'SUCCEEDED'|'FAILED'){if(!payment)return;setBusy(true);setError('');try{setPayment(await api<Payment>('/payments/'+payment.id+'/simulate',{method:'POST',body:JSON.stringify({outcome})}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <><Heading title="Try the membership journey."/><Text style={styles.label}>SANDBOX · NO REAL MONEY</Text><Text style={styles.muted}>This checkout records a test transaction. No card, CVV, UPI PIN or bank information is collected.</Text>{plan.loading?<Loading/>:plan.error?<ErrorPanel error={plan.error} retry={plan.retry}/>:<Text style={styles.heading}>VISTRAH Membership · {new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format((plan.data?.amount??0)/100)}</Text>}{Boolean(error)&&<ErrorPanel error={error}/>}{!payment?<Action label={busy?'Creating transaction…':'Create sandbox transaction'} disabled={busy||!plan.data} onPress={()=>void create()}/>:<View style={styles.card}><Text style={styles.label}>{payment.id}</Text><Text style={styles.heading}>{payment.status.replaceAll('_',' ')}</Text>{payment.status==='PENDING'?<><Text style={styles.muted}>Choose a test outcome. The backend validates a signed sandbox event before updating the transaction.</Text><Action label="Simulate successful payment" disabled={busy} onPress={()=>void simulate('SUCCEEDED')}/><Action label="Simulate failed payment" secondary disabled={busy} onPress={()=>void simulate('FAILED')}/></>:<><Text style={styles.muted}>{payment.status==='SUCCEEDED'?'Sandbox payment recorded. Check backend eligibility before returning; this does not confirm genuine paid membership.':'Test payment failed. Membership was not activated.'}</Text><Action label="View membership" onPress={()=>router.replace('/membership')}/><Action label="Start a new test" secondary onPress={()=>{key.current='mobile_'+Date.now()+'_'+Math.random().toString(36).slice(2);setPayment(null);}}/></>}</View>}</>;
}
