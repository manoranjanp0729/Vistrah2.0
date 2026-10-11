import copy from '../../lib/interface-copy';
import {useState} from 'react';
import {Switch,Text,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Action,ErrorPanel,Field,Heading,Loading,MemberGate,Page} from '../../components/ui';
import {allServices,enquiryPrefix,pathways,type Category,type Intent} from '../../lib/catalogue';
import {useResource} from '../../lib/resource';
import {api} from '../../lib/api';
import {useSession} from '../../lib/session';
import {useLocation} from '../../lib/location';
import {useTheme} from '../../lib/theme';
export default function Enquiry(){return <Page><MemberGate><Form/></MemberGate></Page>;}
function Form(){const {styles}=useTheme();
  const params=useLocalSearchParams<{id:string;intent?:string}>();const {user}=useSession();const {location}=useLocation();const catalogue=useResource<Category[]>('/catalogue');
  const context=allServices(catalogue.data??[]).find(item=>String(item.service.id)===params.id);
  const intent:Intent=pathways.some(path=>path.id===params.intent)?params.intent as Intent:'providers';
  const [pin,setPin]=useState('');const [address,setAddress]=useState('');const [share,setShare]=useState(false);
  const [requirements,setRequirements]=useState('');const [city,setCity]=useState(location?.label??'');const [phone,setPhone]=useState(user?.phone??'');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [saved,setSaved]=useState(false);
  async function submit(){
    if(!context)return;setError('');if(requirements.trim().length<20||city.trim().length<2||!/^\+?[\d\s-]{10,20}$/.test(phone.trim())){setError('Enter at least 20 characters of requirements, your city/area and a phone number of 10–20 characters.');return;}
    if(pin&&!/^[0-9]{6}$/.test(pin)){setError('Enter a six-digit PIN code.');return;}if(share&&address.trim().length<3){setError('Enter an exact service address before sharing it.');return;}
    setBusy(true);try{await api('/requests',{method:'POST',body:JSON.stringify({service_id:context.service.id,requirements:enquiryPrefix(intent)+requirements.trim(),location:city.trim(),phone:phone.trim(),postal_code:pin.trim()||null,service_address:share?address.trim()||null:null})});setSaved(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  if(catalogue.loading)return <Loading/>;if(catalogue.error)return <ErrorPanel error={catalogue.error} retry={catalogue.retry}/>;
  if(!context)return <Text style={styles.muted}>{copy.service.unavailable}</Text>;
  if(saved)return <><Heading title={copy.requests.saved}/><Text style={styles.muted}>{copy.requests.savedDescription}</Text><Action label={copy.requests.view} onPress={()=>router.replace('/requests')}/></>;
  return <><Heading title={context.service.title}/><Text style={styles.muted}>{intent==='recommendations'?'Request help choosing services or providers through human review.':intent==='in-house'?'Ask about delivery options. This does not confirm VISTRAH delivery.':'Save a service-specific enquiry for human review.'} This does not send an email or create a booking.</Text>
    {Boolean(error)&&<ErrorPanel error={error}/>}<Field label={copy.requests.requirements} multiline value={requirements} onChangeText={setRequirements} maxLength={4900}/><Field label="City or area" value={city} onChangeText={setCity} maxLength={200}/><Field label={copy.requests.pin} value={pin} onChangeText={setPin} keyboardType="number-pad" maxLength={6}/><View style={styles.row}><Switch value={share} onValueChange={setShare} accessibilityLabel={copy.requests.share}/><Text style={[styles.muted,{flex:1}]}>{copy.requests.share}</Text></View><Field label={copy.requests.address} multiline value={address} onChangeText={setAddress} maxLength={1000}/><Field label={copy.profile.phone} keyboardType="phone-pad" value={phone} onChangeText={setPhone} maxLength={20}/><Text style={styles.muted}>{copy.requests.privacy}</Text><Action label={busy?'Saving…':'Save enquiry'} disabled={busy} onPress={()=>void submit()}/>
  </>;
}
