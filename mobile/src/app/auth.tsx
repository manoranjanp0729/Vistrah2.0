import {Text} from '../components/typography';
import {UiText,UiElement} from "../components/localized-ui";
import {legalVersion,signupLegalCopy} from '../../../shared/legal';
import {useLanguage} from '../lib/language';
import {useState} from 'react';
import {Pressable,View} from 'react-native';
import {Redirect,router,useLocalSearchParams} from 'expo-router';
import {Action,ErrorPanel,Field,Page,Loading} from '../components/ui';
import {ApiError} from '../lib/api';
import {useSession} from '../lib/session';
import {useTheme} from '../lib/theme';
import {sellerReturnDestination} from '../lib/seller-auth';
import {GoogleSignIn} from '../components/google-sign-in';

export default function Auth(){const {copy,t}=useLanguage();const {styles,colors}=useTheme();
  const params=useLocalSearchParams<{register?:string;next?:string}>();
  const {signIn,signInWithGoogle,user,ready}=useSession();const [register,setRegister]=useState(params.register==='1');const [name,setName]=useState('');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [legalAccepted,setLegalAccepted]=useState(false),[whatsappPromotions,setWhatsappPromotions]=useState(false);
  const [pendingGoogleCredential,setPendingGoogleCredential]=useState('');
  const [consentRegister,setConsentRegister]=useState(register);
  if(consentRegister!==register){setConsentRegister(register);setLegalAccepted(false);setWhatsappPromotions(false);setPendingGoogleCredential('');}
  const consentRequiredForButton=register||Boolean(pendingGoogleCredential);

  function finishNavigation(){
    setPassword('');
    const next=sellerReturnDestination(true,params.next);
    if(next)router.dismissTo(next);else if(router.canGoBack())router.back();else router.replace('/account');
  }

  async function submit(){
    setError('');if(register&&!legalAccepted){setError(signupLegalCopy.required);return;}if(!email.trim()||!password||(register&&(name.trim().length<2||password.length<10))){setError(register?t('validation.authRegister'):t('validation.authSignIn'));return;}
    setBusy(true);try{await signIn(email.trim(),password,register?name.trim():undefined,false,register?{privacy_policy_version:legalVersion,marketing_consent:whatsappPromotions}:undefined);finishNavigation();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function submitGoogle(credential:string){
    setError('');if(consentRequiredForButton&&!legalAccepted){setError(signupLegalCopy.required);return;}
    setBusy(true);try{
      const payload=legalAccepted
        ? {credential,privacy_policy_version:legalVersion,marketing_consent:whatsappPromotions}
        : {credential,require_consent_for_new:true};
      await signInWithGoogle(payload);
      setPendingGoogleCredential('');
      finishNavigation();
    }catch(e){
      if(e instanceof ApiError&&e.status===428){
        setPendingGoogleCredential(credential);
        setError('');
      }else{
        setError((e as Error).message);
      }
    }finally{setBusy(false);}
  }
  if(!ready)return <Page><Loading/></Page>;
  if(user&&!busy)return <Redirect href={sellerReturnDestination(true,params.next)??'/account'}/>;
  return <UiElement as={Page} title={register?copy.auth.register:copy.auth.welcome}><Text style={styles.muted}><UiText value={copy.auth.intro}/></Text>{Boolean(error)&&<ErrorPanel error={error}/>}
    <View style={[styles.card,{gap:8}]}>
      {Boolean(pendingGoogleCredential)&&<Text style={styles.text}><UiText value={"Welcome to VISTRAH! Because this is your first Google sign-in, please check the DPDP privacy consent box below to complete your new account."}/></Text>}
      <View style={{flexDirection:'row',alignItems:'flex-start',gap:6}}>
        <UiElement as={Pressable} accessibilityRole="checkbox" accessibilityLabel={signupLegalCopy.acceptance} accessibilityState={{checked:legalAccepted,disabled:busy}} disabled={busy} onPress={()=>setLegalAccepted(value=>!value)} style={{width:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><View style={{width:22,height:22,borderWidth:1,borderColor:colors.accent,borderRadius:4,alignItems:'center',justifyContent:'center'}}><Text style={{color:colors.text}}>{legalAccepted?'\u2713':''}</Text></View></UiElement>
        <Text style={[styles.text,{flex:1,minWidth:0,paddingTop:10}]}>
          <UiText value={"I have read and agree to Vistrah Groups Pvt Ltd"}/>{'\u2019s '}
          <Text accessibilityRole="link" onPress={()=>router.push('/terms')} style={{color:colors.accent,textDecorationLine:'underline'}}><UiText value={"Terms & Conditions"}/></Text>{', '}
          <Text accessibilityRole="link" onPress={()=>router.push('/privacy')} style={{color:colors.accent,textDecorationLine:'underline'}}><UiText value={"Privacy Policy"}/></Text>{', '}
          <UiText value={"and "}/>
          <Text accessibilityRole="link" onPress={()=>router.push('/grievance-officer')} style={{color:colors.accent,textDecorationLine:'underline'}}><UiText value={"Grievance Redressal Policy"}/></Text>
        </Text>
      </View>
      <View style={{flexDirection:'row',alignItems:'flex-start',gap:6}}>
        <UiElement as={Pressable} accessibilityRole="checkbox" accessibilityLabel={signupLegalCopy.whatsapp} accessibilityState={{checked:whatsappPromotions,disabled:busy}} disabled={busy} onPress={()=>setWhatsappPromotions(value=>!value)} style={{width:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><View style={{width:22,height:22,borderWidth:1,borderColor:colors.accent,borderRadius:4,alignItems:'center',justifyContent:'center'}}><Text style={{color:colors.text}}>{whatsappPromotions?'\u2713':''}</Text></View></UiElement>
        <Text style={[styles.text,{flex:1,minWidth:0,paddingTop:10}]}><UiText value={"I consent to receive optional promotional offers, V Ads campaign updates, and marketplace notifications from Vistrah Groups Pvt Ltd."}/></Text>
      </View>
      <Text style={styles.muted}>
        {!legalAccepted
          ? <UiText value={register||pendingGoogleCredential?"Accept the required DPDP Privacy Policy & Terms above to enable new account creation.":"Required for first-time account creation (returning users with an existing account may continue directly)."}/>
          : signupLegalCopy.notice}
      </Text>
      {Boolean(pendingGoogleCredential)&&(
        <View style={{gap:8}}>
          <Action auth label={busy?'Completing Google sign-in…':'Accept & Complete Google Sign-In'} disabled={busy||!legalAccepted} onPress={()=>void submitGoogle(pendingGoogleCredential)}/>
          <Action label="Cancel" secondary disabled={busy} onPress={()=>{setPendingGoogleCredential('');setLegalAccepted(false);}}/>
        </View>
      )}
    </View>
    <GoogleSignIn disabled={busy||(consentRequiredForButton&&!legalAccepted)} onCredential={credential=>void submitGoogle(credential)} onError={setError}/>
    <View style={{flexDirection:'row',alignItems:'center',gap:10,marginVertical:8}}>
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
  </UiElement>;
}
