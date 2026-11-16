import type {Metadata} from 'next';
import {HeroStoryPage} from '@/components/hero-story-page';

export const metadata: Metadata = {
  title: 'For Businesses — Grow Your Business',
  description: '90 days free Basic membership, 30 days V Ads at ₹0, and done-for-you digital studio.',
};

export default function ForBusinessesPage() {
  return <HeroStoryPage storyKey="businesses" />;
}
