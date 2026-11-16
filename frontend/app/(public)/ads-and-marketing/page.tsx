import type {Metadata} from 'next';
import {HeroStoryPage} from '@/components/hero-story-page';

export const metadata: Metadata = {
  title: 'VISTRAH Ads & Marketing — Creative, Web & V Ads Studio',
  description: 'First 30 days V Ads at ₹0 plus fixed-price creatives, websites, and transparent social retainers.',
};

export default function AdsAndMarketingPage() {
  return <HeroStoryPage storyKey="ads" />;
}
