import type {Metadata} from 'next';
import {HeroStoryPage} from '@/components/hero-story-page';

export const metadata: Metadata = {
  title: 'V HealthConnect — Better Health for a Brighter Tomorrow',
  description: 'Verified doctors, doorstep diagnostics, pharmacies, home care, and family wellness.',
};

export default function HealthConnectPage() {
  return <HeroStoryPage storyKey="health" />;
}
