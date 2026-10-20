export type Advertiser = {id:string;name:string;handle:string;description?:string};
export type Reel = {id:string;title:string;description:string;video_url:string;published_at:string|null;advertiser:Advertiser;likes_count:number;comments_count:number};
export type Comment = {id:string;user_id:number;body:string;created_at:string};
export type Engagement = {liked:boolean;likes_count:number};
export type Feed = {items:Reel[];page:number;has_more:boolean};
export type AdvertiserProfile = Advertiser & {videos:Reel[]};
export type AdvertiserAccount = Advertiser & {status:'PENDING'|'APPROVED'|'REJECTED'|'SUSPENDED';review_token?:string};
export type SellerVideo = {id:string;advertiser_id:string;title:string;description:string;status:'PENDING'|'APPROVED'|'REJECTED'|'REMOVED';created_at:string;review_reason:string;upload_id?:string|null;media_status?:string|null};
export type Upload = {id:string;advertiser_id:string;size_bytes:number;video_id:string|null};
export type Workspace = {accounts:AdvertiserAccount[];videos:SellerVideo[];uploads:Upload[];uploads_available:boolean;page:number;has_more:boolean};
export type Api = <T>(path:string, options?:RequestInit)=>Promise<T>;
const id=(value:string)=>encodeURIComponent(value);
export const maxVideoBytes=100*1024*1024;
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
  // All newly uploaded media must stay on our authenticated media boundary.
  if(/^\/v-ads\/media\/[a-zA-Z0-9-]+$/.test(path))return apiBase.replace(/\/$/,'')+path;
  // Preserve existing reviewed demo assets without accepting arbitrary hosts.
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
    feed:(page=1)=>api<Feed>('/v-ads/reels?page='+page),
    reel:(videoId:string)=>api<Reel>('/v-ads/reels/'+id(videoId)),
    engagement:(videoId:string)=>api<Engagement>('/v-ads/reels/'+id(videoId)+'/engagement'),
    like:(videoId:string,liked:boolean)=>api<Engagement>('/v-ads/reels/'+id(videoId)+'/like',{method:liked?'POST':'DELETE'}),
    comments:(videoId:string,page=1)=>api<{items:Comment[];page:number}>('/v-ads/reels/'+id(videoId)+'/comments?page='+page),
    comment:(videoId:string,body:string)=>api<Comment>('/v-ads/reels/'+id(videoId)+'/comments',{method:'POST',body:json({body:body.trim()})}),
    profile:(advertiserId:string)=>api<AdvertiserProfile>('/v-ads/advertisers/'+id(advertiserId)),
    workspace:(page=1)=>api<Workspace>('/v-ads/me?page='+page),
    register:(name:string,handle:string,description:string)=>api<AdvertiserAccount>('/v-ads/advertisers/request',{method:'POST',body:json({name:name.trim(),handle:handle.trim(),description:description.trim()})}),
    submit:(advertiser_id:string,upload_id:string,title:string,description:string)=>api<{id:string;status:'PENDING'}>('/v-ads/videos/submit',{method:'POST',body:json({advertiser_id,upload_id,title:title.trim(),description:description.trim()})}),
  };
}
