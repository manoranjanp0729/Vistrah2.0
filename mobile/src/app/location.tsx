import {Text} from '../components/typography';
import {UiText,UiElement} from "../components/localized-ui";
import {useState,useRef,useEffect} from 'react';
import {View} from 'react-native';
import * as GPS from 'expo-location';
import {LocationPreview,mapHeaders,maptilerKey} from '../components/location-preview';
import {reversePlace} from '../lib/maptiler';
import {Page,Action,Field,ErrorPanel} from '../components/ui';
import {parsePoint,useLocation,type Location} from '../lib/location';
import {api} from '../lib/api';
import {useTheme} from '../lib/theme';
export default function ChooseLocation(){const {styles}=useTheme();
  const {location,setLocation}=useLocation();const [label,setLabel]=useState(location?.label??'');const [lat,setLat]=useState(location?String(location.latitude):'');const [lon,setLon]=useState(location?String(location.longitude):'');const [radius,setRadius]=useState<Location['radius']>(location?.radius??5);const [pin,setPin]=useState(location?.postal_code??'');const [address,setAddress]=useState(location?.address??'');const [landmark,setLandmark]=useState(location?.landmark??'');const [message,setMessage]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const generation=useRef(0);
  useEffect(()=>()=>{generation.current++;},[]);
  async function gps(){
    const epoch=++generation.current;
    setBusy(true);setError('');setMessage('');
    try{const permission=await GPS.requestForegroundPermissionsAsync();if(epoch!==generation.current)return;if(permission.status!=='granted')throw new Error('Location permission denied. Enter coordinates manually below.');
      let timer:ReturnType<typeof setTimeout>|undefined;
      try{const result=await Promise.race([GPS.getCurrentPositionAsync({accuracy:GPS.Accuracy.Balanced}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Location timed out. Enter coordinates manually.')),15000);})]);
        if(epoch!==generation.current)return;
        const point={latitude:result.coords.latitude,longitude:result.coords.longitude};setLat(String(point.latitude));setLon(String(point.longitude));setLabel('');setPin('');setAddress('');setLandmark('');setLocation(null);
        const place=await reversePlace(point,maptilerKey,mapHeaders);if(epoch!==generation.current)return;setLabel(place.label);setPin(place.postal_code);setLocation({...point,label:place.label,postal_code:place.postal_code,radius});setMessage('Using '+place.label+' temporarily. GPS accuracy: approximately '+Math.round(result.coords.accuracy??0)+' metres. Save this location only if you want it remembered.');
      }finally{if(timer)clearTimeout(timer);}
    }catch(e){if(epoch===generation.current)setError((e as Error).message);}finally{if(epoch===generation.current)setBusy(false);}
  }
  function save(){try{const point=parsePoint(lat,lon);if(label.trim().length<2)throw new Error('Enter a location label.');if(pin&&!/^[0-9]{6}$/.test(pin))throw new Error('Enter a six-digit PIN code.');setLocation({...point,label:label.trim(),radius,postal_code:pin,address,landmark});setMessage('Location is temporary unless you choose Save this location.');}catch(e){setError((e as Error).message);}}
  async function persist(){if(!location)return;setBusy(true);setError('');try{await api('/me/location',{method:'PUT',body:JSON.stringify({locality:location.label,latitude:location.latitude,longitude:location.longitude,postal_code:location.postal_code??'',address:location.address??'',landmark:location.landmark??''})});setMessage('Location saved to your account. You can change it or clear it.');}catch(e){setError('Saving is unavailable. Your selection remains temporary. '+(e as Error).message);}finally{setBusy(false);}}
  async function clear(){generation.current++;setLocation(null);setBusy(true);setError('');setLabel('');setLat('');setLon('');setPin('');setAddress('');setLandmark('');try{await api('/me/location',{method:'DELETE'});setMessage('Saved and temporary locations cleared. Past enquiry addresses are retained.');}catch(e){setError('Temporary location cleared. Saved location could not be cleared; retry Clear location. '+(e as Error).message);}finally{setBusy(false);}}
  return <UiElement as={Page} title="Find services near you"><Text style={styles.muted}><UiText value={"Location is temporary unless explicitly saved. GPS runs only when you choose “Use my location”. MapTiler receives coordinates for place lookup and maps. VISTRAH receives them when you search nearby providers or save a location."}/></Text><UiElement as={Action} label={busy?'Finding location…':'Use my location'} disabled={busy} secondary onPress={()=>void gps()}/>{Boolean(error)&&<ErrorPanel error={error}/>}
    {location&&<LocationPreview key={`${location.latitude},${location.longitude}`} point={location}/>}
    <UiElement as={Field} editable={!busy} label="Locality" placeholder="City or area" value={label} onChangeText={setLabel} maxLength={150}/><UiElement as={Field} editable={!busy} label="PIN code" value={pin} onChangeText={setPin} keyboardType="number-pad" maxLength={6}/><UiElement as={Field} editable={!busy} label="Manual address" value={address} onChangeText={setAddress} maxLength={500}/><UiElement as={Field} editable={!busy} label="Landmark" value={landmark} onChangeText={setLandmark} maxLength={200}/><UiElement as={Field} editable={!busy} label="Search latitude" keyboardType="numbers-and-punctuation" value={lat} onChangeText={setLat}/><UiElement as={Field} editable={!busy} label="Search longitude" keyboardType="numbers-and-punctuation" value={lon} onChangeText={setLon}/>
    <Text style={styles.label}><UiText value={"SEARCH RADIUS"}/></Text><View style={styles.row}>{([2,5,10,25] as const).map(value=><UiElement as={Action} disabled={busy} key={value} label={value+' km'+(value===radius?' ✓':'')} secondary={value!==radius} onPress={()=>setRadius(value)}/>)}</View>
    <UiElement as={Action} label="Use this location" disabled={busy} onPress={save}/><UiElement as={Action} label="Save this location" secondary disabled={busy||!location} onPress={()=>{void persist();}}/><UiElement as={Action} label="Clear location" secondary disabled={busy} onPress={()=>{void clear();}}/>{Boolean(message)&&<Text accessibilityRole="alert" style={styles.muted}><UiText value={message}/></Text>}
    <Text style={styles.muted}><UiText value={"Sellers receive only locality/PIN for enquiries unless you explicitly supply an exact address for that request. Your search point is never copied into an enquiry."}/></Text>
  </UiElement>;
}
