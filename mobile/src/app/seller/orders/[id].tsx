import {useLocalSearchParams} from 'expo-router';
import {Page,Heading} from '../../../components/ui';
import {SellerGate} from '../../../components/seller-gate';
import {SellerOrderWorkspace} from '../../../components/commerce-orders';
export default function Orders(){const {id}=useLocalSearchParams<{id:string}>();return <Page><Heading title="Customer purchase orders"/><SellerGate><SellerOrderWorkspace businessId={id}/></SellerGate></Page>;}
