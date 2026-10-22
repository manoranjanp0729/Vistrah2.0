import {UiElement} from "../../../components/localized-ui";
import {useLocalSearchParams} from 'expo-router';
import {Page} from '../../../components/ui';
import {SellerGate} from '../../../components/seller-gate';
import {SellerOrderWorkspace} from '../../../components/commerce-orders';
export default function Orders(){const {id}=useLocalSearchParams<{id:string}>();return <UiElement as={Page} title="Customer purchase orders"><SellerGate><SellerOrderWorkspace businessId={id}/></SellerGate></UiElement>;}
