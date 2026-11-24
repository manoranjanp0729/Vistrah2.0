import type { Metadata } from 'next';
import { ContentSections } from '@/components/edit-vistrah-content';
import { VibeFinderDiscovery } from '@/components/vibe-finder-discovery';
import { serverApi } from '@/lib/server';
import type { LiveVistrahPage } from '../../../../shared/edit-vistrah';

export const metadata: Metadata = {
  title: 'Vibe Finder | VISTRAH',
  description:
    'Explore nearby cinemas, live social events, specialty cafes, evening lounges, and weekend getaways on VISTRAH Vibe Finder.',
};

export default async function VibeFinderPage({
  searchParams,
}: {
  searchParams?: Promise<{ mood?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const managed = await serverApi<LiveVistrahPage>('/edit-vistrah/pages/vibe-finder').catch(
    () => null,
  );
  return (
    <>
      {managed && managed.target_platform !== 'mobile' && (
        <div className="container">
          <ContentSections sections={managed.sections} />
        </div>
      )}
      <VibeFinderDiscovery initialMoodId={params?.mood} />
    </>
  );
}
