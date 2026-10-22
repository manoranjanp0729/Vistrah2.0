import {UiText,UiElement} from "../components/localized-ui";
import {useState} from 'react';
import {Text} from 'react-native';
import {router} from 'expo-router';
import {Page,Field,Action,ErrorPanel} from '../components/ui';
import {useResource} from '../lib/resource';
import {api} from '../lib/api';
import {useTheme} from '../lib/theme';
export default function Recovery(){const {styles}=useTheme();const [email,setEmail]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);const status=useResource<{configured:boolean}>('/auth/recovery-status');async function submit(){setBusy(true);setError('');try{const result=await api<{message:string}>('/auth/forgot-password',{method:'POST',body:JSON.stringify({email:email.trim()})});setMessage(result.message);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}return <UiElement as={Page} title="Forgot your password?"><Text style={styles.muted}><UiText value={"Enter your registered email address to request a reset link."}/></Text>{status.data?.configured===false&&<Text style={styles.muted}><UiText value={"Email recovery is not configured on this development server. Ask the administrator to configure SMTP delivery."}/></Text>}{Boolean(error)&&<ErrorPanel error={error}/>}{message?<Text accessibilityRole="alert" style={styles.text}><UiText value={message}/></Text>:<><UiElement as={Field} label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" maxLength={254}/><UiElement as={Action} label={busy?'Please wait...':'Send reset link'} disabled={busy||!email.trim()} onPress={()=>void submit()}/></>}<UiElement as={Action} label="Enter reset code in app" secondary onPress={()=>router.push('/reset-password')}/><UiElement as={Action} label="Back to sign in" secondary onPress={()=>router.replace('/auth')}/></UiElement>;}

