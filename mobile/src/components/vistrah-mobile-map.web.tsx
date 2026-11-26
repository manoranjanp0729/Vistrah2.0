import {createElement,useEffect,useMemo,useRef,useState,type MouseEvent as ReactMouseEvent} from 'react';
import {Linking,Pressable,View} from 'react-native';
import {Text} from './typography';
import {Action} from './ui';
import {googleMapsDirectionsUrl,googleMapsEnabled,googleMapsWebKey} from '../lib/google-maps';
import {useTheme} from '../lib/theme';
import {
  hasGoogleMapsAuthFailed,
  mountGoogleMap,
  subscribeGoogleMapsAuthFailure,
} from '../../../shared/google-map-web';
import type {GooglePoint} from '../../../shared/google-location';
import {lookupLocalAreaCity} from '../../../shared/reverse-geocode-fallback';
import {
  reverseGeocodeMobilePoint,
  type MobileMapMarker,
  type ResolvedMobilePlace,
  type VistrahMobileMapProps,
} from './vistrah-mobile-map';

export {reverseGeocodeMobilePoint};
export type {MobileMapMarker,ResolvedMobilePlace,VistrahMobileMapProps};

function osmZoomForRadius(radiusKm?:number):number{
  if(!radiusKm||radiusKm<=2)return 14;
  if(radiusKm<=5)return 13;
  if(radiusKm<=12)return 12;
  if(radiusKm<=30)return 11;
  return 9;
}

function lonToWorldX(lon:number,zoom:number):number{
  return ((lon+180)/360)*256*Math.pow(2,zoom);
}

function latToWorldY(lat:number,zoom:number):number{
  const clamped=Math.max(-85.0511,Math.min(85.0511,lat));
  const rad=(clamped*Math.PI)/180;
  return ((1-Math.log(Math.tan(rad)+1/Math.cos(rad))/Math.PI)/2)*256*Math.pow(2,zoom);
}

function worldXToLon(worldX:number,zoom:number):number{
  const raw=(worldX/(256*Math.pow(2,zoom)))*360-180;
  return ((((raw+180)%360)+360)%360)-180;
}

function worldYToLat(worldY:number,zoom:number):number{
  const n=Math.PI-(2*Math.PI*worldY)/(256*Math.pow(2,zoom));
  return (180/Math.PI)*Math.atan(0.5*(Math.exp(n)-Math.exp(-n)));
}

function metersPerPixel(lat:number,zoom:number):number{
  return (156543.03392*Math.cos((lat*Math.PI)/180))/Math.pow(2,zoom);
}

function InteractiveOsmTileStage({
  center,
  radiusKm,
  markers,
  selectedId,
  editable,
  disabled,
  height,
  borderRadius,
  borderColor,
  onPickPoint,
  onSelectMarker,
}:{
  center:GooglePoint;
  radiusKm?:number;
  markers:MobileMapMarker[];
  selectedId:string|number|null;
  editable:boolean;
  disabled:boolean;
  height:number;
  borderRadius:number;
  borderColor:string;
  onPickPoint:(pt:GooglePoint)=>void;
  onSelectMarker:(id:string|number)=>void;
}){
  const stageRef=useRef<HTMLDivElement>(null);
  const [stageSize,setStageSize]=useState<{w:number;h:number}>({w:640,h:height});
  const [zoomOffset,setZoomOffset]=useState(0);
  const baseZoom=osmZoomForRadius(radiusKm);
  const zoom=Math.max(5,Math.min(18,baseZoom+zoomOffset));

  useEffect(()=>{
    setZoomOffset(0);
  },[baseZoom]);

  useEffect(()=>{
    const el=stageRef.current;
    if(!el)return;
    const measure=()=>{
      const rect=el.getBoundingClientRect();
      if(rect.width>40&&rect.height>40){
        setStageSize({w:Math.round(rect.width),h:Math.round(rect.height)});
      }
    };
    measure();
    if(typeof ResizeObserver==='function'){
      const ro=new ResizeObserver(()=>measure());
      ro.observe(el);
      return ()=>ro.disconnect();
    }
    return undefined;
  },[height]);

  const centerWorldX=lonToWorldX(center.longitude,zoom);
  const centerWorldY=latToWorldY(center.latitude,zoom);
  const maxTile=Math.pow(2,zoom);
  const centerTileX=Math.floor(centerWorldX/256);
  const centerTileY=Math.floor(centerWorldY/256);
  const halfCols=Math.ceil(stageSize.w/512)+1;
  const halfRows=Math.ceil(stageSize.h/512)+1;

  const tiles:Array<{key:string;src:string;left:number;top:number}>=[];
  for(let dy=-halfRows;dy<=halfRows;dy++){
    const ty=centerTileY+dy;
    if(ty<0||ty>=maxTile)continue;
    for(let dx=-halfCols;dx<=halfCols;dx++){
      const rawTx=centerTileX+dx;
      const wrappedTx=((rawTx%maxTile)+maxTile)%maxTile;
      const left=Math.round(stageSize.w/2+(rawTx*256-centerWorldX));
      const top=Math.round(stageSize.h/2+(ty*256-centerWorldY));
      tiles.push({
        key:`${zoom}_${rawTx}_${ty}`,
        src:`https://tile.openstreetmap.org/${zoom}/${wrappedTx}/${ty}.png`,
        left,
        top,
      });
    }
  }

  const radiusPx=
    typeof radiusKm==='number'&&radiusKm>0
      ? Math.min(Math.max(24,Math.round((radiusKm*1000)/Math.max(0.1,metersPerPixel(center.latitude,zoom)))),900)
      : 0;

  const localArea=lookupLocalAreaCity(center);

  function handleStageClick(ev:ReactMouseEvent<HTMLDivElement>){
    if(!editable||disabled||!stageRef.current)return;
    const rect=stageRef.current.getBoundingClientRect();
    const clickX=ev.clientX-rect.left;
    const clickY=ev.clientY-rect.top;
    const nextWorldX=centerWorldX+(clickX-rect.width/2);
    const nextWorldY=centerWorldY+(clickY-rect.height/2);
    const nextLat=Number(Math.max(-85,Math.min(85,worldYToLat(nextWorldY,zoom))).toFixed(6));
    const nextLon=Number(worldXToLon(nextWorldX,zoom).toFixed(6));
    onPickPoint({latitude:nextLat,longitude:nextLon});
  }

  return createElement(
    'div',
    {
      ref:stageRef,
      role:'region',
      'aria-label':`OpenStreetMap — ${localArea?.locality||'Selected area'}`,
      onClick:handleStageClick,
      style:{
        position:'relative',
        width:'100%',
        height,
        borderRadius,
        overflow:'hidden',
        border:borderRadius?`1px solid ${borderColor}`:'none',
        backgroundColor:'#E6F4F1',
        cursor:editable&&!disabled?'crosshair':'default',
        userSelect:'none',
      },
    },
    tiles.map(tile=>
      createElement('img',{
        key:tile.key,
        src:tile.src,
        alt:'',
        draggable:false,
        loading:'eager',
        style:{
          position:'absolute',
          left:tile.left,
          top:tile.top,
          width:256,
          height:256,
          pointerEvents:'none',
          maxWidth:'none',
        },
      }),
    ),
    radiusPx>0&&
      createElement('div',{
        style:{
          position:'absolute',
          left:Math.round(stageSize.w/2-radiusPx),
          top:Math.round(stageSize.h/2-radiusPx),
          width:radiusPx*2,
          height:radiusPx*2,
          borderRadius:'50%',
          backgroundColor:'rgba(13, 148, 136, 0.14)',
          border:'2px solid rgba(15, 118, 110, 0.72)',
          pointerEvents:'none',
        },
      }),
    markers.slice(0,24).map(m=>{
      const mx=Math.round(stageSize.w/2+(lonToWorldX(m.longitude,zoom)-centerWorldX));
      const my=Math.round(stageSize.h/2+(latToWorldY(m.latitude,zoom)-centerWorldY));
      if(mx<-32||mx>stageSize.w+32||my<-32||my>stageSize.h+32)return null;
      const active=m.id===selectedId;
      return createElement(
        'button',
        {
          key:String(m.id),
          type:'button',
          title:m.title,
          onClick:(e:ReactMouseEvent<HTMLButtonElement>)=>{
            e.stopPropagation();
            onSelectMarker(m.id);
          },
          style:{
            position:'absolute',
            left:mx-12,
            top:my-12,
            width:24,
            height:24,
            borderRadius:'50%',
            backgroundColor:active?'#0D9488':'#134E4A',
            border:'2.5px solid #FFFFFF',
            boxShadow:'0 2px 6px rgba(15, 23, 42, 0.28)',
            cursor:'pointer',
            padding:0,
          },
        },
      );
    }),
    // Center Pin (Coastal Teal)
    createElement(
      'div',
      {
        style:{
          position:'absolute',
          left:'50%',
          top:'50%',
          transform:'translate(-50%, -100%)',
          display:'flex',
          flexDirection:'column',
          alignItems:'center',
          pointerEvents:'none',
        },
      },
      createElement(
        'div',
        {
          style:{
            width:28,
            height:28,
            borderRadius:14,
            backgroundColor:'#0D9488',
            border:'3px solid #FFFFFF',
            boxShadow:'0 3px 10px rgba(15, 23, 42, 0.28)',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
          },
        },
        createElement('div',{
          style:{width:8,height:8,borderRadius:4,backgroundColor:'#FFFFFF'},
        }),
      ),
      createElement('div',{
        style:{width:3,height:9,backgroundColor:'#0F766E',borderRadius:2},
      }),
    ),
    // Zoom +/- controls
    createElement(
      'div',
      {
        onClick:(e:ReactMouseEvent<HTMLDivElement>)=>e.stopPropagation(),
        style:{
          position:'absolute',
          top:10,
          right:10,
          display:'flex',
          flexDirection:'column',
          borderRadius:8,
          overflow:'hidden',
          border:'1px solid rgba(15, 23, 42, 0.16)',
          backgroundColor:'rgba(255, 255, 255, 0.96)',
          boxShadow:'0 2px 6px rgba(15, 23, 42, 0.12)',
        },
      },
      createElement(
        'button',
        {
          type:'button',
          'aria-label':'Zoom in',
          onClick:()=>setZoomOffset(z=>Math.min(5,z+1)),
          style:{
            width:30,
            height:30,
            border:'none',
            borderBottom:'1px solid #E2E8F0',
            backgroundColor:'transparent',
            color:'#0F172A',
            fontWeight:700,
            fontSize:16,
            cursor:'pointer',
          },
        },
        '+',
      ),
      createElement(
        'button',
        {
          type:'button',
          'aria-label':'Zoom out',
          onClick:()=>setZoomOffset(z=>Math.max(-5,z-1)),
          style:{
            width:30,
            height:30,
            border:'none',
            backgroundColor:'transparent',
            color:'#0F172A',
            fontWeight:700,
            fontSize:16,
            cursor:'pointer',
          },
        },
        '−',
      ),
    ),
    // Subtle area pill + OSM attribution
    localArea?.locality&&
      createElement(
        'div',
        {
          style:{
            position:'absolute',
            left:10,
            bottom:8,
            padding:'4px 10px',
            borderRadius:999,
            backgroundColor:'rgba(255, 255, 255, 0.94)',
            border:'1px solid #CCFBF1',
            color:'#115E59',
            fontSize:11,
            fontWeight:700,
            pointerEvents:'none',
          },
        },
        `${localArea.locality}${radiusKm?` · ${radiusKm} km`:''}`,
      ),
    createElement(
      'div',
      {
        style:{
          position:'absolute',
          right:8,
          bottom:6,
          padding:'2px 7px',
          borderRadius:6,
          backgroundColor:'rgba(255, 255, 255, 0.88)',
          color:'#475569',
          fontSize:10,
          pointerEvents:'none',
        },
      },
      '© OpenStreetMap',
    ),
  );
}

export function VistrahMobileMap({
  center,
  radiusKm,
  markers=[],
  selectedId:controlledSelectedId,
  hideSelectedCard=false,
  editable=false,
  centerPinMode=false,
  disabled=false,
  height=280,
  onPinChange,
  onResolvedAddress,
  onSelectMarker,
}:VistrahMobileMapProps){
  const {colors,styles}=useTheme();
  const node=useRef<HTMLDivElement>(null);
  const controller=useRef<Awaited<ReturnType<typeof mountGoogleMap>>|null>(null);
  const [internalSelectedId,setInternalSelectedId]=useState<string|number|null>(null);
  const selectedId=controlledSelectedId!==undefined?controlledSelectedId:internalSelectedId;
  const [mapErr,setMapErr]=useState(()=>
    hasGoogleMapsAuthFailed()?'Google Maps authentication failed. Switched to OpenStreetMap.':'',
  );

  const safeCenter=useMemo<GooglePoint>(()=>({
    latitude:Number.isFinite(center.latitude)&&Math.abs(center.latitude)<=90?center.latitude:12.9716,
    longitude:Number.isFinite(center.longitude)&&Math.abs(center.longitude)<=180?center.longitude:77.5946,
  }),[center.latitude,center.longitude]);

  const callbacks=useRef({editable,disabled,onPinChange,onResolvedAddress,onSelectMarker});
  useEffect(()=>{
    callbacks.current={editable,disabled,onPinChange,onResolvedAddress,onSelectMarker};
  },[editable,disabled,onPinChange,onResolvedAddress,onSelectMarker]);

  function applyPinnedPoint(p:GooglePoint){
    if(!callbacks.current.editable||callbacks.current.disabled)return;
    const rounded={latitude:Number(p.latitude.toFixed(6)),longitude:Number(p.longitude.toFixed(6))};
    callbacks.current.onPinChange?.(rounded);
    if(callbacks.current.onResolvedAddress){
      void reverseGeocodeMobilePoint(rounded).then(res=>{
        if(res)callbacks.current.onResolvedAddress?.(res);
      });
    }
  }

  useEffect(()=>{
    const unsub=subscribeGoogleMapsAuthFailure(reason=>{
      controller.current?.destroy();
      controller.current=null;
      setMapErr(reason);
    });
    return unsub;
  },[]);

  useEffect(()=>{
    if(!googleMapsEnabled||Boolean(mapErr)||!node.current)return;
    let alive=true;
    void mountGoogleMap(
      node.current,
      googleMapsWebKey,
      safeCenter,
      p=>applyPinnedPoint(p),
      ()=>alive,
      reason=>{
        if(!alive)return;
        controller.current?.destroy();
        controller.current=null;
        setMapErr(reason);
      },
    ).then(m=>{
      if(alive&&!hasGoogleMapsAuthFailed()){
        controller.current=m;
        m.update(safeCenter);
        m.syncOverlays({
          center:safeCenter,
          radiusKm,
          markers:markers.map(mk=>({id:mk.id,latitude:mk.latitude,longitude:mk.longitude,title:mk.title})),
          selectedId,
          onSelectMarker:id=>{
            setInternalSelectedId(id);
            callbacks.current.onSelectMarker?.(id);
          },
        });
      }else{
        m.destroy();
        if(alive)setMapErr('Switched to OpenStreetMap.');
      }
    }).catch(()=>{
      if(alive)setMapErr('Google Maps unavailable in this browser session.');
    });
    return()=>{alive=false;controller.current?.destroy();controller.current=null;};
  },[mapErr]);

  useEffect(()=>{
    controller.current?.update(safeCenter);
  },[safeCenter.latitude,safeCenter.longitude]);

  useEffect(()=>{
    controller.current?.syncOverlays({
      center:safeCenter,
      radiusKm,
      markers:markers.map(mk=>({id:mk.id,latitude:mk.latitude,longitude:mk.longitude,title:mk.title})),
      selectedId,
      onSelectMarker:id=>{
        setInternalSelectedId(id);
        callbacks.current.onSelectMarker?.(id);
      },
    });
  },[safeCenter.latitude,safeCenter.longitude,radiusKm,markers,selectedId]);

  const selectedMarker=markers.find(m=>m.id===selectedId)??null;

  return (
    <View style={{gap:8}}>
      {googleMapsEnabled&&!mapErr?(
        <View style={{position:'relative',borderRadius:centerPinMode?0:12,overflow:'hidden',borderWidth:centerPinMode?0:1,borderColor:colors.border}}>
          {createElement('div',{ref:node,style:{width:'100%',height},'aria-label':'VISTRAH Map'})}
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
              <View style={{width:28,height:28,borderRadius:14,backgroundColor:'#0D9488',borderWidth:3,borderColor:'#FFFFFF',alignItems:'center',justifyContent:'center'}}>
                <View style={{width:8,height:8,borderRadius:4,backgroundColor:'#FFFFFF'}}/>
              </View>
              <View style={{width:3,height:10,backgroundColor:'#0F766E'}}/>
            </View>
          )}
        </View>
      ):(
        <InteractiveOsmTileStage
          center={safeCenter}
          radiusKm={radiusKm}
          markers={markers}
          selectedId={selectedId}
          editable={editable}
          disabled={disabled}
          height={height}
          borderRadius={centerPinMode?0:12}
          borderColor={colors.border}
          onPickPoint={applyPinnedPoint}
          onSelectMarker={id=>{
            setInternalSelectedId(id);
            onSelectMarker?.(id);
          }}
        />
      )}

      {markers.length>0&&!hideSelectedCard&&(
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
          {markers.slice(0,8).map(m=>{
            const active=m.id===selectedId;
            return (
              <Pressable
                key={String(m.id)}
                onPress={()=>{
                  setInternalSelectedId(m.id);
                  onSelectMarker?.(m.id);
                }}
                style={{
                  paddingHorizontal:10,
                  paddingVertical:6,
                  borderRadius:999,
                  backgroundColor:active?'#0D9488':'#F0FDFA',
                  borderWidth:1,
                  borderColor:active?'#0F766E':'#99F6E4',
                }}
              >
                <Text style={{color:active?'#FFFFFF':'#115E59',fontSize:12,fontWeight:'600'}}>
                  {m.title}{typeof m.distanceKm==='number'?` · ${m.distanceKm.toFixed(1)} km`:''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {selectedMarker&&!hideSelectedCard&&(
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
