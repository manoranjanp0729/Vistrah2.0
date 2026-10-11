export type Point={latitude:number;longitude:number};
export type CustomerLocation=Point&{locality:string;postal_code:string;address:string;landmark:string};
export type NearbyProvider=Point&{id:number;slug:string;company:string;name:string;location:string;description:string;verification_status:string;distance_km:number};
export type NearbyResult={nearby:NearbyProvider[];also_serves:NearbyProvider[];distance_kind:'straight-line';page:number;has_more_nearby:boolean;has_more_also_serves:boolean};
export const radii=[2,5,10,25] as const;
export type Radius=typeof radii[number];
export function validPoint(point:Point){return Number.isFinite(point.latitude)&&Number.isFinite(point.longitude)&&Math.abs(point.latitude)<=90&&Math.abs(point.longitude)<=180;}
export function wrapPoint(point:Point):Point{return {latitude:Math.max(-90,Math.min(90,point.latitude)),longitude:((point.longitude+180)%360+360)%360-180};}

// Providers are injected by a reviewed integration. There is intentionally no
// OSM/Nominatim/public-tile URL or external network fallback here.
export type Geocoder={id:string;search:(query:string,signal:AbortSignal)=>Promise<CustomerLocation[]>};
export type TileProvider={id:string;urlTemplate:string;attribution:string};
export type LocationProviders={tiles:TileProvider|null;geocoder:Geocoder|null};
export const locationProviders:LocationProviders={tiles:null,geocoder:null};
export const providerBlocker='Live map tiles and address lookup are unavailable until provider terms and costs are approved. Enter locality/PIN/landmark and adjust the manual coordinate pin.';

export async function resolveAddress(query:string,providers:LocationProviders,signal:AbortSignal):Promise<CustomerLocation[]>{
  if(!providers.geocoder)throw new Error(providerBlocker);
  try{const rows=await providers.geocoder.search(query,signal);return rows.filter(row=>validPoint(row)&&row.locality.trim().length>=2);}
  catch{throw new Error('Address lookup is unavailable. Enter locality/PIN and adjust the manual pin.');}
}

export function requestGps(geolocation:Pick<Geolocation,'getCurrentPosition'>|undefined):Promise<{point:Point;accuracy:number}>{
  return new Promise((resolve,reject)=>{
    if(!geolocation){reject(new Error('GPS is unavailable. Enter your location and adjust the manual pin.'));return;}
    geolocation.getCurrentPosition(position=>{
      const point={latitude:position.coords.latitude,longitude:position.coords.longitude};
      if(!validPoint(point)||!Number.isFinite(position.coords.accuracy)||position.coords.accuracy<0){reject(new Error('GPS returned an invalid position. Use the manual pin.'));return;}
      resolve({point,accuracy:position.coords.accuracy});
    },()=>reject(new Error('GPS was denied or unavailable. Enter your location and adjust the manual pin.')),
    {enableHighAccuracy:true,timeout:10000,maximumAge:0});
  });
}

// Abort and a generation check cover providers which ignore AbortSignal too.
export class LatestSearch{
  private generation=0;private controller:AbortController|null=null;
  cancel(){this.generation++;this.controller?.abort();}
  async run<T>(read:(signal:AbortSignal)=>Promise<T>):Promise<{current:true;value:T}|{current:false}>{
    this.cancel();const generation=this.generation;this.controller=new AbortController();
    try{const value=await read(this.controller.signal);return generation===this.generation?{current:true,value}:{current:false};}
    catch(error){if(generation!==this.generation)return {current:false};throw error;}
  }
}
