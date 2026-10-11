import {useState} from 'react';
import {Text,View} from 'react-native';
import * as GPS from 'expo-location';
import {Page,Action,Field,ErrorPanel,Heading} from '../components/ui';
import {parsePoint,useLocation,type Location} from '../lib/location';
import {api} from '../lib/api';
import {useTheme} from '../lib/theme';
export default function ChooseLocation(){const {styles}=useTheme();
  const {location,setLocation}=useLocation();const [label,setLabel]=useState(location?.label??'');const [lat,setLat]=useState(location?String(location.latitude):'');const [lon,setLon]=useState(location?String(location.longitude):'');const [radius,setRadius]=useState<Location['radius']>(location?.radius??5);const [pin,setPin]=useState(location?.postal_code??'');const [address,setAddress]=useState(location?.address??'');const [landmark,setLandmark]=useState(location?.landmark??'');const [message,setMessage]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  async function gps(){
    setBusy(true);setError('');
    try{const permission=await GPS.requestForegroundPermissionsAsync();if(permission.status!=='granted')throw new Error('Location permission denied. Enter coordinates manually below.');
      let timer:ReturnType<typeof setTimeout>|undefined;
      try{const result=await Promise.race([GPS.getCurrentPositionAsync({accuracy:GPS.Accuracy.Balanced}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Location timed out. Enter coordinates manually.')),15000);})]);
        setLat(String(result.coords.latitude));setLon(String(result.coords.longitude));setLabel('Current location');
      }finally{if(timer)clearTimeout(timer);}
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  function save(){try{const point=parsePoint(lat,lon);if(label.trim().length<2)throw new Error('Enter a location label.');if(pin&&!/^[0-9]{6}$/.test(pin))throw new Error('Enter a six-digit PIN code.');setLocation({...point,label:label.trim(),radius,postal_code:pin,address,landmark});setMessage('Location is temporary unless you choose Save this location.');}catch(e){setError((e as Error).message);}}
  async function persist(){if(!location)return;setBusy(true);setError('');try{await api('/me/location',{method:'PUT',body:JSON.stringify({locality:location.label,latitude:location.latitude,longitude:location.longitude,postal_code:location.postal_code??'',address:location.address??'',landmark:location.landmark??''})});setMessage('Location saved to your account. You can change it or clear it.');}catch(e){setError('Saving is unavailable. Your selection remains temporary. '+(e as Error).message);}finally{setBusy(false);}}
  async function clear(){setLocation(null);setBusy(true);setError('');setLabel('');setLat('');setLon('');setPin('');setAddress('');setLandmark('');try{await api('/me/location',{method:'DELETE'});setMessage('Saved and temporary locations cleared. Past enquiry addresses are retained.');}catch(e){setError('Temporary location cleared. Saved location could not be cleared; retry Clear location. '+(e as Error).message);}finally{setBusy(false);}}
  return <Page><Heading title="Find services near you"/><Text style={styles.muted}>Location is temporary unless explicitly saved. GPS runs only when you choose “Use my location”. Coordinates are sent to VISTRAH only when you search nearby providers.</Text><Action label={busy?'Finding location…':'Use my location'} disabled={busy} secondary onPress={()=>void gps()}/>{Boolean(error)&&<ErrorPanel error={error}/>}
    <Field label="Locality" placeholder="City or area" value={label} onChangeText={setLabel} maxLength={150}/><Field label="PIN code" value={pin} onChangeText={setPin} keyboardType="number-pad" maxLength={6}/><Field label="Manual address" value={address} onChangeText={setAddress} maxLength={500}/><Field label="Landmark" value={landmark} onChangeText={setLandmark} maxLength={200}/><Field label="Search latitude" keyboardType="numbers-and-punctuation" value={lat} onChangeText={setLat}/><Field label="Search longitude" keyboardType="numbers-and-punctuation" value={lon} onChangeText={setLon}/>
    <Text style={styles.label}>SEARCH RADIUS</Text><View style={styles.row}>{([2,5,10,25] as const).map(value=><Action key={value} label={value+' km'+(value===radius?' ✓':'')} secondary={value!==radius} onPress={()=>setRadius(value)}/>)}</View>
    <Action label="Use this location" disabled={busy} onPress={save}/><Action label="Save this location" secondary disabled={busy||!location} onPress={()=>{void persist();}}/><Action label="Clear location" secondary disabled={busy} onPress={()=>{void clear();}}/>{Boolean(message)&&<Text accessibilityRole="alert" style={styles.muted}>{message}</Text>}
    <Text style={styles.muted}>Sellers receive only locality/PIN for enquiries unless you explicitly supply an exact address for that request. Your search point is never copied into an enquiry.</Text>
  </Page>;
}
