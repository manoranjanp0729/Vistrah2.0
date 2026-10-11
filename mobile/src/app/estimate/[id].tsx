import {useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Action,ErrorPanel,Field,Heading,Loading,MemberGate,Page} from '../../components/ui';
import {useResource} from '../../lib/resource';
import {allServices,type Category,type ServiceContext} from '../../lib/catalogue';
import {estimateScopes} from '../../lib/estimate-scopes';
import {estimateRequirements} from '../../lib/estimate';
import {useSession} from '../../lib/session';
import {useLocation} from '../../lib/location';
import {api} from '../../lib/api';
import {useTheme} from '../../lib/theme';
export default function Estimate(){const {styles}=useTheme();
 const {id}=useLocalSearchParams<{id:string}>();const catalogue=useResource<Category[]>('/catalogue');const context=allServices(catalogue.data??[]).find(item=>String(item.service.id)===id);
 return <Page>{catalogue.loading?<Loading/>:catalogue.error?<ErrorPanel error={catalogue.error} retry={catalogue.retry}/>:!context?<Text style={styles.muted}>This service is unavailable.</Text>:<MemberGate><EstimateForm key={context.service.id} context={context}/></MemberGate>}</Page>;
}
function EstimateForm({context}:{context:ServiceContext}){const {colors,styles}=useTheme();
 const {user}=useSession();const {location}=useLocation();const fields=estimateScopes[context.service.slug];
 const [answers,setAnswers]=useState<Record<string,string>>({}),[city,setCity]=useState(location?.label??''),[phone,setPhone]=useState(user?.phone??''),[details,setDetails]=useState(''),[budget,setBudget]=useState(''),[timing,setTiming]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false);
 async function submit(){
  if(!fields||busy)return;setError('');
  try{
   if(city.trim().length<2||!/^\+?[\d\s-]{10,20}$/.test(phone.trim()))throw new Error('Enter your city or area and a contact phone number of 10–20 characters.');
   if(!timing.trim())throw new Error('Enter your preferred timing.');
   const requirements=estimateRequirements(context.service.title,fields,answers,details,budget,timing.trim());
   setBusy(true);await api('/requests',{method:'POST',body:JSON.stringify({service_id:context.service.id,requirements,location:city.trim(),phone:phone.trim()})});setSaved(true);
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 if(!fields)return <><Heading title="Get Estimate"/><Text style={styles.muted}>A tailored estimate form has not yet been prepared for this service.</Text><Action label="Send a service enquiry" onPress={()=>router.replace({pathname:'/request/[id]',params:{id:context.service.id}})}/></>;
 if(saved)return <><Heading title="Estimate request saved"/><Text style={styles.muted}>Your {context.service.title} details have been saved for human review. This is not a confirmed price or booking.</Text><Action label="View my enquiries" onPress={()=>router.replace('/requests')}/></>;
 return <><Text style={styles.label}>Get Estimate</Text><Heading title={context.service.title}/><Text style={styles.muted}>Tell us the scope of your work to request a service estimate. Required questions are marked *. A final estimate needs human review.</Text>
 {Boolean(error)&&<ErrorPanel error={error}/>}
 {fields.map(field=>field.kind==='choice'?<View key={field.id} style={{gap:8}}><Text style={styles.muted}>{field.label} *</Text><View style={[styles.row,{flexWrap:'wrap',gap:8}]}>{field.options?.map(option=><Pressable key={option} disabled={busy} accessibilityRole="radio" accessibilityState={{checked:answers[field.id]===option,disabled:busy}} accessibilityLabel={field.label+': '+option} onPress={()=>setAnswers(previous=>({...previous,[field.id]:option}))} style={{padding:12,minHeight:44,borderRadius:12,borderWidth:1,borderColor:answers[field.id]===option?colors.accent:colors.border,backgroundColor:colors.surface}}><Text style={{color:answers[field.id]===option?colors.accent:colors.text}}>{option}</Text></Pressable>)}</View></View>:<Field key={field.id} label={field.label+' *'} value={answers[field.id]??''} onChangeText={value=>setAnswers(previous=>({...previous,[field.id]:value}))} keyboardType={field.kind==='number'?'decimal-pad':'default'} maxLength={300} editable={!busy}/>)}
 <Field label="Preferred timing *" placeholder="For example: within two weeks" value={timing} onChangeText={setTiming} maxLength={150} editable={!busy}/><Field label="Budget range (optional)" value={budget} onChangeText={setBudget} maxLength={150} editable={!busy}/><Field label="Additional details (optional)" multiline value={details} onChangeText={setDetails} maxLength={1500} editable={!busy}/><Field label="City or area *" value={city} onChangeText={setCity} maxLength={200} editable={!busy}/><Field label="Contact phone *" keyboardType="phone-pad" value={phone} onChangeText={setPhone} maxLength={20} editable={!busy}/><Text style={styles.muted}>Your precise coordinates are not attached. Describe the scope only; do not enter passwords, identity numbers or private document contents.</Text><Action label={busy?'Saving…':'Request Estimate'} disabled={busy} onPress={()=>void submit()}/></>;
}
