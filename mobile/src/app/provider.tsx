import {Text} from '../components/typography';
import {UiText,UiElement} from "../components/localized-ui";
import {useLanguage} from '../lib/language';
import {View} from 'react-native';
import {router} from 'expo-router';
import {Page,Action} from '../components/ui';
import {useSession} from '../lib/session';
import {isSellerUser} from '../lib/types';
import {useTheme} from '../lib/theme';
export default function ProviderScreen(){const {copy}=useLanguage();const {styles}=useTheme();const {user}=useSession();const seller=isSellerUser(user);
  return <Page title={copy.provider.title}><Text style={styles.text}><UiText value={copy.provider.subtitle}/></Text><Text style={styles.muted}><UiText value={copy.provider.intro}/></Text>
    <View style={styles.card}><Text style={styles.heading}><UiText value={copy.provider.business}/></Text><Text style={styles.muted}><UiText value={"Add your business, complete the details form and upload evidence in the app. Business ownership and each service listing are reviewed independently."}/></Text>{!user?<UiElement as={Action} auth label="Sign in / Create account" onPress={()=>router.push({pathname:'/auth',params:{next:'/seller'}})}/>:!seller&&<UiElement as={Action} label="Complete seller onboarding" onPress={()=>router.push('/seller')}/>}</View>
    <UiElement as={Action} label="Business & service applications" onPress={()=>router.push('/provider-applications')}/><UiElement as={Action} label="Seller dashboard" secondary onPress={()=>router.push('/seller')}/><UiElement as={Action} label="Employer job postings" secondary onPress={()=>router.push('/employer-jobs')}/>
  </Page>;
}
