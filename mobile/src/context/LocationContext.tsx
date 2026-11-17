import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {Platform} from 'react-native';
import * as GPS from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import {useSession} from '../lib/session';
import {api} from '../lib/api';
import {isValidCoordinatePair,type SelectedLocation} from '../../../shared/selected-location';

export const LOCATION_STORAGE_KEY='vistrah.selected_location.v1';

export type Location={
  label:string;
  latitude:number;
  longitude:number;
  radius:2|5|10|25;
  postal_code?:string;
  address?:string;
  landmark?:string;
  city?:string;
  state?:string;
  source?:'google'|'gps'|'preset'|'manual';
};

type LocationContextValue={
  selectedLocation:SelectedLocation|null;
  location:Location|null;
  detecting:boolean;
  hydrated:boolean;
  locationRevision:number;
  commitSelectedLocation:(value:SelectedLocation)=>void;
  clearSelectedLocation:()=>void;
  setLocation:(value:Location|null)=>void;
};

const storage={
  async getItem(key:string):Promise<string|null>{
    try{
      if(Platform.OS==='web'){
        return typeof window!=='undefined'&&window.localStorage?window.localStorage.getItem(key):null;
      }
      return await SecureStore.getItemAsync(key);
    }catch{
      return null;
    }
  },
  async setItem(key:string,val:string):Promise<void>{
    try{
      if(Platform.OS==='web'){
        if(typeof window!=='undefined'&&window.localStorage)window.localStorage.setItem(key,val);
        return;
      }
      await SecureStore.setItemAsync(key,val);
    }catch{
      // Non-blocking storage failure.
    }
  },
  async removeItem(key:string):Promise<void>{
    try{
      if(Platform.OS==='web'){
        if(typeof window!=='undefined'&&window.localStorage)window.localStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    }catch{
      // Non-blocking storage failure.
    }
  },
};

function clampCustomerRadius(r:number|undefined):2|5|10|25{
  if(r===2||r===5||r===10||r===25)return r;
  if(typeof r==='number'&&r<=3)return 2;
  if(typeof r==='number'&&r<=7)return 5;
  if(typeof r==='number'&&r<=18)return 10;
  return 25;
}

export function selectedToLegacyLocation(sel:SelectedLocation|null):Location|null{
  if(!sel||!isValidCoordinatePair(sel.latitude,sel.longitude))return null;
  return {
    label:sel.locality||sel.city||`${sel.latitude.toFixed(3)}° N, ${sel.longitude.toFixed(3)}° E`,
    latitude:sel.latitude,
    longitude:sel.longitude,
    radius:clampCustomerRadius(sel.radiusKm),
    postal_code:sel.pincode||'',
    address:sel.formattedAddress||'',
    landmark:sel.landmark||'',
    city:sel.city||'',
    state:sel.state||'',
    source:sel.source,
  };
}

export function legacyToSelectedLocation(loc:Location):SelectedLocation{
  return {
    latitude:loc.latitude,
    longitude:loc.longitude,
    formattedAddress:loc.address||loc.label,
    locality:loc.label,
    city:loc.city||loc.label.split(',').pop()?.trim()||'',
    state:loc.state||'Karnataka',
    pincode:loc.postal_code||'',
    landmark:loc.landmark||'',
    radiusKm:loc.radius,
    source:loc.source??'manual',
  };
}

function parseStoredLocation(raw:string|null):SelectedLocation|null{
  if(!raw)return null;
  try{
    const parsed=JSON.parse(raw) as Partial<SelectedLocation>;
    if(typeof parsed.latitude!=='number'||typeof parsed.longitude!=='number')return null;
    if(!isValidCoordinatePair(parsed.latitude,parsed.longitude))return null;
    const locality=String(parsed.locality||parsed.city||'').trim();
    if(!locality)return null;
    return {
      latitude:parsed.latitude,
      longitude:parsed.longitude,
      formattedAddress:String(parsed.formattedAddress||locality),
      locality,
      city:String(parsed.city||''),
      state:String(parsed.state||'Karnataka'),
      pincode:String(parsed.pincode||''),
      landmark:String(parsed.landmark||''),
      radiusKm:typeof parsed.radiusKm==='number'&&parsed.radiusKm>0?parsed.radiusKm:5,
      source:parsed.source,
    };
  }catch{
    return null;
  }
}

async function detectForegroundCoordinates8s():Promise<{latitude:number;longitude:number}|null>{
  if(Platform.OS==='web'&&typeof navigator!=='undefined'&&navigator.geolocation){
    return new Promise(resolve=>{
      let settled=false;
      const timer=setTimeout(()=>{
        if(!settled){settled=true;resolve(null);}
      },8000);
      navigator.geolocation.getCurrentPosition(
        pos=>{
          if(settled)return;
          settled=true;
          clearTimeout(timer);
          const lat=pos.coords.latitude;
          const lon=pos.coords.longitude;
          resolve(isValidCoordinatePair(lat,lon)?{latitude:Number(lat.toFixed(6)),longitude:Number(lon.toFixed(6))}:null);
        },
        ()=>{
          if(!settled){settled=true;clearTimeout(timer);resolve(null);}
        },
        {enableHighAccuracy:false,timeout:8000,maximumAge:60000},
      );
    });
  }

  try{
    const perm=await GPS.requestForegroundPermissionsAsync();
    if(perm.status!=='granted')return null;
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{
      const pos=await Promise.race([
        GPS.getCurrentPositionAsync({accuracy:GPS.Accuracy.Balanced}),
        new Promise<null>(resolve=>{
          timer=setTimeout(()=>resolve(null),8000);
        }),
      ]);
      if(!pos)return null;
      const lat=pos.coords.latitude;
      const lon=pos.coords.longitude;
      return isValidCoordinatePair(lat,lon)?{latitude:Number(lat.toFixed(6)),longitude:Number(lon.toFixed(6))}:null;
    }finally{
      if(timer)clearTimeout(timer);
    }
  }catch{
    return null;
  }
}

async function reverseGeocodeWithOfflineFallback(lat:number,lon:number):Promise<SelectedLocation>{
  const coordLabel=`${lat.toFixed(3)}° N, ${lon.toFixed(3)}° E`;
  try{
    const res=await api<{formatted_address:string;locality:string;city:string;state:string;postal_code:string;latitude:number;longitude:number}>(
      `/maps/reverse-geocode?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lon))}`,
    );
    const locality=(res.locality||res.city||coordLabel).trim();
    return {
      latitude:lat,
      longitude:lon,
      formattedAddress:res.formatted_address||locality,
      locality,
      city:res.city||'',
      state:res.state||'Karnataka',
      pincode:res.postal_code||'',
      landmark:'',
      radiusKm:5,
      source:'gps',
    };
  }catch{
    return {
      latitude:lat,
      longitude:lon,
      formattedAddress:coordLabel,
      locality:coordLabel,
      city:'',
      state:'',
      pincode:'',
      landmark:'',
      radiusKm:5,
      source:'gps',
    };
  }
}

const Context=createContext<LocationContextValue|null>(null);

export function LocationProvider({children}:{children:ReactNode}){
  const {user}=useSession(false);
  const [selectedLocation,setSelectedState]=useState<SelectedLocation|null>(null);
  const [hydrated,setHydrated]=useState(false);
  const [detecting,setDetecting]=useState(false);
  const [locationRevision,setLocationRevision]=useState(0);

  const generationRef=useRef(0);
  const autoDetectRanRef=useRef(false);
  const previousUserIdRef=useRef<number|null|undefined>(undefined);

  const commitSelectedLocation=useCallback((next:SelectedLocation)=>{
    generationRef.current++;
    setSelectedState(next);
    setLocationRevision(r=>r+1);
    void storage.setItem(LOCATION_STORAGE_KEY,JSON.stringify(next));
  },[]);

  const clearSelectedLocation=useCallback(()=>{
    generationRef.current++;
    setSelectedState(null);
    setLocationRevision(r=>r+1);
    void storage.removeItem(LOCATION_STORAGE_KEY);
  },[]);

  const setLocation=useCallback((next:Location|null)=>{
    if(next===null){
      clearSelectedLocation();
    }else{
      commitSelectedLocation(legacyToSelectedLocation(next));
    }
  },[clearSelectedLocation,commitSelectedLocation]);

  // Initial hydration from persistent storage + graceful non-blocking auto-detect when empty
  useEffect(()=>{
    let alive=true;
    const bootEpoch=generationRef.current;

    void (async()=>{
      const raw=await storage.getItem(LOCATION_STORAGE_KEY);
      const stored=parseStoredLocation(raw);
      if(!alive)return;

      if(stored&&generationRef.current===bootEpoch){
        setSelectedState(stored);
        setHydrated(true);
        return;
      }

      setHydrated(true);

      if(autoDetectRanRef.current||generationRef.current!==bootEpoch)return;
      autoDetectRanRef.current=true;
      setDetecting(true);
      try{
        const coords=await detectForegroundCoordinates8s();
        if(!alive||!coords||generationRef.current!==bootEpoch)return;
        const resolved=await reverseGeocodeWithOfflineFallback(coords.latitude,coords.longitude);
        if(!alive||generationRef.current!==bootEpoch)return;
        setSelectedState(resolved);
        setLocationRevision(r=>r+1);
        await storage.setItem(LOCATION_STORAGE_KEY,JSON.stringify(resolved));
      }catch{
        // Fail silently; header shows "Select Location".
      }finally{
        if(alive)setDetecting(false);
      }
    })();

    return()=>{alive=false;};
  },[]);

  // Sync account-level saved location if signed in and no local selection was made yet
  useEffect(()=>{
    let active=true;
    const id=user?.id??null;
    if(previousUserIdRef.current!==undefined&&previousUserIdRef.current!==null&&previousUserIdRef.current!==id){
      // Account switched or signed out: clear previous account's private location
      clearSelectedLocation();
    }
    previousUserIdRef.current=id;

    const epoch=generationRef.current;
    if(user){
      api<{location:{locality:string;latitude:number;longitude:number;postal_code:string;address:string;landmark:string}|null}>('/me/location')
        .then(result=>{
          if(!active||epoch!==generationRef.current||!result.location)return;
          const pt=result.location;
          if(!isValidCoordinatePair(pt.latitude,pt.longitude))return;
          setSelectedState(prev=>{
            if(prev)return prev;
            const synced:SelectedLocation={
              latitude:pt.latitude,
              longitude:pt.longitude,
              formattedAddress:pt.address||pt.locality,
              locality:pt.locality,
              city:pt.locality.split(',').pop()?.trim()||'',
              state:'Karnataka',
              pincode:pt.postal_code||'',
              landmark:pt.landmark||'',
              radiusKm:5,
              source:'manual',
            };
            void storage.setItem(LOCATION_STORAGE_KEY,JSON.stringify(synced));
            return synced;
          });
        })
        .catch(()=>{});
    }
    return()=>{active=false;};
  },[user,clearSelectedLocation]);

  const legacyLocation=useMemo(()=>selectedToLegacyLocation(selectedLocation),[selectedLocation]);

  const ctxValue=useMemo<LocationContextValue>(()=>({
    selectedLocation,
    location:legacyLocation,
    detecting,
    hydrated,
    locationRevision,
    commitSelectedLocation,
    clearSelectedLocation,
    setLocation,
  }),[selectedLocation,legacyLocation,detecting,hydrated,locationRevision,commitSelectedLocation,clearSelectedLocation,setLocation]);

  return <Context.Provider value={ctxValue}>{children}</Context.Provider>;
}

export function useLocation(){
  const value=useContext(Context);
  if(!value)throw new Error('Missing LocationProvider');
  return value;
}

export function useOptionalLocation(){
  return useContext(Context);
}

export function parsePoint(latitude:string,longitude:string){
  if(!latitude.trim()||!longitude.trim())throw new Error('Enter both latitude and longitude.');
  const lat=Number(latitude),lon=Number(longitude);
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat > 90||lon < -180||lon > 180){
    throw new Error('Use latitude -90 to 90 and longitude -180 to 180.');
  }
  return {latitude:lat,longitude:lon};
}
