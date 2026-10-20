import {useLanguage} from '../lib/language';
import {useState} from 'react';
import {Text} from 'react-native';
import {router} from 'expo-router';
import {Action,ErrorPanel,Field,Heading,Loading,Page} from '../components/ui';
import {useSession} from '../lib/session';
import {api} from '../lib/api';
import type {User} from '../lib/catalogue';
import {useTheme} from '../lib/theme';
export default function Profile(){
  const {copy}=useLanguage();
  const session=useSession();
  return <Page>{!session.ready?<Loading/>:!session.user?<><Heading title={copy.profile.title}/><Action label={copy.auth.signIn} onPress={()=>router.push('/auth')}/></>:<ProfileForm key={session.user.id} user={session.user}/>}</Page>;
}
function ProfileForm({user}:{user:User}){const {copy,t}=useLanguage();const {styles}=useTheme();
  const session=useSession();const [name,setName]=useState(user.name);const [phone,setPhone]=useState(user.phone);const [error,setError]=useState('');const [saved,setSaved]=useState(false);const [busy,setBusy]=useState(false);
  async function save(){setError('');setSaved(false);if(name.trim().length<2){setError(t('validation.name'));return;}setBusy(true);try{await api('/me',{method:'PATCH',body:JSON.stringify({name:name.trim(),phone:phone.trim()})});await session.refresh();setSaved(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <><Heading title={copy.profile.title}/><Text style={styles.muted}>{user.email}</Text>{Boolean(error)&&<ErrorPanel error={error}/>}<Field label={copy.auth.name} value={name} onChangeText={setName} maxLength={100}/><Field label={copy.profile.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={20}/><Action label={busy?copy.profile.saving:copy.profile.save} disabled={busy} onPress={()=>void save()}/>{saved&&<Text accessibilityRole="alert" style={styles.text}>{copy.profile.saved}</Text>}</>;
}
