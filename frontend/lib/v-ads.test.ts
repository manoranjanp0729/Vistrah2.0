import {describe,it,expect} from 'vitest';
import {vAdsClient,validateVideoFile,maxVideoBytes,mediaUrl,mergeReels,sharePath,type Api,type Reel} from '../../shared/v-ads';
describe('shared web/mobile V Ads contract',()=>{
 it('submits only an owned upload reference and trimmed copy',async()=>{
  const calls:{path:string;options?:RequestInit}[]=[];
  const api:Api=async<T>(path:string,options?:RequestInit)=>{calls.push({path,options});return {id:'video',status:'PENDING'} as T;};
  const client=vAdsClient(api);await client.submit('advertiser','owned-upload',' Title ',' Description ');
  expect(calls[0].path).toBe('/v-ads/videos/submit');
  expect(JSON.parse(calls[0].options!.body as string)).toEqual({advertiser_id:'advertiser',upload_id:'owned-upload',title:'Title',description:'Description'});
  await client.like('video',false);expect(calls[1].options?.method).toBe('DELETE');
  await client.comments('video',2);expect(calls[2].path).toBe('/v-ads/reels/video/comments?page=2');
  await client.engagement('video');expect(calls[3].path).toBe('/v-ads/reels/video/engagement');
 });
 it.each([['video.mp4',1],['VIDEO.MP4',maxVideoBytes]])('accepts bounded MP4 %s',(name,size)=>expect(()=>validateVideoFile(name,size)).not.toThrow());
 it.each([['a.mov',12],['a.mp4',0],['a.mp4',maxVideoBytes+1],['a.mp4',NaN]])('rejects unsupported files %s %s',(name,size)=>expect(()=>validateVideoFile(name,size)).toThrow());
 it('keeps playback and shares on approved application boundaries',()=>{
  expect(mediaUrl('/v-ads/media/upload','/api')).toBe('/api/v-ads/media/upload');
  expect(mediaUrl('/videos/v-ads/optimized/a%20b.mp4','https://api.test','https://web.test')).toBe('https://web.test/videos/v-ads/optimized/a%20b.mp4');
  expect(mediaUrl('https://api.test/v-ads/media/upload','https://api.test')).toBe('https://api.test/v-ads/media/upload');
  for(const value of ['https://evil.test/video.mp4','javascript:alert(1)','//evil.test/a.mp4','/videos/v-ads/%2e%2e/private.mp4','/v-ads/media/../private'])expect(()=>mediaUrl(value,'/api')).toThrow();
  expect(sharePath('video')).toBe('/v-ads?video=video');
 });
 it('deduplicates pagination without moving the active first video',()=>{
  const a={id:'a'} as Reel,b={id:'b'} as Reel;
  expect(mergeReels([a],[a,b,b])).toEqual([a,b]);
 });
});
