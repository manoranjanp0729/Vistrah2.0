import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {loadAsync} from 'expo-font';
import {useLanguage} from './language';
import {FontLocaleContext} from './font-context';
import {fontFace,fontPreferenceKey,isFontChoice,type FontChoice} from './font-policy';
import {selectableFontAssets} from './selectable-font-assets';
import {webFontFamily} from './web-fonts';

type Preference={font:FontChoice;activeFont:FontChoice;ready:boolean;error:string;loadError:boolean;setFont:(value:string)=>void;retry:()=>void};
const Context=createContext<Preference>({font:'montserrat',activeFont:'montserrat',ready:false,error:'',loadError:false,setFont:()=>{},retry:()=>{}});

export function FontPreferenceProvider({children}:{children:ReactNode}){
 const {locale}=useLanguage();
 const [font,updateFont]=useState<FontChoice>('montserrat'),[restored,setRestored]=useState(false),[loaded,setLoaded]=useState(false);
 const [storageError,setStorageError]=useState(''),[loadError,setLoadError]=useState(''),[attempt,setAttempt]=useState(0);
 const revision=useRef(0),pending=useRef(Promise.resolve());
 useEffect(()=>{
  let active=true;const initial=revision.current;
  void (async()=>{try{const saved=Platform.OS==='web'?localStorage.getItem(fontPreferenceKey):await SecureStore.getItemAsync(fontPreferenceKey);if(active&&revision.current===initial&&isFontChoice(saved))updateFont(saved);}catch{if(active)setStorageError('settings.fontRestoreError');}finally{if(active)setRestored(true);}})();
  return()=>{active=false;};
 },[]);
 useEffect(()=>{
  let active=true;
  loadAsync(selectableFontAssets).then(()=>{if(active){setLoaded(true);setLoadError('');}}).catch(()=>{if(active)setLoadError('settings.fontLoadError');});
  return()=>{active=false;};
 },[attempt]);
 const activeFont=loaded?font:'montserrat';
 useEffect(()=>{
  if(Platform.OS!=='web')return;
  const root=document.documentElement,previous=root.style.getPropertyValue('--vistrah-font');
  const family=activeFont==='montserrat'||locale!=='en'?webFontFamily:`'${fontFace('en',400,activeFont)}', 'Vistrah Kannada', 'Vistrah Devanagari', sans-serif`;
  if(family)root.style.setProperty('--vistrah-font',family);
  return()=>{if(previous)root.style.setProperty('--vistrah-font',previous);else root.style.removeProperty('--vistrah-font');};
 },[activeFont,locale]);
 function setFont(value:string){
  if(!isFontChoice(value)||!loaded)return;
  const current=++revision.current;updateFont(value);setStorageError('');
  const write=pending.current.then(async()=>{if(Platform.OS==='web')localStorage.setItem(fontPreferenceKey,value);else await SecureStore.setItemAsync(fontPreferenceKey,value);});
  pending.current=write.catch(()=>{if(revision.current===current)setStorageError('settings.fontSaveError');});
 }
 function retry(){setLoadError('');setLoaded(false);setAttempt(value=>value+1);}
 return <Context.Provider value={{font,activeFont,ready:restored&&loaded,error:loadError||storageError,loadError:!!loadError,setFont,retry}}><FontLocaleContext.Provider value={locale}>{children}</FontLocaleContext.Provider></Context.Provider>;
}
export function useFontPreference(){return useContext(Context);}
