import copy from '../lib/interface-copy';
import {useState} from 'react';
import {Text,View} from 'react-native';
import {Page,Heading,Action,ErrorPanel} from '../components/ui';
import {openWebsite} from '../lib/web';
import {styles} from '../lib/theme';
export default function ProviderScreen(){
  const [error,setError]=useState('');const open=(path:string)=>{void openWebsite(path).catch(e=>setError(e.message));};
  return <Page><Heading title={copy.provider.title}/><Text style={styles.text}>{copy.provider.subtitle}</Text><Text style={styles.muted}>{copy.provider.intro}</Text>
    <View style={styles.card}><Text style={styles.heading}>{copy.provider.business}</Text><Text style={styles.muted}>{copy.provider.businessCopy}</Text><Action label={copy.provider.register} onPress={()=>open('/seller/register')}/><Action label={copy.provider.login} secondary onPress={()=>open('/seller/login')}/></View>
    <Action label={copy.provider.application} secondary onPress={()=>open('/provide-service')}/><Action label={copy.provider.dashboard} secondary onPress={()=>open('/seller')}/>
    <Text style={styles.muted}>These actions open your browser. Sign in there using your VISTRAH account; tokens are never passed in links.</Text>{Boolean(error)&&<ErrorPanel error={error}/>}
  </Page>;
}
