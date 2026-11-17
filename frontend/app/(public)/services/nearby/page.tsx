import { notFound, permanentRedirect } from 'next/navigation';
import { MarketplaceBrowser } from '@/components/marketplace-browser';
import {
  legacyMarketplaceSelection,
  resolveMarketplaceSelection,
  type MarketplaceSelection,
} from '@/lib/marketplace-taxonomy';
import { nearbyServicesUrl } from '../../../../../shared/nearby-services';
import styles from '@/components/marketplace.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nearby services' };

export default async function NearbyServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; subcategory?: string; type?: string; q?: string }>;
}) {
  const raw = await searchParams;
  const sub = raw.subcategory || raw.type;
  const normalized: MarketplaceSelection = {
    category: raw.category,
    subcategory: sub,
    type: sub,
    q: raw.q,
  };

  const selection = resolveMarketplaceSelection(normalized);
  if (!selection || !selection.category || !selection.subcategory) {
    const legacy = legacyMarketplaceSelection({
      category: raw.category,
      subcategory: sub,
      q: raw.q,
    });
    if (legacy?.category && legacy?.subcategory) {
      permanentRedirect(
        nearbyServicesUrl({ category: legacy.category, type: legacy.subcategory }),
      );
    }
    if (selection?.category && !selection.subcategory) {
      return (
        <div className={`container ${styles.servicesPage}`}>
          <MarketplaceBrowser selection={selection} query={raw.q ?? ''} />
        </div>
      );
    }
    notFound();
  }

  return (
    <div className={`container ${styles.servicesPage}`}>
      <MarketplaceBrowser selection={selection} query={raw.q ?? ''} />
    </div>
  );
}
