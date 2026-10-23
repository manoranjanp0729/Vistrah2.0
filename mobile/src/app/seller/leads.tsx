import {Text} from '../../components/typography';
import {UiText,UiElement} from "../../components/localized-ui";
import {View} from 'react-native';
import {Page,Heading,Loading,ErrorPanel} from '../../components/ui';
import {SellerGate} from '../../components/seller-gate';
import {useSession} from '../../lib/session';
import {useResource} from '../../lib/resource';
import {useTheme} from '../../lib/theme';
type Lead={id:number;request_id:number;service_id:number;requirements?:string;location?:string;phone?:string;postal_code?:string;service_address?:string;customer?:string;status?:string;service_title?:string};
export default function Leads(){return <UiElement as={Page} title="Assigned enquiries"><SellerGate><LeadList/></SellerGate></UiElement>;}
function LeadList(){const {styles}=useTheme();const {user}=useSession();const leads=useResource<Lead[]>('/seller/leads',user?.id??null);return leads.loading?<Loading/>:leads.error?<ErrorPanel error={leads.error} retry={leads.retry}/>:leads.data?.length?<>{leads.data.map(lead=><View key={lead.id} style={styles.card}><UiElement as={Heading} title={lead.service_title||'Enquiry #'+lead.request_id}/>{[lead.status,lead.customer,lead.requirements,lead.location,lead.postal_code,lead.service_address,lead.phone].filter(Boolean).map((text,index)=><Text key={index} style={styles.muted}>{text}</Text>)}</View>)}</>:<Text style={styles.muted}><UiText value={"No assigned enquiries yet."}/></Text>;}
