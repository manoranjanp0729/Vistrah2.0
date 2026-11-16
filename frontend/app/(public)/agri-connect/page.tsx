import type {Metadata} from 'next';
import {HeroStoryPage} from '@/components/hero-story-page';

export const metadata: Metadata = {
  title: 'VISTRAH AgriConnect — Stronger Farmers, Brighter Tomorrow',
  description: 'Direct produce buyers, certified seeds & irrigation, tractor rentals, and crop advisory.',
};

export default function AgriConnectPage() {
  return <HeroStoryPage storyKey="agri" />;
}
