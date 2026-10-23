import {Text} from '../../components/typography';
import {UiText} from "../../components/localized-ui";
import {useLanguage} from '../../lib/language';
import {useState} from 'react';
import {Switch,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {PageTitle,Action,ErrorPanel,Field,Heading,Loading,MemberGate,Page} from '../../components/ui';
import {allServices,enquiryPrefix,pathways,type Category,type Intent} from '../../lib/catalogue';
import {useResource} from '../../lib/resource';
import {api} from '../../lib/api';
import {useSession} from '../../lib/session';
import {useLocation} from '../../lib/location';
import {useTheme} from '../../lib/theme';
export default function Enquiry(){return <Page><MemberGate><Form/></MemberGate></Page>;}
function Form(){const {copy,t}=useLanguage();const {styles}=useTheme();
  const params=useLocalSearchParams<{id:string;intent?:string}>();const {user}=useSession();const {location}=useLocation();const catalogue=useResource<Category[]>('/catalogue');
  const context=allServices(catalogue.data??[]).find(item=>String(item.service.id)===params.id);
  const intent:Intent=pathways.some(path=>path.id===params.intent)?params.intent as Intent:'providers';
  const [pin,setPin]=useState('');const [address,setAddress]=useState('');const [share,setShare]=useState(false);
  const [requirements,setRequirements]=useState('');const [city,setCity]=useState(location?.label??'');const [phone,setPhone]=useState(user?.phone??'');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [saved,setSaved]=useState(false);
  async function submit(){
    if(!context)return;setError('');if(requirements.trim().length<20||city.trim().length<2||!/^\+?[\d\s-]{10,20}$/.test(phone.trim())){setError(t('validation.enquiry'));return;}
    if(pin&&!/^[0-9]{6}$/.test(pin)){setError(t('validation.pin'));return;}if(share&&address.trim().length<3){setError(t('validation.address'));return;}
    setBusy(true);try{await api('/requests',{method:'POST',body:JSON.stringify({service_id:context.service.id,requirements:enquiryPrefix(intent)+requirements.trim(),location:city.trim(),phone:phone.trim(),postal_code:pin.trim()||null,service_address:share?address.trim()||null:null})});setSaved(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  if(catalogue.loading)return <Loading/>;if(catalogue.error)return <ErrorPanel error={catalogue.error} retry={catalogue.retry}/>;
  if(!context)return <Text style={styles.muted}><UiText value={copy.service.unavailable}/></Text>;
  if(saved)return <><PageTitle title={copy.requests.saved}/><Text style={styles.muted}><UiText value={copy.requests.savedDescription}/></Text><Action label={copy.requests.view} onPress={()=>router.replace('/my-requests')}/></>;
  return <><Heading title={context.service.title}/><Text style={styles.muted}><UiText value={intent==='recommendations'?t('requests.recommendationIntro'):intent==='in-house'?t('requests.deliveryIntro'):t('requests.enquiryIntro')}/>{' '}{t('requests.noBooking')}</Text>
    {Boolean(error)&&<ErrorPanel error={error}/>}<Field label={copy.requests.requirements} multiline value={requirements} onChangeText={setRequirements} maxLength={4900}/><Field label={copy.requests.city} value={city} onChangeText={setCity} maxLength={200}/><Field label={copy.requests.pin} value={pin} onChangeText={setPin} keyboardType="number-pad" maxLength={6}/><View style={styles.row}><Switch value={share} onValueChange={setShare} accessibilityLabel={copy.requests.share}/><Text style={[styles.muted,{flex:1}]}><UiText value={copy.requests.share}/></Text></View><Field label={copy.requests.address} multiline value={address} onChangeText={setAddress} maxLength={1000}/><Field label={copy.profile.phone} keyboardType="phone-pad" value={phone} onChangeText={setPhone} maxLength={20}/><Text style={styles.muted}><UiText value={copy.requests.privacy}/></Text><Action label={busy?copy.profile.saving:copy.requests.save} disabled={busy} onPress={()=>void submit()}/>
  </>;
}
