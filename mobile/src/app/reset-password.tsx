import {useState} from 'react';
import {Text} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Page,Heading,Field,Action,ErrorPanel} from '../components/ui';
import {api} from '../lib/api';
import {resetToken} from '../lib/reset-token';
import {useTheme} from '../lib/theme';
export default function ResetPassword(){const {token}=useLocalSearchParams<{token?:string}>();const {styles}=useTheme();const [code,setCode]=useState(token??''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  async function reset(){setBusy(true);setError('');try{if(password.length<15||password!==confirmation)throw new Error('Use a password of at least 15 characters and enter it twice.');const result=await api<{message:string}>('/auth/reset-password',{method:'POST',body:JSON.stringify({token:resetToken(code),new_password:password,confirm_password:confirmation})});setCode('');setPassword('');setConfirmation('');setMessage(result.message);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <Page><Heading title="Reset your password"/><Text style={styles.muted}>Copy the reset code or complete link from your email and paste it here. The link is read in the app; it is not opened in a browser.</Text>{Boolean(error)&&<ErrorPanel error={error}/>}{message?<><Text style={styles.text}>{message}</Text><Action label="Sign in with new password" onPress={()=>router.replace('/auth')}/></>:<><Field label="Single-use reset code or link" value={code} onChangeText={setCode} editable={!busy} secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={2048}/><Field label="New password" value={password} onChangeText={setPassword} editable={!busy} secureTextEntry autoComplete="new-password" maxLength={128}/><Field label="Confirm new password" value={confirmation} onChangeText={setConfirmation} editable={!busy} secureTextEntry autoComplete="new-password" maxLength={128}/><Action label="Reset password" disabled={busy} onPress={()=>void reset()}/></>}</Page>;
}
