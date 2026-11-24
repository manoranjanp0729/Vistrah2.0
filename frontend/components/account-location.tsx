'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronDown,MapPin,X} from 'lucide-react';
import {LocationChooser,useOptionalCustomerLocation} from './customer-location';
import {useLanguage} from './language-provider';

export function AccountLocation({compactHeader=false}:{compactHeader?:boolean}){
  const {t}=useLanguage();
  const loc=useOptionalCustomerLocation();
  const active=loc?.active??null;
  const detecting=loc?.detecting??false;
  const [open,setOpen]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);

  useEffect(()=>{
    const element=dialog.current;
    if(open&&element&&!element.open)element.showModal();
    return()=>{if(element?.open)element.close();};
  },[open]);

  if(!loc)return null;

  const pillText=active?.locality||(detecting?'Locating…':'Select Location');

  return (
    <>
      <button
        type="button"
        onClick={()=>setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Location: ${pillText}`}
        style={
          compactHeader
            ? {
                display:'inline-flex',
                alignItems:'center',
                gap:6,
                minHeight:36,
                maxWidth:210,
                padding:'6px 12px',
                borderRadius:999,
                border:'1px solid var(--hairline, var(--border, #cbd5e1))',
                background:'var(--surface, #ffffff)',
                color:'var(--text-primary, #0f172a)',
                fontSize:13,
                fontWeight:600,
                cursor:'pointer',
                whiteSpace:'nowrap',
              }
            : undefined
        }
      >
        <MapPin size={15} style={{flexShrink:0,color:'#F97316'}} aria-hidden="true"/>
        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{pillText}</span>
        <ChevronDown size={14} style={{flexShrink:0,opacity:0.65}} aria-hidden="true"/>
      </button>

      {open&&(
        <dialog
          ref={dialog}
          aria-label="Select Location"
          className="replica-location-dialog"
          style={{maxWidth:740,width:'min(94vw, 740px)',padding:18,borderRadius:18,border:'1px solid var(--hairline, var(--border))'}}
          onCancel={()=>setOpen(false)}
          onClick={e=>{if(e.target===e.currentTarget)setOpen(false);}}
        >
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:10}}>
            <h2 style={{margin:0,fontSize:18,fontWeight:600}}>{t('navigation.nearby')}</h2>
            <button type="button" className="icon-button" aria-label={t('navigation.closeLocation')} onClick={()=>setOpen(false)}>
              <X size={20}/>
            </button>
          </div>
          <LocationChooser expanded onCommitted={()=>setOpen(false)}/>
        </dialog>
      )}
    </>
  );
}
