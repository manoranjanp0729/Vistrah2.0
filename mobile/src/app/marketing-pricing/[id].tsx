import {Stack,useLocalSearchParams} from 'expo-router';
import {MarketingPricing} from '../../components/marketing-pricing';
export default function PricingDetail(){const {id,package:pack}=useLocalSearchParams<{id:string;package?:string}>();return <><Stack.Screen options={{title:'Service pricing'}}/><MarketingPricing key={id} serviceId={id} initialPackage={pack}/></>;}
