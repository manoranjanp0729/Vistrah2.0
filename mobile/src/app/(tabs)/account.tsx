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
  return <Page><Heading title="Your VISTRAH"/>{!session.ready?<Loading/>:session.user?<View style={styles.card}><Text style={styles.heading}>{session.user.name}</Text><Text style={styles.muted}>{session.user.email}</Text><Action label={busy?'Signing out…':'Sign out'} secondary disabled={busy} onPress={()=>void logout()}/></View>:<><Text style={styles.muted}>One account for customers and sellers.</Text><Action label="Sign in / Create account" onPress={()=>router.push('/auth')}/></>}
    {(error||session.error)&&<ErrorPanel error={error||session.error} retry={session.error?session.retry:undefined}/>}
    {session.error&&<Action label="Clear saved sign-in" secondary disabled={busy} onPress={()=>void logout()}/>}
    <Action label="Membership" secondary onPress={()=>router.push('/membership')}/><Action label="Offer your services" secondary onPress={()=>router.push('/provider')}/><Action label="Choose location" secondary onPress={()=>router.push('/location')}/>
    {session.user&&<Action label="Edit profile" secondary onPress={()=>router.push('/profile')}/>}
    {session.user?.role==='ADMIN'&&<Action label="Admin dashboard on website ↗" secondary onPress={()=>web('/admin')}/>}
    <Text style={styles.muted}>Website actions open your browser and may require a separate sign-in. The mobile app does not share your token with the browser.</Text>
  </Page>;
}
