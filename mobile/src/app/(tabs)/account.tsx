import copy from '../../lib/interface-copy';
import {useState} from 'react';
import {Text,View} from 'react-native';
import {router} from 'expo-router';
import {Page,Action,Heading,Loading,ErrorPanel} from '../../components/ui';
import {useSession} from '../../lib/session';
import {openWebsite} from '../../lib/web';
import {styles} from '../../lib/theme';
export default function Account(){
  const session=useSession();const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  async function logout(){setBusy(true);setError('');try{await session.signOut();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  const web=(path:string)=>{void openWebsite(path).catch(e=>setError(e.message));};
  return <Page><Heading title="Your VISTRAH"/>{!session.ready?<Loading/>:session.user?<View style={styles.card}><Text style={styles.heading}>{session.user.name}</Text><Text style={styles.muted}>{session.user.email}</Text><Action label={busy?'Signing out…':'Sign out'} secondary disabled={busy} onPress={()=>void logout()}/></View>:<><Text style={styles.muted}>{copy.account.intro}</Text><Action label={copy.account.signIn} onPress={()=>router.push('/auth')}/></>}
    {Boolean(error||session.error)&&<ErrorPanel error={error||session.error} retry={session.error?session.retry:undefined}/>}
    {Boolean(session.error)&&<Action label="Clear saved sign-in" secondary disabled={busy} onPress={()=>void logout()}/>}
    <Action label="Membership" secondary onPress={()=>router.push('/membership')}/><Action label={copy.account.provider} secondary onPress={()=>router.push('/provider')}/><Action label={copy.nav.location} secondary onPress={()=>router.push('/location')}/>
    {session.user&&<Action label="Edit profile" secondary onPress={()=>router.push('/profile')}/>}
    {session.user&&<><Action label={copy.nav.requests} secondary onPress={()=>router.push('/requests')}/><Action label={copy.account.history} secondary onPress={()=>router.push('/payments')}/><Action label={copy.account.finds} secondary onPress={()=>web('/account/finds')}/><Action label={copy.account.applications} secondary onPress={()=>web('/account/provider-applications')}/><Action label={copy.account.seller} secondary onPress={()=>web('/seller')}/></>}
    <Action label={copy.account.discovery} secondary onPress={()=>web('/discover-more')}/>
    {session.user?.role==='ADMIN' &&<Action label="Admin dashboard on website ↗" secondary onPress={()=>web('/admin')}/>}
    <Text style={styles.muted}>Website actions open your browser and may require a separate sign-in. The mobile app does not share your token with the browser.</Text>
  </Page>;
}
