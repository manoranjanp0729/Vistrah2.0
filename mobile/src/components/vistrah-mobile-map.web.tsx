import {createElement,useEffect,useMemo,useRef,useState} from 'react';
import {Linking,Pressable,View} from 'react-native';
import {Text} from './typography';
import {Action} from './ui';
import {api} from '../lib/api';
import {googleMapsDirectionsUrl,googleMapsEnabled,googleMapsWebKey} from '../lib/google-maps';
import {useTheme} from '../lib/theme';
import {mountGoogleMap} from '../../../shared/google-map-web';
import type {GooglePoint} from '../../../shared/google-location';
import type {MobileMapMarker,ResolvedMobilePlace,VistrahMobileMapProps} from './vistrah-mobile-map';

export type {MobileMapMarker,ResolvedMobilePlace,VistrahMobileMapProps};

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
  const node=useRef<HTMLDivElement>(null);
  const controller=useRef<Awaited<ReturnType<typeof mountGoogleMap>>|null>(null);
  const [selectedId,setSelectedId]=useState<string|number|null>(null);
  const [mapErr,setMapErr]=useState('');

  const safeCenter=useMemo<GooglePoint>(()=>({
    latitude:Number.isFinite(center.latitude)&&Math.abs(center.latitude)<=90?center.latitude:12.9716,
    longitude:Number.isFinite(center.longitude)&&Math.abs(center.longitude)<=180?center.longitude:77.5946,
  }),[center.latitude,center.longitude]);

  const callbacks=useRef({editable,disabled,onPinChange,onResolvedAddress});
  useEffect(()=>{callbacks.current={editable,disabled,onPinChange,onResolvedAddress};},[editable,disabled,onPinChange,onResolvedAddress]);

  useEffect(()=>{
    if(!googleMapsEnabled||!node.current)return;
    let alive=true;
    void mountGoogleMap(
      node.current,
      googleMapsWebKey,
      safeCenter,
      p=>{
        if(!callbacks.current.editable||callbacks.current.disabled)return;
        const rounded={latitude:Number(p.latitude.toFixed(6)),longitude:Number(p.longitude.toFixed(6))};
        callbacks.current.onPinChange?.(rounded);
        if(callbacks.current.onResolvedAddress){
          void api<{formatted_address:string;locality:string;postal_code:string;latitude:number;longitude:number}>(
            '/maps/reverse-geocode',
            {method:'POST',body:JSON.stringify(rounded)},
          ).then(res=>{
            callbacks.current.onResolvedAddress?.({
              formattedAddress:res.formatted_address,
              locality:res.locality,
              postalCode:res.postal_code,
              latitude:res.latitude,
              longitude:res.longitude,
            });
          }).catch(()=>{});
        }
      },
      ()=>alive,
    ).then(m=>{
      if(alive){controller.current=m;m.update(safeCenter);}
      else m.destroy();
    }).catch(()=>{
      if(alive)setMapErr('Google Maps unavailable in this browser session.');
    });
    return()=>{alive=false;controller.current?.destroy();controller.current=null;};
  },[]);

  useEffect(()=>{controller.current?.update(safeCenter);},[safeCenter.latitude,safeCenter.longitude]);

  const selectedMarker=markers.find(m=>m.id===selectedId)??null;

  return (
    <View style={{gap:8}}>
      {googleMapsEnabled&&!mapErr?(
        <View style={{borderRadius:12,overflow:'hidden',borderWidth:1,borderColor:colors.border}}>
          {createElement('div',{ref:node,style:{width:'100%',height},'aria-label':'VISTRAH Google Map'})}
        </View>
      ):(
        <View style={[styles.card,{gap:6}]}>
          <Text style={styles.label}>MAP PREVIEW · FALLBACK</Text>
          <Text style={[styles.muted,styles.tabular]}>
            {safeCenter.latitude.toFixed(5)}, {safeCenter.longitude.toFixed(5)}{radiusKm?` · ${radiusKm} km radius`:''}
          </Text>
          <Action
            label="Open in Google Maps"
            secondary
            onPress={()=>void Linking.openURL(googleMapsDirectionsUrl(safeCenter.latitude,safeCenter.longitude))}
          />
        </View>
      )}

      {markers.length>0&&(
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
          {markers.slice(0,8).map(m=>(
            <Pressable
              key={String(m.id)}
              onPress={()=>setSelectedId(m.id)}
              style={{
                paddingHorizontal:10,
                paddingVertical:6,
                borderRadius:999,
                backgroundColor:m.id===selectedId?'#d4af37':'#0f172a',
              }}
            >
              <Text style={{color:m.id===selectedId?'#0f172a':'#ffffff',fontSize:12,fontWeight:'600'}}>
                {m.title}{typeof m.distanceKm==='number'?` · ${m.distanceKm.toFixed(1)} km`:''}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {selectedMarker&&(
        <View style={[styles.card,{gap:6}]}>
          <Text style={styles.heading}>{selectedMarker.title}</Text>
          {Boolean(selectedMarker.subtitle)&&<Text style={styles.muted}>{selectedMarker.subtitle}</Text>}
          <Action
            label="Open in Google Maps ↗"
            secondary
            onPress={()=>void Linking.openURL(googleMapsDirectionsUrl(selectedMarker.latitude,selectedMarker.longitude,selectedMarker.title))}
          />
        </View>
      )}
    </View>
  );
}
