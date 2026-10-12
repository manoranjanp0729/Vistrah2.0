import copy from '../lib/interface-copy';
import {Text,View} from 'react-native';
import {router} from 'expo-router';
import {Page,Heading,Action} from '../components/ui';
import {useSession} from '../lib/session';
import {useTheme} from '../lib/theme';
export default function ProviderScreen(){const {styles}=useTheme();const {user}=useSession();
  return <Page><Heading title={copy.provider.title}/><Text style={styles.text}>{copy.provider.subtitle}</Text><Text style={styles.muted}>{copy.provider.intro}</Text>
    <View style={styles.card}><Text style={styles.heading}>{copy.provider.business}</Text><Text style={styles.muted}>Add your business, complete the details form and upload evidence in the app. Business ownership and each service listing are reviewed independently.</Text>{!user&&<><Action label="Sign up as seller / employer" onPress={()=>router.push({pathname:'/auth',params:{mode:'seller',register:'1'}})}/><Action label="Seller / employer sign in" secondary onPress={()=>router.push({pathname:'/auth',params:{mode:'seller'}})}/></>}</View>
    <Action label="Business & service applications" onPress={()=>router.push('/provider-applications')}/><Action label="Seller dashboard" secondary onPress={()=>router.push('/seller')}/><Action label="Employer job postings" secondary onPress={()=>router.push('/employer-jobs')}/>
  </Page>;
}
