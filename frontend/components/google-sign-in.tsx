'use client';
import {UiText} from "./localized-ui";
import {useEffect,useRef,useState} from 'react';
import {loadGoogleIdentity} from '../../shared/google-web';

export function GoogleSignIn({disabled,onCredential}:{disabled:boolean;onCredential:(credential:string)=>void}){
 const host=useRef<HTMLDivElement>(null),latest=useRef({disabled,onCredential});
 const [error,setError]=useState('');
 useEffect(()=>{latest.current={disabled,onCredential};},[disabled,onCredential]);
 const clientId=process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
 useEffect(()=>{let active=true;if(clientId)void loadGoogleIdentity().then(api=>{if(!active||!host.current)return;api.initialize({client_id:clientId,auto_select:false,callback:response=>{if(active&&!latest.current.disabled)latest.current.onCredential(response.credential);}});api.renderButton(host.current,{theme:'outline',size:'large',text:'continue_with',shape:'pill'});}).catch(error=>{if(active)setError(error.message);});return()=>{active=false;};},[clientId]);
 if(!clientId)return <p role="status"><UiText value={"Google sign-in is not configured yet. Use email and password."}/></p>;
 return <div aria-disabled={disabled} style={{opacity:disabled?.5:1,pointerEvents:disabled?'none':undefined,marginBottom:16}}><div ref={host}/>{error&&<p role="alert"><UiText value={error}/></p>}</div>;
}
