'use client';
import {UiSelect,UiButton} from "./localized-ui";
import {useLanguage} from './language-provider';
import {createContext,useId,useContext,useState,useEffect,type ReactNode} from 'react';
import {themeVariables,accentPresets,fontChoices,isFontChoice,defaultFontChoice,webFontStack,type FontChoice} from '@/lib/brand-theme';
import {fontPreferenceCookie,fontPreferenceKey} from '../../shared/fonts';

export type ThemeMode='light'|'dark';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  accent: string;
  setAccent: (accentId: string) => void;
  font: FontChoice;
  setFont: (fontId: string) => void;
}

const Context=createContext<ThemeContextType|null>(null);

export function ThemeProvider({children,initialMode,initialAccent='indigo',initialFont=defaultFontChoice}:{children:ReactNode;initialMode:ThemeMode;initialAccent?:string;initialFont?:FontChoice}){
 const {locale}=useLanguage();
 const [mode,updateMode]=useState<ThemeMode>(initialMode);
 const [accent,updateAccent]=useState<string>(accentPresets.some(p=>p.id===initialAccent)?initialAccent:'indigo');
 const [font,updateFont]=useState<FontChoice>(initialFont);

 useEffect(()=>{
   let resolvedAccent=accent;
   let resolvedFont=font;
   try {
     const accentMatch=document.cookie.match(/(?:^|;\s*)vistrah_accent=([^;]+)/);
     const savedAccent=accentMatch?decodeURIComponent(accentMatch[1]):(localStorage.getItem('vistrah_accent')??localStorage.getItem('vistrah.theme.accent'));
     if(savedAccent&&accentPresets.some(p=>p.id===savedAccent)){
       resolvedAccent=savedAccent;
       updateAccent(savedAccent);
     }
     const fontMatch=document.cookie.match(/(?:^|;\s*)vistrah_font=([^;]+)/);
     const savedFont=fontMatch?decodeURIComponent(fontMatch[1]):localStorage.getItem(fontPreferenceKey);
     if(isFontChoice(savedFont)){
       resolvedFont=savedFont;
       updateFont(savedFont);
     }
   } catch {}
   Object.entries(themeVariables(mode,resolvedAccent,resolvedFont,locale)).forEach(([key,value])=>document.documentElement.style.setProperty(key,String(value)));
 },[mode,locale]);

 function setMode(next:ThemeMode){
   updateMode(next);
   document.documentElement.dataset.theme=next;
   Object.entries(themeVariables(next,accent,font,locale)).forEach(([key,value])=>document.documentElement.style.setProperty(key,String(value)));
   try{localStorage.setItem('vistrah.theme',next);}catch{}
   document.cookie=`vistrah_theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
 }

 function setAccent(next:string){
   if(!accentPresets.some(p=>p.id===next))return;
   updateAccent(next);
   try {
     localStorage.setItem('vistrah_accent',next);
     localStorage.setItem('vistrah.theme.accent',next);
     document.cookie=`vistrah_accent=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
   } catch {}
   Object.entries(themeVariables(mode,next,font,locale)).forEach(([key,value])=>document.documentElement.style.setProperty(key,String(value)));
 }

 function setFont(next:string){
   if(!isFontChoice(next))return;
   updateFont(next);
   try {
     localStorage.setItem(fontPreferenceKey,next);
     document.cookie=`${fontPreferenceCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
   } catch {}
   Object.entries(themeVariables(mode,accent,next,locale)).forEach(([key,value])=>document.documentElement.style.setProperty(key,String(value)));
 }

 return <Context.Provider value={{mode,setMode,accent,setAccent,font,setFont}}>{children}</Context.Provider>;
}

export function useTheme(){
  const theme = useContext(Context);
  if(!theme) throw new Error('Missing ThemeProvider');
  return theme;
}

export function ThemeSettings(){
  const id=useId();const {t,locale}=useLanguage();
  const theme=useContext(Context);
  if(!theme)throw new Error('Missing ThemeProvider');
  return <>
    <section className="panel" aria-labelledby={id+'-font-title'}>
      <h2 id={id+'-font-title'} style={{margin:'0 0 6px'}}>{t('settings.font')}</h2>
      <p id={id+'-font-help'}>{t('settings.fontHelp')}</p>
      <UiSelect aria-label={t('settings.font')} aria-describedby={id+'-font-help'} value={theme.font} onChange={event=>theme.setFont(event.target.value)} style={{minHeight:44,width:'100%',minWidth:0,padding:'10px 12px',borderRadius:'var(--radius-control, 8px)',border:'1px solid var(--border)',background:'var(--bg-surface)',color:'var(--text-primary)',fontFamily:webFontStack(theme.font,locale)}}>
        {fontChoices.map(choice=><option key={choice.id} value={choice.id} style={{fontFamily:webFontStack(choice.id,'en')}}>{choice.label}</option>)}
      </UiSelect>
      <p style={{margin:'8px 0 0',fontSize:15,lineHeight:1.5,color:'var(--text-primary)',fontFamily:webFontStack(theme.font,locale)}}>{t('settings.fontPreview')}</p>
      {locale!=='en'&&<p style={{margin:'4px 0 0'}}>{t('settings.fontLanguageHelp')}</p>}
    </section>

    <section className="panel" aria-labelledby={id+'-title'}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:8}}>
        <h2 id={id+'-title'} style={{margin:0,flex:1,minWidth:0}}>{t('settings.themeColor')}</h2>
        <div role="group" aria-label={t('settings.darkTheme')} style={{display:'flex',flexShrink:0,padding:2,borderRadius:'var(--radius-control, 8px)',border:'1px solid var(--border)',background:'var(--bg-elevated)'}}>
          {(['light','dark'] as const).map(mode=><UiButton key={mode} type="button" aria-pressed={theme.mode===mode} onClick={()=>theme.setMode(mode)} style={{minHeight:28,padding:'3px 10px',lineHeight:'20px',border:0,borderRadius:6,cursor:'pointer',font:'inherit',fontSize:12,fontWeight:theme.mode===mode?700:500,background:theme.mode===mode?'var(--interactive-accent)':'transparent',color:theme.mode===mode?'var(--interactive-ink)':'var(--text-secondary)'}}>{t('settings.'+mode)}</UiButton>)}
        </div>
      </div>
      <p id={id+'-help'}>{t('settings.themeColorHelp')}</p>
      <div style={{display:'flex',alignItems:'center',gap:12,maxWidth:400}}>
        <span aria-hidden="true" style={{width:22,height:22,borderRadius:'var(--radius-pill, 9999px)',flexShrink:0,backgroundColor:accentPresets.find(preset=>preset.id===theme.accent)?.[theme.mode],border:'1px solid var(--border)'}}/>
        <UiSelect aria-label={t('settings.themeColor')} aria-describedby={id+'-help'} value={theme.accent} onChange={event=>theme.setAccent(event.target.value)} style={{minHeight:44,width:'100%',minWidth:0,padding:'10px 12px',borderRadius:'var(--radius-control, 8px)',border:'1px solid var(--border)',background:'var(--bg-surface)',color:'var(--text-primary)',font:'inherit'}}>
          {accentPresets.map(preset=><option key={preset.id} value={preset.id}>{t('settings.theme.'+preset.id,{},preset.label)}</option>)}
        </UiSelect>
      </div>
    </section>
  </>;
}
