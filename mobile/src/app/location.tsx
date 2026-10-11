import {useState} from 'react';
import {Text,View} from 'react-native';
import * as GPS from 'expo-location';
import {router} from 'expo-router';
import {Page,Action,Field,ErrorPanel,Heading} from '../components/ui';
import {parsePoint,useLocation,type Location} from '../lib/location';
import {styles} from '../lib/theme';
export default function ChooseLocation(){
  const {location,setLocation}=useLocation();const [label,setLabel]=useState(location?.label??'');const [lat,setLat]=useState(location?String(location.latitude):'');const [lon,setLon]=useState(location?String(location.longitude):'');const [radius,setRadius]=useState<Location['radius']>(location?.radius??5);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  async function gps(){
    setBusy(true);setError('');
    try{const permission=await GPS.requestForegroundPermissionsAsync();if(permission.status!=='granted')throw new Error('Location permission denied. Enter coordinates manually below.');
      let timer:ReturnType<typeof setTimeout>|undefined;
      try{const result=await Promise.race([GPS.getCurrentPositionAsync({accuracy:GPS.Accuracy.Balanced}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Location timed out. Enter coordinates manually.')),15000);})]);
        setLat(String(result.coords.latitude));setLon(String(result.coords.longitude));setLabel('Current location');
      }finally{if(timer)clearTimeout(timer);}
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  function save(){try{const point=parsePoint(lat,lon);if(label.trim().length<2)throw new Error('Enter a location label.');setLocation({...point,label:label.trim(),radius});router.back();}catch(e){setError((e as Error).message);}}
  return <Page><Heading title="Find services near you"/><Text style={styles.muted}>Location is temporary and clears when the app closes. GPS runs only when you choose “Use my location”. Coordinates are sent to VISTRAH only when you search nearby providers; this does not save your location to your profile.</Text><Action label={busy?'Finding location…':'Use my location'} disabled={busy} secondary onPress={()=>void gps()}/>{error&&<ErrorPanel error={error}/>}
    <Field label="Location label" placeholder="City or area" value={label} onChangeText={setLabel} maxLength={200}/><Field label="Latitude" keyboardType="numbers-and-punctuation" value={lat} onChangeText={setLat}/><Field label="Longitude" keyboardType="numbers-and-punctuation" value={lon} onChangeText={setLon}/>
    <Text style={styles.label}>SEARCH RADIUS</Text><View style={styles.row}>{([2,5,10,25] as const).map(value=><Action key={value} label={value+' km'+(value===radius?' ✓':'')} secondary={value!==radius} onPress={()=>setRadius(value)}/>)}</View>
    <Action label="Use this temporary location" disabled={busy} onPress={save}/><Action label="Clear location" secondary onPress={()=>{setLocation(null);router.back();}}/>
  </Page>;
}
