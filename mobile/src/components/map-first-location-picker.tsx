import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {Linking,Pressable,ScrollView,View,useWindowDimensions} from 'react-native';
import * as GPS from 'expo-location';
import {Feather} from '@expo/vector-icons';
import {Text,TextInput} from './typography';
import {Field} from './ui';
import {api} from '../lib/api';
import {googleMapsDirectionsUrl} from '../lib/google-maps';
import {useTheme} from '../lib/theme';
import {VistrahMobileMap,reverseGeocodeMobilePoint} from './vistrah-mobile-map';
import {
  CUSTOMER_SEARCH_RADII,
  KARNATAKA_QUICK_CITIES,
  SELLER_COVERAGE_RADII,
  presetToSelectedLocation,
  type QuickCityPreset,
  type SelectedLocation,
} from '../../../shared/selected-location';

type AutocompleteSuggestion={
  place_id:string;
  main_text:string;
  secondary_text:string;
  description:string;
};

export function MobileMapFirstLocationPicker({
  value,
  onChange,
  onConfirm,
  confirmLabel='Confirm Location',
  mode='customer',
  radiusOptions,
  disabled=false,
  busy=false,
  extraFields,
  secondaryActions,
}:{
  value:SelectedLocation;
  onChange:(next:SelectedLocation)=>void;
  onConfirm?:(confirmed:SelectedLocation)=>void;
  confirmLabel?:string;
  mode?:'customer'|'seller';
  radiusOptions?:readonly number[];
  disabled?:boolean;
  busy?:boolean;
  extraFields?:ReactNode;
  secondaryActions?:ReactNode;
}){
  const {colors,styles}=useTheme();
  const {height:winHeight}=useWindowDimensions();
  const mapStageHeight=Math.min(480,Math.max(320,Math.round((winHeight||720)*0.55)));
  const radiiList=radiusOptions??(mode==='seller'?SELLER_COVERAGE_RADII:CUSTOMER_SEARCH_RADII);

  const [searchQuery,setSearchQuery]=useState('');
  const [suggestions,setSuggestions]=useState<AutocompleteSuggestion[]>([]);
  const [searching,setSearching]=useState(false);
  const [gpsBusy,setGpsBusy]=useState(false);
  const [gpsRecovery,setGpsRecovery]=useState('');
  const [drawerOpen,setDrawerOpen]=useState(false);

  const sessionTokenRef=useRef('');
  const debounceRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const latestRef=useRef(value);
  useEffect(()=>{latestRef.current=value;},[value]);
  useEffect(()=>()=>{if(debounceRef.current)clearTimeout(debounceRef.current);},[]);

  function ensureSessionToken():string{
    if(!sessionTokenRef.current){
      sessionTokenRef.current=`vst_mob_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;
    }
    return sessionTokenRef.current;
  }

  async function fetchAutocomplete(text:string){
    const trimmed=text.trim();
    if(trimmed.length<2){
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try{
      const token=ensureSessionToken();
      const res=await api<{suggestions:AutocompleteSuggestion[]}>(
        '/maps/autocomplete',
        {method:'POST',body:JSON.stringify({query:trimmed,session_token:token})},
      );
      setSuggestions(res.suggestions??[]);
    }catch{
      setSuggestions([]);
    }finally{
      setSearching(false);
    }
  }

  async function selectSuggestion(item:AutocompleteSuggestion){
    const usedToken=sessionTokenRef.current||undefined;
    sessionTokenRef.current='';
    setSearchQuery(item.main_text);
    setSuggestions([]);
    setSearching(true);
    setGpsRecovery('');
    try{
      try{
        const detail=await api<{formatted_address:string;locality:string;city:string;state:string;postal_code:string;latitude:number;longitude:number}>(
          '/maps/place-details',
          {method:'POST',body:JSON.stringify({place_id:item.place_id,session_token:usedToken})},
        );
        onChange({
          ...latestRef.current,
          latitude:Number(detail.latitude.toFixed(6)),
          longitude:Number(detail.longitude.toFixed(6)),
          locality:detail.locality||item.main_text,
          formattedAddress:detail.formatted_address||item.description,
          city:detail.city||'',
          state:detail.state||'',
          pincode:detail.postal_code||latestRef.current.pincode,
          source:'google',
        });
        return;
      }catch{
        // Guest fallback via /locations/geocode
      }
      const geo=await api<{items:Array<{latitude:number;longitude:number;label:string;postal_code:string}>}>(
        '/locations/geocode',
        {method:'POST',body:JSON.stringify({query:item.description})},
      );
      const top=geo.items?.[0];
      if(top){
        onChange({
          ...latestRef.current,
          latitude:Number(top.latitude.toFixed(6)),
          longitude:Number(top.longitude.toFixed(6)),
          locality:top.label||item.main_text,
          formattedAddress:item.description,
          city:top.label.split(',').pop()?.trim()||'',
          state:'',
          pincode:top.postal_code||latestRef.current.pincode,
          source:'google',
        });
      }
    }catch{
      setGpsRecovery('Could not resolve that address. Tap a Karnataka city chip or edit PIN below.');
    }finally{
      setSearching(false);
    }
  }

  async function runDirectSearch(){
    if(searchQuery.trim().length<2)return;
    setSuggestions([]);
    setSearching(true);
    try{
      const geo=await api<{items:Array<{latitude:number;longitude:number;label:string;postal_code:string}>}>(
        '/locations/geocode',
        {method:'POST',body:JSON.stringify({query:searchQuery.trim()})},
      );
      const top=geo.items?.[0];
      if(top){
        onChange({
          ...latestRef.current,
          latitude:Number(top.latitude.toFixed(6)),
          longitude:Number(top.longitude.toFixed(6)),
          locality:top.label,
          formattedAddress:top.label,
          pincode:top.postal_code||latestRef.current.pincode,
          source:'google',
        });
      }
    }catch{
      setGpsRecovery('Search unavailable right now — tap a city chip above or enter locality/PIN below.');
    }finally{
      setSearching(false);
    }
  }

  async function handleCurrentGps(){
    if(disabled||busy||gpsBusy)return;
    setGpsBusy(true);
    setGpsRecovery('');
    try{
      const permission=await GPS.requestForegroundPermissionsAsync();
      if(permission.status!=='granted'){
        throw new Error('denied');
      }
      let timer:ReturnType<typeof setTimeout>|undefined;
      try{
        const pos=await Promise.race([
          GPS.getCurrentPositionAsync({accuracy:GPS.Accuracy.Balanced}),
          new Promise<never>((_,reject)=>{
            timer=setTimeout(()=>reject(new Error('timeout')),14000);
          }),
        ]);
        const pt={
          latitude:Number(pos.coords.latitude.toFixed(6)),
          longitude:Number(pos.coords.longitude.toFixed(6)),
        };
        const resolved=await reverseGeocodeMobilePoint(pt);
        onChange({
          ...latestRef.current,
          latitude:pt.latitude,
          longitude:pt.longitude,
          locality:resolved?.locality||'Current GPS Area',
          formattedAddress:resolved?.formattedAddress||`GPS (~${Math.round(pos.coords.accuracy??0)}m)`,
          city:resolved?.city||'',
          state:resolved?.state||'',
          pincode:resolved?.postalCode||'',
          source:'gps',
        });
      }finally{
        if(timer)clearTimeout(timer);
      }
    }catch{
      setGpsRecovery('Location permission denied or GPS timed out. Tap a Karnataka city chip above, pan the map, or edit street / PIN below.');
      setDrawerOpen(true);
    }finally{
      setGpsBusy(false);
    }
  }

  function pickPreset(preset:QuickCityPreset){
    if(disabled||busy)return;
    setGpsRecovery('');
    setSuggestions([]);
    onChange(presetToSelectedLocation(preset,value.radiusKm,value.landmark));
  }

  const activeCityId=useMemo(()=>{
    const match=KARNATAKA_QUICK_CITIES.find(
      c=>Math.abs(c.latitude-value.latitude)<0.03&&Math.abs(c.longitude-value.longitude)<0.03,
    );
    return match?.id??'';
  },[value.latitude,value.longitude]);

  return (
    <View style={{borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface}}>
      {/* Map Stage with Floating Search, Karnataka City Chips, Center Pin & Floating GPS */}
      <View style={{position:'relative',height:mapStageHeight}}>
        <VistrahMobileMap
          center={{latitude:value.latitude,longitude:value.longitude}}
          radiusKm={value.radiusKm}
          editable={!disabled&&!busy}
          centerPinMode
          disabled={disabled||busy}
          height={mapStageHeight}
          onPinChange={pt=>{
            onChange({
              ...latestRef.current,
              latitude:pt.latitude,
              longitude:pt.longitude,
              source:'google',
            });
          }}
          onResolvedAddress={place=>{
            onChange({
              ...latestRef.current,
              latitude:place.latitude,
              longitude:place.longitude,
              locality:place.locality||latestRef.current.locality,
              formattedAddress:place.formattedAddress||place.locality||latestRef.current.formattedAddress,
              city:place.city||latestRef.current.city,
              state:place.state||latestRef.current.state,
              pincode:place.postalCode||latestRef.current.pincode,
              source:'google',
            });
          }}
        />

        {/* Floating Top Search + Quick Karnataka City Chips */}
        <View style={{position:'absolute',top:10,left:10,right:10,gap:8,zIndex:30}}>
          <View
            style={{
              flexDirection:'row',
              alignItems:'center',
              gap:8,
              paddingHorizontal:12,
              paddingVertical:6,
              borderRadius:12,
              backgroundColor:'#ffffff',
              borderWidth:1,
              borderColor:'rgba(15,23,42,0.14)',
            }}
          >
            <Feather name="search" size={16} color="#475569"/>
            <TextInput
              value={searchQuery}
              editable={!disabled&&!busy}
              placeholder="Search area, street, landmark, or PIN code..."
              placeholderTextColor="#64748b"
              returnKeyType="search"
              onSubmitEditing={()=>void runDirectSearch()}
              onChangeText={t=>{
                setSearchQuery(t);
                if(debounceRef.current)clearTimeout(debounceRef.current);
                debounceRef.current=setTimeout(()=>void fetchAutocomplete(t),280);
              }}
              style={{flex:1,fontSize:14,color:'#0f172a',minHeight:34,paddingVertical:2}}
            />
            {Boolean(searchQuery)&&(
              <Pressable onPress={()=>{setSearchQuery('');setSuggestions([]);}} hitSlop={8}>
                <Feather name="x" size={16} color="#64748b"/>
              </Pressable>
            )}
          </View>

          {suggestions.length>0&&(
            <View
              style={{
                borderRadius:12,
                backgroundColor:'#ffffff',
                borderWidth:1,
                borderColor:'rgba(15,23,42,0.14)',
                overflow:'hidden',
              }}
            >
              {suggestions.slice(0,5).map(item=>(
                <Pressable
                  key={item.place_id}
                  onPress={()=>void selectSuggestion(item)}
                  style={{paddingHorizontal:12,paddingVertical:9,borderBottomWidth:1,borderBottomColor:'#f1f5f9'}}
                >
                  <Text style={{fontSize:13,fontWeight:'700',color:'#0f172a'}}>{item.main_text}</Text>
                  {Boolean(item.secondary_text)&&<Text style={{fontSize:11,color:'#64748b'}}>{item.secondary_text}</Text>}
                </Pressable>
              ))}
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,paddingRight:8}}>
            {KARNATAKA_QUICK_CITIES.map(city=>{
              const active=activeCityId===city.id;
              return (
                <Pressable
                  key={city.id}
                  disabled={disabled||busy}
                  onPress={()=>pickPreset(city)}
                  style={{
                    paddingHorizontal:12,
                    paddingVertical:6,
                    borderRadius:999,
                    backgroundColor:active?'#0f172a':'rgba(255,255,255,0.95)',
                    borderWidth:1,
                    borderColor:active?'#d4af37':'rgba(15,23,42,0.16)',
                  }}
                >
                  <Text style={{fontSize:12,fontWeight:'700',color:active?'#f8e7b0':'#0f172a'}}>{city.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Floating Use Current GPS Button */}
        <Pressable
          disabled={disabled||busy||gpsBusy}
          onPress={()=>void handleCurrentGps()}
          style={{
            position:'absolute',
            right:12,
            bottom:12,
            flexDirection:'row',
            alignItems:'center',
            gap:6,
            paddingHorizontal:14,
            paddingVertical:9,
            borderRadius:999,
            backgroundColor:'#ffffff',
            borderWidth:1,
            borderColor:'rgba(15,23,42,0.18)',
          }}
        >
          <Feather name="navigation" size={14} color="#0f172a"/>
          <Text style={{fontSize:12,fontWeight:'700',color:'#0f172a'}}>
            {gpsBusy?'Detecting GPS…':'Use Current GPS'}
          </Text>
        </Pressable>
      </View>

      {/* Bottom Confirmation Card */}
      <View style={{padding:16,gap:12,borderTopWidth:1,borderTopColor:colors.border}}>
        {Boolean(gpsRecovery)&&(
          <View style={{padding:10,borderRadius:10,backgroundColor:'#fef3c7',borderWidth:1,borderColor:'#f59e0b'}}>
            <Text style={{fontSize:12,color:'#92400e'}}>{gpsRecovery}</Text>
          </View>
        )}

        <View style={{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:10}}>
          <View style={{flexDirection:'row',alignItems:'flex-start',gap:10,flex:1}}>
            <View style={{width:34,height:34,borderRadius:10,backgroundColor:'#0f172a',alignItems:'center',justifyContent:'center',marginTop:2}}>
              <Feather name="map-pin" size={16} color="#d4af37"/>
            </View>
            <View style={{flex:1,gap:2}}>
              <Text style={[styles.heading,{fontSize:16}]}>
                {searching?'Updating locality…':value.locality||'Select area on map'}
              </Text>
              <Text style={[styles.muted,{fontSize:13}]}>
                {value.formattedAddress||'Pan the map, search above, or tap a Karnataka city chip.'}
              </Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:4}}>
                {Boolean(value.pincode)&&(
                  <View style={{paddingHorizontal:8,paddingVertical:2,borderRadius:999,backgroundColor:colors.soft}}>
                    <Text style={[styles.muted,styles.tabular,{fontSize:11,fontWeight:'600'}]}>PIN {value.pincode}</Text>
                  </View>
                )}
                <View style={{paddingHorizontal:8,paddingVertical:2,borderRadius:999,backgroundColor:colors.soft}}>
                  <Text style={[styles.muted,styles.tabular,{fontSize:11,fontWeight:'600'}]}>
                    {value.radiusKm} km {mode==='seller'?'coverage':'radius'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Pressable
            onPress={()=>void Linking.openURL(googleMapsDirectionsUrl(value.latitude,value.longitude))}
            style={{paddingHorizontal:10,paddingVertical:6,borderRadius:8,borderWidth:1,borderColor:colors.border}}
          >
            <Text style={{fontSize:11,fontWeight:'700',color:colors.text}}>Maps ↗</Text>
          </Pressable>
        </View>

        {/* Segmented Radius Selector */}
        <View style={{gap:6,paddingTop:8,borderTopWidth:1,borderTopColor:colors.border}}>
          <Text style={[styles.label,{fontSize:11}]}>
            {mode==='seller'?'COVERAGE RADIUS':'NEARBY SEARCH RADIUS'}
          </Text>
          <View style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}>
            {radiiList.map(km=>{
              const active=value.radiusKm===km;
              return (
                <Pressable
                  key={km}
                  disabled={disabled||busy}
                  onPress={()=>onChange({...value,radiusKm:km})}
                  style={{
                    flex:1,
                    minWidth:64,
                    paddingVertical:8,
                    borderRadius:8,
                    alignItems:'center',
                    backgroundColor:active?'#0f172a':colors.soft,
                    borderWidth:1,
                    borderColor:active?'#d4af37':colors.border,
                  }}
                >
                  <Text style={[styles.tabular,{fontSize:12,fontWeight:'700',color:active?'#f8e7b0':colors.text}]}>
                    {km} km
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Collapsible Edit street / landmark / PIN Drawer */}
        <Pressable
          onPress={()=>setDrawerOpen(o=>!o)}
          style={{flexDirection:'row',alignItems:'center',gap:6,paddingVertical:4}}
        >
          <Feather name="edit-3" size={14} color={colors.text}/>
          <Text style={{fontSize:13,fontWeight:'700',color:colors.text}}>Edit street / landmark / PIN</Text>
          <Feather name={drawerOpen?'chevron-up':'chevron-down'} size={15} color={colors.text}/>
        </Pressable>

        {drawerOpen&&(
          <View style={{gap:8,padding:12,borderRadius:10,borderWidth:1,borderColor:colors.border}}>
            <Field
              label="Locality / Area *"
              editable={!disabled&&!busy}
              value={value.locality}
              maxLength={150}
              placeholder="e.g. Indiranagar, Tarikere"
              onChangeText={t=>onChange({...value,locality:t,source:value.source==='google'?'google':'manual'})}
            />
            <Field
              label="6-Digit PIN Code"
              editable={!disabled&&!busy}
              value={value.pincode}
              maxLength={6}
              keyboardType="number-pad"
              placeholder="e.g. 560038"
              onChangeText={t=>onChange({...value,pincode:t.replace(/\D/g,'').slice(0,6)})}
            />
            <Field
              label="Street / Building / Address"
              editable={!disabled&&!busy}
              value={value.formattedAddress}
              maxLength={500}
              onChangeText={t=>onChange({...value,formattedAddress:t})}
            />
            <Field
              label="Landmark"
              editable={!disabled&&!busy}
              value={value.landmark}
              maxLength={200}
              placeholder="Optional nearby landmark"
              onChangeText={t=>onChange({...value,landmark:t})}
            />
          </View>
        )}

        {extraFields}

        {onConfirm&&(
          <Pressable
            disabled={disabled||busy||value.locality.trim().length<2}
            onPress={()=>onConfirm(value)}
            style={{
              minHeight:46,
              borderRadius:10,
              backgroundColor:disabled||busy||value.locality.trim().length<2?'#94a3b8':'#0f172a',
              alignItems:'center',
              justifyContent:'center',
              flexDirection:'row',
              gap:8,
              paddingHorizontal:16,
            }}
          >
            <Feather name="check-circle" size={16} color="#d4af37"/>
            <Text style={{color:'#ffffff',fontSize:15,fontWeight:'700'}}>
              {busy?'Saving…':confirmLabel}
            </Text>
          </Pressable>
        )}

        {secondaryActions}
      </View>
    </View>
  );
}
