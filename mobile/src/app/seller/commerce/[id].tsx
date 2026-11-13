import {UiElement} from "../../../components/localized-ui";
import {useLocalSearchParams} from 'expo-router';
import {Page} from '../../../components/ui';
import {SellerGate} from '../../../components/seller-gate';
import {SellerCommerce} from '../../../components/seller-commerce';
export default function Listings(){const {id,focus}=useLocalSearchParams<{id:string;focus?:string}>();return <UiElement as={Page} title="Your services & products"><SellerGate><SellerCommerce businessId={id} focus={typeof focus==='string'?focus:undefined}/></SellerGate></UiElement>;}
