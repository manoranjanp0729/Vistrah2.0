import {languageStorageKey} from '../../shared/i18n';

// Primitive snapshots remain stable between external storage changes.
export function readLanguagePreference(){
 try{return localStorage.getItem(languageStorageKey)??'';}
 catch{return '!restore-error';}
}

export function subscribeLanguagePreference(notify:()=>void){
 const changed=(event:StorageEvent)=>{if(event.key===null||event.key===languageStorageKey)notify();};
 window.addEventListener('storage',changed);
 return ()=>window.removeEventListener('storage',changed);
}
