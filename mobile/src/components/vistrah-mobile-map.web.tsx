import {createElement,useEffect,useMemo,useRef,useState} from 'react';
import {Linking,Pressable,View} from 'react-native';
import {Text} from './typography';
import {Action} from './ui';
import {googleMapsDirectionsUrl,googleMapsEnabled,googleMapsWebKey} from '../lib/google-maps';
import {useTheme} from '../lib/theme';
import {MobileGoogleLogoBadge} from './google-attribution';
import {mountGoogleMap} from '../../../shared/google-map-web';
import type {GooglePoint} from '../../../shared/google-location';
import {reverseGeocodeMobilePoint,type MobileMapMarker,type ResolvedMobilePlace,type VistrahMobileMapProps} from './vistrah-mobile-map';

export {reverseGeocodeMobilePoint};
export type {MobileMapMarker,ResolvedMobilePlace,VistrahMobileMapProps};

export function VistrahMobileMap({
  center,
  radiusKm,
  markers=[],
  editable=false,
  centerPinMode=false,
  disabled=false,
  height=280,
  onPinChange,
  onResolvedAddress,
}:VistrahMobileMapProps){
  const {colors,styles,mode}=useTheme();
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
          void reverseGeocodeMobilePoint(rounded).then(res=>{
            if(res)callbacks.current.onResolvedAddress?.(res);
          });
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
        <View style={{position:'relative',borderRadius:centerPinMode?0:12,overflow:'hidden',borderWidth:centerPinMode?0:1,borderColor:colors.border}}>
          {createElement('div',{ref:node,style:{width:'100%',height},'aria-label':'VISTRAH Google Map'})}
          {centerPinMode&&(
            <View
              pointerEvents="none"
              style={{
                position:'absolute',
                top:'50%',
                left:'50%',
                marginLeft:-14,
                marginTop:-34,
                alignItems:'center',
              }}
            >
              <View style={{width:28,height:28,borderRadius:14,backgroundColor:'#0f172a',borderWidth:3,borderColor:'#d4af37',alignItems:'center',justifyContent:'center'}}>
                <View style={{width:8,height:8,borderRadius:4,backgroundColor:'#d4af37'}}/>
              </View>
              <View style={{width:3,height:10,backgroundColor:'#0f172a'}}/>
            </View>
          )}
        </View>
      ):(
        <View style={[styles.card,{position:'relative',minHeight:height,justifyContent:'center',paddingBottom:38,gap:6}]}>
          <Text style={styles.label}>MAP STAGE · FALLBACK</Text>
          <Text style={[styles.muted,styles.tabular]}>
            {safeCenter.latitude.toFixed(4)}° N, {safeCenter.longitude.toFixed(4)}° E{radiusKm?` · ${radiusKm} km radius`:''}
          </Text>
          <Action
            label="Open in Google Maps"
            secondary
            onPress={()=>void Linking.openURL(googleMapsDirectionsUrl(safeCenter.latitude,safeCenter.longitude))}
          />
          <MobileGoogleLogoBadge dark={mode==='dark'}/>
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
