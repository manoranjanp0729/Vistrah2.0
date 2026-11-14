'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {Settings,X} from 'lucide-react';
import {isLocale,languages,translate} from '../../shared/i18n';
import {accentPresets,defaultAccent,themeProperties} from '../../shared/brand-theme';
import {defaultFontChoice,fontChoices,fontPreferenceCookie,fontPreferenceKey,isFontChoice,webFontStack,type FontChoice} from '../../shared/fonts';
import styles from './app-preferences.module.css';

const initial=JSON.stringify({locale:'en',mode:'light',accent:defaultAccent,font:defaultFontChoice});
const event='vistrah:preferences';
function subscribe(listener:()=>void){window.addEventListener('storage',listener);window.addEventListener(event,listener);return()=>{window.removeEventListener('storage',listener);window.removeEventListener(event,listener);};}
function snapshot(){try{return JSON.stringify({locale:localStorage.getItem('vistrah.language')??'en',mode:document.cookie.match(/(?:^|;\s*)vistrah_theme=(dark|light)/)?.[1]??localStorage.getItem('vistrah.theme')??'light',accent:localStorage.getItem('vistrah_accent')??localStorage.getItem('vistrah.theme.accent')??defaultAccent,font:localStorage.getItem(fontPreferenceKey)??document.cookie.match(/(?:^|;\s*)vistrah_font=([^;]+)/)?.[1]??defaultFontChoice});}catch{return initial;}}

function persistPreference(key:'locale'|'mode'|'accent'|'font',value:string){
   const storage={locale:'vistrah.language',mode:'vistrah.theme',accent:'vistrah_accent',font:fontPreferenceKey};
   localStorage.setItem(storage[key],value);
   if(key==='accent')localStorage.setItem('vistrah.theme.accent',value);
   const cookie={locale:'vistrah_language',mode:'vistrah_theme',accent:'vistrah_accent',font:fontPreferenceCookie};
   document.cookie=`${cookie[key]}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
   window.dispatchEvent(new Event(event));
}

/** Public display preferences only; this component does not access admin identity or APIs. */
export function AppPreferences(){
 const saved=JSON.parse(useSyncExternalStore(subscribe,snapshot,()=>initial)) as Record<string,string>;
 const locale=isLocale(saved.locale)?saved.locale:'en',mode=saved.mode==='dark'?'dark':'light';
 const accent=accentPresets.some(item=>item.id===saved.accent)?saved.accent:defaultAccent;
 const font:FontChoice=isFontChoice(saved.font)?saved.font:defaultFontChoice;
 const t=(key:string)=>translate(locale,key);const dialog=useRef<HTMLDialogElement>(null);const [error,setError]=useState('');
 useEffect(()=>{
  const root=document.documentElement;
  root.setAttribute('data-theme',mode);
  root.setAttribute('data-font',font);
  root.setAttribute('data-preferences','true');
  root.style.setProperty('--vistrah-font',webFontStack(font,locale));
  for(const [key,value] of Object.entries(themeProperties(mode,accent)))root.style.setProperty(key,value);
 },[mode,accent,font,locale]);
 function update(key:'locale'|'mode'|'accent'|'font',value:string){
  setError('');try{
   persistPreference(key,value);
  }catch{setError(t(key==='locale'?'settings.saveError':key==='font'?'settings.fontSaveError':'settings.themeSaveError'));}
 }
 return <><button type="button" className={styles.gear} aria-label={t('settings.title')} aria-haspopup="dialog" onClick={()=>dialog.current?.showModal()}><Settings size={21}/></button>
  <dialog ref={dialog} className={styles.dialog} lang={locale} aria-labelledby="admin-preferences-title" onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}>
   <header><h2 id="admin-preferences-title">{t('settings.title')}</h2><button type="button" aria-label={t('settings.close')} onClick={()=>dialog.current?.close()}><X size={20}/></button></header>
   <section><h3>{t('settings.language')}</h3><label><span className={styles.srOnly}>{t('settings.language')}</span><select value={locale} onChange={e=>update('locale',e.target.value)}>{languages.map(item=><option key={item.code} value={item.code}>{item.label}</option>)}</select></label></section>
   <section><h3>{t('settings.font')}</h3><label><span className={styles.srOnly}>{t('settings.font')}</span><select value={font} onChange={e=>update('font',e.target.value)}>{fontChoices.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label></section>
   <section><div className={styles.themeHeading}><h3>{t('settings.themeColor')}</h3><div role="group" aria-label={t('settings.darkTheme')}>{(['light','dark'] as const).map(value=><button type="button" key={value} aria-pressed={mode===value} onClick={()=>update('mode',value)}>{t('settings.'+value)}</button>)}</div></div><label><span className={styles.srOnly}>{t('settings.themeColor')}</span><select value={accent} onChange={e=>update('accent',e.target.value)}>{accentPresets.map(item=><option key={item.id} value={item.id}>{t('settings.theme.'+item.id)}</option>)}</select></label></section>
   {error&&<p role="alert">{error}</p>}
  </dialog>
 </>;
}
