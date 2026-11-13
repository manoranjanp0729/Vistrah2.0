import {usePathname} from 'expo-router';
import {sellerScreen,type SessionScope} from '../../../shared/session-scope';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {api,ApiError,onUnauthorized,setToken,usesBrowserCookies} from './api';
import type {User} from './catalogue';
import {authEndpoint} from './seller-auth';
import {fetchBootstrap} from './bootstrap';
const storageKey=(scope:SessionScope)=>scope==='seller'?'vistrah.seller.session':'vistrah.session';
const readToken=(scope:SessionScope)=>Platform.OS==='web'?Promise.resolve(null):SecureStore.getItemAsync(storageKey(scope));
const storeToken=(token:string,scope:SessionScope)=>Platform.OS==='web'?Promise.resolve():SecureStore.setItemAsync(storageKey(scope),token);
const removeToken=(scope:SessionScope)=>Platform.OS==='web'?Promise.resolve():SecureStore.deleteItemAsync(storageKey(scope));
type Session={user:User|null;ready:boolean;error:string;signIn:(email:string,password:string,name?:string,seller?:boolean)=>Promise<void>;signInWithGoogle:(payload:{credential:string},seller?:boolean)=>Promise<void>;signOut:()=>Promise<void>;retry:()=>void;refresh:()=>Promise<void>};
const Context=createContext<Session|null>(null);
const SellerContext=createContext<Session|null>(null);
export function SessionProvider({children}:{children:ReactNode}) {
  const customer=useStoredSession('customer'),seller=useStoredSession('seller');
  return <Context.Provider value={customer}><SellerContext.Provider value={seller}>{children}</SellerContext.Provider></Context.Provider>;
}
function useStoredSession(scope:SessionScope):Session {
  const [user,setUser]=useState<User|null>(null);const [ready,setReady]=useState(false);const [error,setError]=useState('');const [attempt,setAttempt]=useState(0);
  const generation=useRef(0);
  useEffect(()=>{
    let active=true;
    const serial=generation.current;
    const expire=()=>{generation.current++;setToken(null,scope);setUser(null);void removeToken(scope).catch(()=>{if(active)setError('Could not clear secure storage. Please retry sign out.');});};
    onUnauthorized(expire,scope);
    const restore=async()=>{
      try{const saved=await readToken(scope);if(!active||generation.current!==serial)return;setToken(saved,scope);
        if(saved||usesBrowserCookies){
          if(scope==='customer'){
            const bootstrap=await fetchBootstrap('customer');
            if(active&&generation.current===serial&&bootstrap?.user){setUser(bootstrap.user);setError('');}
            else if(active&&generation.current===serial){const current=await api<User>('/me',{}, {scope});setUser(current);setError('');}
          }else{
            const current=await api<User>('/me',{}, {scope});if(active&&generation.current===serial){setUser(current);setError('');}
          }
        }else if(scope==='customer'){
          void fetchBootstrap('customer');
        }
      }catch(e){if(active&&generation.current===serial){setUser(null);setToken(null,scope);if(!(e instanceof ApiError&&e.status===401))setError((e as Error).message);}}
      finally{if(active)setReady(true);}
    };
    void restore();return()=>{active=false;onUnauthorized(()=>{},scope);};
  },[attempt,scope]);
  async function signIn(email:string,password:string,name?:string,seller=false) {
    generation.current++;const serial=generation.current;
    const result=await api<{access_token?:string;user:User}>(authEndpoint(Boolean(name),seller),{method:'POST',body:JSON.stringify({email,password,...(name?{name}:{})})},{scope});
    if(serial!==generation.current)return;
    if(!usesBrowserCookies&&!result.access_token)throw new Error('Sign-in could not be completed. Please try again.');
    if(result.access_token&&!usesBrowserCookies)await storeToken(result.access_token,scope);
    setToken(usesBrowserCookies?null:result.access_token!,scope);setUser(result.user);setError('');
  }
  async function signInWithGoogle(payload:{credential:string},seller=false){
    generation.current++;const serial=generation.current;
    const result=await api<{access_token?:string;user:User}>(seller?'/auth/seller/google':'/auth/google',{method:'POST',body:JSON.stringify(payload)},{scope});
    if(serial!==generation.current)return;
    if(!usesBrowserCookies&&!result.access_token)throw new Error('Sign-in could not be completed. Please try again.');
    if(result.access_token&&!usesBrowserCookies)await storeToken(result.access_token,scope);
    setToken(usesBrowserCookies?null:result.access_token!,scope);setUser(result.user);setError('');
  }
  async function signOut(){
    generation.current++;let revocationError:Error|null=null;
    await api('/auth/logout',{method:'POST'},{scope}).catch(e=>{if(!(e instanceof ApiError&&e.status===401))revocationError=e;});
    await removeToken(scope);setToken(null,scope);setUser(null);setError('');
    if(revocationError)throw new Error('Signed out on this device. VISTRAH could not revoke the server session because it was unreachable.');
  }
  async function refresh(){const serial=generation.current;const current=await api<User>('/me',{}, {scope});if(serial===generation.current)setUser(current);}
  return {user,ready,error,signIn,signInWithGoogle,signOut,refresh,retry:()=>{setReady(false);setAttempt(v=>v+1);}};
}
export function useSession(seller?:boolean){const path=usePathname();const customer=useContext(Context),sellerSession=useContext(SellerContext);const value=(seller??sellerScreen(path))?sellerSession:customer;if(!value)throw new Error('Missing SessionProvider');return value;}

