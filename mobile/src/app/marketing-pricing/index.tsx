import {Stack} from 'expo-router';
import MarketingPricingCodex from '../../components/marketing-pricing-codex';

export default function Pricing() {
  return (
    <>
      <Stack.Screen options={{title: 'Ads & Marketing pricing'}} />
      <MarketingPricingCodex />
    </>
  );
}
