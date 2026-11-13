import {describe,it,expect,vi} from 'vitest';
import {googlePlaces} from '../../shared/google-location';
import {loadGoogleMap,mountGoogleMap} from '../../shared/google-map-web';

describe('Google location boundary',()=>{
 it('sends searches by POST and discards invalid upstream coordinates',async()=>{
  const valid={latitude:12,longitude:77,label:'Fixture town',postal_code:'560001'};
  const api=vi.fn().mockResolvedValue({items:[valid,{...valid,latitude:91},{...valid,longitude:NaN},{...valid,label:''}]});
  expect(await googlePlaces(api,{query:'Private fixture'})).toEqual([valid]);
  expect(api).toHaveBeenCalledWith('/locations/geocode',{method:'POST',body:JSON.stringify({query:'Private fixture'})});
 });
 it('uses the same private endpoint for explicit reverse lookup',async()=>{
  const api=vi.fn().mockResolvedValue({items:[]});await googlePlaces(api,{latitude:12,longitude:77});
  expect(api.mock.calls[0][1].body).toBe('{"latitude":12,"longitude":77}');
 });
 it('never loads Google Maps without a configured browser key',async()=>{
  await expect(loadGoogleMap('')).rejects.toThrow('not configured');
 });
 it('updates a selected map pin and cleans up; a closed picker never mounts',async()=>{
  let click!:(event:{latLng:{lat:()=>number;lng:()=>number}})=>void;
  const remove=vi.fn(),setCenter=vi.fn(),panTo=vi.fn(),setMap=vi.fn(),replaceChildren=vi.fn();
  const Map=vi.fn(function(){return {panTo,addListener:(_name:string,handler:typeof click)=>{click=handler;return {remove};}};});
  const Circle=vi.fn(function(){return {setCenter,setMap};});
  vi.stubGlobal('window',{google:{maps:{Map,Circle}}});
  vi.stubGlobal('document',{createElement:()=>({remove:vi.fn()}),head:{appendChild:(script:{onload:()=>void})=>queueMicrotask(()=>script.onload())}});
  try{
   const onPin=vi.fn(),node={replaceChildren} as unknown as HTMLElement;
   const map=await mountGoogleMap(node,'fixture-public-key',{latitude:12,longitude:77},onPin);
   click({latLng:{lat:()=>13,lng:()=>78}});expect(onPin).toHaveBeenCalledWith({latitude:13,longitude:78});
   map.update({latitude:14,longitude:79});expect(setCenter).toHaveBeenCalledWith({lat:14,lng:79});
   map.destroy();expect(remove).toHaveBeenCalledOnce();expect(setMap).toHaveBeenCalledWith(null);expect(replaceChildren).toHaveBeenCalledOnce();
   await expect(mountGoogleMap(node,'fixture-public-key',{latitude:12,longitude:77},onPin,()=>false)).rejects.toThrow('closed');
   expect(Map).toHaveBeenCalledOnce();
  }finally{vi.unstubAllGlobals();}
 });
});
