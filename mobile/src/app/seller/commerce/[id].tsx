import {useLocalSearchParams} from 'expo-router';
import {Page,Heading} from '../../../components/ui';
import {SellerGate} from '../../../components/seller-gate';
import {SellerCommerce} from '../../../components/seller-commerce';
export default function Listings(){const {id}=useLocalSearchParams<{id:string}>();return <Page><Heading title="Products & service packages"/><SellerGate><SellerCommerce businessId={id}/></SellerGate></Page>;}
