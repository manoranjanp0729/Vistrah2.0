import {Text} from '../components/typography';
import {UiText,UiElement} from "../components/localized-ui";
import {useState} from 'react';
import {View} from 'react-native';
import {Page,Action,ErrorPanel} from '../components/ui';
import {useLocation,type Location} from '../lib/location';
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

function locationToSelected(loc:Location|null):SelectedLocation{
  if(!loc)return {...DEFAULT_SELECTED_LOCATION};
  return {
    latitude:loc.latitude,
    longitude:loc.longitude,
    formattedAddress:loc.address||loc.label||DEFAULT_SELECTED_LOCATION.formattedAddress,
    locality:loc.label||DEFAULT_SELECTED_LOCATION.locality,
    city:loc.label.split(',').pop()?.trim()||DEFAULT_SELECTED_LOCATION.city,
    state:'Karnataka',
    pincode:loc.postal_code||'',
    landmark:loc.landmark||'',
    radiusKm:loc.radius,
    source:loc.source==='google'?'google':'manual',
  };
}

export default function ChooseLocation(){
  const {styles}=useTheme();
  const {location,setLocation}=useLocation();
  const [selected,setSelected]=useState<SelectedLocation>(()=>locationToSelected(location));
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);

  function confirmSelection(confirmed:SelectedLocation){
    setError('');
    if(confirmed.locality.trim().length<2){
      setError('Select an area on the map or enter a locality.');
      return;
    }
    if(confirmed.pincode&&!/^[0-9]{6}$/.test(confirmed.pincode)){
      setError('Enter a valid 6-digit PIN code or leave it blank.');
      return;
    }
    const r=([2,5,10,25] as const).includes(confirmed.radiusKm as 2|5|10|25)?(confirmed.radiusKm as Location['radius']):5;
    setLocation({
      latitude:confirmed.latitude,
      longitude:confirmed.longitude,
      label:confirmed.locality.trim(),
      radius:r,
      postal_code:confirmed.pincode,
      address:confirmed.formattedAddress,
      landmark:confirmed.landmark,
      ...(confirmed.source==='google'?{source:'google' as const}:{}),
    });
    setMessage(`Location confirmed: ${confirmed.locality.trim()}${confirmed.pincode?` (${confirmed.pincode})`:''}. Temporary unless saved to your account.`);
  }

  async function persistToAccount(){
    if(!location)return;
    if(location.source==='google'){
      setError('Google search locations stay temporary. Edit locality/PIN manually to save to your account.');
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
      setMessage('Location saved to your account.');
    }catch(e){
      setError('Saving is unavailable. Your selection remains active temporarily. '+(e as Error).message);
    }finally{
      setBusy(false);
    }
  }

  async function clearAll(){
    setLocation(null);
    setSelected({...DEFAULT_SELECTED_LOCATION});
    setBusy(true);
    setError('');
    try{
      await api('/me/location',{method:'DELETE'});
      setMessage('Saved and temporary locations cleared.');
    }catch{
      setMessage('Temporary location cleared.');
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
        onConfirm={confirmSelection}
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
                :<UiText value={"Location stays temporary unless saved. GPS runs only when you tap Use Current GPS. Sellers receive only locality/PIN unless you explicitly supply an exact address."}/>}
            </Text>
          </View>
        }
      />
    </UiElement>
  );
}
