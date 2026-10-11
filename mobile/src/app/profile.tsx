import {useState} from 'react';
import {Text} from 'react-native';
import {router} from 'expo-router';
import {Action,ErrorPanel,Field,Heading,Loading,Page} from '../components/ui';
import {useSession} from '../lib/session';
import {api} from '../lib/api';
import type {User} from '../lib/catalogue';
import {styles} from '../lib/theme';
export default function Profile(){
  const session=useSession();
  return <Page>{!session.ready?<Loading/>:!session.user?<><Heading title="Your profile"/><Action label="Sign in" onPress={()=>router.push('/auth')}/></>:<ProfileForm key={session.user.id} user={session.user}/>}</Page>;
}
function ProfileForm({user}:{user:User}){
  const session=useSession();const [name,setName]=useState(user.name);const [phone,setPhone]=useState(user.phone);const [error,setError]=useState('');const [saved,setSaved]=useState(false);const [busy,setBusy]=useState(false);
  async function save(){setError('');setSaved(false);if(name.trim().length<2){setError('Enter a name of at least two characters.');return;}setBusy(true);try{await api('/me',{method:'PATCH',body:JSON.stringify({name:name.trim(),phone:phone.trim()})});await session.refresh();setSaved(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <><Heading title="Your profile"/><Text style={styles.muted}>{user.email}</Text>{error&&<ErrorPanel error={error}/>}<Field label="Your name" value={name} onChangeText={setName} maxLength={100}/><Field label="Contact phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={20}/><Action label={busy?'Saving…':'Save profile'} disabled={busy} onPress={()=>void save()}/>{saved&&<Text accessibilityRole="alert" style={styles.text}>Profile saved.</Text>}</>;
}
