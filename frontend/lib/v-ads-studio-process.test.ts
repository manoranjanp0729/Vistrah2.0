import {expect,it} from 'vitest';
import {studioVideoLive,type SellerVideo,type AdvertiserAccount} from '../../shared/v-ads';
const video={id:'video',advertiser_id:'channel',status:'APPROVED',video_url:'/v-ads/media/file',upload_id:'upload',media_status:'VALIDATED'} as SellerVideo;
const account={id:'channel',status:'APPROVED'} as AdvertiserAccount;
it('only calls an approved video public when its channel and media are available',()=>{
 expect(studioVideoLive(video,[account])).toBe(true);
 for(const status of ['PENDING','REJECTED','REMOVED'] as const)expect(studioVideoLive({...video,status},[account])).toBe(false);
 for(const status of ['PENDING','REJECTED','SUSPENDED'] as const)expect(studioVideoLive(video,[{...account,status}])).toBe(false);
 expect(studioVideoLive(video,[])).toBe(false);
 expect(studioVideoLive({...video,media_status:'REVOKED'},[account])).toBe(false);
 expect(studioVideoLive({...video,video_url:''},[account])).toBe(false);
});
