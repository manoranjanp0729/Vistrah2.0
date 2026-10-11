import {createContext,useContext,useState,type ReactNode} from 'react';
export type Location={label:string;latitude:number;longitude:number;radius:2|5|10|25};
const Context=createContext<{location:Location|null;setLocation:(value:Location|null)=>void}|null>(null);
export function LocationProvider({children}:{children:ReactNode}){const [location,setLocation]=useState<Location|null>(null);return <Context.Provider value={{location,setLocation}}>{children}</Context.Provider>;}
export function useLocation(){const value=useContext(Context);if(!value)throw new Error('Missing LocationProvider');return value;}
export function parsePoint(latitude:string,longitude:string){
  if(!latitude.trim()||!longitude.trim())throw new Error('Enter both latitude and longitude.');
  const lat=Number(latitude),lon=Number(longitude);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat > 90||lon < -180||lon > 180)throw new Error('Use latitude -90 to 90 and longitude -180 to 180.');
  return {latitude:lat,longitude:lon};
}
