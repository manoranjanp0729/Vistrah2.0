import type {Metadata} from 'next';
import {HeroStoryPage} from '@/components/hero-story-page';

export const metadata: Metadata = {
  title: 'VISTRAH Ads & Marketing — Creative, Web & Automation Studio',
  description: 'Free V Ads for any radius on VISTRAH plus done-for-you commercial reels, custom websites, workflow automation, and managed marketing.',
};

export default function AdsAndMarketingPage() {
  return <HeroStoryPage storyKey="ads" />;
}
