import {useState} from 'react';
import {Text} from 'react-native';
import {router} from 'expo-router';
import {Action,ErrorPanel,Field,Heading,Page} from '../components/ui';
import {useSession} from '../lib/session';
import {openWebsite} from '../lib/web';
import {styles} from '../lib/theme';
export default function Auth(){
  const {signIn}=useSession();const [register,setRegister]=useState(false);const [name,setName]=useState('');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function submit(){
    setError('');if(!email.trim()||!password||(register&&(name.trim().length<2||password.length<10))){setError(register?'Enter your name, email and a password of at least 10 characters.':'Enter your email and password.');return;}
    setBusy(true);try{await signIn(email.trim(),password,register?name.trim():undefined);setPassword('');if(router.canGoBack())router.back();else router.replace('/account');}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <Page><Heading title={register?'Create your account':'Welcome back'}/><Text style={styles.muted}>One VISTRAH identity for customer and seller access.</Text>{Boolean(error)&&<ErrorPanel error={error}/>}
    {register&&<Field label="Your name" value={name} onChangeText={setName} autoComplete="name" maxLength={100}/>}
    <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254}/>
    <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={register?'new-password':'current-password'} maxLength={128}/>
    <Action label={busy?'Please wait…':register?'Create account':'Sign in'} disabled={busy} onPress={()=>void submit()}/>
    <Action label={register?'Already have an account? Sign in':'Create a new account'} disabled={busy} secondary onPress={()=>{setRegister(!register);setError('');setPassword('');}}/>
    {!register&&<Action label="Forgot password? Open recovery ↗" secondary onPress={()=>{void openWebsite('/forgot-password').catch(e=>setError(e.message));}}/>}
  </Page>;
}
