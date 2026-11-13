export type GeoPoint={latitude:number;longitude:number};
type Feature={id?:string;text?:string;place_name?:string;place_type?:string[];context?:Feature[]};
export type PlaceLabel={label:string;city:string;postal_code:string};
function matches(feature:Feature,types:string[]){return types.some(type=>feature.place_type?.includes(type)||feature.id?.startsWith(type+'.'));}
export function placeLabel(data:{features?:Feature[]}):PlaceLabel{
 const features=data.features??[];const rows=features.flatMap(feature=>[feature,...(feature.context??[])]);
 const find=(types:string[])=>types.map(type=>rows.find(row=>matches(row,[type])&&row.text?.trim())).find(Boolean)?.text?.trim()??'';
 const city=find(['municipality','place']);const area=find(['neighbourhood','locality','municipal_district']);
 const label=[area,city].filter((value,index,array)=>value&&array.indexOf(value)===index).join(', ');
 if(!label)throw new Error('No place or city was found. Enter your locality manually.');
 const postal=find(['postal_code','postcode']);return {label:label.slice(0,150),city,postal_code:/^[0-9]{6}$/.test(postal)?postal:''};
}
export async function reversePlace(point:GeoPoint,key:string,headers:Record<string,string>={}):Promise<PlaceLabel>{
 if(!Number.isFinite(point.latitude)||!Number.isFinite(point.longitude)||Math.abs(point.latitude)>90||Math.abs(point.longitude)>180)throw new Error('Invalid location coordinates.');
 if(!key.trim())throw new Error('Place lookup is not configured yet. Enter your locality manually.');
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
 try{const query=new URLSearchParams({key,language:'en'});const response=await fetch(`https://api.maptiler.com/geocoding/${point.longitude},${point.latitude}.json?${query}`,{signal:controller.signal,headers,redirect:'error'});
 if(!response.ok)throw new Error('Place lookup is unavailable. Enter your locality manually.');
 return placeLabel(await response.json());
 }catch(error){if(error instanceof Error&&['No place','Place lookup'].some(prefix=>error.message.startsWith(prefix)))throw error;throw new Error('Place lookup could not connect. Enter your locality manually.',{cause:error});}finally{clearTimeout(timer);}
}
export function previewTiles(point:GeoPoint,width:number,height:number,zoom:number){
 const n=2**zoom;const latitude=Math.max(-85.05112878,Math.min(85.05112878,point.latitude));const sin=Math.sin(latitude*Math.PI/180);
 const cx=(point.longitude+180)/360*n*256,cy=(.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*n*256;
 const rows=[];for(let x=Math.floor((cx-width/2)/256);x<=Math.floor((cx+width/2)/256);x++)for(let y=Math.floor((cy-height/2)/256);y<=Math.floor((cy+height/2)/256);y++)if(y>=0&&y<n)rows.push({x:((x%n)+n)%n,y,left:x*256-cx+width/2,top:y*256-cy+height/2});return rows;
}
