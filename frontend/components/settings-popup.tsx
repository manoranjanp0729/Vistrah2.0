'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {Settings,X} from 'lucide-react';
import {LanguageSettings,useLanguage} from './language-provider';
import {ThemeSettings} from './theme-provider';
import styles from './settings-popup.module.css';

export function SettingsPopup(){
 const {t}=useLanguage();const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);const id=useId();const [open,setOpen]=useState(false);
 useEffect(()=>{if(!open)return;const node=dialog.current,button=trigger.current;node?.showModal();return()=>{node?.close();button?.focus();};},[open]);
 return <><button ref={trigger} type="button" className={styles.trigger} aria-label={t('settings.title')} aria-haspopup="dialog" onClick={()=>setOpen(true)}><Settings size={22} aria-hidden="true"/></button>
 {open&&<dialog ref={dialog} className={styles.dialog} aria-labelledby={id} onCancel={()=>setOpen(false)} onClick={event=>{if(event.target===event.currentTarget)setOpen(false);}}>
  <div className={styles.card}>
   <div className={styles.header}><div><span>VISTRAH</span><h2 id={id}>{t('settings.title')}</h2></div><button type="button" aria-label={t('settings.close')} onClick={()=>setOpen(false)}><X size={22}/></button></div>
   <div className={styles.body}><LanguageSettings/><ThemeSettings/></div>
  </div>
 </dialog>}</>;
}
