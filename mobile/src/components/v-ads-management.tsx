import {Text} from './typography';
import {UiText,UiElement} from "./localized-ui";
import {useRef,useState} from 'react';
import {View} from 'react-native';
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
 return <View style={{gap:10}}>{account.status==='SUSPENDED'?<Text style={styles.muted}><UiText value={"Suspended accounts require administrator review."}/></Text>:<><UiElement as={Action} label="Edit advertiser profile" secondary onPress={()=>setOpen(value=>!value)}/>{open&&<><Text style={styles.muted}><UiText value={"Saving changes sends the profile for review and hides its approved videos until the account is approved again. The handle stays unchanged."}/></Text><UiElement as={Field} label="Advertiser name" value={name} onChangeText={setName} maxLength={120}/><UiElement as={Field} label="Description" value={description} onChangeText={setDescription} maxLength={2000} multiline/><UiElement as={Action} label="Save and request review" disabled={busy||!account.review_token||name.trim().length<2} onPress={()=>void action(async()=>{await client.profile(account,name,description);onChanged();})}/></>}</>}
 <UiElement as={Action} label="Account decisions" secondary disabled={busy} onPress={()=>historyPage()}/>{Boolean(error)&&<ErrorPanel error={new Error(error)}/>}{history&&<>{history.items.map(item=><Text style={styles.muted} key={item.id}>{item.action} · {item.created_at}{'\n'}{item.details.reason}</Text>)}{!history.items.length&&<Text style={styles.muted}><UiText value={"No decisions recorded yet."}/></Text>}{history.has_more&&<UiElement as={Action} label="More decisions" disabled={busy} secondary onPress={()=>historyPage(history.page+1)}/>}</>}</View>;
}
export function VideoManagement({video,onChanged}:{video:SellerVideo;onChanged:()=>void}){
 const {styles}=useTheme();const [editing,setEditing]=useState(false),[title,setTitle]=useState(video.title),[description,setDescription]=useState(video.description??'');
 const [showAnalytics,setShowAnalytics]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 async function run(work:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await work();onChanged();}catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}}
 if(video.status==='REMOVED')return <View style={{gap:8}}>{video.upload_id&&video.media_status==='VALIDATED'&&<UiElement as={Action} label="Release private upload" secondary disabled={busy} onPress={()=>void run(async()=>{await client.release(video.upload_id!);})}/>}{Boolean(error)&&<ErrorPanel error={new Error(error)}/>}</View>;
 const views=video.views??0;
 const likes=video.likes??0;
 const comments=video.comments??0;
 const engagementRate=views>0?(((likes+comments)/views)*100).toFixed(1)+'%':'0.0%';
 return <View style={{gap:10}}>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
   <UiElement as={Action} label={showAnalytics?'Hide Analytics':'Analytics'} secondary disabled={busy} onPress={()=>setShowAnalytics(v=>!v)}/>
   <UiElement as={Action} label={editing?'Cancel Edit':'Edit Ad'} secondary disabled={busy} onPress={()=>{setTitle(video.title);setDescription(video.description??'');setEditing(v=>!v);}}/>
   <UiElement as={Action} label="Delete Ad" secondary disabled={busy} onPress={()=>void run(async()=>{await client.deleteVideo(video.id);})}/>
   {video.status==='REJECTED'&&video.upload_id&&video.media_status==='VALIDATED'&&<UiElement as={Action} label="Release private upload" secondary disabled={busy} onPress={()=>void run(async()=>{await client.release(video.upload_id!);})}/>}
  </View>
  {showAnalytics&&<View style={[styles.card,{padding:12,borderRadius:14,gap:8,backgroundColor:styles.card.backgroundColor,borderWidth:1,borderColor:styles.card.borderColor}]}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
      <Text style={[styles.heading,{fontSize:14}]}><UiText value={"Ad Analytics & Performance"}/></Text>
      <View style={{paddingHorizontal:8,paddingVertical:3,borderRadius:8,backgroundColor:video.status==='APPROVED'?'#16a34a20':'#ca8a0420'}}>
        <Text style={{fontSize:11,fontWeight:'700',color:video.status==='APPROVED'?'#16a34a':'#ca8a04'}}>{video.status}</Text>
      </View>
    </View>
    <View style={{flexDirection:'row',gap:8}}>
      <View style={{flex:1,padding:8,borderRadius:10,backgroundColor:styles.card.backgroundColor,borderWidth:1,borderColor:styles.card.borderColor,alignItems:'center'}}>
        <Text style={{fontSize:16,fontWeight:'700',color:styles.text.color}}>{views.toLocaleString()}</Text>
        <Text style={[styles.muted,{fontSize:10}]}><UiText value={"Views"}/></Text>
      </View>
      <View style={{flex:1,padding:8,borderRadius:10,backgroundColor:styles.card.backgroundColor,borderWidth:1,borderColor:styles.card.borderColor,alignItems:'center'}}>
        <Text style={{fontSize:16,fontWeight:'700',color:styles.text.color}}>{likes.toLocaleString()}</Text>
        <Text style={[styles.muted,{fontSize:10}]}><UiText value={"Likes"}/></Text>
      </View>
      <View style={{flex:1,padding:8,borderRadius:10,backgroundColor:styles.card.backgroundColor,borderWidth:1,borderColor:styles.card.borderColor,alignItems:'center'}}>
        <Text style={{fontSize:16,fontWeight:'700',color:styles.text.color}}>{comments.toLocaleString()}</Text>
        <Text style={[styles.muted,{fontSize:10}]}><UiText value={"Comments"}/></Text>
      </View>
      <View style={{flex:1,padding:8,borderRadius:10,backgroundColor:styles.card.backgroundColor,borderWidth:1,borderColor:styles.card.borderColor,alignItems:'center'}}>
        <Text style={{fontSize:16,fontWeight:'700',color:'#16a34a'}}>{engagementRate}</Text>
        <Text style={[styles.muted,{fontSize:10}]}><UiText value={"Engagement"}/></Text>
      </View>
    </View>
  </View>}
  {editing&&<View style={{gap:8}}>
   <UiElement as={Field} label="Ad title" value={title} onChangeText={setTitle} maxLength={160}/>
   <UiElement as={Field} label="Caption / description" value={description} onChangeText={setDescription} maxLength={2000} multiline/>
   <Text style={styles.muted}><UiText value={"Edited ads are resubmitted for administrator approval before appearing on the V Ads tab."}/></Text>
   <UiElement as={Action} label="Save changes & submit for approval" disabled={busy||title.trim().length<3} onPress={()=>void run(async()=>{await client.editVideo(video.id,title,description);setEditing(false);})}/>
  </View>}
  {Boolean(error)&&<ErrorPanel error={new Error(error)}/>}
 </View>;
}
export function DiscardUpload({id,onChanged}:{id:string;onChanged:()=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function discard(){setBusy(true);setError('');try{await client.release(id);onChanged();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <><UiElement as={Action} label="Discard unused upload" secondary disabled={busy} onPress={()=>void discard()}/>{Boolean(error)&&<ErrorPanel error={new Error(error)}/>}</>;
}
export function VAdsPerformance(){
 const {styles}=useTheme();const [data,setData]=useState<Performance|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function load(page=1){setBusy(true);setError('');try{setData(await client.analytics(page));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <View style={styles.card}><UiElement as={Heading} title="V Ads performance insights"/><UiElement as={Action} label="Load / refresh performance" secondary disabled={busy} onPress={()=>void load()}/>{Boolean(error)&&<ErrorPanel error={new Error(error)}/>}{data&&<><Text style={styles.muted}>{data.view_policy}</Text><Text style={styles.muted}>{data.totals.videos} <UiText value={"videos · "}/>{data.totals.views} <UiText value={"signed-in views · "}/>{data.totals.likes} <UiText value={"likes · "}/>{data.totals.comments} <UiText value={"visible comments"}/></Text>{data.items.map(row=><Text key={row.id} style={styles.muted}>{row.title} · {row.status} · {row.views} <UiText value={"views · "}/>{row.likes} <UiText value={"likes · "}/>{row.comments} <UiText value={"comments"}/></Text>)}<UiElement as={Action} label="Previous" secondary disabled={busy||data.page===1} onPress={()=>void load(data.page-1)}/><UiElement as={Action} label="Next" secondary disabled={busy||!data.has_more} onPress={()=>void load(data.page+1)}/></>}</View>;
}
