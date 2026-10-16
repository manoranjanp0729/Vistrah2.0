import {Text,View} from 'react-native';
import {router} from 'expo-router';
import {Page,Heading,Action,Loading,ErrorPanel} from '../../components/ui';
import {SellerGate} from '../../components/seller-gate';
import {useResource} from '../../lib/resource';
import {useSession} from '../../lib/session';
import {useTheme} from '../../lib/theme';
type Business={id:number;name:string;company:string;verification_status:string;active:boolean};
export default function SellerDashboard(){return <Page><Heading title="Seller dashboard"/><SellerGate><Workspace/></SellerGate></Page>;}
function Workspace(){const {styles}=useTheme();const {user}=useSession();const businesses=useResource<Business[]>('/seller/businesses',user?.id??null);
  return <><Text style={styles.muted}>Manage your businesses, applications, service listings and job postings. Each business and service needs independent review.</Text><Action label="Business membership & benefits" secondary onPress={()=>router.push('/membership')}/><Action label="Business & service applications" onPress={()=>router.push('/provider-applications')}/><Action label="Employer job postings" secondary onPress={()=>router.push('/employer-jobs')}/><Action label="Legacy business ownership" secondary onPress={()=>router.push('/seller/ownership')}/><Action label="Assigned enquiries" secondary onPress={()=>router.push('/seller/leads')}/><Heading title="Your businesses"/>{businesses.loading?<Loading/>:businesses.error?<ErrorPanel error={businesses.error} retry={businesses.retry}/>:businesses.data?.length?businesses.data.map(business=><View key={business.id} style={styles.card}><Heading title={business.company||business.name}/><Text style={styles.muted}>Business #{business.id} · {business.verification_status} · {business.active?'Active':'Inactive'}</Text><Action label="Business details & listings" secondary onPress={()=>router.push({pathname:'/seller/business/[id]',params:{id:business.id}})}/></View>):<Text style={styles.muted}>No owned business yet. Start a business application or request ownership of a legacy business.</Text>}</>;
}
