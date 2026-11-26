import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {Alert,Linking,Platform,Pressable,ScrollView,View,useWindowDimensions} from 'react-native';
import * as GPS from 'expo-location';
import {Feather} from '@expo/vector-icons';
import {Text,TextInput} from './typography';
import {Field} from './ui';
import {api} from '../lib/api';
import {googleMapsDirectionsUrl,googleMapsEnabled} from '../lib/google-maps';
import {useTheme} from '../lib/theme';
import {MobileGoogleWordmark,MobilePoweredByGoogle} from './google-attribution';
import {VistrahMobileMap,reverseGeocodeMobilePoint} from './vistrah-mobile-map';
import {
  GPS_HARD_TIMEOUT_MS,
  GPS_TIMEOUT_MESSAGE,
  acquireNativeExpoGpsFix,
  requestBrowserGpsFix,
  type GeolocationPermissionsLike,
} from '../../../shared/live-geolocation';
import {
  isCoordinateFormattedLabel,
  lookupLocalAreaCity,
} from '../../../shared/reverse-geocode-fallback';
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
  onQuickCommit,
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
  onQuickCommit?:(committed:SelectedLocation)=>void;
  confirmLabel?:string;
  mode?:'customer'|'seller';
  radiusOptions?:readonly number[];
  disabled?:boolean;
  busy?:boolean;
  extraFields?:ReactNode;
  secondaryActions?:ReactNode;
}){
  const {colors,styles,mode:themeMode}=useTheme();
  const isDark=themeMode==='dark';
  const {height:winHeight}=useWindowDimensions();
  const mapStageHeight=Math.min(400,Math.max(260,Math.round((winHeight||720)*0.42)));
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

  // Auto-upgrade any stale raw coordinate label (e.g. "12.892° N, 77.623° E") into clean Area, City ("Begur, Bengaluru")
  useEffect(()=>{
    if(!isCoordinateFormattedLabel(value.locality)&&!isCoordinateFormattedLabel(value.formattedAddress)){
      return;
    }
    let alive=true;
    const pt={latitude:value.latitude,longitude:value.longitude};
    const instant=lookupLocalAreaCity(pt);
    if(instant){
      onChange({
        ...latestRef.current,
        locality:instant.locality,
        formattedAddress:instant.formattedAddress,
        city:latestRef.current.city||instant.city,
        state:latestRef.current.state||instant.state,
        pincode:latestRef.current.pincode||instant.postalCode,
      });
    }
    void reverseGeocodeMobilePoint(pt).then(resolved=>{
      if(!alive||!resolved||isCoordinateFormattedLabel(resolved.locality))return;
      onChange({
        ...latestRef.current,
        locality:resolved.locality,
        formattedAddress:resolved.formattedAddress||resolved.locality,
        city:resolved.city||latestRef.current.city,
        state:resolved.state||latestRef.current.state,
        pincode:resolved.postalCode||latestRef.current.pincode,
      });
    });
    return ()=>{alive=false;};
  },[value.latitude,value.longitude]);

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
      const qs=new URLSearchParams({q:trimmed,session_token:token});
      const res=await api<{suggestions:AutocompleteSuggestion[]}>(
        `/maps/autocomplete?${qs.toString()}`,
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
        const qs=new URLSearchParams({place_id:item.place_id,...(usedToken?{session_token:usedToken}:{})});
        const detail=await api<{formatted_address:string;locality:string;city:string;state:string;postal_code:string;latitude:number;longitude:number}>(
          `/maps/place-details?${qs.toString()}`,
        );
        const committed:SelectedLocation={
          ...latestRef.current,
          latitude:Number(detail.latitude.toFixed(6)),
          longitude:Number(detail.longitude.toFixed(6)),
          locality:detail.locality||item.main_text,
          formattedAddress:detail.formatted_address||item.description,
          city:detail.city||'',
          state:detail.state||'',
          pincode:detail.postal_code||latestRef.current.pincode,
          source:'google',
        };
        onChange(committed);
        onQuickCommit?.(committed);
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
        const committed:SelectedLocation={
          ...latestRef.current,
          latitude:Number(top.latitude.toFixed(6)),
          longitude:Number(top.longitude.toFixed(6)),
          locality:top.label||item.main_text,
          formattedAddress:item.description,
          city:top.label.split(',').pop()?.trim()||'',
          state:'',
          pincode:top.postal_code||latestRef.current.pincode,
          source:'google',
        };
        onChange(committed);
        onQuickCommit?.(committed);
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
    const hardTimer=setTimeout(()=>{
      setGpsBusy(false);
    },GPS_HARD_TIMEOUT_MS);
    try{
      const fix=await Promise.race([
        Platform.OS==='web'
          ? requestBrowserGpsFix(
              typeof navigator!=='undefined'?navigator.geolocation:undefined,
              typeof navigator!=='undefined'
                ? ((navigator as unknown as {permissions?:GeolocationPermissionsLike}).permissions??null)
                : null,
              GPS_HARD_TIMEOUT_MS,
            )
          : acquireNativeExpoGpsFix(GPS,{hardTimeoutMs:GPS_HARD_TIMEOUT_MS}),
        new Promise<never>((_,reject)=>
          setTimeout(()=>reject(new Error(GPS_TIMEOUT_MESSAGE)),GPS_HARD_TIMEOUT_MS),
        ),
      ]);
      const pt=fix.point;
      const localGuess=lookupLocalAreaCity(pt);
      const resolved=await reverseGeocodeMobilePoint(pt);
      const cleanLocality=
        (resolved?.locality&&!isCoordinateFormattedLabel(resolved.locality)?resolved.locality:'')||
        localGuess?.locality||
        resolved?.locality||
        'Bengaluru';
      const cleanAddress=
        (resolved?.formattedAddress&&!isCoordinateFormattedLabel(resolved.formattedAddress)
          ? resolved.formattedAddress
          : '')||
        localGuess?.formattedAddress||
        cleanLocality;

      const committed:SelectedLocation={
        ...latestRef.current,
        latitude:pt.latitude,
        longitude:pt.longitude,
        locality:cleanLocality,
        formattedAddress:cleanAddress,
        city:resolved?.city||localGuess?.city||'',
        state:resolved?.state||localGuess?.state||'Karnataka',
        pincode:resolved?.postalCode||localGuess?.postalCode||'',
        source:'gps',
      };
      onChange(committed);
      onQuickCommit?.(committed);
    }catch(err){
      const msg=(err as Error)?.message||'Location permission denied or GPS timed out. Tap a city chip above, pan the map, or edit street / PIN below.';
      setGpsRecovery(msg);
      if(Platform.OS!=='web'&&msg.toLowerCase().includes('permission')){
        Alert.alert('Location Permission Needed',msg);
      }
      setDrawerOpen(true);
    }finally{
      clearTimeout(hardTimer);
      setGpsBusy(false);
    }
  }

  function pickPreset(preset:QuickCityPreset){
    if(disabled||busy)return;
    setGpsRecovery('');
    setSuggestions([]);
    const committed=presetToSelectedLocation(preset,value.radiusKm,value.landmark);
    onChange(committed);
    onQuickCommit?.(committed);
  }

  const activeCityId=useMemo(()=>{
    const match=KARNATAKA_QUICK_CITIES.find(
      c=>Math.abs(c.latitude-value.latitude)<0.03&&Math.abs(c.longitude-value.longitude)<0.03,
    );
    return match?.id??'';
  },[value.latitude,value.longitude]);

  const localDisplayFallback=useMemo(
    ()=>lookupLocalAreaCity({latitude:value.latitude,longitude:value.longitude}),
    [value.latitude,value.longitude],
  );
  const displayLocality=
    value.locality&&!isCoordinateFormattedLabel(value.locality)
      ? value.locality
      : localDisplayFallback?.locality||value.locality||'Select area on map';
  const displayFormattedAddress=
    value.formattedAddress&&!isCoordinateFormattedLabel(value.formattedAddress)
      ? value.formattedAddress
      : localDisplayFallback?.formattedAddress||displayLocality;

  return (
    <View style={{borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface}}>
      {/* Clean Top Controls Bar Positioned Above the Map (Zero Overlapping Text) */}
      <View style={{padding:12,gap:10,borderBottomWidth:1,borderBottomColor:colors.border,backgroundColor:colors.surface,zIndex:20}}>
        <View
          style={{
            flexDirection:'row',
            alignItems:'center',
            gap:8,
            paddingHorizontal:12,
            paddingVertical:6,
            borderRadius:10,
            backgroundColor:isDark?'#1E293B':'#F8FAFC',
            borderWidth:1,
            borderColor:colors.border,
          }}
        >
          <Feather name="search" size={16} color="#0D9488"/>
          <TextInput
            value={searchQuery}
            editable={!disabled&&!busy}
            placeholder="Search area, street, landmark, or PIN code..."
            placeholderTextColor="#64748B"
            returnKeyType="search"
            onSubmitEditing={()=>void runDirectSearch()}
            onChangeText={t=>{
              setSearchQuery(t);
              if(debounceRef.current)clearTimeout(debounceRef.current);
              debounceRef.current=setTimeout(()=>void fetchAutocomplete(t),280);
            }}
            style={{flex:1,fontSize:14,color:colors.text,minHeight:34,paddingVertical:2}}
          />
          {searchQuery?(
            <Pressable onPress={()=>{setSearchQuery('');setSuggestions([]);}} hitSlop={8}>
              <Feather name="x" size={16} color="#64748B"/>
            </Pressable>
          ):googleMapsEnabled?(
            <View
              pointerEvents="none"
              accessible
              accessibilityLabel="Powered by Google"
              style={{
                flexDirection:'row',
                alignItems:'center',
                gap:4,
                paddingHorizontal:6,
                paddingVertical:3,
                borderRadius:6,
                backgroundColor:'rgba(15,23,42,0.04)',
              }}
            >
              <Text style={{fontSize:10,fontWeight:'500',color:'#5f6368'}}>Powered by</Text>
              <MobileGoogleWordmark height={12} dark={isDark}/>
            </View>
          ):null}
        </View>

        {suggestions.length>0&&(
          <View
            style={{
              borderRadius:10,
              backgroundColor:isDark?'#1E293B':'#FFFFFF',
              borderWidth:1,
              borderColor:colors.border,
              overflow:'hidden',
            }}
          >
            {suggestions.slice(0,5).map(item=>(
              <Pressable
                key={item.place_id}
                onPress={()=>void selectSuggestion(item)}
                style={{paddingHorizontal:12,paddingVertical:9,borderBottomWidth:1,borderBottomColor:colors.border}}
              >
                <Text style={{fontSize:13,fontWeight:'700',color:colors.text}}>{item.main_text}</Text>
                {Boolean(item.secondary_text)&&<Text style={{fontSize:11,color:colors.muted}}>{item.secondary_text}</Text>}
              </Pressable>
            ))}
            {googleMapsEnabled&&<MobilePoweredByGoogle dark={isDark}/>}
          </View>
        )}

        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{flexGrow:1,flexShrink:1}}
            contentContainerStyle={{gap:6,paddingRight:4,alignItems:'center'}}
          >
            {KARNATAKA_QUICK_CITIES.map(city=>{
              const active=activeCityId===city.id;
              return (
                <Pressable
                  key={city.id}
                  disabled={disabled||busy}
                  onPress={()=>pickPreset(city)}
                  style={({pressed})=>({
                    paddingHorizontal:12,
                    paddingVertical:7,
                    borderRadius:999,
                    backgroundColor:active?(pressed?'#0F766E':'#0D9488'):(isDark?'#1E293B':'#FFFFFF'),
                    borderWidth:1,
                    borderColor:active?'#0F766E':colors.border,
                  })}
                >
                  <Text style={{fontSize:12,fontWeight:'700',color:active?'#FFFFFF':colors.text}}>{city.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            disabled={disabled||busy||gpsBusy}
            onPress={()=>void handleCurrentGps()}
            style={({pressed})=>({
              flexDirection:'row',
              alignItems:'center',
              gap:6,
              paddingHorizontal:13,
              paddingVertical:8,
              borderRadius:999,
              backgroundColor:pressed&&!gpsBusy?'#0F766E':'#0D9488',
              borderWidth:1,
              borderColor:'#0F766E',
              opacity:disabled||busy||gpsBusy?0.78:1,
            })}
          >
            <Feather name="navigation" size={13} color="#FFFFFF"/>
            <Text style={{fontSize:12,fontWeight:'700',color:'#FFFFFF'}}>
              {gpsBusy?'Locating…':'Use Current GPS'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Interactive Map Stage (Google Maps when healthy, OpenStreetMap slippy tiles on fallback) */}
      <View style={{position:'relative',minHeight:mapStageHeight}}>
        <VistrahMobileMap
          center={{latitude:value.latitude,longitude:value.longitude}}
          radiusKm={value.radiusKm}
          editable={!disabled&&!busy}
          centerPinMode
          disabled={disabled||busy}
          height={mapStageHeight}
          onPinChange={pt=>{
            const instant=lookupLocalAreaCity(pt);
            onChange({
              ...latestRef.current,
              latitude:pt.latitude,
              longitude:pt.longitude,
              ...(instant?{
                locality:instant.locality,
                formattedAddress:instant.formattedAddress,
                city:instant.city,
                state:instant.state,
                pincode:instant.postalCode||latestRef.current.pincode,
              }:{}),
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
      </View>

      {/* Bottom Confirmation Card */}
      <View style={{padding:16,gap:12,borderTopWidth:1,borderTopColor:colors.border}}>
        {Boolean(gpsRecovery)&&(
          <View style={{padding:10,borderRadius:10,backgroundColor:'#FEF3C7',borderWidth:1,borderColor:'#F59E0B'}}>
            <Text style={{fontSize:12,color:'#92400E'}}>{gpsRecovery}</Text>
          </View>
        )}

        <View style={{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:10}}>
          <View style={{flexDirection:'row',alignItems:'flex-start',gap:10,flex:1}}>
            <View style={{width:36,height:36,borderRadius:10,backgroundColor:isDark?'#134E4A':'#F0FDFA',borderWidth:1,borderColor:isDark?'#0F766E':'#99F6E4',alignItems:'center',justifyContent:'center',marginTop:2}}>
              <Feather name="map-pin" size={16} color={isDark?'#5EEAD4':'#0D9488'}/>
            </View>
            <View style={{flex:1,gap:2}}>
              <Text style={[styles.heading,{fontSize:16}]}>
                {searching?'Updating locality…':displayLocality}
              </Text>
              <Text style={[styles.muted,{fontSize:13}]}>
                {displayFormattedAddress||'Tap the map, search above, or choose a Karnataka city chip.'}
              </Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:4}}>
                {Boolean(value.pincode)&&(
                  <View style={{paddingHorizontal:8,paddingVertical:2,borderRadius:999,backgroundColor:'#F0FDFA',borderWidth:1,borderColor:'#CCFBF1'}}>
                    <Text style={[styles.tabular,{fontSize:11,fontWeight:'600',color:'#115E59'}]}>PIN {value.pincode}</Text>
                  </View>
                )}
                <View style={{paddingHorizontal:8,paddingVertical:2,borderRadius:999,backgroundColor:'#F0FDFA',borderWidth:1,borderColor:'#CCFBF1'}}>
                  <Text style={[styles.tabular,{fontSize:11,fontWeight:'600',color:'#115E59'}]}>
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
            <Text style={{fontSize:11,fontWeight:'700',color:'#0D9488'}}>Maps ↗</Text>
          </Pressable>
        </View>

        {/* Segmented Radius Selector (Coastal Teal #0D9488) */}
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
                  style={({pressed})=>({
                    flex:1,
                    minWidth:64,
                    paddingVertical:9,
                    borderRadius:8,
                    alignItems:'center',
                    backgroundColor:active?(pressed?'#0F766E':'#0D9488'):colors.soft,
                    borderWidth:1,
                    borderColor:active?'#0F766E':colors.border,
                  })}
                >
                  <Text style={[styles.tabular,{fontSize:12,fontWeight:'700',color:active?'#FFFFFF':colors.text}]}>
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
          <Feather name="edit-3" size={14} color="#0D9488"/>
          <Text style={{fontSize:13,fontWeight:'700',color:'#0D9488'}}>Edit street / landmark / PIN</Text>
          <Feather name={drawerOpen?'chevron-up':'chevron-down'} size={15} color="#0D9488"/>
        </Pressable>

        {drawerOpen&&(
          <View style={{gap:8,padding:12,borderRadius:10,borderWidth:1,borderColor:colors.border}}>
            <Field
              label="Locality / Area *"
              editable={!disabled&&!busy}
              value={displayLocality==='Select area on map'?'':displayLocality}
              maxLength={150}
              placeholder="e.g. Begur, Bengaluru"
              onChangeText={t=>onChange({...value,locality:t,source:value.source==='google'?'google':'manual'})}
            />
            <Field
              label="6-Digit PIN Code"
              editable={!disabled&&!busy}
              value={value.pincode}
              maxLength={6}
              keyboardType="number-pad"
              placeholder="e.g. 560068"
              onChangeText={t=>onChange({...value,pincode:t.replace(/\D/g,'').slice(0,6)})}
            />
            <Field
              label="Street / Building / Address"
              editable={!disabled&&!busy}
              value={displayFormattedAddress}
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
            disabled={disabled||busy||displayLocality.trim().length<2}
            onPress={()=>
              onConfirm({
                ...value,
                locality:displayLocality,
                formattedAddress:displayFormattedAddress||displayLocality,
              })
            }
            style={({pressed})=>({
              minHeight:46,
              borderRadius:10,
              backgroundColor:
                disabled||busy||displayLocality.trim().length<2
                  ? '#94A3B8'
                  : pressed
                    ? '#0F766E'
                    : '#0D9488',
              alignItems:'center',
              justifyContent:'center',
              flexDirection:'row',
              gap:8,
              paddingHorizontal:16,
            })}
          >
            <Feather name="check-circle" size={16} color="#FFFFFF"/>
            <Text style={{color:'#FFFFFF',fontSize:15,fontWeight:'700'}}>
              {busy?'Saving…':confirmLabel}
            </Text>
          </Pressable>
        )}

        {secondaryActions}
      </View>
    </View>
  );
}
