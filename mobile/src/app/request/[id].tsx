import {useState} from 'react';
import {Text} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Action,ErrorPanel,Field,Heading,Loading,MemberGate,Page} from '../../components/ui';
import {allServices,enquiryPrefix,pathways,type Category,type Intent} from '../../lib/catalogue';
import {useResource} from '../../lib/resource';
import {api} from '../../lib/api';
import {useSession} from '../../lib/session';
import {useLocation} from '../../lib/location';
import {styles} from '../../lib/theme';
export default function Enquiry(){return <Page><MemberGate><Form/></MemberGate></Page>;}
function Form(){
  const params=useLocalSearchParams<{id:string;intent?:string}>();const {user}=useSession();const {location}=useLocation();const catalogue=useResource<Category[]>('/catalogue');
  const context=allServices(catalogue.data??[]).find(item=>String(item.service.id)===params.id);
  const intent:Intent=pathways.some(path=>path.id===params.intent)?params.intent as Intent:'providers';
  const [requirements,setRequirements]=useState('');const [city,setCity]=useState(location?.label??'');const [phone,setPhone]=useState(user?.phone??'');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [saved,setSaved]=useState(false);
  async function submit(){
    if(!context)return;setError('');if(requirements.trim().length<20||city.trim().length<2||!/^\+?[\d\s-]{10,20}$/.test(phone.trim())){setError('Enter at least 20 characters of requirements, your city/area and a phone number of 10–20 characters.');return;}
    setBusy(true);try{await api('/requests',{method:'POST',body:JSON.stringify({service_id:context.service.id,requirements:enquiryPrefix(intent)+requirements.trim(),location:city.trim(),phone:phone.trim()})});setSaved(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  if(catalogue.loading)return <Loading/>;if(catalogue.error)return <ErrorPanel error={catalogue.error} retry={catalogue.retry}/>;
  if(!context)return <Text style={styles.muted}>This service is unavailable.</Text>;
  if(saved)return <><Heading title="Enquiry saved"/><Text style={styles.muted}>VISTRAH can review your requirements. This is not a confirmed booking.</Text><Action label="View my enquiries" onPress={()=>router.replace('/requests')}/></>;
  return <><Heading title={context.service.title}/><Text style={styles.muted}>{intent==='recommendations'?'Request help choosing services or providers through human review.':intent==='in-house'?'Ask about delivery options. This does not confirm VISTRAH delivery.':'Save a service-specific enquiry for human review.'} This does not send an email or create a booking.</Text>
    {error&&<ErrorPanel error={error}/>}<Field label="Your requirements" multiline value={requirements} onChangeText={setRequirements} maxLength={4900}/><Field label="City or area" value={city} onChangeText={setCity} maxLength={200}/><Field label="Contact phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} maxLength={20}/><Text style={styles.muted}>Your precise coordinates are not attached to this enquiry.</Text><Action label={busy?'Saving…':'Save enquiry'} disabled={busy} onPress={()=>void submit()}/>
  </>;
}
