import type {Api,AdvertiserAccount,SellerVideo} from './v-ads';
export type Metrics={views:number;likes:number;comments:number};
export type Performance={totals:Metrics & {videos:number};items:(Metrics & {id:string;title:string;status:string})[];page:number;has_more:boolean;view_policy:string};
export type History={items:{id:number;actor_id:number|null;action:string;created_at:string;details:{reason?:string;previous_status?:string;status?:string}}[];page:number;has_more:boolean};
export type AdminAccount=AdvertiserAccount & {owner_id:number|null};
export type AdminVideo=Metrics & {id:string;title:string;description:string;status:SellerVideo['status'];advertiser:AdvertiserAccount;owner_id:number|null;preview_available:boolean;video_url?:string;media_upload_id?:string|null};
export type Queue<T>={items:T[];page:number;has_more:boolean};
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
 };
}
export function adminVAdsClient(api:Api){
 const id=encodeURIComponent;
 const post=(path:string,body:unknown)=>api(path,{method:'POST',body:JSON.stringify(body)});
 return {
  accounts:(status:string,page=1)=>api<Queue<AdminAccount>>('/admin/v-ads/advertisers?status='+id(status)+'&page='+page),
  videos:(status:string,page=1)=>api<Queue<AdminVideo>>('/admin/v-ads/videos?status='+id(status)+'&page='+page),
  reviewAccount:(row:AdminAccount,status:'APPROVED'|'REJECTED',reason:string)=>{
   if(!row.review_token)throw new Error('Refresh the account before reviewing.');
   return post('/admin/v-ads/advertisers/'+id(row.id)+'/review',{status,reason:moderationInput(row.status,reason).reason,expected_revision:row.review_token});
  },
  moderateAccount:(row:AdminAccount,status:'SUSPENDED'|'PENDING',reason:string)=>post('/admin/v-ads/advertisers/'+id(row.id)+'/moderate',{status,...moderationInput(row.status,reason)}),
  reviewVideo:(row:AdminVideo,status:'APPROVED'|'REJECTED',reason:string)=>post('/admin/v-ads/videos/'+id(row.id)+'/review',{status,reason:moderationInput(row.status,reason).reason}),
  removeVideo:(row:AdminVideo,reason:string)=>post('/admin/v-ads/videos/'+id(row.id)+'/remove',moderationInput(row.status,reason)),
  history:(kind:'advertisers'|'videos',entityId:string,page=1)=>api<History>('/admin/v-ads/'+kind+'/'+id(entityId)+'/history?page='+page),
  analytics:(page=1)=>api<Performance>('/admin/v-ads/analytics?page='+page),
 };
}
