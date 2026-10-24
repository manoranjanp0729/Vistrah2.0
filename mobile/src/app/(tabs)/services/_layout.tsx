import {Stack} from 'expo-router';
import {servicesSelectionKey} from '../../../lib/marketplace-navigation';

export default function ServicesLayout(){return <Stack screenOptions={{headerShown:false}}><Stack.Screen name="index" dangerouslySingular={(_name,params)=>servicesSelectionKey(params)}/></Stack>;}
