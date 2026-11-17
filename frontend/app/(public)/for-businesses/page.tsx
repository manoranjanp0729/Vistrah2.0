import type {Metadata} from 'next';
import {HeroStoryPage} from '@/components/hero-story-page';

export const metadata: Metadata = {
  title: 'For Businesses — Grow Your Business Free on VISTRAH',
  description: '₹0 free business listing across 808+ services, free V Ads for any radius, plus done-for-you Studio, Websites & Automation.',
};

export default function ForBusinessesPage() {
  return <HeroStoryPage storyKey="businesses" />;
}
