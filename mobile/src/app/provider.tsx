import {Text} from '../components/typography';
import {UiText,UiElement} from "../components/localized-ui";
import {useLanguage} from '../lib/language';
import {View} from 'react-native';
import {router} from 'expo-router';
import {Page,Action} from '../components/ui';
import {useSession} from '../lib/session';
import {useTheme} from '../lib/theme';
export default function ProviderScreen(){const {copy}=useLanguage();const {styles}=useTheme();const {user}=useSession();
  return <Page title={copy.provider.title}><Text style={styles.text}><UiText value={copy.provider.subtitle}/></Text><Text style={styles.muted}><UiText value={copy.provider.intro}/></Text>
    <View style={styles.card}><Text style={styles.heading}><UiText value={copy.provider.business}/></Text><Text style={styles.muted}><UiText value={"Add your business, complete the details form and upload evidence in the app. Business ownership and each service listing are reviewed independently."}/></Text>{!user&&<><UiElement as={Action} auth label="Sign up as seller / employer" onPress={()=>router.push({pathname:'/auth',params:{mode:'seller',register:'1'}})}/><UiElement as={Action} auth label="Seller / employer sign in" secondary onPress={()=>router.push({pathname:'/auth',params:{mode:'seller'}})}/></>}</View>
    <UiElement as={Action} label="Business & service applications" onPress={()=>router.push('/provider-applications')}/><UiElement as={Action} label="Seller dashboard" secondary onPress={()=>router.push('/seller')}/><UiElement as={Action} label="Employer job postings" secondary onPress={()=>router.push('/employer-jobs')}/>
  </Page>;
}
