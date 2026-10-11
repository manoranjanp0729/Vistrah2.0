import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {useSession} from './session';
import {api} from './api';
export type Location={label:string;latitude:number;longitude:number;radius:2|5|10|25;postal_code?:string;address?:string;landmark?:string};
const Context=createContext<{location:Location|null;setLocation:(value:Location|null)=>void}|null>(null);
export function LocationProvider({children}:{children:ReactNode}){
 const {user}=useSession();const [location,setValue]=useState<Location|null>(null);const generation=useRef(0);const previous=useRef<number|null>(null);
 const setLocation=useCallback((value:Location|null)=>{generation.current++;setValue(value);},[]);
 useEffect(()=>{let active=true;const id=user?.id??null;if(previous.current!==null&&previous.current!==id)setLocation(null);previous.current=id;const epoch=generation.current;
  if(user)api<{location:{locality:string;latitude:number;longitude:number;postal_code:string;address:string;landmark:string}|null}>('/me/location').then(result=>{if(active&&epoch===generation.current&&result.location){const point=result.location;setValue(value=>value??{...point,label:point.locality,radius:5});}}).catch(()=>{});
  return()=>{active=false;};
 },[user,setLocation]);
 return <Context.Provider value={{location,setLocation}}>{children}</Context.Provider>;
}
export function useLocation(){const value=useContext(Context);if(!value)throw new Error('Missing LocationProvider');return value;}
export function parsePoint(latitude:string,longitude:string){if(!latitude.trim()||!longitude.trim())throw new Error('Enter both latitude and longitude.');const lat=Number(latitude),lon=Number(longitude);if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat > 90||lon < -180||lon > 180)throw new Error('Use latitude -90 to 90 and longitude -180 to 180.');return {latitude:lat,longitude:lon};}
