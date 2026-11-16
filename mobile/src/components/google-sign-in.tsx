import {Text} from './typography';
import {UiText,UiElement} from "./localized-ui";
import {useState} from 'react';
import {Platform,Pressable,View} from 'react-native';
import Constants from 'expo-constants';
import {router} from 'expo-router';
import {Action} from './ui';
import {useTheme} from '../lib/theme';
import {legalVersion,signupLegalCopy} from '../../../shared/legal';

export type GoogleAuthGrant={
 credential?:string;
 accessToken?:string;
 privacyPolicyVersion:string;
 marketingConsent:boolean;
};

export function GoogleSignIn({
 disabled,
 onCredential,
 onError,
 legalAccepted:controlledAccepted,
 onLegalAcceptedChange,
 marketingConsent:controlledMarketing,
 onMarketingConsentChange,
}:{
 disabled:boolean;
 onCredential:(credential:string,grant?:GoogleAuthGrant)=>void;
 onError:(message:string)=>void;
 legalAccepted?:boolean;
 onLegalAcceptedChange?:(checked:boolean)=>void;
 marketingConsent?:boolean;
 onMarketingConsentChange?:(checked:boolean)=>void;
}){
 const {styles,colors}=useTheme();const [working,setWorking]=useState(false),[consentAlert,setConsentAlert]=useState('');
 const [internalAccepted,setInternalAccepted]=useState(false),[internalMarketing,setInternalMarketing]=useState(false);
 const accepted=controlledAccepted!==undefined?controlledAccepted:internalAccepted;
 const marketing=controlledMarketing!==undefined?controlledMarketing:internalMarketing;
 const setAccepted=(next:boolean)=>{
  if(onLegalAcceptedChange)onLegalAcceptedChange(next);
  else setInternalAccepted(next);
  if(next)setConsentAlert('');
 };
 const setMarketing=(next:boolean)=>{
  if(onMarketingConsentChange)onMarketingConsentChange(next);
  else setInternalMarketing(next);
 };
 const clientId=process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
 const iosClientId=process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
 const supported=Constants.executionEnvironment!=='storeClient';

 async function signIn(){
  if(disabled||!clientId||working)return;
  if(!accepted){
   setConsentAlert('Please review and accept the Terms & Conditions, Privacy Policy, and Grievance Redressal Policy above before signing in with Google.');
   return;
  }
  setConsentAlert('');
  setWorking(true);
  try{
   const {GoogleSignin}=await import('@react-native-google-signin/google-signin');
   GoogleSignin.configure({webClientId:clientId,iosClientId});
   if(Platform.OS==='android')await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog:true});
   // Ask explicitly; never silently reuse a cached Google account.
   await GoogleSignin.signOut();
   const result=await GoogleSignin.signIn();
   if(result.type==='success'){
    if(!result.data.idToken)throw new Error('Google did not return an identity token. Check the OAuth client configuration.');
    onCredential(result.data.idToken,{
     credential:result.data.idToken,
     privacyPolicyVersion:legalVersion,
     marketingConsent:marketing,
    });
   }
  }catch{onError('Google sign-in could not be completed. Check the development build and OAuth configuration, or use email and password.');}
  finally{setWorking(false);}
 }

 return <View style={{width:'100%',maxWidth:400,alignSelf:'center',gap:10}}>
  <View style={[styles.card,{gap:8,borderWidth:consentAlert?1.5:1,borderColor:consentAlert?'#dc2626':colors.border}]}>
   <View style={{flexDirection:'row',alignItems:'flex-start',gap:6}}>
    <UiElement as={Pressable} accessibilityRole="checkbox" accessibilityLabel={signupLegalCopy.acceptance} accessibilityState={{checked:accepted,disabled}} disabled={disabled} onPress={()=>setAccepted(!accepted)} style={{width:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><View style={{width:22,height:22,borderWidth:1,borderColor:consentAlert?'#dc2626':colors.accent,borderRadius:4,alignItems:'center',justifyContent:'center'}}><Text style={{color:colors.text}}>{accepted?'\u2713':''}</Text></View></UiElement>
    <Text style={[styles.text,{flex:1,minWidth:0,paddingTop:10}]}>
     <UiText value={"I have read and agree to Vistrah India Pvt Limited"}/>{'\u2019s '}
     <Text accessibilityRole="link" onPress={()=>router.push('/terms')} style={{color:colors.accent,textDecorationLine:'underline'}}><UiText value={"Terms & Conditions"}/></Text>{', '}
     <Text accessibilityRole="link" onPress={()=>router.push('/privacy')} style={{color:colors.accent,textDecorationLine:'underline'}}><UiText value={"Privacy Policy"}/></Text>{', '}
     <UiText value={"and "}/>
     <Text accessibilityRole="link" onPress={()=>router.push('/grievance-officer')} style={{color:colors.accent,textDecorationLine:'underline'}}><UiText value={"Grievance Redressal Policy"}/></Text>
    </Text>
   </View>
   <View style={{flexDirection:'row',alignItems:'flex-start',gap:6}}>
    <UiElement as={Pressable} accessibilityRole="checkbox" accessibilityLabel={signupLegalCopy.whatsapp} accessibilityState={{checked:marketing,disabled}} disabled={disabled} onPress={()=>setMarketing(!marketing)} style={{width:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><View style={{width:22,height:22,borderWidth:1,borderColor:colors.accent,borderRadius:4,alignItems:'center',justifyContent:'center'}}><Text style={{color:colors.text}}>{marketing?'\u2713':''}</Text></View></UiElement>
    <Text style={[styles.text,{flex:1,minWidth:0,paddingTop:10}]}><UiText value={"I consent to receive optional promotional offers, V Ads campaign updates, and marketplace notifications from Vistrah India Pvt Limited."}/></Text>
   </View>
   {consentAlert?(
    <Text accessibilityRole="alert" style={[styles.text,{color:'#dc2626',fontWeight:'600'}]}><UiText value={consentAlert}/></Text>
   ):(
    <Text style={styles.muted}>{!accepted?<UiText value={"Check the DPDP Privacy Policy & Terms box above before continuing with Google or creating an account."}/>:signupLegalCopy.notice}</Text>
   )}
  </View>
  {!clientId||(Platform.OS==='ios'&&!iosClientId)?(
   <Text style={styles.muted}><UiText value={"Google sign-in is not configured yet. Use email and password."}/></Text>
  ):!supported?(
   <Text style={styles.muted}><UiText value={"Google sign-in requires a development build. Use email and password in Expo Go."}/></Text>
  ):(
   <View style={{gap:10,width:'100%'}}>
    <UiElement as={Action} secondary label={working?'Opening Google...':'Continue with Google'} disabled={disabled||working} onPress={()=>void signIn()}/>
    <UiElement as={Action} secondary label="Sign in with a different Google account" disabled={disabled||working} onPress={()=>void signIn()}/>
   </View>
  )}
 </View>;
}
