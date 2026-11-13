import {Text} from './typography';
import {UiText,UiElement} from "./localized-ui";
import {useState} from 'react';
import {Linking,View} from 'react-native';
import {Action,Field,Heading,Loading,ErrorPanel} from './ui';
import {useResource} from '../lib/resource';
import {ApiError} from '../lib/api';
import {applicationLink,type EmployerJob,type JobPage} from '../lib/employer-jobs';
import {useTheme} from '../lib/theme';
export function EmployerJobsList(){
  const {styles}=useTheme();const [input,setInput]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(1),[error,setError]=useState('');
  const result=useResource<JobPage<EmployerJob>>('/employer-jobs?page='+page+'&q='+encodeURIComponent(query));
  async function apply(value:string){setError('');try{await Linking.openURL(applicationLink(value));}catch(e){setError((e as Error).message);}}
  return <View style={{gap:16}}><UiElement as={Heading} title="VISTRAH Jobs"/><Text style={styles.muted}><UiText value={"Jobs posted by employers and approved for publication. Applications open on the employer’s website."}/></Text>
    <UiElement as={Field} label="Search VISTRAH jobs" value={input} onChangeText={setInput} maxLength={150}/><UiElement as={Action} label="Search" onPress={()=>{setQuery(input.trim());setPage(1);}}/>
    {Boolean(error)&&<ErrorPanel error={error}/>}
    {result.loading?<Loading/>:result.error?<ErrorPanel error={result.error instanceof ApiError&&result.error.status===404?'VISTRAH Jobs is currently unavailable. Please try again later.':result.error} retry={result.retry}/>:<>
      {!result.data?.items.length&&<Text style={styles.muted}><UiText value={"No published VISTRAH jobs match this search."}/></Text>}
      {result.data?.items.map(job=><View key={job.id} style={styles.card}><Heading title={job.title}/><Text style={styles.text}>{job.employer}</Text><Text style={styles.muted}>{job.location} · {job.arrangement} · {job.employment_type.replaceAll('_',' ')}</Text><Text style={styles.label}><UiText value={"EMPLOYER POSTED"}/></Text><Text style={styles.muted}>{job.salary_text||'Salary not supplied'} <UiText value={"· Deadline: "}/>{job.deadline||'Not supplied'}</Text><Text style={styles.text}>{job.description}</Text><UiElement as={Action} label="Apply on employer website ↗" onPress={()=>void apply(job.application_url)}/></View>)}
      <View style={styles.row}>{page>1&&<UiElement as={Action} label="Previous" secondary onPress={()=>setPage(value=>value-1)}/>}<Text style={styles.muted}><UiText value={"Page "}/>{page}</Text>{page*(result.data?.page_size??20)<(result.data?.total??0)&&<UiElement as={Action} label="Next" secondary onPress={()=>setPage(value=>value+1)}/>}</View>
    </>}
  </View>;
}
