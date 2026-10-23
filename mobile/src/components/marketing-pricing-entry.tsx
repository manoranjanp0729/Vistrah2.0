import {router} from 'expo-router';
import {Action} from './ui';
export function MarketingPricingEntry(){return <Action label="Explore services & pricing" onPress={()=>router.push('/marketing-pricing')}/>;}
