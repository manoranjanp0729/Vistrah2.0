import {Text} from '../components/typography';
import {UiText,UiElement} from "../components/localized-ui";
import {legalVersion,signupLegalCopy} from '../../../shared/legal';
import {useLanguage} from '../lib/language';
import {useState} from 'react';
import {View} from 'react-native';
import {Redirect,router,useLocalSearchParams} from 'expo-router';
import {Action,ErrorPanel,Field,Page,Loading} from '../components/ui';
import {useSession} from '../lib/session';
import {useTheme} from '../lib/theme';
import {sellerReturnDestination} from '../lib/seller-auth';
import {GoogleSignIn,type GoogleAuthGrant} from '../components/google-sign-in';

export default function Auth(){const {copy,t}=useLanguage();const {styles,colors}=useTheme();
  const params=useLocalSearchParams<{register?:string;next?:string}>();
  const {signIn,signInWithGoogle,user,ready}=useSession();const [register,setRegister]=useState(params.register==='1');const [name,setName]=useState('');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [legalAccepted,setLegalAccepted]=useState(false),[whatsappPromotions,setWhatsappPromotions]=useState(false);
  const [consentRegister,setConsentRegister]=useState(register);
  if(consentRegister!==register){setConsentRegister(register);setLegalAccepted(false);setWhatsappPromotions(false);}

  function finishNavigation(){
    setPassword('');
    const next=sellerReturnDestination(true,params.next);
    if(next)router.dismissTo(next);else if(router.canGoBack())router.back();else router.replace('/account');
  }

  async function submit(){
    setError('');if(register&&!legalAccepted){setError(signupLegalCopy.required);return;}if(!email.trim()||!password||(register&&(name.trim().length<2||password.length<10))){setError(register?t('validation.authRegister'):t('validation.authSignIn'));return;}
    setBusy(true);try{await signIn(email.trim(),password,register?name.trim():undefined,false,register?{privacy_policy_version:legalVersion,marketing_consent:whatsappPromotions}:undefined);finishNavigation();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function submitGoogle(credential:string,grant?:GoogleAuthGrant){
    setError('');if(!legalAccepted){setError(signupLegalCopy.required);return;}
    setBusy(true);try{
      const payload=grant?.accessToken
        ? {access_token:grant.accessToken,privacy_policy_version:grant.privacyPolicyVersion||legalVersion,marketing_consent:grant.marketingConsent??whatsappPromotions}
        : {credential:grant?.credential||credential,privacy_policy_version:grant?.privacyPolicyVersion||legalVersion,marketing_consent:grant?.marketingConsent??whatsappPromotions};
      await signInWithGoogle(payload);
      finishNavigation();
    }catch(e){
      setError((e as Error).message);
    }finally{setBusy(false);}
  }
  if(!ready)return <Page><Loading/></Page>;
  if(user&&!busy)return <Redirect href={sellerReturnDestination(true,params.next)??'/account'}/>;
  return <UiElement as={Page} title={register?copy.auth.register:copy.auth.welcome}><View style={{width:'100%',maxWidth:400,alignSelf:'center',gap:12}}><Text style={styles.muted}><UiText value={copy.auth.intro}/></Text>{Boolean(error)&&<ErrorPanel error={error}/>}
    <GoogleSignIn
      disabled={busy}
      legalAccepted={legalAccepted}
      onLegalAcceptedChange={setLegalAccepted}
      marketingConsent={whatsappPromotions}
      onMarketingConsentChange={setWhatsappPromotions}
      onCredential={(credential,grant)=>void submitGoogle(credential,grant)}
      onError={setError}
    />
    <View style={{flexDirection:'row',alignItems:'center',gap:10,marginVertical:4}}>
      <View style={{flex:1,height:1,backgroundColor:colors.border}}/>
      <Text style={{color:colors.muted,fontSize:12}}><UiText value={"or with email"}/></Text>
      <View style={{flex:1,height:1,backgroundColor:colors.border}}/>
    </View>
    {register&&<Field label={copy.auth.name} value={name} onChangeText={setName} autoComplete="name" maxLength={100}/>}
    <Field label={copy.auth.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" maxLength={254}/>
    <Field label={copy.auth.password} value={password} onChangeText={setPassword} secureTextEntry autoComplete={register?'new-password':'current-password'} maxLength={128}/>
    <Action auth label={busy?copy.auth.wait:register?copy.auth.create:copy.auth.signIn} disabled={busy||(register&&!legalAccepted)} onPress={()=>void submit()}/>
    <Action auth label={register?copy.auth.existing:copy.auth.new} disabled={busy} secondary onPress={()=>{setRegister(!register);setError('');setPassword('');}}/>
    {!register&&<Action label={copy.auth.forgot} secondary onPress={()=>{router.push('/forgot-password');}}/>}
  </View></UiElement>;
}
