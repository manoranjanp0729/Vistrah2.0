'use client';
import {UiSelect,UiButton} from "./localized-ui";
import {useLanguage} from './language-provider';
import {createContext,useId,useContext,useState,useEffect,type ReactNode} from 'react';
import {themeVariables,accentPresets} from '@/lib/brand-theme';

export type ThemeMode='light'|'dark';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  accent: string;
  setAccent: (accentId: string) => void;
}

const Context=createContext<ThemeContextType|null>(null);

export function ThemeProvider({children,initialMode}:{children:ReactNode;initialMode:ThemeMode}){
 const [mode,updateMode]=useState<ThemeMode>(initialMode);
 const [accent,updateAccent]=useState<string>('indigo');

 useEffect(()=>{
   try {
     const match = document.cookie.match(/(?:^|;\s*)vistrah_accent=([^;]+)/);
     const savedAccent = match ? decodeURIComponent(match[1]) : localStorage.getItem('vistrah_accent');
     if(savedAccent && accentPresets.some(p => p.id === savedAccent)){
       updateAccent(savedAccent);
       Object.entries(themeVariables(mode, savedAccent)).forEach(([key,value])=>document.documentElement.style.setProperty(key,String(value)));
     }
   } catch {}
 },[mode]);

 function setMode(next:ThemeMode){
   updateMode(next);
   document.documentElement.dataset.theme=next;
   Object.entries(themeVariables(next, accent)).forEach(([key,value])=>document.documentElement.style.setProperty(key,String(value)));
   document.cookie=`vistrah_theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
 }

 function setAccent(next:string){
   if(!accentPresets.some(p=>p.id===next))return;
   updateAccent(next);
   try {
     localStorage.setItem('vistrah_accent', next);
     document.cookie=`vistrah_accent=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
   } catch {}
   Object.entries(themeVariables(mode, next)).forEach(([key,value])=>document.documentElement.style.setProperty(key,String(value)));
 }

 return <Context.Provider value={{mode,setMode,accent,setAccent}}>{children}</Context.Provider>;
}

export function useTheme(){
  const theme = useContext(Context);
  if(!theme) throw new Error('Missing ThemeProvider');
  return theme;
}

export function ThemeSettings(){
  const id=useId();const {t}=useLanguage();
  const theme=useContext(Context);
  if(!theme)throw new Error('Missing ThemeProvider');
  return <>
    {/* 5 Theme Colours Selection (From Blue to Pink) */}
    <section className="panel" aria-labelledby={id+'-title'}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:8}}>
        <h2 id={id+'-title'} style={{margin:0,flex:1,minWidth:0}}>{t('settings.themeColor')}</h2>
        <div role="group" aria-label={t('settings.darkTheme')} style={{display:'flex',flexShrink:0,padding:2,borderRadius:11,border:'1px solid var(--border)',background:'var(--surface-soft)'}}>
          {(['light','dark'] as const).map(mode=><UiButton key={mode} type="button" aria-pressed={theme.mode===mode} onClick={()=>theme.setMode(mode)} style={{minHeight:28,padding:'3px 10px',lineHeight:'20px',border:0,borderRadius:7,cursor:'pointer',font:'inherit',fontSize:12,fontWeight:theme.mode===mode?700:500,background:theme.mode===mode?'var(--surface)':'transparent',color:theme.mode===mode?'var(--text-primary)':'var(--text-muted)',boxShadow:theme.mode===mode?'0 1px 3px rgba(0,0,0,0.12)':'none'}}>{t('settings.'+mode)}</UiButton>)}
        </div>
      </div>
      <p id={id+'-help'}>{t('settings.themeColorHelp')}</p>
      <div style={{display:'flex',alignItems:'center',gap:12,maxWidth:400}}>
        <span aria-hidden="true" style={{width:22,height:22,borderRadius:'50%',flexShrink:0,backgroundColor:accentPresets.find(preset=>preset.id===theme.accent)?.[theme.mode],border:'1px solid var(--border)'}}/>
        <UiSelect  aria-label={t('settings.themeColor')} aria-describedby={id+'-help'} value={theme.accent} onChange={event=>theme.setAccent(event.target.value)} style={{minHeight:44,width:'100%',minWidth:0,padding:'10px 12px',borderRadius:12,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--text-primary)',font:'inherit'}}>
          {accentPresets.map(preset=><option key={preset.id} value={preset.id}>{t('settings.theme.'+preset.id,{},preset.label)}</option>)}
        </UiSelect>
      </div>
    </section>

  </>;
}
