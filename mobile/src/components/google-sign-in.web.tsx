import {UiText} from "./localized-ui";
import {useEffect,useRef,useState} from 'react';
import {Text} from 'react-native';
import {loadGoogleIdentity} from '../../../shared/google-web';
import {useTheme} from '../lib/theme';

export function GoogleSignIn({disabled,onCredential,onError}:{disabled:boolean;onCredential:(credential:string)=>void;onError:(message:string)=>void}){
 const {styles}=useTheme(),host=useRef<HTMLDivElement>(null),latest=useRef({disabled,onCredential,onError});const [error,setError]=useState('');
 const clientId=process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
 useEffect(()=>{latest.current={disabled,onCredential,onError};},[disabled,onCredential,onError]);
 useEffect(()=>{let active=true;if(clientId)void loadGoogleIdentity().then(api=>{if(!active||!host.current)return;api.initialize({client_id:clientId,auto_select:false,callback:response=>{if(active&&!latest.current.disabled)latest.current.onCredential(response.credential);}});api.renderButton(host.current,{theme:'outline',size:'large',text:'continue_with',shape:'pill'});}).catch(error=>{if(active)setError(error.message);});return()=>{active=false;};},[clientId]);
 if(!clientId)return <Text style={styles.muted}><UiText value={"Google sign-in is not configured yet. Use email and password."}/></Text>;
 return <div aria-disabled={disabled} style={{opacity:disabled?.5:1,pointerEvents:disabled?'none':undefined}}><div ref={host}/>{error&&<p role="alert"><UiText value={error}/></p>}</div>;
}
