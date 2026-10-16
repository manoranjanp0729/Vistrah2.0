import {useLanguage} from '../lib/language';
import {useState} from 'react';
import {Text} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Action,ErrorPanel,Field,Heading,Page} from '../components/ui';
import {useSession} from '../lib/session';
import {useTheme} from '../lib/theme';
export default function Auth(){const {copy,t}=useLanguage();const {styles}=useTheme();
  const params=useLocalSearchParams<{mode?:string;register?:string}>();const seller=params.mode==='seller';
  const {signIn}=useSession();const [register,setRegister]=useState(params.register==='1');const [name,setName]=useState('');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function submit(){
    setError('');if(!email.trim()||!password||(register&&(name.trim().length<2||password.length<10))){setError(register?t('validation.authRegister'):t('validation.authSignIn'));return;}
    setBusy(true);try{await signIn(email.trim(),password,register?name.trim():undefined,seller);setPassword('');if(router.canGoBack())router.back();else router.replace('/account');}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <Page><Heading title={seller?(register?t('auth.sellerCreate'):t('auth.sellerSignIn')):register?copy.auth.register:copy.auth.welcome}/><Text style={styles.muted}>{copy.auth.intro}</Text>{Boolean(error)&&<ErrorPanel error={error}/>}
    {register&&<Field label={copy.auth.name} value={name} onChangeText={setName} autoComplete="name" maxLength={100}/>}
    <Field label={copy.auth.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254}/>
    <Field label={copy.auth.password} value={password} onChangeText={setPassword} secureTextEntry autoComplete={register?'new-password':'current-password'} maxLength={128}/>
    <Action label={busy?copy.auth.wait:register?copy.auth.create:copy.auth.signIn} disabled={busy} onPress={()=>void submit()}/>
    <Action label={register?copy.auth.existing:copy.auth.new} disabled={busy} secondary onPress={()=>{setRegister(!register);setError('');setPassword('');}}/>
    {!register&&<Action label={copy.auth.forgot} secondary onPress={()=>{router.push('/forgot-password');}}/>}
  </Page>;
}

