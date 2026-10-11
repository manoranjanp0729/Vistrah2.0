import {useState} from 'react';
import {Text,View} from 'react-native';
import {Page,Heading,Action,ErrorPanel} from '../components/ui';
import {openWebsite} from '../lib/web';
import {styles} from '../lib/theme';
export default function ProviderScreen(){
  const [error,setError]=useState('');const open=(path:string)=>{void openWebsite(path).catch(e=>setError(e.message));};
  return <Page><Heading title="Offer your expertise"/><Text style={styles.text}>Opportunities for every provider.</Text><Text style={styles.muted}>Use one account as a customer and seller. Customer membership is not required for seller onboarding. Business ownership and each service listing require separate review.</Text>
    <View style={styles.card}><Text style={styles.heading}>Start with your business</Text><Text style={styles.muted}>Add your business, submit ownership evidence, and present the services you provide. Provider application forms and evidence uploads are available through the website.</Text><Action label="Sign up as seller on website ↗" onPress={()=>open('/seller/register')}/><Action label="Existing seller: sign in ↗" secondary onPress={()=>open('/seller/login')}/></View>
    <Action label="Provider application ↗" secondary onPress={()=>open('/provide-service')}/><Action label="Seller dashboard ↗" secondary onPress={()=>open('/seller')}/>
    <Text style={styles.muted}>These actions open your browser. Sign in there using your VISTRAH account; tokens are never passed in links.</Text>{error&&<ErrorPanel error={error}/>}
  </Page>;
}
