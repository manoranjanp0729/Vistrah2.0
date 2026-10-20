import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {vAdsClient,mediaUrl,sharePath,mergeReels,validateVideoFile,type Api,type Reel} from '../../shared/v-ads.ts';
import {api,setToken,onUnauthorized} from '../src/lib/api.ts';
test('native uses authenticated backend likes, comments, submission and status contracts',async()=>{
 const calls:{path:string;options?:RequestInit}[]=[];
 const api:Api=async<T>(path:string,options?:RequestInit)=>{calls.push({path,options});return {} as T;};
 const client=vAdsClient(api);await client.like('video',true);await client.comment('video',' comment ');await client.workspace();await client.submit('advertiser','owned',' Title ','');
 assert.equal(calls[0].options?.method,'POST');assert.equal(calls[1].options?.body,JSON.stringify({body:'comment'}));assert.equal(calls[2].path,'/v-ads/me?page=1');assert.deepEqual(JSON.parse(calls[3].options?.body as string),{advertiser_id:'advertiser',upload_id:'owned',title:'Title',description:''});
});
test('native media URL and file validation fail closed',()=>{
 assert.equal(mediaUrl('/v-ads/media/id','https://api.test'),'https://api.test/v-ads/media/id');assert.equal(sharePath('video'),'/v-ads?video=video');
 assert.throws(()=>mediaUrl('https://untrusted.test/secret.mp4','https://api.test'));assert.throws(()=>validateVideoFile('bad.mov',100));assert.throws(()=>validateVideoFile('big.mp4',104857601));
 assert.deepEqual(mergeReels([{id:'a'} as Reel],[{id:'a'} as Reel,{id:'b'} as Reel]).map(item=>item.id),['a','b']);
});
test('existing playback and five-tab navigation controls remain wired',()=>{
 const source=readFileSync(new URL('../src/app/(tabs)/v-ads.tsx',import.meta.url),'utf8');
 for(const marker of ['pagingEnabled','decelerationRate="fast"','itemVisiblePercentThreshold: 60','active && !commentsOpen && !paused && screenFocused && appActive','player.pause()','player.muted = !muted','vAds.feed()','vAds.like(','vAds.comment(','sharePath(reel.id)'])assert(source.includes(marker),marker);
 assert(!source.includes('Demo comments'));assert(!source.includes("id: 'users'"));
 const tabs=readFileSync(new URL('../src/app/(tabs)/_layout.tsx',import.meta.url),'utf8');
 assert.deepEqual([...tabs.matchAll(/Tabs.Screen name="([^"]+)"/g)].map(match=>match[1]),['index','services','v-ads','requests','account']);
});
test('native raw uploads keep bearer authentication and extended transport timeout',async()=>{
 process.env.EXPO_PUBLIC_API_URL='https://api.example.test';Object.assign(globalThis,{__DEV__:true});
 setToken('synthetic-token');let expired=false;onUnauthorized(()=>{expired=true;});
 const body=new Blob(['mp4'],{type:'video/mp4'});
 const fetcher:typeof fetch=async(input,init)=>{assert.equal(input,'https://api.example.test/v-ads/advertisers/owner/uploads');assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer synthetic-token');assert.equal(new Headers(init?.headers).get('Content-Type'),'video/mp4');assert.equal(init?.body,body);assert(init?.signal instanceof AbortSignal);return Response.json({id:'owned'});};
 try{assert.deepEqual(await api('/v-ads/advertisers/owner/uploads',{method:'POST',body,headers:{'Content-Type':'video/mp4'}},{timeoutMs:90000,fetcher}),{id:'owned'});
  await assert.rejects(api('/v-ads/me',{}, {fetcher:async()=>Response.json({detail:'Sign in again'},{status:401})}));assert(expired);
 }finally{setToken(null);onUnauthorized(()=>{});}
});
