import {Text} from '../components/typography';
import {UiText,UiElement} from "../components/localized-ui";
import {useEffect,useState} from 'react';
import {View} from 'react-native';
import {router} from 'expo-router';
import {Page,Action,ErrorPanel} from '../components/ui';
import {useLocation} from '../context/LocationContext';
import {api} from '../lib/api';
import {useTheme} from '../lib/theme';
import {googleMapsEnabled} from '../lib/google-maps';
import {googlePrivacy} from '../../../shared/google-location';
import {MobileMapFirstLocationPicker} from '../components/map-first-location-picker';
import {
  CUSTOMER_SEARCH_RADII,
  DEFAULT_SELECTED_LOCATION,
  type SelectedLocation,
} from '../../../shared/selected-location';

function dismissLocationScreen(){
  if(router.canGoBack()){
    router.back();
  }else{
    router.replace('/(tabs)');
  }
}

export default function ChooseLocation(){
  const {styles}=useTheme();
  const {selectedLocation,location,commitSelectedLocation,clearSelectedLocation}=useLocation();
  const [selected,setSelected]=useState<SelectedLocation>(()=>selectedLocation??{...DEFAULT_SELECTED_LOCATION});
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    if(selectedLocation){
      setSelected(selectedLocation);
    }
  },[selectedLocation]);

  function commitAndClose(confirmed:SelectedLocation){
    setError('');
    if(confirmed.locality.trim().length<2){
      setError('Select an area on the map or enter a locality.');
      return;
    }
    if(confirmed.pincode&&!/^[0-9]{6}$/.test(confirmed.pincode)){
      setError('Enter a valid 6-digit PIN code or leave it blank.');
      return;
    }
    const normalized:SelectedLocation={
      ...confirmed,
      locality:confirmed.locality.trim(),
      formattedAddress:(confirmed.formattedAddress||confirmed.locality).trim(),
      pincode:confirmed.pincode.trim(),
      landmark:confirmed.landmark.trim(),
    };
    commitSelectedLocation(normalized);
    dismissLocationScreen();
  }

  async function persistToAccount(){
    if(!location)return;
    if(location.source==='google'){
      setError('Google search locations stay temporary in account storage; local app storage already remembers it.');
      return;
    }
    setBusy(true);
    setError('');
    try{
      await api('/me/location',{
        method:'PUT',
        body:JSON.stringify({
          locality:location.label,
          latitude:location.latitude,
          longitude:location.longitude,
          postal_code:location.postal_code??'',
          address:location.address??'',
          landmark:location.landmark??'',
        }),
      });
      setMessage('Location saved to your VISTRAH account.');
    }catch(e){
      setError('Account sync unavailable; your location remains saved on this device. '+(e as Error).message);
    }finally{
      setBusy(false);
    }
  }

  async function clearAll(){
    clearSelectedLocation();
    setSelected({...DEFAULT_SELECTED_LOCATION});
    setBusy(true);
    setError('');
    try{
      await api('/me/location',{method:'DELETE'});
      setMessage('Saved and device locations cleared.');
    }catch{
      setMessage('Device location cleared.');
    }finally{
      setBusy(false);
    }
  }

  return (
    <UiElement as={Page} title="Select your location">
      {Boolean(error)&&<ErrorPanel error={error}/>}
      {Boolean(message)&&(
        <Text accessibilityRole="alert" style={styles.muted}>
          <UiText value={message}/>
        </Text>
      )}

      <MobileMapFirstLocationPicker
        mode="customer"
        radiusOptions={CUSTOMER_SEARCH_RADII}
        value={selected}
        onChange={setSelected}
        onConfirm={commitAndClose}
        onQuickCommit={commitAndClose}
        confirmLabel="Confirm Location"
        disabled={busy}
        busy={busy}
        secondaryActions={
          <View style={{gap:8}}>
            <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
              <UiElement
                as={Action}
                label="Save to account"
                secondary
                disabled={busy||!location||location.source==='google'}
                onPress={()=>void persistToAccount()}
              />
              <UiElement
                as={Action}
                label="Clear location"
                secondary
                disabled={busy}
                onPress={()=>void clearAll()}
              />
            </View>
            <Text style={[styles.muted,{fontSize:12}]}>
              {googleMapsEnabled
                ?googlePrivacy
                :<UiText value={"Your selected area is saved locally so every screen and header stay in sync. Sellers receive only locality/PIN unless you explicitly supply an exact address."}/>}
            </Text>
          </View>
        }
      />
    </UiElement>
  );
}
