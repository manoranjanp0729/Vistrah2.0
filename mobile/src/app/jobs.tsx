import {useState} from 'react';
import {Linking,Text,View} from 'react-native';
import type {Vacancy} from '../lib/types';
import {Page,Heading,Field,Action,Loading,ErrorPanel} from '../components/ui';
import {useResource} from '../lib/resource';
import {styles} from '../lib/theme';
export default function Jobs(){
  const [input,setInput]=useState('');const [query,setQuery]=useState('');const [page,setPage]=useState(1);const [error,setError]=useState('');
  const result=useResource<{items:Vacancy[];total:number;note:string}>('/jobs?page='+page+'&q='+encodeURIComponent(query));
  async function open(value:string){try{const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('This listing has an invalid source link.');await Linking.openURL(value);}catch(e){setError((e as Error).message);}}
  return <Page><Heading title="Public vacancies"/><Text style={styles.muted}>Read source-listed jobs without signing in. Open status and salary are supplied by the source.</Text><Field label="Search vacancies" value={input} onChangeText={setInput} maxLength={150}/><Action label="Search" onPress={()=>{setQuery(input.trim());setPage(1);}}/>{Boolean(error)&&<ErrorPanel error={error}/>}
    {result.loading?<Loading/>:result.error?<ErrorPanel error={result.error} retry={result.retry}/>:<><Text style={styles.muted}>{result.data?.note}</Text>{!result.data?.items.length&&<Text style={styles.muted}>No cached vacancies match this search. No sample listings are shown.</Text>}{result.data?.items.map(vacancy=><View key={vacancy.id} style={styles.card}><Text style={styles.heading}>{vacancy.title}</Text><Text style={styles.muted}>{vacancy.employer||'Employer not supplied'} · {vacancy.location||'Location not supplied'}</Text><Text style={styles.label}>{vacancy.status==='STALE'?'STALE':'SOURCE LISTED'} · OPEN STATUS UNCONFIRMED</Text><Text style={styles.muted}>{vacancy.salary_text||'Salary not supplied'} · Deadline: {vacancy.deadline||'Not supplied'}</Text><Text style={styles.muted}>{vacancy.description}</Text>{vacancy.provenance.map(source=><View key={source.source+'_'+source.source_record_id} style={{gap:8}}><Text style={styles.muted}>{source.attribution} · Retrieved {new Date(source.retrieved_at).toLocaleDateString('en-IN')}</Text><Action label="View original listing ↗" secondary onPress={()=>void open(source.source_url)}/></View>)}</View>)}
      <View style={styles.row}>{page>1&&<Action label="Previous" secondary onPress={()=>setPage(v=>v-1)}/>}<Text style={styles.muted}>Page {page}</Text>{page*20<(result.data?.total??0)&&<Action label="Next" secondary onPress={()=>setPage(v=>v+1)}/>}</View></>}
  </Page>;
}
