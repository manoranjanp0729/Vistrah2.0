import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {api,ApiError,onUnauthorized,setToken,usesBrowserCookies} from './api';
import type {User} from './catalogue';
import {authEndpoint} from './seller-auth';
const key='vistrah.session';
const readToken=()=>Platform.OS==='web'?Promise.resolve(null):SecureStore.getItemAsync(key);
const storeToken=(token:string)=>Platform.OS==='web'?Promise.resolve():SecureStore.setItemAsync(key,token);
const removeToken=()=>Platform.OS==='web'?Promise.resolve():SecureStore.deleteItemAsync(key);
type Session={user:User|null;ready:boolean;error:string;signIn:(email:string,password:string,name?:string,seller?:boolean)=>Promise<void>;signOut:()=>Promise<void>;retry:()=>void;refresh:()=>Promise<void>};
const Context=createContext<Session|null>(null);
export function SessionProvider({children}:{children:ReactNode}) {
  const [user,setUser]=useState<User|null>(null);const [ready,setReady]=useState(false);const [error,setError]=useState('');const [attempt,setAttempt]=useState(0);
  const generation=useRef(0);
  useEffect(()=>{
    let active=true;
    const serial=generation.current;
    const expire=()=>{generation.current++;setToken(null);setUser(null);void removeToken().catch(()=>{if(active)setError('Could not clear secure storage. Please retry sign out.');});};
    onUnauthorized(expire);
    const restore=async()=>{
      try{const saved=await readToken();if(!active||generation.current!==serial)return;setToken(saved);
        if(saved||usesBrowserCookies){const current=await api<User>('/me');if(active&&generation.current===serial){setUser(current);setError('');}}
      }catch(e){if(active&&generation.current===serial){setUser(null);setToken(null);if(!(e instanceof ApiError&&e.status===401))setError((e as Error).message);}}
      finally{if(active)setReady(true);}
    };
    void restore();return()=>{active=false;onUnauthorized(()=>{});};
  },[attempt]);
  async function signIn(email:string,password:string,name?:string,seller=false) {
    generation.current++;const serial=generation.current;
    const result=await api<{access_token?:string;user:User}>(authEndpoint(Boolean(name),seller),{method:'POST',body:JSON.stringify({email,password,...(name?{name}:{})})});
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
  return <Context.Provider value={{user,ready,error,signIn,signOut,refresh,retry:()=>{setReady(false);setAttempt(v=>v+1);}}}>{children}</Context.Provider>;
}
export function useSession(){const value=useContext(Context);if(!value)throw new Error('Missing SessionProvider');return value;}

