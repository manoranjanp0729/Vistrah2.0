import { notFound, permanentRedirect } from 'next/navigation';
import { MarketplaceBrowser } from '@/components/marketplace-browser';
import {
  legacyMarketplaceSelection,
  marketplaceCategories,
  resolveMarketplaceSelection,
  type MarketplaceSelection,
} from '@/lib/marketplace-taxonomy';
import { FLAGSHIP_SECTORS, getFlagshipSector } from '../../../../../shared/flagship-sectors';
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
  let cat = raw.category || FLAGSHIP_SECTORS[0].slug;
  let sub = raw.subcategory;
  let typ = raw.type;

  if (cat && !sub && !typ) {
    const flagship = getFlagshipSector(cat);
    if (flagship) {
      sub = flagship.defaultSubcategorySlug;
      typ = flagship.defaultTypeSlug;
    } else {
      const matchedCat = marketplaceCategories.find(c => c.slug === cat);
      const firstSub = matchedCat?.subcategories[0];
      if (firstSub) {
        sub = firstSub.slug;
        typ = firstSub.listing_types[0]?.slug;
      }
    }
  } else if (cat && !sub && typ) {
    const matchedCat = marketplaceCategories.find(c => c.slug === cat);
    const matchedSub =
      matchedCat?.subcategories.find(s => s.listing_types.some(lt => lt.slug === typ)) ??
      matchedCat?.subcategories.find(s => s.slug === typ);
    if (matchedSub) {
      sub = matchedSub.slug;
      if (!matchedSub.listing_types.some(lt => lt.slug === typ)) {
        typ = matchedSub.listing_types[0]?.slug;
      }
    }
  } else if (cat && sub && !typ) {
    const matchedCat = marketplaceCategories.find(c => c.slug === cat);
    const matchedSub = matchedCat?.subcategories.find(s => s.slug === sub);
    if (matchedSub && matchedSub.listing_types.length > 0) {
      typ = matchedSub.listing_types[0].slug;
    }
  }

  const normalized: MarketplaceSelection = {
    category: cat,
    subcategory: sub,
    type: typ,
    q: raw.q,
  };

  const selection = resolveMarketplaceSelection(normalized);
  if (!selection || !selection.category || !selection.subcategory) {
    const legacy = legacyMarketplaceSelection({
      category: raw.category,
      subcategory: raw.subcategory || raw.type,
      type: raw.type,
      q: raw.q,
    });
    if (legacy?.category && (legacy.type || legacy.subcategory)) {
      permanentRedirect(
        nearbyServicesUrl({
          category: legacy.category,
          subcategory: legacy.subcategory,
          type: legacy.type || legacy.subcategory!,
        }),
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
