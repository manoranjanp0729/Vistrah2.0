import {useRef,useState} from 'react';
import {Text,View} from 'react-native';
import {Page,Heading,Action,Field,Loading,ErrorPanel} from '../../components/ui';
import {SellerGate} from '../../components/seller-gate';
import {useTheme} from '../../lib/theme';
import {useSession} from '../../lib/session';
import {useResource} from '../../lib/resource';
import {vAds} from '../../lib/v-ads';
import {pickAndUploadVideo} from '../../lib/v-ads-upload';
import type {Workspace} from '../../../../shared/v-ads';
import {AdvertiserManagement,VideoManagement,DiscardUpload,VAdsPerformance} from '../../components/v-ads-management';

export default function SellerVAds(){return <Page><Heading title="Your V Ads"/><SellerGate><WorkspaceScreen/></SellerGate></Page>;}
function WorkspaceScreen(){
  const {styles}=useTheme();const {user}=useSession();
  const resource=useResource<Workspace>('/v-ads/me',user?.id??null);
  const [name,setName]=useState(''),[handle,setHandle]=useState(''),[description,setDescription]=useState('');
  const [title,setTitle]=useState(''),[videoDescription,setVideoDescription]=useState(''),[uploadId,setUploadId]=useState('');
  const [accountId,setAccountId]=useState(''),[page,setPage]=useState(1);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [history,setHistory]=useState<Workspace['videos']>([]);
  const [historyMore,setHistoryMore]=useState<boolean|null>(null);
  const working=useRef(false);
  const data=resource.data;
  const account=data?.accounts.find(item=>item.id===accountId)??data?.accounts[0];
  async function perform(action:()=>Promise<void>){if(working.current)return;working.current=true;setBusy(true);setError('');setMessage('');try{await action();}catch(e){setError((e as Error).message);}finally{working.current=false;setBusy(false);}}
  if(resource.loading)return <Loading/>;
  if(resource.error)return <ErrorPanel error={resource.error} retry={resource.retry}/>;
  if(!data)return null;
  return <>
    <Text style={styles.muted}>Videos are published only after administrator approval. MP4, H.264/AAC, up to 60 seconds and 100 MB.</Text>
    <Action label="Refresh status" secondary disabled={busy} onPress={()=>{setHistory([]);setPage(1);setHistoryMore(null);resource.retry();}}/>
    {Boolean(error)&&<ErrorPanel error={new Error(error)}/>}{Boolean(message)&&<Text accessibilityLiveRegion="polite" style={styles.muted}>{message}</Text>}
    {!data.accounts.length?<View style={styles.card}><Heading title="Request advertiser account"/><Field label="Advertiser name" value={name} onChangeText={setName} maxLength={120}/><Field label="Handle (lowercase letters, numbers and hyphens)" value={handle} onChangeText={setHandle} autoCapitalize="none" maxLength={80}/><Field label="Description" value={description} onChangeText={setDescription} multiline maxLength={2000}/><Action label="Request review" disabled={busy||name.trim().length<2||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(handle)||handle.length<3} onPress={()=>void perform(async()=>{await vAds.register(name,handle,description);resource.retry();})}/></View>:<>
      {data.accounts.map(item=><View style={styles.card} key={item.id}><Heading title={item.name}/><Text style={styles.muted}>@{item.handle} · {item.status}</Text><AdvertiserManagement key={item.review_token??item.id} account={item} onChanged={resource.retry}/>{data.accounts.length>1&&<Action label={account?.id===item.id?'Selected advertiser':'Use this advertiser'} secondary disabled={busy} onPress={()=>{setAccountId(item.id);setUploadId('');}}/>}</View>)}
      {account?.status!=='APPROVED'?<Text style={styles.muted}>An approved advertiser account is required to submit videos.</Text>:!data.uploads_available?<Text style={styles.muted}>Video uploads and submissions are not available yet.</Text>:<View style={styles.card}>
        <Heading title="Submit video for review"/>
        <Action label={busy?'Please wait…':'Choose and upload MP4'} disabled={busy} onPress={()=>void perform(async()=>{const result=await pickAndUploadVideo(account.id);if(result){setUploadId(result.id);setMessage('Upload validated. Add a title and submit for review.');}})}/>
        {data.uploads.filter(item=>item.advertiser_id===account.id&&!item.video_id).map(item=><Action key={item.id} secondary label={uploadId===item.id?'Upload selected':'Use saved upload '+item.id.slice(0,8)} disabled={busy} onPress={()=>setUploadId(item.id)}/>)}
        {data.uploads.filter(item=>item.advertiser_id===account.id&&!item.video_id).map(item=><DiscardUpload key={'discard-'+item.id} id={item.id} onChanged={()=>{if(uploadId===item.id)setUploadId('');resource.retry();}}/>)}
        {Boolean(uploadId)&&<Text style={styles.muted}>Validated upload selected.</Text>}
        <Field label="Video title" value={title} onChangeText={setTitle} maxLength={160}/><Field label="Video description" value={videoDescription} onChangeText={setVideoDescription} multiline maxLength={2000}/>
        <Action label="Submit for review" disabled={busy||!uploadId||title.trim().length<3} onPress={()=>void perform(async()=>{await vAds.submit(account.id,uploadId,title,videoDescription);setUploadId('');setTitle('');setVideoDescription('');setHistory([]);setPage(1);setHistoryMore(null);setMessage('Video submitted. Status: PENDING.');resource.retry();})}/>
      </View>}
    </>}
    <Heading title="Your videos"/>
    {[...data.videos,...history].map(video=><View style={styles.card} key={video.id}><Heading title={video.title}/><Text style={styles.muted}>{video.status}</Text>{Boolean(video.review_reason)&&<Text style={styles.muted}>{video.review_reason}</Text>}<VideoManagement video={video} onChanged={()=>{setHistory([]);setPage(1);setHistoryMore(null);resource.retry();}}/></View>)}
    {!data.videos.length&&<Text style={styles.muted}>No submitted videos yet.</Text>}
    {(historyMore??data.has_more)&&<Action label="Load more videos" secondary disabled={busy} onPress={()=>void perform(async()=>{const next=await vAds.workspace(page+1);setHistory(previous=>[...previous,...next.videos.filter(item=>!previous.some(old=>old.id===item.id))]);setPage(next.page);setHistoryMore(next.has_more);})}/>}
    <VAdsPerformance/>
  </>;
}
