import type { CreateVideoInput, CreatedVideoResult } from './v-ads-templates';
export type { CreateVideoInput, CreatedVideoResult };
export type Advertiser = {id:string;name:string;handle:string;description?:string};
export type AdType = 'BRAND' | 'PRODUCT';

export type BrandProduct = {
  id: string;
  title: string;
  description: string;
  unit_price_paise: number;
  currency: string;
  delivery_fee_paise?: number | null;
  fulfilment_modes?: string[];
};

export type AdProductMeta = {
  ad_type: 'PRODUCT';
  product_name?: string;
  product_price?: string;
  delivery_info?: string;
  product_id?: string;
};

export type AdBrandMeta = {
  ad_type: 'BRAND';
  brand_highlights?: string;
  products_available?: string;
};

export type AdMetadata = AdProductMeta | AdBrandMeta;

export type Reel = {
  id:string;
  title:string;
  description:string;
  video_url:string;
  published_at:string|null;
  advertiser:Advertiser;
  likes_count:number;
  comments_count:number;
  ad_type?: AdType;
  product_id?: string | null;
  product_name?: string | null;
  product_price?: string | null;
  delivery_info?: string | null;
  products_available?: string | null;
  distance_km?: number;
  proximity?: 'local' | 'farther';
  targeting_radius_km?: number;
};

export type FeedFilter = {
  lat: number;
  lon: number;
  radius_km?: number;
  local_only?: boolean;
};

export type Comment = {id:string;user_id:number;body:string;created_at:string};
export type Engagement = {liked:boolean;likes_count:number};
export type Feed = {items:Reel[];page:number;has_more:boolean};
export type AdvertiserProfile = Advertiser & {videos:Reel[]; products?: BrandProduct[]};
export type AdvertiserAccount = Advertiser & {status:'PENDING'|'APPROVED'|'REJECTED'|'SUSPENDED';review_token?:string};

export type SellerVideo = {
  id:string;
  advertiser_id:string;
  title:string;
  description:string;
  status:'PENDING'|'APPROVED'|'REJECTED'|'REMOVED';
  created_at:string;
  review_reason:string;
  upload_id?:string|null;
  media_status?:string|null;
  views?:number;
  likes?:number;
  comments?:number;
  video_url?:string;
  account_name?:string;
  account_handle?:string;
  is_owner?:boolean;
  ad_type?: AdType;
  product_id?: string | null;
  product_name?: string | null;
  product_price?: string | null;
  delivery_info?: string | null;
  products_available?: string | null;
};

export type Upload = {id:string;advertiser_id:string;size_bytes:number;video_id:string|null};
export type Workspace = {accounts:AdvertiserAccount[];videos:SellerVideo[];uploads:Upload[];uploads_available:boolean;page:number;has_more:boolean};
export type Api = <T>(path:string, options?:RequestInit)=>Promise<T>;
const id=(value:string)=>encodeURIComponent(value);
export const maxVideoBytes=100*1024*1024;

export const META_TAG_START = '<!--V_AD_META:';
export const META_TAG_END = ':V_AD_META-->';

export function encodeAdDescription(userDescription: string, meta?: AdMetadata): string {
  if (!meta) return userDescription.trim();
  const jsonStr = JSON.stringify(meta);
  return `${userDescription.trim()}\n\n${META_TAG_START}${jsonStr}${META_TAG_END}`;
}

export function parseAdDescription(rawDescription: string = ''): { description: string; meta: AdMetadata } {
  if (!rawDescription) {
    return {
      description: '',
      meta: { ad_type: 'BRAND', products_available: 'All verified services & catalog products' },
    };
  }
  const startIdx = rawDescription.indexOf(META_TAG_START);
  const endIdx = rawDescription.indexOf(META_TAG_END);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const jsonStr = rawDescription.slice(startIdx + META_TAG_START.length, endIdx);
    const cleanDesc = (rawDescription.slice(0, startIdx) + rawDescription.slice(endIdx + META_TAG_END.length)).trim();
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.ad_type === 'PRODUCT' || parsed.ad_type === 'BRAND') {
        return { description: cleanDesc, meta: parsed as AdMetadata };
      }
    } catch {}
  }
  return {
    description: rawDescription.trim(),
    meta: { ad_type: 'BRAND', products_available: 'All verified services & catalog products' },
  };
}

export function validateVideoFile(name:string,size:number) {
  if(!/\.mp4$/i.test(name)||!Number.isSafeInteger(size)||size<1||size>maxVideoBytes)
    throw new Error('Choose an MP4 video between 1 byte and 100 MB.');
}

export function mediaUrl(path:string,apiBase:string,assetBase='') {
  if(/^https?:\/\//.test(path)){
    const parsed=new URL(path);
    const trusted=[apiBase,assetBase].filter(value=>/^https?:\/\//.test(value)).map(value=>new URL(value).origin);
    if(parsed.username||parsed.password||parsed.search||parsed.hash||!trusted.includes(parsed.origin))throw new Error('This video has no supported playback source.');
    path=parsed.pathname;
  }
  if(/^\/v-ads\/media\/[a-zA-Z0-9-]+$/.test(path))return apiBase.replace(/\/$/,'')+path;
  if(/^\/admin\/v-ads\/videos\/[a-zA-Z0-9-]+\/preview$/.test(path))return apiBase.replace(/\/$/,'')+path;
  if(/^\/videos\/v-ads\/(?:[a-zA-Z0-9_./ -]|%20)+\.mp4$/.test(path)&&!path.includes('..'))return assetBase.replace(/\/$/,'')+path;
  throw new Error('This video has no supported playback source.');
}

export function sharePath(videoId:string){return '/v-ads?video='+id(videoId);}

export function mergeReels(existing:Reel[],incoming:Reel[]) {
  const seen=new Set(existing.map(item=>item.id));
  return [...existing,...incoming.filter(item=>!seen.has(item.id)&&!!seen.add(item.id))];
}

export function vAdsClient(api:Api) {
  const json=(body:unknown)=>JSON.stringify(body);
  return {
    feed:(page=1,filter?:FeedFilter)=>{
      const params=new URLSearchParams({page:String(page)});
      if(filter&&Number.isFinite(filter.lat)&&Number.isFinite(filter.lon)&&Math.abs(filter.lat)<=90&&Math.abs(filter.lon)<=180){
        params.set('lat',String(filter.lat));
        params.set('lon',String(filter.lon));
        if(filter.radius_km!=null&&Number.isFinite(filter.radius_km)&&filter.radius_km>0)params.set('radius_km',String(filter.radius_km));
        if(filter.local_only)params.set('local_only','true');
      }
      return api<Feed>('/v-ads/reels?'+params.toString());
    },
    reel:(videoId:string)=>api<Reel>('/v-ads/reels/'+id(videoId)),
    engagement:(videoId:string)=>api<Engagement>('/v-ads/reels/'+id(videoId)+'/engagement'),
    like:(videoId:string,liked:boolean)=>api<Engagement>('/v-ads/reels/'+id(videoId)+'/like',{method:liked?'POST':'DELETE'}),
    comments:(videoId:string,page=1)=>api<{items:Comment[];page:number}>('/v-ads/reels/'+id(videoId)+'/comments?page='+page),
    comment:(videoId:string,body:string)=>api<Comment>('/v-ads/reels/'+id(videoId)+'/comments',{method:'POST',body:json({body:body.trim()})}),
    profile:(advertiserId:string)=>api<AdvertiserProfile>('/v-ads/advertisers/'+id(advertiserId)),
    workspace:(page=1)=>api<Workspace>('/v-ads/me?page='+page),
    register:(name:string,handle:string,description:string)=>api<AdvertiserAccount>('/v-ads/advertisers/request',{method:'POST',body:json({name:name.trim(),handle:handle.trim(),description:description.trim()})}),
    submit:(advertiser_id:string,upload_id:string,title:string,description:string,meta?:AdMetadata)=>api<{id:string;status:'PENDING'|'APPROVED'}>('/v-ads/videos/submit',{method:'POST',body:json({advertiser_id,upload_id,title:title.trim(),description:encodeAdDescription(description,meta)})}),
    createVideo:(advertiser_id:string,payload:CreateVideoInput)=>api<CreatedVideoResult>('/v-ads/advertisers/'+id(advertiser_id)+'/create-video',{method:'POST',body:json(payload)}),
  };
}

export function studioVideoLive(video:SellerVideo,accounts:AdvertiserAccount[]){
 const account=accounts.find(item=>item.id===video.advertiser_id);
 return video.status==='APPROVED'&&account?.status==='APPROVED'&&Boolean(video.video_url)&&(!video.upload_id||video.media_status==='VALIDATED');
}
