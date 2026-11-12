export type GooglePoint={latitude:number;longitude:number};
export type GooglePlace=GooglePoint&{label:string;postal_code:string};
type Api=<T>(path:string,options?:RequestInit)=>Promise<T>;
export async function googlePlaces(api:Api,input:{query:string}|GooglePoint):Promise<GooglePlace[]>{
 const result=await api<{items:GooglePlace[]}>('/locations/geocode',{method:'POST',body:JSON.stringify(input)});
 return result.items.filter(p=>typeof p.latitude==='number'&&Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=90&&typeof p.longitude==='number'&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180&&typeof p.label==='string'&&p.label.length>=2);
}
export const googlePrivacy='Google receives map activity and place searches. Search results stay temporary; saving Google-derived locations is not supported yet. GPS runs only when you choose Use my location. You can always enter coordinates and locality manually.';
