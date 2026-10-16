'use client';
import {createContext,useContext,useEffect,useMemo,useState,type ReactNode,type ComponentProps} from 'react';
import {displayLabel,isLocale,languages,languageStorageKey,localizedCopy,translate,type Locale,type Parameters} from '../../shared/i18n';
type Language={locale:Locale;ready:boolean;error:string;setLocale:(locale:Locale)=>void;t:(key:string,parameters?:Parameters,fallback?:string)=>string;label:(id:string,fallback:string)=>string;copy:ReturnType<typeof localizedCopy>};
const Context=createContext<Language|null>(null);
export function LanguageProvider({children,initialLocale='en'}:{children:ReactNode;initialLocale?:Locale}){
 const [locale,updateLocale]=useState<Locale>(initialLocale),[ready,setReady]=useState(false),[error,setError]=useState('');
 useEffect(()=>{try{const saved=localStorage.getItem(languageStorageKey);if(isLocale(saved))updateLocale(saved);}catch{setError('settings.restoreError');}finally{setReady(true);}},[]);
 useEffect(()=>{document.documentElement.lang=locale;},[locale]);
 function setLocale(next:Locale){if(!isLocale(next))return;updateLocale(next);setError('');try{localStorage.setItem(languageStorageKey,next);document.cookie=`vistrah_language=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;}catch{setError('settings.saveError');}}
 const value=useMemo(()=>({locale,ready,error,setLocale,t:(key:string,parameters?:Parameters,fallback?:string)=>translate(locale,key,parameters,fallback),label:(id:string,fallback:string)=>displayLabel(locale,id,fallback),copy:localizedCopy(locale)}),[locale,ready,error]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLanguage(){const value=useContext(Context);if(!value)throw new Error('Missing LanguageProvider');return value;}
export function T({id,parameters,fallback}:{id:string;parameters?:Parameters;fallback?:string}){const {t}=useLanguage();return <>{t(id,parameters,fallback)}</>;}
export function LanguageSettings(){const {locale,setLocale,ready,error,t}=useLanguage();return <section className="panel" aria-labelledby="app-language-title"><h2 id="app-language-title">{t('settings.language')}</h2><p>{t('settings.languageHelp')}</p><div role="group" aria-label={t('settings.language')} style={{display:'flex',flexWrap:'wrap',gap:8}}>{languages.map(language=><button type="button" key={language.code} lang={language.code} aria-pressed={locale===language.code} disabled={!ready} className={`button${locale===language.code?'':' secondary'}`} style={{minHeight:44,whiteSpace:'normal'}} onClick={()=>setLocale(language.code)}>{language.label}</button>)}</div>{error&&<p role="alert">{t(error)}</p>}</section>;}
export function LocalizedSearchInput(props:ComponentProps<'input'>){const {t}=useLanguage();return <input {...props} aria-label={t('home.search.service')} placeholder={t('home.search.service')}/>;}
