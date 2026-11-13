import {createContext,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {displayLabel,isLocale,languageStorageKey,localizedCopy,translate,type Locale,type Parameters} from '../../../shared/i18n';
type Language={locale:Locale;ready:boolean;error:string;setLocale:(locale:Locale)=>void;t:(key:string,parameters?:Parameters,fallback?:string)=>string;label:(id:string,fallback:string)=>string;copy:ReturnType<typeof localizedCopy>};
const Context=createContext<Language|null>(null);
export function LanguageProvider({children}:{children:ReactNode}){
 const [locale,updateLocale]=useState<Locale>('en'),[ready,setReady]=useState(false),[error,setError]=useState('');
 const pending=useRef(Promise.resolve()),revision=useRef(0);
 useEffect(()=>{let active=true;const initial=revision.current;void (async()=>{try{const saved=Platform.OS==='web'?localStorage.getItem(languageStorageKey):await SecureStore.getItemAsync(languageStorageKey);if(active&&revision.current===initial&&isLocale(saved))updateLocale(saved);}catch{if(active)setError('settings.restoreError');}finally{if(active)setReady(true);}})();return()=>{active=false;};},[]);
 function setLocale(next:Locale){if(!isLocale(next))return;revision.current++;updateLocale(next);setError('');const current=revision.current;const write=pending.current.then(async()=>{if(Platform.OS==='web')localStorage.setItem(languageStorageKey,next);else await SecureStore.setItemAsync(languageStorageKey,next);});pending.current=write.catch(()=>{if(revision.current===current)setError('settings.saveError');});}
 const value=useMemo(()=>({locale,ready,error,setLocale,t:(key:string,parameters?:Parameters,fallback?:string)=>translate(locale,key,parameters,fallback),label:(id:string,fallback:string)=>displayLabel(locale,id,fallback),copy:localizedCopy(locale)}),[locale,ready,error]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLanguage(){const value=useContext(Context);if(!value)throw new Error('Missing LanguageProvider');return value;}
