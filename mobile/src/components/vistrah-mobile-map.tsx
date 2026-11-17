import {useMemo,useState} from 'react';
import {Linking,Pressable,View} from 'react-native';
import MapView,{Circle,Marker,PROVIDER_GOOGLE} from 'react-native-maps';
import {Text} from './typography';
import {Action} from './ui';
import {api} from '../lib/api';
import {googleMapsDirectionsUrl,googleMapsEnabled} from '../lib/google-maps';
import {useTheme} from '../lib/theme';
import type {GooglePoint} from '../../../shared/google-location';

export type MobileMapMarker={
  id:string|number;
  latitude:number;
  longitude:number;
  title:string;
  subtitle?:string;
  distanceKm?:number|null;
  onAction?:()=>void;
  actionLabel?:string;
};

export type ResolvedMobilePlace={
  formattedAddress:string;
  locality:string;
  postalCode:string;
  latitude:number;
  longitude:number;
};

export type VistrahMobileMapProps={
  center:GooglePoint;
  radiusKm?:number;
  markers?:MobileMapMarker[];
  editable?:boolean;
  disabled?:boolean;
  height?:number;
  onPinChange?:(point:GooglePoint)=>void;
  onResolvedAddress?:(place:ResolvedMobilePlace)=>void;
};

function deltaForRadius(radiusKm?:number):number{
  if(!radiusKm||radiusKm<=2)return 0.035;
  if(radiusKm<=5)return 0.08;
  if(radiusKm<=15)return 0.22;
  if(radiusKm<=30)return 0.45;
  return 0.9;
}

export function VistrahMobileMap({
  center,
  radiusKm,
  markers=[],
  editable=false,
  disabled=false,
  height=280,
  onPinChange,
  onResolvedAddress,
}:VistrahMobileMapProps){
  const {colors,styles}=useTheme();
  const [selectedId,setSelectedId]=useState<string|number|null>(null);
  const [resolving,setResolving]=useState(false);

  const safeCenter=useMemo<GooglePoint>(()=>({
    latitude:Number.isFinite(center.latitude)&&Math.abs(center.latitude)<=90?center.latitude:12.9716,
    longitude:Number.isFinite(center.longitude)&&Math.abs(center.longitude)<=180?center.longitude:77.5946,
  }),[center.latitude,center.longitude]);

  const delta=deltaForRadius(radiusKm);
  const selectedMarker=useMemo(()=>markers.find(m=>m.id===selectedId)??null,[markers,selectedId]);

  async function resolvePinAddress(point:GooglePoint){
    if(!onResolvedAddress)return;
    setResolving(true);
    try{
      const res=await api<{formatted_address:string;locality:string;postal_code:string;latitude:number;longitude:number}>(
        '/maps/reverse-geocode',
        {method:'POST',body:JSON.stringify({latitude:point.latitude,longitude:point.longitude})},
      );
      onResolvedAddress({
        formattedAddress:res.formatted_address,
        locality:res.locality,
        postalCode:res.postal_code,
        latitude:res.latitude,
        longitude:res.longitude,
      });
    }catch{
      // Silent fallback when server key unset or offline.
    }finally{
      setResolving(false);
    }
  }

  function updatePin(point:GooglePoint){
    if(disabled||!editable)return;
    const rounded={
      latitude:Number(point.latitude.toFixed(6)),
      longitude:Number(point.longitude.toFixed(6)),
    };
    onPinChange?.(rounded);
    void resolvePinAddress(rounded);
  }

  if(!googleMapsEnabled){
    return (
      <View style={[styles.card,{gap:8}]}>
        <Text style={styles.label}>MAP PREVIEW · MANUAL FALLBACK</Text>
        <Text style={[styles.muted,styles.tabular]}>
          Center: {safeCenter.latitude.toFixed(5)}, {safeCenter.longitude.toFixed(5)}{radiusKm?` · ${radiusKm} km radius`:''}
        </Text>
        <Text style={styles.muted}>
          Google Maps Android key is not active in this local dev build. Coordinate inputs and spatial search remain active.
        </Text>
        <Action
          label="Open in Google Maps"
          secondary
          onPress={()=>void Linking.openURL(googleMapsDirectionsUrl(safeCenter.latitude,safeCenter.longitude))}
        />
      </View>
    );
  }

  return (
    <View style={{gap:8}}>
      <View style={{borderRadius:12,overflow:'hidden',borderWidth:1,borderColor:colors.border}}>
        <MapView
          style={{width:'100%',height}}
          provider={PROVIDER_GOOGLE}
          region={{
            latitude:safeCenter.latitude,
            longitude:safeCenter.longitude,
            latitudeDelta:delta,
            longitudeDelta:delta,
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
          onPress={event=>{
            if(editable&&!disabled){
              updatePin(event.nativeEvent.coordinate);
            }
          }}
        >
          {typeof radiusKm==='number'&&radiusKm>0&&(
            <Circle
              center={safeCenter}
              radius={radiusKm*1000}
              strokeColor="rgba(15, 23, 42, 0.65)"
              strokeWidth={1.5}
              fillColor="rgba(212, 175, 55, 0.16)"
            />
          )}

          <Marker
            coordinate={safeCenter}
            pinColor="#d4af37"
            title={editable?'Drag or tap map to set pin':'Selected location'}
            draggable={editable&&!disabled}
            onDragEnd={event=>{
              if(editable&&!disabled){
                updatePin(event.nativeEvent.coordinate);
              }
            }}
          />

          {markers.map(marker=>(
            <Marker
              key={String(marker.id)}
              coordinate={{latitude:marker.latitude,longitude:marker.longitude}}
              pinColor={marker.id===selectedId?'#d4af37':'#0f172a'}
              title={marker.title}
              description={marker.subtitle}
              onPress={()=>setSelectedId(marker.id)}
            />
          ))}
        </MapView>
      </View>

      {resolving&&<Text style={styles.muted}>Resolving address for selected pin…</Text>}

      {selectedMarker&&(
        <View style={[styles.card,{gap:6}]}>
          <Text style={styles.heading}>{selectedMarker.title}</Text>
          {Boolean(selectedMarker.subtitle)&&<Text style={styles.muted}>{selectedMarker.subtitle}</Text>}
          {typeof selectedMarker.distanceKm==='number'&&(
            <Text style={[styles.text,styles.tabular]}>{selectedMarker.distanceKm.toFixed(2)} km straight-line</Text>
          )}
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
            {selectedMarker.onAction&&(
              <Pressable
                onPress={selectedMarker.onAction}
                style={{paddingHorizontal:12,paddingVertical:8,borderRadius:8,backgroundColor:'#0f172a'}}
              >
                <Text style={{color:'#ffffff',fontWeight:'600',fontSize:13}}>{selectedMarker.actionLabel||'View'}</Text>
              </Pressable>
            )}
            <Pressable
              onPress={()=>void Linking.openURL(googleMapsDirectionsUrl(selectedMarker.latitude,selectedMarker.longitude,selectedMarker.title))}
              style={{paddingHorizontal:12,paddingVertical:8,borderRadius:8,borderWidth:1,borderColor:colors.border}}
            >
              <Text style={{color:colors.text,fontWeight:'600',fontSize:13}}>Open in Google Maps ↗</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
