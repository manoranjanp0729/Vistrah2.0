'use client';
import {createContext,useContext,useState,type ReactNode} from 'react';
export type ThemeMode='light'|'dark';
const Context=createContext<{mode:ThemeMode;setMode:(mode:ThemeMode)=>void}|null>(null);
export function ThemeProvider({children,initialMode}:{children:ReactNode;initialMode:ThemeMode}){
 const [mode,updateMode]=useState(initialMode);
 function setMode(next:ThemeMode){updateMode(next);document.documentElement.dataset.theme=next;document.cookie=`vistrah_theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;}
 return <Context.Provider value={{mode,setMode}}>{children}</Context.Provider>;
}
export function ThemeSettings(){const theme=useContext(Context);if(!theme)throw new Error('Missing ThemeProvider');return <section className="panel theme-settings"><div><h2>Dark theme</h2><p>{theme.mode==='dark'?'Dark':'Light'}</p></div><button type="button" role="switch" aria-label="Dark theme" aria-checked={theme.mode==='dark'} className="theme-switch" onClick={()=>theme.setMode(theme.mode==='dark'?'light':'dark')}><span/></button></section>;}
