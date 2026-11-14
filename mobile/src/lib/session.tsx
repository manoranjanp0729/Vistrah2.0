import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {api,ApiError,onUnauthorized,setToken,usesBrowserCookies} from './api';
import type {User} from './catalogue';
import {authEndpoint} from './seller-auth';
import {fetchBootstrap} from './bootstrap';
const PRIMARY_STORAGE_KEY='vistrah.session';
const LEGACY_SELLER_STORAGE_KEY='vistrah.seller.session';
const readToken=async()=>{
  if(Platform.OS==='web')return null;
  const primary=await SecureStore.getItemAsync(PRIMARY_STORAGE_KEY);
  if(primary)return primary;
  const legacy=await SecureStore.getItemAsync(LEGACY_SELLER_STORAGE_KEY);
  if(legacy){
    await SecureStore.setItemAsync(PRIMARY_STORAGE_KEY,legacy);
    await SecureStore.deleteItemAsync(LEGACY_SELLER_STORAGE_KEY).catch(()=>{});
    return legacy;
  }
  return null;
};
const storeToken=(token:string)=>Platform.OS==='web'?Promise.resolve():SecureStore.setItemAsync(PRIMARY_STORAGE_KEY,token);
const removeToken=async()=>{
  if(Platform.OS==='web')return;
  await SecureStore.deleteItemAsync(PRIMARY_STORAGE_KEY);
  await SecureStore.deleteItemAsync(LEGACY_SELLER_STORAGE_KEY).catch(()=>{});
};
type Session={user:User|null;ready:boolean;error:string;signIn:(email:string,password:string,name?:string,seller?:boolean)=>Promise<void>;signInWithGoogle:(payload:{credential:string},seller?:boolean)=>Promise<void>;signOut:()=>Promise<void>;retry:()=>void;refresh:()=>Promise<void>};
const Context=createContext<Session|null>(null);
export function SessionProvider({children}:{children:ReactNode}) {
  const session=useStoredSession();
  return <Context.Provider value={session}>{children}</Context.Provider>;
}
function useStoredSession():Session {
  const [user,setUser]=useState<User|null>(null);const [ready,setReady]=useState(false);const [error,setError]=useState('');const [attempt,setAttempt]=useState(0);
  const generation=useRef(0);
  useEffect(()=>{
    let active=true;
    const serial=generation.current;
    const expire=()=>{generation.current++;setToken(null);setUser(null);void removeToken().catch(()=>{if(active)setError('Could not clear secure storage. Please retry sign out.');});};
    onUnauthorized(expire);
    const restore=async()=>{
      try{const saved=await readToken();if(!active||generation.current!==serial)return;setToken(saved);
        if(saved||usesBrowserCookies){
          const bootstrap=await fetchBootstrap('customer');
          if(active&&generation.current===serial&&bootstrap?.user){setUser(bootstrap.user);setError('');}
          else if(active&&generation.current===serial){const current=await api<User>('/me');setUser(current);setError('');}
        }else{
          void fetchBootstrap('customer');
        }
      }catch(e){if(active&&generation.current===serial){setUser(null);setToken(null);if(!(e instanceof ApiError&&e.status===401))setError((e as Error).message);}}
      finally{if(active)setReady(true);}
    };
    void restore();return()=>{active=false;onUnauthorized(()=>{});};
  },[attempt]);
  async function signIn(email:string,password:string,name?:string,_seller=false) {
    generation.current++;const serial=generation.current;
    const result=await api<{access_token?:string;user:User}>(authEndpoint(Boolean(name)),{method:'POST',body:JSON.stringify({email,password,...(name?{name}:{})})});
    if(serial!==generation.current)return;
    if(!usesBrowserCookies&&!result.access_token)throw new Error('Sign-in could not be completed. Please try again.');
    if(result.access_token&&!usesBrowserCookies)await storeToken(result.access_token);
    setToken(usesBrowserCookies?null:result.access_token!);setUser(result.user);setError('');
  }
  async function signInWithGoogle(payload:{credential:string},_seller=false){
    generation.current++;const serial=generation.current;
    const result=await api<{access_token?:string;user:User}>('/auth/google',{method:'POST',body:JSON.stringify(payload)});
    if(serial!==generation.current)return;
    if(!usesBrowserCookies&&!result.access_token)throw new Error('Sign-in could not be completed. Please try again.');
    if(result.access_token&&!usesBrowserCookies)await storeToken(result.access_token);
    setToken(usesBrowserCookies?null:result.access_token!);setUser(result.user);setError('');
  }
  async function signOut(){
    generation.current++;let revocationError:Error|null=null;
    await api('/auth/logout',{method:'POST'}).catch(e=>{if(!(e instanceof ApiError&&e.status===401))revocationError=e;});
    await removeToken();setToken(null);setUser(null);setError('');
    if(revocationError)throw new Error('Signed out on this device. VISTRAH could not revoke the server session because it was unreachable.');
  }
  async function refresh(){const serial=generation.current;const current=await api<User>('/me');if(serial===generation.current)setUser(current);}
  return {user,ready,error,signIn,signInWithGoogle,signOut,refresh,retry:()=>{setReady(false);setAttempt(v=>v+1);}};
}
export function useSession(_seller?:boolean){const value=useContext(Context);if(!value)throw new Error('Missing SessionProvider');return value;}

