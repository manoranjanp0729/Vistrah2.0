import { useLocalSearchParams } from 'expo-router';
import { EditVistrahContent } from '../../components/edit-vistrah-content';
import { Page } from '../../components/ui';
import { MobileVibeFinderDiscovery } from '../../components/vibe-finder-discovery';

export default function VibeFinderTabScreen() {
  const { mood } = useLocalSearchParams<{ mood?: string }>();
  return (
    <Page sectioned>
      <EditVistrahContent slug="vibe-finder" replace={false} />
      <MobileVibeFinderDiscovery initialMoodId={typeof mood === 'string' ? mood : undefined} />
    </Page>
  );
}
