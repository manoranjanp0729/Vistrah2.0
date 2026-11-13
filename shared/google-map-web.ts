/** Browser-only Maps JS loader shared by Next and Expo Web. No server key here. */
import type {GooglePoint} from './google-location';
type LatLng={lat:()=>number;lng:()=>number};
type Listener={remove:()=>void};
type MapInstance={panTo:(p:{lat:number;lng:number})=>void;addListener:(name:string,handler:(event:{latLng:LatLng|null})=>void)=>Listener};
type CircleInstance={setCenter:(p:{lat:number;lng:number})=>void;setMap:(map:null)=>void};
type Maps={Map:new(node:HTMLElement,options:object)=>MapInstance;Circle:new(options:object)=>CircleInstance};
let pending:Promise<Maps>|null=null;
export function loadGoogleMap(key:string):Promise<Maps>{
 if(!key.trim())return Promise.reject(new Error('Google Maps is not configured. Use manual location.'));
 if(pending)return pending;
 pending=new Promise<Maps>((resolve,reject)=>{
  const script=document.createElement('script');const timer=setTimeout(()=>{script.remove();pending=null;reject(new Error('Google Maps timed out. Use manual location.'));},15000);
  const finish=()=>{const maps=(window as unknown as {google?:{maps?:Maps}}).google?.maps;if(!maps){pending=null;reject(new Error('Google Maps is unavailable.'));}else resolve(maps);clearTimeout(timer);};
  script.src='https://maps.googleapis.com/maps/api/js?'+new URLSearchParams({key,v:'quarterly'});script.async=true;script.onload=finish;script.onerror=()=>{clearTimeout(timer);script.remove();pending=null;reject(new Error('Google Maps could not load. Use manual location.'));};document.head.appendChild(script);
 });
 return pending;
}
export async function mountGoogleMap(node:HTMLElement,key:string,point:GooglePoint,onPin:(p:GooglePoint)=>void,isCurrent=()=>true){
 const maps=await loadGoogleMap(key);if(!isCurrent())throw new Error('Map was closed.');const initial={lat:point.latitude,lng:point.longitude};
 const map=new maps.Map(node,{center:initial,zoom:13,streetViewControl:false,fullscreenControl:false,mapTypeControl:false,gestureHandling:'cooperative'});
 const marker=new maps.Circle({map,center:initial,radius:20,fillColor:'#f97316',fillOpacity:1,strokeColor:'#fff',strokeWeight:3,clickable:false});
 const listener=map.addListener('click',event=>{if(event.latLng)onPin({latitude:event.latLng.lat(),longitude:event.latLng.lng()});});
 return {update:(p:GooglePoint)=>{const centre={lat:p.latitude,lng:p.longitude};marker.setCenter(centre);map.panTo(centre);},destroy:()=>{listener.remove();marker.setMap(null);node.replaceChildren();}};
}
