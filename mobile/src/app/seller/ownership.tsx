import {UiText,UiElement} from "../../components/localized-ui";
import {useState} from 'react';
import {Text,View} from 'react-native';
import {Page,Action,Heading,Field,Loading,ErrorPanel} from '../../components/ui';
import {SellerGate} from '../../components/seller-gate';
import {ToggleChoice} from '../../components/requirement-form';
import {useTheme} from '../../lib/theme';
import {useResource} from '../../lib/resource';
import {useSession} from '../../lib/session';
import {api} from '../../lib/api';
import {pickEvidence} from '../../lib/evidence';
type ClaimInput={statement:string;business_type:'REGISTERED'|'UNREGISTERED';registration_evidence_available:boolean;contact_channel:'EMAIL'|'PHONE';contact_value:string};
type Claim=ClaimInput&{id:string;provider_id:number;status:string;needs_more_info:boolean;contact_control_verified:boolean;contact_control_note:string;evidence_requirements_met:boolean;evidence:{id:string;evidence_type:string;filename:string}[]};
const blank:ClaimInput={statement:'',business_type:'REGISTERED',registration_evidence_available:true,contact_channel:'EMAIL',contact_value:''};
export default function Ownership(){return <UiElement as={Page} title="Legacy business ownership"><SellerGate><Claims/></SellerGate></UiElement>;}
function Claims(){const {styles}=useTheme();const {user}=useSession();const rows=useResource<Claim[]>('/seller/ownership-claims',user?.id??null);const [providerId,setProviderId]=useState(''),[form,setForm]=useState<ClaimInput>(blank),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  async function create(){if(!/^\d+$/.test(providerId)||Number(providerId)<1){setError('Enter the existing business ID.');return;}setBusy(true);setError('');setNotice('');try{await api('/seller/ownership-claims',{method:'POST',body:JSON.stringify({...form,provider_id:Number(providerId)})});setForm(blank);setProviderId('');rows.retry();setNotice('Ownership claim created. Add the required evidence below.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <><Text style={styles.muted}><UiText value={"Claim only an existing unowned business you are authorized to represent. Contact verification and independent evidence review are required."}/></Text>{Boolean(error)&&<ErrorPanel error={error}/>}
    {Boolean(notice)&&<Text style={styles.text}>{notice}</Text>}
    <View style={styles.card}><UiElement as={Heading} title="New ownership claim"/><UiElement as={Field} label="Existing business ID" value={providerId} onChangeText={setProviderId} keyboardType="number-pad" editable={!busy}/><ClaimFields value={form} onChange={setForm} disabled={busy}/><UiElement as={Action} label="Create ownership claim" disabled={busy} onPress={()=>void create()}/></View>
    {rows.loading?<Loading/>:rows.error?<ErrorPanel error={rows.error} retry={rows.retry}/>:rows.data?.map(claim=><ClaimCard key={claim.id} claim={claim} reload={rows.retry}/>)}
  </>;
}
function ClaimFields({value,onChange,disabled}:{value:ClaimInput;onChange:(value:ClaimInput)=>void;disabled:boolean}){const {styles}=useTheme();return <>
  <UiElement as={Field} label="Your authority and ownership statement (at least 20 characters)" value={value.statement} multiline maxLength={2000} editable={!disabled} onChangeText={statement=>onChange({...value,statement})}/>
  <Text style={styles.muted}><UiText value={"Business type"}/></Text>{(['REGISTERED','UNREGISTERED'] as const).map(business_type=><UiElement as={ToggleChoice} key={business_type} label={business_type==='REGISTERED'?'Registered business':'Unregistered business'} selected={value.business_type===business_type} disabled={disabled} onPress={()=>onChange({...value,business_type,registration_evidence_available:business_type==='REGISTERED'?value.registration_evidence_available:false})}/>)}
  {value.business_type==='REGISTERED'&&<UiElement as={ToggleChoice} label="Business registration evidence is available" selected={value.registration_evidence_available} disabled={disabled} onPress={()=>onChange({...value,registration_evidence_available:!value.registration_evidence_available})}/>}
  <Text style={styles.muted}><UiText value={"Use the email address already stored for the business. Email control is verified separately from ownership."}/></Text>
  <UiElement as={Field} label="Stored business email" value={value.contact_value} editable={!disabled} keyboardType="email-address" autoCapitalize="none" maxLength={254} onChangeText={contact_value=>onChange({...value,contact_channel:'EMAIL',contact_value})}/>
</>;}
function ClaimCard({claim,reload}:{claim:Claim;reload:()=>void}){const {styles}=useTheme();const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[token,setToken]=useState(''),[editing,setEditing]=useState<ClaimInput|null>(null);
  async function operation(action:string,payload?:unknown){setBusy(true);setError('');setNotice('');try{const result=await api<{message?:string}>('/seller/ownership-claims/'+claim.id+'/'+action,{method:'POST',...(payload?{body:JSON.stringify(payload)}:{})});setToken('');setEditing(null);setNotice(result.message||'Claim updated.');reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function attach(evidence_type:string){setBusy(true);setError('');try{const file=await pickEvidence();if(!file)return;await api('/seller/ownership-claims/'+claim.id+'/evidence',{method:'POST',body:JSON.stringify({evidence:[{...file,evidence_type}]})});setNotice('Evidence attached.');reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <View style={styles.card}><UiElement as={Heading} title={'Business #'+claim.provider_id}/><Text style={styles.label}>{claim.status}<UiText value={claim.needs_more_info?' · MORE INFORMATION REQUIRED':''}/></Text><Text style={styles.muted}>{claim.statement}</Text>{Boolean(error)&&<ErrorPanel error={error}/>}
    {Boolean(notice)&&<Text style={styles.text}>{notice}</Text>}
    <Text style={styles.muted}><UiText value={"Evidence "}/><UiText value={claim.evidence_requirements_met?'complete':'incomplete'}/> <UiText value={"· Contact "}/><UiText value={claim.contact_control_verified?'verified':'not verified'}/></Text><Text style={styles.muted}>{claim.contact_control_note}</Text>{claim.evidence.map(doc=><Text key={doc.id} style={styles.muted}>{doc.evidence_type.replaceAll('_',' ')} · {doc.filename}</Text>)}
    {claim.status==='PENDING'&&<>
      {claim.business_type==='REGISTERED'?<><UiElement as={Action} label="Upload authority evidence" secondary disabled={busy} onPress={()=>void attach('AUTHORITY')}/>{claim.registration_evidence_available&&<UiElement as={Action} label="Upload business registration evidence" secondary disabled={busy} onPress={()=>void attach('BUSINESS_REGISTRATION')}/>}</>:<><Text style={styles.muted}><UiText value={"Two distinct corroborating documents are required."}/></Text><UiElement as={Action} label="Upload corroborating evidence" secondary disabled={busy} onPress={()=>void attach('CORROBORATING')}/></>}
      {!claim.needs_more_info&&<><UiElement as={Action} label="Send business email verification code" secondary disabled={busy} onPress={()=>void operation('contact-challenge')}/><UiElement as={Field} label="Single-use email verification code" value={token} editable={!busy} maxLength={43} autoCapitalize="none" autoCorrect={false} secureTextEntry onChangeText={setToken}/><UiElement as={Action} label="Verify contact code" disabled={busy||token.length!==43} onPress={()=>void operation('contact-verify',{token})}/></>}
      {claim.needs_more_info&&(editing?<><ClaimFields value={editing} onChange={setEditing} disabled={busy}/><UiElement as={Action} label="Resubmit updated claim" disabled={busy} onPress={()=>void operation('resubmit',editing)}/><UiElement as={Action} label="Cancel editing" secondary disabled={busy} onPress={()=>setEditing(null)}/></>:<UiElement as={Action} label="Update requested information" secondary onPress={()=>setEditing({statement:claim.statement,business_type:claim.business_type,registration_evidence_available:claim.registration_evidence_available,contact_channel:claim.contact_channel,contact_value:claim.contact_value})}/>)}
    </>}
  </View>;
}
