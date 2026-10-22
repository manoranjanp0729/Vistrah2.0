import {UiText,UiElement} from "../components/localized-ui";
import {useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {router} from 'expo-router';
import {Page,Action,Heading,Field,ErrorPanel,Loading} from '../components/ui';
import {useSession} from '../lib/session';
import {useResource} from '../lib/resource';
import {api} from '../lib/api';
import {emptyJob,jobDraft,type JobDraft,type OwnedJob,type JobPage} from '../lib/employer-jobs';
import {useTheme} from '../lib/theme';
type Business={id:number;company:string;name:string;active:boolean;verification_status:string};
export default function EmployerJobs(){
  const session=useSession();const {styles}=useTheme();const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function enable(){setBusy(true);setError('');try{await api('/auth/seller/enable',{method:'POST'});await session.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <UiElement as={Page} title="Employer job postings"><Text style={styles.muted}><UiText value={"Create job drafts for a business you own. VISTRAH reviews each submission before publication."}/></Text>{Boolean(error)&&<ErrorPanel error={error}/>}
    {!session.ready?<Loading/>:!session.user?<UiElement as={Action} label="Sign in to post a job" onPress={()=>router.push('/auth')}/>:!session.user.seller_enabled?<><Text style={styles.muted}><UiText value={"Enable employer access using your existing account. Customer membership is not required."}/></Text><UiElement as={Action} label="Enable employer access" disabled={busy} onPress={()=>void enable()}/></>:<EmployerManager key={session.user.id} userId={session.user.id}/>}
  </UiElement>;
}
function EmployerManager({userId}:{userId:number}){
  const {styles}=useTheme();const businesses=useResource<Business[]>('/seller/businesses',userId);const [selected,setSelected]=useState<number|null>(null);
  const provider=businesses.data?.find(item=>item.id===selected)??businesses.data?.[0];
  return <>{businesses.loading?<Loading/>:businesses.error?<ErrorPanel error={businesses.error} retry={businesses.retry}/>:!businesses.data?.length?<><Text style={styles.muted}><UiText value={"Add your employer business and complete ownership review before posting jobs."}/></Text><UiElement as={Action} label="Add employer business" onPress={()=>router.push('/provider-applications/new')}/></>:<>
    <Text style={styles.label}><UiText value={"CHOOSE YOUR EMPLOYER BUSINESS"}/></Text>{businesses.data.map(item=><Action key={item.id} label={(provider?.id===item.id?'✓ ':'')+(item.company||item.name)} secondary={provider?.id!==item.id} onPress={()=>setSelected(item.id)}/>)}
    {provider&&<BusinessJobs key={provider.id} provider={provider} userId={userId}/>}
  </>}</>;
}
function BusinessJobs({provider,userId}:{provider:Business;userId:number}){
  const {styles,colors}=useTheme();const [page,setPage]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[form,setForm]=useState<JobDraft|null>(null),[editing,setEditing]=useState<OwnedJob|null>(null);
  const path='/seller/businesses/'+provider.id+'/jobs';const jobs=useResource<JobPage<OwnedJob>>(path+'?page='+page,userId);const verified=provider.active&&provider.verification_status==='VERIFIED';
  async function save(){if(!form)return;setBusy(true);setError('');setNotice('');try{await api(editing?path+'/'+editing.id:path,{method:editing?'PATCH':'POST',body:JSON.stringify({...jobDraft(form),...(editing?{revision:editing.revision}:{})})});setForm(null);setEditing(null);setPage(1);setNotice('Draft saved. Submit it when you are ready for review.');jobs.retry();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function change(job:OwnedJob,action:'submit'|'close'){setBusy(true);setError('');setNotice('');try{await api(path+'/'+job.id+'/'+action,{method:'POST',body:JSON.stringify({revision:job.revision})});setNotice(action==='submit'?'Submitted for admin approval. The job is not public yet.':'Job closed. It is no longer available to applicants.');}catch(e){setError((e as Error).message);}finally{setBusy(false);jobs.retry();}}
  function field<K extends keyof JobDraft>(key:K,value:JobDraft[K]){setForm(current=>current?{...current,[key]:value}:current);}
  function choices<K extends 'arrangement'|'employment_type'>(key:K,values:JobDraft[K][]){return <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{values.map(value=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:form?.[key]===value,disabled:busy}} disabled={busy} onPress={()=>field(key,value)} style={{minHeight:44,padding:12,borderRadius:12,backgroundColor:form?.[key]===value?colors.accent:colors.surface,borderWidth:1,borderColor:colors.border}}><Text style={{color:form?.[key]===value?colors.ink:colors.text,fontSize:12}}>{value.replaceAll('_',' ')}</Text></Pressable>)}</View>;}
  return <>{!verified&&<Text style={styles.muted}><UiText value={"Drafts can be saved now. Your business must be active and verified before submission."}/></Text>}
    {Boolean(error)&&<ErrorPanel error={error}/>}
    {Boolean(notice)&&<Text accessibilityRole="alert" style={styles.text}>{notice}</Text>}
    <UiElement as={Action} label="Create job draft" disabled={busy} onPress={()=>{setEditing(null);setForm({...emptyJob});setError('');setNotice('');}}/>
    {form&&<View style={styles.card}><UiElement as={Heading} title={editing?'Edit job draft':'New job draft'}/>
      <UiElement as={Field} label="Job title" value={form.title} editable={!busy} maxLength={150} onChangeText={value=>field('title',value)}/>
      <UiElement as={Field} label="Job description (at least 30 characters)" value={form.description} editable={!busy} multiline maxLength={6000} onChangeText={value=>field('description',value)}/>
      <UiElement as={Field} label="Job location" value={form.location} editable={!busy} maxLength={150} onChangeText={value=>field('location',value)}/>
      <Text style={styles.muted}><UiText value={"Work arrangement"}/></Text>{choices('arrangement',['ONSITE','HYBRID','REMOTE'])}
      <Text style={styles.muted}><UiText value={"Employment type"}/></Text>{choices('employment_type',['FULL_TIME','PART_TIME','CONTRACT','INTERNSHIP','TEMPORARY'])}
      <UiElement as={Field} label="Salary (optional)" value={form.salary_text} editable={!busy} maxLength={300} onChangeText={value=>field('salary_text',value)}/>
      <UiElement as={Field} label="Employer application link (HTTPS)" value={form.application_url} editable={!busy} autoCapitalize="none" keyboardType="url" maxLength={1500} onChangeText={value=>field('application_url',value)}/>
      <UiElement as={Field} label="Application deadline (optional, YYYY-MM-DD)" value={form.deadline??''} editable={!busy} maxLength={10} onChangeText={value=>field('deadline',value||null)}/>
      <UiElement as={Action} label={busy?'Saving…':'Save draft'} disabled={busy} onPress={()=>void save()}/><UiElement as={Action} label="Cancel editing" secondary disabled={busy} onPress={()=>{setForm(null);setEditing(null);}}/>
    </View>}
    <UiElement as={Heading} title="Your job postings"/>{jobs.loading?<Loading/>:jobs.error?<ErrorPanel error={jobs.error} retry={jobs.retry}/>:<>
      {!jobs.data?.items.length&&<Text style={styles.muted}><UiText value={"No job postings for this business yet."}/></Text>}
      {jobs.data?.items.map(job=><View key={job.id} style={styles.card}><Heading title={job.title}/><Text style={styles.label}>{job.status}</Text><Text style={styles.muted}>{job.location} · {job.arrangement}</Text>{Boolean(job.review_note)&&<Text style={styles.muted}><UiText value={"Review: "}/>{job.review_note}</Text>}
        {['DRAFT','REJECTED'].includes(job.status)&&job.actor_id===userId&&<UiElement as={Action} label="Edit draft" secondary disabled={busy} onPress={()=>{setEditing(job);setForm(jobDraft(job));setError('');}}/>}
        {job.status==='DRAFT'&&job.actor_id===userId&&<UiElement as={Action} label="Submit for admin approval" disabled={busy||!verified} onPress={()=>void change(job,'submit')}/>}
        {job.status!=='CLOSED'&&<UiElement as={Action} label="Close job" secondary disabled={busy} onPress={()=>void change(job,'close')}/>}
      </View>)}
      <View style={styles.row}>{page>1&&<UiElement as={Action} label="Previous" secondary disabled={busy} onPress={()=>setPage(value=>value-1)}/>}<Text style={styles.muted}><UiText value={"Page "}/>{page}</Text>{page*20<(jobs.data?.total??0)&&<UiElement as={Action} label="Next" secondary disabled={busy} onPress={()=>setPage(value=>value+1)}/>}</View>
    </>}
  </>;
}
