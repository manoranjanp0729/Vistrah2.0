import type {Metadata} from 'next';
import {HeroStoryPage} from '@/components/hero-story-page';

export const metadata: Metadata = {
  title: 'For Businesses — Grow Your Business Free on VISTRAH',
  description: '₹0 free business listing for verified local businesses across India, free V Ads for any radius, plus done-for-you Studio, Websites & Automation.',
};

export default function ForBusinessesPage() {
  return <HeroStoryPage storyKey="businesses" />;
}
