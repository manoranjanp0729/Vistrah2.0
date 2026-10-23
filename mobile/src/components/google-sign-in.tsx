import {Text} from './typography';
import {UiText,UiElement} from "./localized-ui";
import {useState} from 'react';
import {Platform} from 'react-native';
import Constants from 'expo-constants';
import {Action} from './ui';
import {useTheme} from '../lib/theme';

export function GoogleSignIn({disabled,onCredential,onError}:{disabled:boolean;onCredential:(credential:string)=>void;onError:(message:string)=>void}){
 const {styles}=useTheme();const [working,setWorking]=useState(false);
 const clientId=process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
 const iosClientId=process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
 const supported=Constants.executionEnvironment!=='storeClient';
 async function signIn(){
  if(!clientId||working)return;setWorking(true);
  try{
   const {GoogleSignin}=await import('@react-native-google-signin/google-signin');
   GoogleSignin.configure({webClientId:clientId,iosClientId});
   if(Platform.OS==='android')await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog:true});
   // Ask explicitly; never silently reuse a cached Google account.
   await GoogleSignin.signOut();
   const result=await GoogleSignin.signIn();
   if(result.type==='success'){
    if(!result.data.idToken)throw new Error('Google did not return an identity token. Check the OAuth client configuration.');
    onCredential(result.data.idToken);
   }
  }catch{onError('Google sign-in could not be completed. Check the development build and OAuth configuration, or use email and password.');}
  finally{setWorking(false);}
 }
 if(!clientId||(Platform.OS==='ios'&&!iosClientId))return <Text style={styles.muted}><UiText value={"Google sign-in is not configured yet. Use email and password."}/></Text>;
 if(!supported)return <Text style={styles.muted}><UiText value={"Google sign-in requires a development build. Use email and password in Expo Go."}/></Text>;
 return <UiElement as={Action} secondary label={working?'Opening Google...':'Continue with Google'} disabled={disabled||working} onPress={()=>void signIn()}/>;
}
