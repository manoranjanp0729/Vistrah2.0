import {useRef,useState} from 'react';
import {Text} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Page,Heading,Action,ErrorPanel} from '../../components/ui';
import {FindsForm} from '../../components/finds-form';
import {api} from '../../lib/api';
import {newInputs,preparedInputs,type JobInputs,type DiscoveryInputs} from '../../lib/finds';
import {useSession} from '../../lib/session';
import {useTheme} from '../../lib/theme';
export default function NewPlan(){const {request,template}=useLocalSearchParams<{request:string;template:string}>();const {user}=useSession();return <Page><Heading title="New private career plan"/>{user?<PlanForm key={user.id} request={request} template={template}/>:<Action label="Sign in" onPress={()=>router.push('/auth')}/>}</Page>;}
function PlanForm({request,template}:{request:string;template:string}){const {styles}=useTheme();const discovery=template==='job-discovery@2';const [value,setValue]=useState<JobInputs|DiscoveryInputs>(discovery?{...newInputs,sources:['remotive'],result_limit:20,max_pages:2}:{...newInputs}),[busy,setBusy]=useState(false),[error,setError]=useState('');const key=useRef('');
  async function create(){if(!key.current)key.current='mobile-find-'+Date.now()+'-'+Math.random().toString(36).slice(2);setBusy(true);setError('');try{const run=await api<{id:string}>(discovery?'/finds/discovery':'/finds/workflows',{method:'POST',body:JSON.stringify({request_id:Number(request),template_id:template,idempotency_key:key.current,inputs:preparedInputs(value)})});router.replace({pathname:'/finds/[id]',params:{id:run.id}});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <><Text style={styles.muted}>Your profile and plan stay private. Starting a plan is a separate action; applications are not submitted automatically.</Text>{Boolean(error)&&<ErrorPanel error={error}/>}<FindsForm value={value} onChange={setValue} discovery={discovery} disabled={busy}/><Action label="Create plan draft" disabled={busy} onPress={()=>void create()}/></>;
}
