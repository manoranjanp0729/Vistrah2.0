import {signupLegalCopy} from '../../../shared/legal';
import {useLanguage} from '../lib/language';
import {useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Action,ErrorPanel,Field,Heading,Page} from '../components/ui';
import {useSession} from '../lib/session';
import {useTheme} from '../lib/theme';
export default function Auth(){const {copy,t}=useLanguage();const {styles,colors}=useTheme();
  const params=useLocalSearchParams<{mode?:string;register?:string}>();const seller=params.mode==='seller';
  const {signIn}=useSession();const [register,setRegister]=useState(params.register==='1');const [name,setName]=useState('');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [legalAccepted,setLegalAccepted]=useState(false),[whatsappPromotions,setWhatsappPromotions]=useState(false);
  const [consentMode,setConsentMode]=useState({register,seller});
  if(consentMode.register!==register||consentMode.seller!==seller){setConsentMode({register,seller});setLegalAccepted(false);setWhatsappPromotions(false);}
  async function submit(){
    setError('');if(register&&!legalAccepted){setError(signupLegalCopy.required);return;}if(!email.trim()||!password||(register&&(name.trim().length<2||password.length<10))){setError(register?t('validation.authRegister'):t('validation.authSignIn'));return;}
    setBusy(true);try{await signIn(email.trim(),password,register?name.trim():undefined,seller);setPassword('');if(router.canGoBack())router.back();else router.replace('/account');}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <Page><Heading title={seller?(register?t('auth.sellerCreate'):t('auth.sellerSignIn')):register?copy.auth.register:copy.auth.welcome}/><Text style={styles.muted}>{copy.auth.intro}</Text>{Boolean(error)&&<ErrorPanel error={error}/>}
    {register&&<Field label={copy.auth.name} value={name} onChangeText={setName} autoComplete="name" maxLength={100}/>}
    <Field label={copy.auth.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254}/>
    <Field label={copy.auth.password} value={password} onChangeText={setPassword} secureTextEntry autoComplete={register?'new-password':'current-password'} maxLength={128}/>
    {register&&<View style={{gap:8}}>
      <View style={{flexDirection:'row',alignItems:'flex-start',gap:6}}><Pressable accessibilityRole="checkbox" accessibilityLabel={signupLegalCopy.acceptance} accessibilityHint="Required to create an account. Draft documents; choices are not recorded yet." accessibilityState={{checked:legalAccepted,disabled:busy}} disabled={busy} onPress={()=>setLegalAccepted(value=>!value)} style={{width:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><View style={{width:22,height:22,borderWidth:1,borderColor:colors.accent,borderRadius:4,alignItems:'center',justifyContent:'center'}}><Text style={{color:colors.text}}>{legalAccepted?'\u2713':''}</Text></View></Pressable><Text style={[styles.text,{flex:1,minWidth:0,paddingTop:10}]}>I have read and agree to VISTRAH{'\u2019s '}<Text accessibilityRole="link" onPress={()=>router.push('/terms')} style={{color:colors.accent,textDecorationLine:'underline'}}>Terms &amp; Conditions</Text> and <Text accessibilityRole="link" onPress={()=>router.push('/privacy')} style={{color:colors.accent,textDecorationLine:'underline'}}>Privacy Policy</Text></Text></View>
      <View style={{flexDirection:'row',alignItems:'flex-start',gap:6}}><Pressable accessibilityRole="checkbox" accessibilityLabel={signupLegalCopy.whatsapp} accessibilityHint="Optional. WhatsApp promotions are not enabled." accessibilityState={{checked:whatsappPromotions,disabled:busy}} disabled={busy} onPress={()=>setWhatsappPromotions(value=>!value)} style={{width:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><View style={{width:22,height:22,borderWidth:1,borderColor:colors.accent,borderRadius:4,alignItems:'center',justifyContent:'center'}}><Text style={{color:colors.text}}>{whatsappPromotions?'\u2713':''}</Text></View></Pressable><Text style={[styles.text,{flex:1,minWidth:0,paddingTop:10}]}>{signupLegalCopy.whatsapp}</Text></View>
      <Text style={styles.muted}>{signupLegalCopy.notice}</Text>
    </View>}
    <Action label={busy?copy.auth.wait:register?copy.auth.create:copy.auth.signIn} disabled={busy} onPress={()=>void submit()}/>
    <Action label={register?copy.auth.existing:copy.auth.new} disabled={busy} secondary onPress={()=>{setRegister(!register);setError('');setPassword('');}}/>
    {!register&&<Action label={copy.auth.forgot} secondary onPress={()=>{router.push('/forgot-password');}}/>}
  </Page>;
}

