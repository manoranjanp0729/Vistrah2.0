import {useLocalSearchParams} from 'expo-router';
import {Page} from '../../components/ui';
import {CommerceDetail} from '../../components/commerce-browser';
export default function Detail(){const {id}=useLocalSearchParams<{id:string}>();return <Page><CommerceDetail id={id}/></Page>;}
