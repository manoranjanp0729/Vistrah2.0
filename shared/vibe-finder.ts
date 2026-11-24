import type { NearbyBusinessItem } from './nearby-services.ts';

/**
 * Categories shifted out of the homepage "Services Near You" grid into their own dedicated tab.
 */
export const HOMEPAGE_EXCLUDED_CATEGORY_SLUGS = ['vibe-finder'] as const;

export const VIBE_FINDER_RADIUS_OPTIONS_KM = [2, 5, 10, 25, 50] as const;
export const DEFAULT_VIBE_RADIUS_KM = 10;

export type VibeQueryTarget = {
  readonly category: string;
  readonly serviceType?: string;
};

export type VibeMood = {
  readonly id:
    | 'all-vibes'
    | 'theatres-cinema'
    | 'social-live'
    | 'chill-cafes'
    | 'evening-hangouts'
    | 'weekend-escapes'
    | 'unwind-wellness';
  readonly label: string;
  readonly shortLabel: string;
  readonly subtitle: string;
  readonly icon: 'compass' | 'film' | 'music' | 'coffee' | 'sunset' | 'map' | 'sun';
  readonly photoKey: string;
  readonly queries: readonly VibeQueryTarget[];
};

export const VIBE_MOODS: readonly VibeMood[] = [
  {
    id: 'all-vibes',
    label: 'All Vibes',
    shortLabel: 'All Vibes',
    subtitle: 'Cinemas, social events, cosy cafes, evening lounges, and weekend getaways near you.',
    icon: 'compass',
    photoKey: 'vibe-finder',
    queries: [
      { category: 'vibe-finder' },
      { category: 'restaurants-and-dining', serviceType: 'cafes' },
      { category: 'restaurants-and-dining', serviceType: 'pubs' },
      { category: 'hotels-and-stay', serviceType: 'resorts' },
    ],
  },
  {
    id: 'theatres-cinema',
    label: 'Cinema & Shows',
    shortLabel: 'Cinema & Shows',
    subtitle: 'Movie theatres, multiplexes, screenings, and stage shows within your radius.',
    icon: 'film',
    photoKey: 'theatres',
    queries: [{ category: 'vibe-finder', serviceType: 'theatres' }],
  },
  {
    id: 'social-live',
    label: 'Social & Live Events',
    shortLabel: 'Social Events',
    subtitle: 'Cultural gatherings, community meetups, open mics, and local experiences.',
    icon: 'music',
    photoKey: 'social-events',
    queries: [{ category: 'vibe-finder', serviceType: 'social-events' }],
  },
  {
    id: 'chill-cafes',
    label: 'Coffee & Conversations',
    shortLabel: 'Cafes',
    subtitle: 'Specialty coffee houses, bakery cafes, and relaxed work-friendly corners.',
    icon: 'coffee',
    photoKey: 'cafes',
    queries: [{ category: 'restaurants-and-dining', serviceType: 'cafes' }],
  },
  {
    id: 'evening-hangouts',
    label: 'Evening Hangouts',
    shortLabel: 'Lounges & Pubs',
    subtitle: 'Rooftop lounges, craft kitchens, and lively evening spots with friends.',
    icon: 'sunset',
    photoKey: 'pubs',
    queries: [{ category: 'restaurants-and-dining', serviceType: 'pubs' }],
  },
  {
    id: 'weekend-escapes',
    label: 'Weekend Getaways',
    shortLabel: 'Resorts & Stays',
    subtitle: 'Nature resorts, boutique homestays, and scenic day-out retreats.',
    icon: 'map',
    photoKey: 'resorts',
    queries: [
      { category: 'hotels-and-stay', serviceType: 'resorts' },
      { category: 'hotels-and-stay', serviceType: 'homestays' },
    ],
  },
  {
    id: 'unwind-wellness',
    label: 'Relax & Recharge',
    shortLabel: 'Spas & Wellness',
    subtitle: 'Day spas, Ayurvedic therapies, and calm restorative wellness studios.',
    icon: 'sun',
    photoKey: 'spas',
    queries: [{ category: 'salons-and-beauty-parlour', serviceType: 'spas' }],
  },
] as const;

export function getVibeMoodById(id?: string | null): VibeMood {
  return VIBE_MOODS.find(mood => mood.id === id) ?? VIBE_MOODS[0];
}

export function buildVibeFinderNearbyMapHref(
  moodId: string | null | undefined,
  radiusKm: number = DEFAULT_VIBE_RADIUS_KM,
): string {
  const mood = getVibeMoodById(moodId);
  const primary = mood.queries[0] ?? { category: 'vibe-finder' };
  const params = new URLSearchParams({
    category: primary.category,
    radius: String(radiusKm),
  });
  if (primary.serviceType) {
    params.set('subcategory', primary.serviceType);
    params.set('type', primary.serviceType);
  }
  return `/services/nearby?${params.toString()}`;
}

export function dedupeAndSortVibeListings(
  batches: ReadonlyArray<ReadonlyArray<NearbyBusinessItem>>,
  searchText = '',
): NearbyBusinessItem[] {
  const seen = new Set<string>();
  const merged: NearbyBusinessItem[] = [];
  const needle = searchText.trim().toLowerCase();

  for (const list of batches) {
    for (const item of list) {
      const itemKey = item?.id != null ? String(item.id) : '';
      if (!itemKey || seen.has(itemKey)) continue;
      if (needle) {
        const hay = [
          item.name,
          item.company,
          item.service_title,
          item.business_type,
          item.address,
          item.location,
          item.description,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(needle)) continue;
      }
      seen.add(itemKey);
      merged.push(item);
    }
  }

  return merged.sort((a, b) => {
    const da = typeof a.distance_km === 'number' ? a.distance_km : Number.POSITIVE_INFINITY;
    const db = typeof b.distance_km === 'number' ? b.distance_km : Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    if (a.source !== b.source) return a.source === 'vistrah' ? -1 : 1;
    return String(a.company || a.name).localeCompare(String(b.company || b.name));
  });
}
