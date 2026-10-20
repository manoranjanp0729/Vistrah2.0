import {useRef,useState} from 'react';
import {Text,View} from 'react-native';
import {Action,Field,ErrorPanel,Heading} from './ui';
import {useTheme} from '../lib/theme';
import {api} from '../lib/api';
import type {AdvertiserAccount,SellerVideo} from '../../../shared/v-ads';
import {managementClient,type History,type Performance} from '../../../shared/v-ads-management';
const client=managementClient(api);
export function AdvertiserManagement({account,onChanged}:{account:AdvertiserAccount;onChanged:()=>void}){
 const {styles}=useTheme();const [open,setOpen]=useState(false),[name,setName]=useState(account.name),[description,setDescription]=useState(account.description??'');
 const [history,setHistory]=useState<History|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 async function action(work:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await work();}catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}}
 function historyPage(page=1){void action(async()=>{const next=await client.history(account.id,page);setHistory(old=>page===1?next:{...next,items:[...(old?.items??[]),...next.items]});});}
 return <View style={{gap:10}}>{account.status==='SUSPENDED'?<Text style={styles.muted}>Suspended accounts require administrator review.</Text>:<><Action label="Edit advertiser profile" secondary onPress={()=>setOpen(value=>!value)}/>{open&&<><Text style={styles.muted}>Saving changes sends the profile for review and hides its approved videos until the account is approved again. The handle stays unchanged.</Text><Field label="Advertiser name" value={name} onChangeText={setName} maxLength={120}/><Field label="Description" value={description} onChangeText={setDescription} maxLength={2000} multiline/><Action label="Save and request review" disabled={busy||!account.review_token||name.trim().length<2} onPress={()=>void action(async()=>{await client.profile(account,name,description);onChanged();})}/></>}</>}
 <Action label="Account decisions" secondary disabled={busy} onPress={()=>historyPage()}/>{Boolean(error)&&<ErrorPanel error={new Error(error)}/>}{history&&<>{history.items.map(item=><Text style={styles.muted} key={item.id}>{item.action} · {item.created_at}{'\n'}{item.details.reason}</Text>)}{!history.items.length&&<Text style={styles.muted}>No decisions recorded yet.</Text>}{history.has_more&&<Action label="More decisions" disabled={busy} secondary onPress={()=>historyPage(history.page+1)}/>}</>}</View>;
}
export function VideoManagement({video,onChanged}:{video:SellerVideo;onChanged:()=>void}){
 const {styles}=useTheme();const [open,setOpen]=useState(false),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 async function action(remove:boolean){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{if(remove)await client.withdraw(video,reason);else if(video.upload_id)await client.release(video.upload_id);onChanged();}catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}}
 return <View style={{gap:10}}><Action label="Manage video" secondary onPress={()=>setOpen(value=>!value)}/>{open&&<><Text style={styles.muted}>Withdrawal takes the video offline permanently. A new upload requires a new review.</Text>{video.status!=='REMOVED'&&<><Field label="Withdrawal reason" value={reason} onChangeText={setReason} maxLength={2000} multiline/><Action label="Withdraw video" disabled={busy||reason.trim().length<10} onPress={()=>void action(true)}/></>}{['REJECTED','REMOVED'].includes(video.status)&&video.upload_id&&video.media_status==='VALIDATED'&&<Action label="Release private upload" secondary disabled={busy} onPress={()=>void action(false)}/>}</>}{Boolean(error)&&<ErrorPanel error={new Error(error)}/>}</View>;
}
export function DiscardUpload({id,onChanged}:{id:string;onChanged:()=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function discard(){setBusy(true);setError('');try{await client.release(id);onChanged();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <><Action label="Discard unused upload" secondary disabled={busy} onPress={()=>void discard()}/>{Boolean(error)&&<ErrorPanel error={new Error(error)}/>}</>;
}
export function VAdsPerformance(){
 const {styles}=useTheme();const [data,setData]=useState<Performance|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function load(page=1){setBusy(true);setError('');try{setData(await client.analytics(page));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <View style={styles.card}><Heading title="Video performance"/><Action label="Load / refresh performance" secondary disabled={busy} onPress={()=>void load()}/>{Boolean(error)&&<ErrorPanel error={new Error(error)}/>}{data&&<><Text style={styles.muted}>{data.view_policy}</Text><Text style={styles.muted}>{data.totals.videos} videos · {data.totals.views} signed-in views · {data.totals.likes} likes · {data.totals.comments} visible comments</Text>{data.items.map(row=><Text key={row.id} style={styles.muted}>{row.title} · {row.status} · {row.views} views · {row.likes} likes · {row.comments} comments</Text>)}<Action label="Previous" secondary disabled={busy||data.page===1} onPress={()=>void load(data.page-1)}/><Action label="Next" secondary disabled={busy||!data.has_more} onPress={()=>void load(data.page+1)}/></>}</View>;
}
