'use client';
import Link from 'next/link';
import {UiText} from "./localized-ui";
import {useEffect,useRef,useState} from 'react';
import {disableGoogleAutoSelect,getGoogleOAuth2,loadGoogleIdentity} from '../../shared/google-web';
import {legalVersion,signupLegalCopy} from '../../shared/legal';

const TARGET_HEIGHT=44,BASE_HEIGHT=40,BUTTON_RADIUS=8;
const computeGsiWidth=(el:HTMLElement)=>Math.min(400,Math.max(240,Math.floor(el.getBoundingClientRect().width||400)));

export type GoogleAuthGrant={
 credential?:string;
 accessToken?:string;
 privacyPolicyVersion:string;
 marketingConsent:boolean;
};

export function GoogleSignIn({
 disabled,
 onCredential,
 legalAccepted:controlledAccepted,
 onLegalAcceptedChange,
 marketingConsent:controlledMarketing,
 onMarketingConsentChange,
}:{
 disabled:boolean;
 onCredential:(credential:string,grant?:GoogleAuthGrant)=>void;
 legalAccepted?:boolean;
 onLegalAcceptedChange?:(checked:boolean)=>void;
 marketingConsent?:boolean;
 onMarketingConsentChange?:(checked:boolean)=>void;
}){
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

 const wrap=useRef<HTMLDivElement>(null),host=useRef<HTMLDivElement>(null),checkboxRef=useRef<HTMLInputElement>(null);
 const latest=useRef({disabled,accepted,marketing,onCredential}),initialized=useRef(false);
 const [error,setError]=useState(''),[consentAlert,setConsentAlert]=useState(''),[gsiWidth,setGsiWidth]=useState(400),[gsiReady,setGsiReady]=useState(false);
 useEffect(()=>{latest.current={disabled,accepted,marketing,onCredential};},[disabled,accepted,marketing,onCredential]);
 const clientId=process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

 function requireConsentAlert(){
  setConsentAlert('Please review and accept the Terms & Conditions, Privacy Policy, and Grievance Redressal Policy above before signing in with Google.');
  checkboxRef.current?.focus();
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
       checkboxRef.current?.focus();
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
     if(response.error!=='access_denied')setError('Google account selection was cancelled or could not complete.');
     return;
    }
    if(!response.access_token){
     setError('Google did not return an account token. Please try again.');
     return;
    }
    latest.current.onCredential('',{
     accessToken:response.access_token,
     privacyPolicyVersion:legalVersion,
     marketingConsent:latest.current.marketing,
    });
   },
   error_callback:err=>{
    if(err?.type!=='popup_closed')setError('Could not open Google account chooser. Allow popups for vistrah.in or use email and password.');
   },
  });
  tokenClient.requestAccessToken({prompt:'select_account'});
 }

 const clipWidth=Math.max(236,gsiWidth-4);

 return <div style={{width:'100%',maxWidth:400,marginInline:'auto',marginBottom:16}}>
  <div
   role="region"
   aria-label="DPDP privacy and marketing consent"
   style={{
    display:'grid',
    gap:10,
    padding:14,
    marginBottom:12,
    borderRadius:BUTTON_RADIUS,
    boxSizing:'border-box',
    border:consentAlert?'1.5px solid #dc2626':'1px solid var(--border,rgba(15,23,42,0.12))',
    background:consentAlert?'rgba(220,38,38,0.04)':'var(--surface-soft,rgba(15,23,42,0.02))',
    transition:'border-color 0.15s ease, background-color 0.15s ease',
   }}
  >
   <label className="checkbox-label" style={{alignItems:'flex-start',cursor:disabled?'not-allowed':'pointer'}}>
    <input
     ref={checkboxRef}
     type="checkbox"
     checked={accepted}
     disabled={disabled}
     onChange={event=>setAccepted(event.target.checked)}
     aria-label={signupLegalCopy.acceptance}
     aria-invalid={Boolean(consentAlert)}
     aria-describedby="signup-phase-notice"
     style={{flexShrink:0,padding:0,marginTop:4}}
    />
    <span>
     <UiText value={"I have read and agree to Vistrah India Pvt Limited"}/>{'\u2019s '}
     <Link href="/terms" target="_blank" rel="noopener noreferrer"><UiText value={"Terms & Conditions"}/></Link>{', '}
     <Link href="/privacy" target="_blank" rel="noopener noreferrer"><UiText value={"Privacy Policy"}/></Link>{', '}
     <UiText value={"and "}/>
     <Link href="/grievance-officer" target="_blank" rel="noopener noreferrer"><UiText value={"Grievance Redressal Policy"}/></Link>
    </span>
   </label>
   <label className="checkbox-label" style={{alignItems:'flex-start',cursor:disabled?'not-allowed':'pointer'}}>
    <input
     type="checkbox"
     checked={marketing}
     disabled={disabled}
     onChange={event=>setMarketing(event.target.checked)}
     aria-describedby="signup-phase-notice"
     style={{flexShrink:0,padding:0,marginTop:4}}
    />
    <span><UiText value={"I consent to receive optional promotional offers, V Ads campaign updates, and marketplace notifications from Vistrah India Pvt Limited."}/></span>
   </label>
   {consentAlert?(
    <p role="alert" style={{margin:0,fontSize:13,fontWeight:600,lineHeight:1.45,color:'#dc2626'}}>
     <UiText value={consentAlert}/>
    </p>
   ):(
    <small id="signup-phase-notice" style={{lineHeight:1.45,color:'var(--text-secondary,#64748b)'}}>
     {!accepted
      ? <UiText value={"Check the DPDP Privacy Policy & Terms box above before continuing with Google or creating an account."}/>
      : <>{signupLegalCopy.notice} <UiText value={"Legal links open in a new tab."}/></>}
    </small>
   )}
  </div>

  {!clientId?(
   <p role="status"><UiText value={"Google sign-in is not configured yet. Use email and password."}/></p>
  ):(
   <div style={{display:'grid',gap:10,width:'100%'}}>
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
       borderRadius:BUTTON_RADIUS,
       backgroundColor:'#ffffff',
       border:consentAlert?'1.5px solid #dc2626':'1px solid var(--border,#dadce0)',
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
        borderRadius:BUTTON_RADIUS,
        cursor:'pointer',
        zIndex:2,
       }}
      />
     )}
    </div>
    <button
     type="button"
     className="button secondary"
     disabled={disabled||(!gsiReady&&accepted)}
     onClick={switchGoogleAccount}
     style={{
      width:'100%',
      minHeight:TARGET_HEIGHT,
      height:TARGET_HEIGHT,
      borderRadius:BUTTON_RADIUS,
      boxSizing:'border-box',
     }}
    >
     <UiText value={"Sign in with a different Google account"}/>
    </button>
    {error&&<p role="alert" style={{margin:0,fontSize:13,color:'#dc2626'}}><UiText value={error}/></p>}
   </div>
  )}
 </div>;
}
