import {Text} from './typography';
import {UiText,UiElement} from "./localized-ui";
import {useEffect,useRef,useState} from 'react';
import {Pressable,View} from 'react-native';
import {router} from 'expo-router';
import {Action} from './ui';

import {disableGoogleAutoSelect,getGoogleOAuth2,loadGoogleIdentity} from '../../../shared/google-web';
import {legalVersion,signupLegalCopy} from '../../../shared/legal';
import {controlHeights,layout,radii,useTheme} from '../lib/theme';

const TARGET_HEIGHT=controlHeights.standard,BASE_HEIGHT=40;
const computeGsiWidth=(el:HTMLElement)=>Math.min(400,Math.max(240,Math.floor(el.getBoundingClientRect().width||360)));

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
 const {styles,colors}=useTheme();
 const [internalAccepted,setInternalAccepted]=useState(false);
 const [internalMarketing,setInternalMarketing]=useState(false);
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

 const wrap=useRef<HTMLDivElement>(null),host=useRef<HTMLDivElement>(null);
 const latest=useRef({disabled,accepted,marketing,onCredential,onError}),initialized=useRef(false);
 const [error,setError]=useState(''),[consentAlert,setConsentAlert]=useState(''),[gsiWidth,setGsiWidth]=useState(360),[gsiReady,setGsiReady]=useState(false);
 const clientId=process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
 useEffect(()=>{latest.current={disabled,accepted,marketing,onCredential,onError};},[disabled,accepted,marketing,onCredential,onError]);

 function requireConsentAlert(){
  setConsentAlert('Please review and accept the Terms & Conditions, Privacy Policy, and Grievance Redressal Policy above before signing in with Google.');
 }

 useEffect(()=>{
  const el=wrap.current;if(!clientId||!el)return;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const applyWidth=()=>{
   const next=computeGsiWidth(el);
   setGsiWidth(prev=>prev===next?prev:next);
  };
  applyWidth();
  if(typeof ResizeObserver==='undefined')return;
  const ro=new ResizeObserver(()=>{
   if(timer)clearTimeout(timer);
   timer=setTimeout(applyWidth,80);
  });
  ro.observe(el);
  return()=>{
   if(timer)clearTimeout(timer);
   ro.disconnect();
  };
 },[clientId]);

 useEffect(()=>{
  let active=true;if(!clientId)return;
  void loadGoogleIdentity().then(api=>{
   if(!active||!host.current)return;
   if(!initialized.current){
    api.initialize({
     client_id:clientId,
     auto_select:false,
     button_auto_select:false,
     callback:response=>{
      if(latest.current.disabled)return;
      if(!latest.current.accepted){
       setConsentAlert('Please review and accept the Terms & Conditions, Privacy Policy, and Grievance Redressal Policy above before signing in with Google.');
       return;
      }
      setConsentAlert('');
      latest.current.onCredential(response.credential,{
       credential:response.credential,
       privacyPolicyVersion:legalVersion,
       marketingConsent:latest.current.marketing,
      });
     },
    });
    initialized.current=true;
   }
   const measured=wrap.current?computeGsiWidth(wrap.current):gsiWidth;
   if(measured!==gsiWidth)setGsiWidth(measured);
   host.current.innerHTML='';
   api.renderButton(host.current,{theme:'outline',size:'large',text:'continue_with',shape:'rectangular',width:measured,logo_alignment:'left'});
   setGsiReady(true);
  }).catch(err=>{if(active)setError((err as Error).message);});
  return()=>{active=false;};
 },[clientId,gsiWidth]);

 function switchGoogleAccount(){
  if(disabled||!clientId)return;
  if(!accepted){requireConsentAlert();return;}
  setConsentAlert('');
  setError('');
  disableGoogleAutoSelect();
  const oauth2=getGoogleOAuth2();
  if(!oauth2){
   setError('Google account chooser is still loading. Please try again in a moment.');
   return;
  }
  const tokenClient=oauth2.initTokenClient({
   client_id:clientId,
   scope:'openid email profile',
   prompt:'select_account',
   callback:response=>{
    if(latest.current.disabled)return;
    if(response.error){
     if(response.error!=='access_denied')latest.current.onError('Google account selection was cancelled or could not complete.');
     return;
    }
    if(!response.access_token){
     latest.current.onError('Google did not return an account token. Please try again.');
     return;
    }
    latest.current.onCredential('',{
     accessToken:response.access_token,
     privacyPolicyVersion:legalVersion,
     marketingConsent:latest.current.marketing,
    });
   },
   error_callback:err=>{
    if(err?.type!=='popup_closed')latest.current.onError('Could not open Google account chooser. Allow popups for vistrah.in or use email and password.');
   },
  });
  tokenClient.requestAccessToken({prompt:'select_account'});
 }

 const clipWidth=Math.max(236,gsiWidth-4);

 return <View style={{width:'100%',maxWidth:400,alignSelf:'center',gap:10}}>
  <View
   style={[
    styles.card,
    {
     gap:8,
     borderWidth:consentAlert?1.5:1,
     borderColor:consentAlert?'#dc2626':colors.border,
    },
   ]}
  >
   <View style={{flexDirection:'row',alignItems:'flex-start',gap:6}}>
    <UiElement
     as={Pressable}
     accessibilityRole="checkbox"
     accessibilityLabel={signupLegalCopy.acceptance}
     accessibilityState={{checked:accepted,disabled}}
     disabled={disabled}
     onPress={()=>setAccepted(!accepted)}
     style={{width:44,minHeight:44,alignItems:'center',justifyContent:'center'}}
    >
     <View style={{width:22,height:22,borderWidth:1,borderColor:consentAlert?'#dc2626':colors.accent,borderRadius:4,alignItems:'center',justifyContent:'center'}}>
      <Text style={{color:colors.text}}>{accepted?'\u2713':''}</Text>
     </View>
    </UiElement>
    <Text style={[styles.text,{flex:1,minWidth:0,paddingTop:10}]}>
     <UiText value={"I have read and agree to Vistrah India Pvt Limited"}/>{'\u2019s '}
     <Text accessibilityRole="link" onPress={()=>router.push('/terms')} style={{color:colors.accent,textDecorationLine:'underline'}}><UiText value={"Terms & Conditions"}/></Text>{', '}
     <Text accessibilityRole="link" onPress={()=>router.push('/privacy')} style={{color:colors.accent,textDecorationLine:'underline'}}><UiText value={"Privacy Policy"}/></Text>{', '}
     <UiText value={"and "}/>
     <Text accessibilityRole="link" onPress={()=>router.push('/grievance-officer')} style={{color:colors.accent,textDecorationLine:'underline'}}><UiText value={"Grievance Redressal Policy"}/></Text>
    </Text>
   </View>
   <View style={{flexDirection:'row',alignItems:'flex-start',gap:6}}>
    <UiElement
     as={Pressable}
     accessibilityRole="checkbox"
     accessibilityLabel={signupLegalCopy.whatsapp}
     accessibilityState={{checked:marketing,disabled}}
     disabled={disabled}
     onPress={()=>setMarketing(!marketing)}
     style={{width:44,minHeight:44,alignItems:'center',justifyContent:'center'}}
    >
     <View style={{width:22,height:22,borderWidth:1,borderColor:colors.accent,borderRadius:4,alignItems:'center',justifyContent:'center'}}>
      <Text style={{color:colors.text}}>{marketing?'\u2713':''}</Text>
     </View>
    </UiElement>
    <Text style={[styles.text,{flex:1,minWidth:0,paddingTop:10}]}>
     <UiText value={"I consent to receive optional promotional offers, V Ads campaign updates, and marketplace notifications from Vistrah India Pvt Limited."}/>
    </Text>
   </View>
   {consentAlert?(
    <p role="alert" style={{margin:0,fontSize:13,fontWeight:600,lineHeight:1.45,color:'#dc2626'}}>
     <UiText value={consentAlert}/>
    </p>
   ):(
    <Text style={styles.muted}>
     {!accepted
      ? <UiText value={"Check the DPDP Privacy Policy & Terms box above before continuing with Google or creating an account."}/>
      : signupLegalCopy.notice}
    </Text>
   )}
  </View>

  {!clientId?(
   <Text style={styles.muted}><UiText value={"Google sign-in is not configured yet. Use email and password."}/></Text>
  ):(
   <View style={{width:'100%',gap:10}}>
    <div
     aria-disabled={disabled||!accepted}
     style={{
      position:'relative',
      width:'100%',
      opacity:disabled?.5:!accepted?.85:1,
      pointerEvents:disabled?'none':undefined,
     }}
    >
     <div
      ref={wrap}
      style={{
       width:'100%',
       minHeight:TARGET_HEIGHT,
       height:TARGET_HEIGHT,
       borderRadius:radii.action,
       backgroundColor:'#ffffff',
       border:consentAlert?'1.5px solid #dc2626':`${layout.borderWidth}px solid ${colors.accent}`,
       display:'flex',
       alignItems:'center',
       justifyContent:'center',
       overflow:'hidden',
       boxSizing:'border-box',
      }}
     >
      <div style={{width:clipWidth,height:BASE_HEIGHT-4,overflow:'hidden',pointerEvents:accepted?'auto':'none'}}>
       <div ref={host} style={{width:gsiWidth,height:BASE_HEIGHT,transform:'translate(-2px,-2px)'}}/>
      </div>
     </div>
     {!accepted&&(
      <button
       type="button"
       aria-label="Continue with Google"
       onClick={requireConsentAlert}
       style={{
        position:'absolute',
        inset:0,
        width:'100%',
        height:'100%',
        background:'transparent',
        border:'none',
        borderRadius:radii.action,
        cursor:'pointer',
        zIndex:2,
       }}
      />
     )}
    </div>
    <UiElement
     as={Action}
     secondary
     label="Sign in with a different Google account"
     disabled={disabled||(!gsiReady&&accepted)}
     onPress={switchGoogleAccount}
    />
    {error&&<p role="alert" style={{margin:0,fontSize:13,color:'#dc2626'}}><UiText value={error}/></p>}
   </View>
  )}
 </View>;
}
