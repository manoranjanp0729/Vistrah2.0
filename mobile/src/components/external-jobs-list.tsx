import {useLanguage} from '../lib/language';
import {date} from '../lib/format';
import {useState} from 'react';
import {Linking,Text,View} from 'react-native';
import type {Vacancy} from '../lib/types';
import {Field,Action,Loading,ErrorPanel} from '../components/ui';
import {useResource} from '../lib/resource';
import {useTheme} from '../lib/theme';
export function ExternalJobsList(){const {copy}=useLanguage();const {styles}=useTheme();
  const [input,setInput]=useState('');const [query,setQuery]=useState('');const [page,setPage]=useState(1);const [error,setError]=useState('');
  const result=useResource<{items:Vacancy[];total:number;note:string}>('/jobs?page='+page+'&q='+encodeURIComponent(query));
  async function open(value:string){try{const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('This listing has an invalid source link.');await Linking.openURL(value);}catch(e){setError((e as Error).message);}}
  return <View style={{gap:16}}><Field label={copy.jobs.search} value={input} onChangeText={setInput} maxLength={150}/><Action label={copy.jobs.searchButton} onPress={()=>{setQuery(input.trim());setPage(1);}}/>{Boolean(error)&&<ErrorPanel error={error}/>}
    {result.loading?<Loading/>:result.error?<ErrorPanel error={result.error} retry={result.retry}/>:<><Text style={styles.muted}>{result.data?.note}</Text>{!result.data?.items.length&&<Text style={styles.muted}>{copy.jobs.empty}</Text>}{result.data?.items.map(vacancy=><View key={vacancy.id} style={styles.card}><Text style={styles.heading}>{vacancy.title}</Text><Text style={styles.muted}>{vacancy.employer||'Employer not supplied'} · {vacancy.location||'Location not supplied'}</Text><Text style={styles.label}>{vacancy.status==='STALE'?'STALE':'SOURCE LISTED'} · OPEN STATUS UNCONFIRMED</Text><Text style={styles.muted}>{vacancy.salary_text||'Salary not supplied'} · Deadline: {vacancy.deadline||'Not supplied'}</Text><Text style={styles.muted}>{vacancy.description}</Text>{vacancy.provenance.map(source=><View key={source.source+'_'+source.source_record_id} style={{gap:8}}><Action label={source.attribution} secondary onPress={()=>void open(source.source==='adzuna'?'https://www.adzuna.co.uk':source.source_url)}/><Text style={styles.muted}>Retrieved {date(source.retrieved_at)}</Text><Action label="View original listing ↗" secondary onPress={()=>void open(source.source_url)}/></View>)}</View>)}
      <View style={styles.row}>{page>1&&<Action label={copy.jobs.previous} secondary onPress={()=>setPage(v=>v-1)}/>}<Text style={styles.muted}>Page {page}</Text>{page*20<(result.data?.total??0)&&<Action label={copy.jobs.next} secondary onPress={()=>setPage(v=>v+1)}/>}</View></>}
  </View>;
}

