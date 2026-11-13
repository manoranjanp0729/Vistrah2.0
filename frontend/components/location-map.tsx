'use client';
import {UiText,UiDiv} from "./localized-ui";
import {useEffect,useRef,useState} from 'react';
import type * as Leaflet from 'leaflet';
import {locationProviders,wrapPoint,type Point,type NearbyProvider,type LocationProviders} from '@/lib/location';

export function LocationMap({point,items=[],selectedId=null,onPin,onView,onSelect,providers=locationProviders}:{point:Point;items?:NearbyProvider[];selectedId?:number|null;onPin:(point:Point)=>void;onView:(point:Point)=>void;onSelect:(id:number)=>void;providers?:LocationProviders}){
  const element=useRef<HTMLDivElement>(null);const map=useRef<Leaflet.Map|null>(null);const library=useRef<typeof Leaflet|null>(null);
  const callbacks=useRef({onPin,onView,onSelect});const [ready,setReady]=useState(false);const [failed,setFailed]=useState(false);const [tileFailed,setTileFailed]=useState(false);
  useEffect(()=>{callbacks.current={onPin,onView,onSelect};},[onPin,onView,onSelect]);
  useEffect(()=>{let alive=true;import('leaflet').then(L=>{
    if(!alive||!element.current)return;library.current=L;
    const instance=L.map(element.current,{center:[20.5937,78.9629],zoom:5,minZoom:2,maxZoom:18,worldCopyJump:true});map.current=instance;
    if(providers.tiles)L.tileLayer(providers.tiles.urlTemplate,{attribution:providers.tiles.attribution,maxZoom:18}).on('tileerror',()=>{if(alive)setTileFailed(true);}).addTo(instance);
    instance.on('click',(event:Leaflet.LeafletMouseEvent)=>callbacks.current.onPin(wrapPoint({latitude:event.latlng.lat,longitude:event.latlng.lng})));
    instance.on('moveend',()=>{const p=instance.getCenter();callbacks.current.onView(wrapPoint({latitude:p.lat,longitude:p.lng}));});
    setReady(true);
  }).catch(()=>{if(alive)setFailed(true);});return()=>{alive=false;map.current?.remove();map.current=null;};},[providers]);
  useEffect(()=>{
    if(!ready||!map.current||!library.current)return;
    const L=library.current;const instance=map.current;
    const pin=L.marker([point.latitude,point.longitude],{draggable:true,title:'Adjust customer search pin',icon:L.divIcon({className:'location-marker customer-marker',html:'<span>+</span>',iconSize:[28,28]})}).addTo(instance);
    pin.on('dragend',()=>{const p=pin.getLatLng();callbacks.current.onPin(wrapPoint({latitude:p.lat,longitude:p.lng}));});
    instance.setView([point.latitude,point.longitude],Math.max(instance.getZoom(),11),{animate:false});
    return()=>{pin.remove();};
  },[point.latitude,point.longitude,ready]);
  useEffect(()=>{
    if(!ready||!map.current||!library.current)return;
    const L=library.current;const group=L.layerGroup().addTo(map.current);
    items.forEach(item=>{const marker=L.marker([item.latitude,item.longitude],{title:item.company,keyboard:true,icon:L.divIcon({className:`location-marker business-marker${item.id===selectedId?' selected-marker':''}`,html:`<span>${item.id}</span>`,iconSize:[32,32]})}).addTo(group);marker.on('click',()=>callbacks.current.onSelect(item.id));});
    const selected=items.find(item=>item.id===selectedId);if(selected)map.current.panTo([selected.latitude,selected.longitude],{animate:false});
    return()=>{group.remove();};
  },[items,selectedId,ready]);
  return <div>{failed&&<p role="alert"><UiText value={"The map could not load. Use the coordinate controls and provider list."}/></p>}<UiDiv  ref={element} className="location-map" aria-label={providers.tiles?'Location map powered by MapTiler':'Manual location map'}/>{tileFailed&&<p role="alert"><UiText value={"Map tiles could not load. Check your connection or map configuration; coordinate controls still work."}/></p>}{!providers.tiles&&<p className="small-label"><UiText value={"Manual coordinate map · live basemap unavailable · click or drag the + pin"}/></p>}</div>;
}

