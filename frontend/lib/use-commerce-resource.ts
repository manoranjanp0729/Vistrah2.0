'use client';
import {useEffect,useState} from 'react';
import {api} from './api';
export function useCommerceResource<T>(path:string){
 const [version,setVersion]=useState(0),[result,setResult]=useState<{key:string;data?:T;error?:Error}>({key:''});const key=path+'|'+version;
 useEffect(()=>{let active=true;api<T>(path).then(data=>{if(active)setResult({key,data});}).catch(error=>{if(active)setResult({key,error});});return()=>{active=false;};},[path,key]);
 useEffect(()=>{const refresh=()=>setVersion(v=>v+1);window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh);},[]);
 return {data:result.key===key?result.data:undefined,error:result.key===key?result.error:undefined,loading:result.key!==key,retry:()=>setVersion(v=>v+1)};
}
