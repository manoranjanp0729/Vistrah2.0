import {Text} from '../components/typography';
import {UiText} from "../components/localized-ui";
import {useLanguage} from '../lib/language';
import {useState} from 'react';
import {Platform,Share,View} from 'react-native';
import {router} from 'expo-router';
import {Action,ErrorPanel,Field,Heading,Loading,Page} from '../components/ui';
import {useSession} from '../lib/session';
import {api} from '../lib/api';
import type {User} from '../lib/catalogue';
import {useTheme} from '../lib/theme';
import {legalVersion} from '../../../shared/legal';

export default function Profile(){
  const {copy}=useLanguage();
  const session=useSession();
  return <Page title={copy.profile.title}>{!session.ready?<Loading/>:!session.user?<><Action auth label={copy.auth.signIn} onPress={()=>router.push('/auth')}/></>:<ProfileForm key={session.user.id} user={session.user}/>}</Page>;
}
function ProfileForm({user}:{user:User}){const {copy,t}=useLanguage();const {styles}=useTheme();
  const session=useSession();const [name,setName]=useState(user.name);const [phone,setPhone]=useState(user.phone);const [error,setError]=useState('');const [saved,setSaved]=useState(false);const [busy,setBusy]=useState(false);
  const [exporting,setExporting]=useState(false);const [confirmDelete,setConfirmDelete]=useState(false);const [confirmText,setConfirmText]=useState('');const [deleting,setDeleting]=useState(false);const [exportMessage,setExportMessage]=useState('');
  async function save(){setError('');setSaved(false);if(name.trim().length<2){setError(t('validation.name'));return;}setBusy(true);try{await api('/me',{method:'PATCH',body:JSON.stringify({name:name.trim(),phone:phone.trim()})});await session.refresh();setSaved(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function exportData(){
    if(exporting)return;
    setExporting(true);setError('');setExportMessage('');
    try{
      const payload=await api<Record<string,unknown>>('/account/export-data');
      const json=JSON.stringify(payload,null,2);
      if(Platform.OS==='web'&&typeof document!=='undefined'){
        const blob=new Blob([json],{type:'application/json'});
        const url=URL.createObjectURL(blob);
        const anchor=document.createElement('a');
        anchor.href=url;anchor.download=`vistrah-data-export-${user.id}.json`;
        document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
      }else{
        await Share.share({title:`vistrah-data-export-${user.id}.json`,message:json});
      }
      setExportMessage('Your DPDP personal & seller data archive (JSON) is ready.');
    }catch(e){setError((e as Error).message);}finally{setExporting(false);}
  }
  async function deleteAccount(){
    if(deleting||confirmText.trim()!=='DELETE')return;
    setDeleting(true);setError('');
    try{
      await api('/account',{method:'DELETE'});
      await session.signOut().catch(()=>{});
      router.replace('/auth');
    }catch(e){setError((e as Error).message);setDeleting(false);}
  }
  return <>
    <Text style={styles.muted}>{user.email}</Text>
    {Boolean(error)&&<ErrorPanel error={error}/>}
    <Field label={copy.auth.name} value={name} onChangeText={setName} maxLength={100}/>
    <Field label={copy.profile.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={20}/>
    <Action label={busy?copy.profile.saving:copy.profile.save} disabled={busy} onPress={()=>void save()}/>
    {saved&&<Text accessibilityRole="alert" style={styles.text}><UiText value={copy.profile.saved}/></Text>}
    <View style={[styles.card,{gap:10,marginTop:16}]}>
      <Heading title="Account Data & Privacy (DPDP Act 2023)"/>
      <Text style={styles.muted}><UiText value={"Vistrah Groups Pvt Ltd (vistrah.in) · Policy "}/>{user.privacy_policy_version||legalVersion}</Text>
      {Boolean(exportMessage)&&<Text style={styles.text}><UiText value={exportMessage}/></Text>}
      <Action label={exporting?'Preparing export…':'Download My Data'} secondary disabled={exporting||deleting} onPress={()=>void exportData()}/>
      <Action label="Privacy Policy" secondary onPress={()=>router.push('/privacy')}/>
      <Action label="Grievance Officer (24h ack / 15-day SLA)" secondary onPress={()=>router.push('/grievance-officer')}/>
      {user.role!=='ADMIN'&&!confirmDelete&&<Action label="Delete Account" secondary disabled={exporting||deleting} onPress={()=>setConfirmDelete(true)}/>}
      {confirmDelete&&<View style={{gap:8}}>
        <Text style={styles.muted}><UiText value={"Type DELETE below to permanently anonymize your account, revoke sessions, and deactivate seller listings while retaining non-personal statutory audit logs."}/></Text>
        <Field label="Type DELETE to confirm" value={confirmText} onChangeText={setConfirmText} autoCapitalize="characters" maxLength={12}/>
        <Action label={deleting?'Deleting account…':'Confirm Delete Account'} disabled={deleting||confirmText.trim()!=='DELETE'} onPress={()=>void deleteAccount()}/>
        <Action label="Cancel" secondary disabled={deleting} onPress={()=>{setConfirmDelete(false);setConfirmText('');}}/>
      </View>}
    </View>
  </>;
}
