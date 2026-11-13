import {Stack,useLocalSearchParams} from 'expo-router';
import {Page} from '../../components/ui';
import {EditVistrahContent} from '../../components/edit-vistrah-content';
export default function ContentPage(){const {slug}=useLocalSearchParams<{slug:string}>();return <><Stack.Screen options={{title:'VISTRAH'}}/><Page><EditVistrahContent slug={slug} required replace/></Page></>;}
