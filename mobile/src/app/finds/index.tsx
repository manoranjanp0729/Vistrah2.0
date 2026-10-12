import {useState} from 'react';
import {Text,View} from 'react-native';
import {router} from 'expo-router';
import {Page,Action,Heading,Loading,ErrorPanel} from '../../components/ui';
import {useSession} from '../../lib/session';
import {useResource} from '../../lib/resource';
import {useTheme} from '../../lib/theme';
import type {RunSummary,FindRequest} from '../../lib/finds';
export default function Finds(){const {user,ready}=useSession();return <Page><Heading title="VISTRAH Finds"/>{!ready?<Loading/>:!user?<Action label="Sign in to view your plans" onPress={()=>router.push('/auth')}/>:<Plans key={user.id} userId={user.id}/>}</Page>;}
function Plans({userId}:{userId:number}){const {styles}=useTheme();const [page,setPage]=useState(1);const requests=useResource<FindRequest[]>('/finds/requests',userId),runs=useResource<RunSummary[]>('/finds/workflows?page='+page,userId);
  return <><Text style={styles.muted}>Create private job discovery and preparation plans from your saved career enquiries. Applications are not submitted automatically.</Text><Heading title="Start a plan"/>{requests.loading?<Loading/>:requests.error?<ErrorPanel error={requests.error} retry={requests.retry}/>:requests.data?.some(request=>request.templates.length)?requests.data.filter(request=>request.templates.length).map(request=><View key={request.id} style={styles.card}><Heading title={request.service_title}/>{request.templates.map(template=><Action key={template.id} label={template.name} secondary onPress={()=>router.push({pathname:'/finds/new',params:{request:request.id,template:template.id}})}/>)}</View>):<><Text style={styles.muted}>Save a career service enquiry first to create a plan.</Text><Action label="Explore Jobs & Careers" secondary onPress={()=>router.push({pathname:'/category/[slug]',params:{slug:'jobs-careers'}})}/></>}
    <Heading title="Your plans"/>{runs.loading?<Loading/>:runs.error?<ErrorPanel error={runs.error} retry={runs.retry}/>:<>{runs.data?.map(run=><View key={run.id} style={styles.card}><Text style={styles.heading}>{run.template_id==='job-discovery@2'?'Job discovery':'Application preparation'}</Text><Text style={styles.muted}>{run.status} · {run.completed_actions}/{run.total_actions} steps completed</Text><Action label="View plan" secondary onPress={()=>router.push({pathname:'/finds/[id]',params:{id:run.id}})}/></View>)}{!runs.data?.length&&<Text style={styles.muted}>No plans yet.</Text>}<View style={styles.row}>{page>1&&<Action label="Previous" secondary onPress={()=>setPage(value=>value-1)}/>}<Text style={styles.muted}>Page {page}</Text>{runs.data?.length===30&&<Action label="Next" secondary onPress={()=>setPage(value=>value+1)}/>}</View></>}
  </>;
}
