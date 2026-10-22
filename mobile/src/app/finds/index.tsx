import {UiText,UiElement} from "../../components/localized-ui";
import {useState} from 'react';
import {Text,View} from 'react-native';
import {router} from 'expo-router';
import {Page,Action,Heading,Loading,ErrorPanel} from '../../components/ui';
import {useSession} from '../../lib/session';
import {useResource} from '../../lib/resource';
import {useTheme} from '../../lib/theme';
import type {RunSummary,FindRequest} from '../../lib/finds';
export default function Finds(){const {user,ready}=useSession();return <UiElement as={Page} title="VISTRAH Finds">{!ready?<Loading/>:!user?<UiElement as={Action} label="Sign in to view your plans" onPress={()=>router.push('/auth')}/>:<Plans key={user.id} userId={user.id}/>}</UiElement>;}
function Plans({userId}:{userId:number}){const {styles}=useTheme();const [page,setPage]=useState(1);const requests=useResource<FindRequest[]>('/finds/requests',userId),runs=useResource<RunSummary[]>('/finds/workflows?page='+page,userId);
  return <><Text style={styles.muted}><UiText value={"Create private job discovery and preparation plans from your saved career enquiries. Applications are not submitted automatically."}/></Text><UiElement as={Heading} title="Start a plan"/>{requests.loading?<Loading/>:requests.error?<ErrorPanel error={requests.error} retry={requests.retry}/>:requests.data?.some(request=>request.templates.length)?requests.data.filter(request=>request.templates.length).map(request=><View key={request.id} style={styles.card}><Heading title={request.service_title}/>{request.templates.map(template=><Action key={template.id} label={template.name} secondary onPress={()=>router.push({pathname:'/finds/new',params:{request:request.id,template:template.id}})}/>)}</View>):<><Text style={styles.muted}><UiText value={"Save a career service enquiry first to create a plan."}/></Text><UiElement as={Action} label="Explore Jobs & Careers" secondary onPress={()=>router.push({pathname:'/category/[slug]',params:{slug:'jobs-careers'}})}/></>}
    <UiElement as={Heading} title="Your plans"/>{runs.loading?<Loading/>:runs.error?<ErrorPanel error={runs.error} retry={runs.retry}/>:<>{runs.data?.map(run=><View key={run.id} style={styles.card}><Text style={styles.heading}><UiText value={run.template_id==='job-discovery@2'?'Job discovery':'Application preparation'}/></Text><Text style={styles.muted}>{run.status} · {run.completed_actions}/{run.total_actions} <UiText value={"steps completed"}/></Text><UiElement as={Action} label="View plan" secondary onPress={()=>router.push({pathname:'/finds/[id]',params:{id:run.id}})}/></View>)}{!runs.data?.length&&<Text style={styles.muted}><UiText value={"No plans yet."}/></Text>}<View style={styles.row}>{page>1&&<UiElement as={Action} label="Previous" secondary onPress={()=>setPage(value=>value-1)}/>}<Text style={styles.muted}><UiText value={"Page "}/>{page}</Text>{runs.data?.length===30&&<UiElement as={Action} label="Next" secondary onPress={()=>setPage(value=>value+1)}/>}</View></>}
  </>;
}
