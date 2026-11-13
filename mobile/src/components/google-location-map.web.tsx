import {createElement,useEffect,useRef,useState} from 'react';
import {View} from 'react-native';
import {Text} from './typography';
import {mountGoogleMap} from '../../../shared/google-map-web';
import type {GooglePoint} from '../../../shared/google-location';

export function GoogleLocationMap({point,onPin,disabled=false}:{point:GooglePoint;onPin:(point:GooglePoint)=>void;disabled?:boolean}){
 const node=useRef<HTMLDivElement>(null),controller=useRef<Awaited<ReturnType<typeof mountGoogleMap>>|null>(null),callbacks=useRef({point,onPin,disabled});
 useEffect(()=>{callbacks.current={point,onPin,disabled};},[point,onPin,disabled]);
 const [error,setError]=useState('');
 useEffect(()=>{let alive=true;if(!node.current)return;void mountGoogleMap(node.current,process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY??'',callbacks.current.point,p=>{if(!callbacks.current.disabled)callbacks.current.onPin(p);},()=>alive).then(map=>{if(alive){controller.current=map;map.update(callbacks.current.point);}else map.destroy();}).catch(()=>{if(alive)setError('Google Maps could not load. Use manual location.');});return()=>{alive=false;controller.current?.destroy();controller.current=null;};},[]);
 useEffect(()=>{controller.current?.update(point);},[point]);
 return <View>{createElement('div',{ref:node,style:{height:260,width:'100%'},'aria-label':'Google Maps location picker'})}{Boolean(error)&&<Text accessibilityRole="alert">{error}</Text>}</View>;
}
