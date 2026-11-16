import type {Metadata} from 'next';
import {HeroStoryPage} from '@/components/hero-story-page';

export const metadata: Metadata = {
  title: 'For Users — Find the Right Services',
  description: 'Direct Call & WhatsApp to verified businesses across 13 verticals with zero broker spam.',
};

export default function ForUsersPage() {
  return <HeroStoryPage storyKey="users" />;
}
