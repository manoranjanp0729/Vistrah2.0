import type {Api,AdvertiserAccount,SellerVideo} from './v-ads';
export type Metrics={views:number;likes:number;comments:number};
export type Performance={totals:Metrics & {videos:number};items:(Metrics & {id:string;title:string;status:string})[];page:number;has_more:boolean;view_policy:string};
export type History={items:{id:number;actor_id:number|null;action:string;created_at:string;details:{reason?:string;previous_status?:string;status?:string}}[];page:number;has_more:boolean};
export type AdminAccount=AdvertiserAccount & {owner_id:number|null};
export type AdminVideo=Metrics & {id:string;title:string;description:string;status:SellerVideo['status'];advertiser:AdvertiserAccount;owner_id:number|null;preview_available:boolean;video_url?:string;media_upload_id?:string|null};
export type TargetingStatus='PENDING'|'APPROVED'|'REJECTED'|'SUPERSEDED';
export type TargetingRevision={revision:number;latitude:number;longitude:number;radius_km:number;targeting_radius_km:number;target_regions:string[];status:TargetingStatus;created_at:string|null;reviewed_at:string|null;reviewed_by:number|null};
export type AdTargeting={ad_id:string;video_id:string;advertiser_id:string;configured:boolean;created_at:string|null;active_revision:TargetingRevision|null;pending_revision:TargetingRevision|null;latest_revision:TargetingRevision|null;revisions:TargetingRevision[]};
export type TargetingInput={latitude:number;longitude:number;radius_km:number;target_regions:string[]};
export type AdminTargeting={id:string;rule_id:string;video_id:string;video_title:string;video_status:SellerVideo['status'];advertiser:AdvertiserAccount;owner_id:number|null;revision:number;latitude:number;longitude:number;radius_km:number;targeting_radius_km:number;target_regions:string[];status:TargetingStatus;created_at:string|null;reviewed_at:string|null;reviewed_by:number|null;active_revision:{revision:number;latitude:number;longitude:number;radius_km:number;target_regions:string[]}|null};
export type Queue<T>={items:T[];page:number;has_more:boolean};
const MAX_TARGETING_RADIUS_KM=Math.PI*6371.0088;
export function parseTargetingInput(latitude:string|number,longitude:string|number,radiusKm:string|number,regionsText=''):TargetingInput{
 const latStr=String(latitude).trim(),lonStr=String(longitude).trim(),radStr=String(radiusKm).trim();
 const lat=latStr===''?NaN:Number(latStr),lon=lonStr===''?NaN:Number(lonStr),rad=radStr===''?NaN:Number(radStr);
 if(!Number.isFinite(lat)||lat<-90||lat>90)throw new Error('Enter a valid latitude between -90 and 90.');
 if(!Number.isFinite(lon)||lon<-180||lon>180)throw new Error('Enter a valid longitude between -180 and 180.');
 if(!Number.isFinite(rad)||rad<=0||rad>MAX_TARGETING_RADIUS_KM)throw new Error('Enter a valid positive targeting radius in km.');
 const seen=new Set<string>(),target_regions:string[]=[];
 for(const raw of regionsText.split(/[,\n]+/)){
  const region=raw.trim();if(!region)continue;
  if(region.length>120)throw new Error('Each target region must be 120 characters or fewer.');
  const key=region.toLowerCase();
  if(!seen.has(key)){seen.add(key);target_regions.push(region);}
 }
 if(target_regions.length>50)throw new Error('At most 50 target regions are allowed.');
 return {latitude:lat,longitude:lon,radius_km:rad,target_regions};
}
export function advanceView(watched:number,delta:number,playing:boolean){
 return watched+(playing&&delta>0&&delta<=1.5?delta:0);
}
export function moderationInput(expected_status:string,reason:string){
 const clean=reason.trim();if(clean.length<10||clean.length>2000)throw new Error('Enter a reason of 10 to 2000 characters.');
 return {expected_status,reason:clean};
}
export function managementClient(api:Api){
 const id=encodeURIComponent;
 const post=<T>(path:string,body:unknown)=>api<T>(path,{method:'POST',body:JSON.stringify(body)});
 return {
  profile:(account:AdvertiserAccount,name:string,description:string)=>{
   if(!account.review_token)throw new Error('Profile editing is not available yet.');
   return post<AdvertiserAccount>('/v-ads/advertisers/'+id(account.id)+'/profile',{name:name.trim(),description:description.trim(),expected_revision:account.review_token});
  },
  withdraw:(video:SellerVideo,reason:string)=>post('/v-ads/videos/'+id(video.id)+'/withdraw',moderationInput(video.status,reason)),
  editVideo:(videoId:string,title:string,description:string)=>post<{id:string;title:string;description:string;status:SellerVideo['status']}>('/v-ads/videos/'+id(videoId)+'/edit',{title:title.trim(),description:description.trim()}),
  deleteVideo:(videoId:string)=>api<{id:string;status:'REMOVED'}>('/v-ads/videos/'+id(videoId),{method:'DELETE'}),
  release:(uploadId:string)=>api('/v-ads/uploads/'+id(uploadId),{method:'DELETE'}),
  history:(accountId:string,page=1)=>api<History>('/v-ads/advertisers/'+id(accountId)+'/history?page='+page),
  analytics:(page=1)=>api<Performance>('/v-ads/analytics?page='+page),
  view:(videoId:string)=>post<{counted:boolean}>('/v-ads/reels/'+id(videoId)+'/view',{}),
  targeting:(videoId:string)=>api<AdTargeting>('/v-ads/seller/targeting/'+id(videoId)),
  submitTargeting:(videoId:string,input:TargetingInput)=>post<AdTargeting>('/v-ads/seller/targeting/'+id(videoId),input),
 };
}
export function adminVAdsClient(api:Api){
 const id=encodeURIComponent;
 const post=(path:string,body:unknown)=>api(path,{method:'POST',body:JSON.stringify(body)});
 return {
  accounts:(status:string,page=1)=>api<Queue<AdminAccount>>('/admin/v-ads/advertisers?status='+id(status)+'&page='+page),
  videos:(status:string,page=1)=>api<Queue<AdminVideo>>('/admin/v-ads/videos?status='+id(status)+'&page='+page),
  targeting:(status:string,page=1)=>api<Queue<AdminTargeting>>('/admin/v-ads/targeting?status='+id(status)+'&page='+page),
  reviewAccount:(row:AdminAccount,status:'APPROVED'|'REJECTED',reason:string)=>{
   if(!row.review_token)throw new Error('Refresh the account before reviewing.');
   return post('/admin/v-ads/advertisers/'+id(row.id)+'/review',{status,reason:moderationInput(row.status,reason).reason,expected_revision:row.review_token});
  },
  moderateAccount:(row:AdminAccount,status:'SUSPENDED'|'PENDING',reason:string)=>post('/admin/v-ads/advertisers/'+id(row.id)+'/moderate',{status,...moderationInput(row.status,reason)}),
  reviewVideo:(row:AdminVideo,status:'APPROVED'|'REJECTED',reason:string)=>post('/admin/v-ads/videos/'+id(row.id)+'/review',{status,reason:moderationInput(row.status,reason).reason}),
  removeVideo:(row:AdminVideo,reason:string)=>post('/admin/v-ads/videos/'+id(row.id)+'/remove',moderationInput(row.status,reason)),
  reviewTargeting:(row:Pick<AdminTargeting,'rule_id'|'revision'>,status:'APPROVED'|'REJECTED'|'SUPERSEDED',reason:string)=>{
   const clean=reason.trim();
   if(status==='REJECTED'&&!clean)throw new Error('Rejection reason is required.');
   if(clean.length>2000)throw new Error('Reason must be 2000 characters or fewer.');
   return post('/admin/v-ads/targeting/'+id(row.rule_id)+'/review',{status,reason:clean,expected_revision:row.revision});
  },
  history:(kind:'advertisers'|'videos',entityId:string,page=1)=>api<History>('/admin/v-ads/'+kind+'/'+id(entityId)+'/history?page='+page),
  analytics:(page=1)=>api<Performance>('/admin/v-ads/analytics?page='+page),
 };
}
