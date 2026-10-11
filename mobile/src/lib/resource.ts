import {useCallback,useState} from 'react';
import {useFocusEffect} from 'expo-router';
import {api} from './api';
export function useResource<T>(path:string|null,identity:number|null=null) {
  const [version,setVersion]=useState(0);
  const [result,setResult]=useState<{key:string;data?:T;error?:Error}>({key:''});
  const key=path+'|'+identity+'|'+version;
  useFocusEffect(useCallback(()=>{
    let active=true;
    if(path)api<T>(path).then(data=>{if(active)setResult({key,data});}).catch(error=>{if(active)setResult({key,error});});
    return()=>{active=false;};
  },[path,key]));
  return {data:result.key===key?result.data:undefined,error:result.key===key?result.error:undefined,
    loading:!!path&&(result.key!==key||(!result.data&&!result.error)),retry:()=>setVersion(v=>v+1)};
}
