'use client';
import {useEffect,useRef,useState} from 'react';
import {MapPin,X} from 'lucide-react';
import {LocationChooser,useCustomerLocation} from './customer-location';
import {useLanguage} from './language-provider';

export function AccountLocation(){
 const {copy,t}=useLanguage();const {active}=useCustomerLocation();
 const [open,setOpen]=useState(false);const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const element=dialog.current;if(open)element?.showModal();return()=>element?.close();},[open]);
 return <><button type="button" onClick={()=>setOpen(true)} aria-haspopup="dialog"><MapPin size={18}/><span>{copy.nav.location}{active?`: ${active.locality}`:''}</span></button>
 {open&&<dialog ref={dialog} aria-label={copy.nav.location} className="replica-location-dialog" onCancel={()=>setOpen(false)}><button type="button" className="icon-button" aria-label={t('navigation.closeLocation')} onClick={()=>setOpen(false)}><X/></button><h2>{t('navigation.nearby')}</h2><LocationChooser expanded/></dialog>}</>;
}
