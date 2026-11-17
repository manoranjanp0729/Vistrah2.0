export const NEARBY_DISCOVERY_RADII = [5, 10, 25, 50] as const;
export type NearbyDiscoveryRadius = (typeof NEARBY_DISCOVERY_RADII)[number];

export function normalizeNearbyRadius(value?: number | null): NearbyDiscoveryRadius {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 5) return 5;
  if (value <= 10) return 10;
  if (value <= 25) return 25;
  return 50;
}

export type NearbyListingSource = 'vistrah' | 'google_places';

export type NearbyBusinessItem = {
  source: NearbyListingSource;
  id: number | string;
  slug: string;
  name: string;
  company: string;
  contact_name: string;
  category_slug: string;
  business_type: string;
  service_title: string;
  description: string;
  address: string;
  location: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  coverage_radius_km: number | null;
  verification_status: string;
  phone: string;
  whatsapp: string;
  timings: string;
  photo_url: string | null;
  website_url?: string | null;
  directions_url: string;
  google_maps_uri?: string;
  types?: string[];
};

export type ListingMoreOptionItem = {
  id: string;
  label: string;
  subtitle?: string;
  disabled?: boolean;
};

export type NearbyServicesResponse = {
  category: { slug: string; title: string };
  business_type: { slug: string; title: string } | null;
  radius_km: number;
  total: number;
  has_google_places?: boolean;
  items: NearbyBusinessItem[];
};

export type DivisionFallbackTheme = {
  bgDark: string;
  bgLight: string;
  borderDark: string;
  borderLight: string;
  accent: string;
  glyph:
    | 'utensils'
    | 'tool'
    | 'heart'
    | 'leaf'
    | 'truck'
    | 'layers'
    | 'scissors'
    | 'camera'
    | 'book'
    | 'briefcase'
    | 'shopping-bag'
    | 'compass'
    | 'cpu';
};

const DIVISION_THEMES: Record<string, DivisionFallbackTheme> = {
  'food-and-dining': {
    bgDark: 'rgba(249, 115, 22, 0.14)',
    bgLight: '#fff7ed',
    borderDark: 'rgba(249, 115, 22, 0.35)',
    borderLight: '#fed7aa',
    accent: '#ea580c',
    glyph: 'utensils',
  },
  'home-services': {
    bgDark: 'rgba(56, 189, 248, 0.14)',
    bgLight: '#f0f9ff',
    borderDark: 'rgba(56, 189, 248, 0.35)',
    borderLight: '#bae6fd',
    accent: '#0284c7',
    glyph: 'tool',
  },
  'home-and-everyday-services': {
    bgDark: 'rgba(56, 189, 248, 0.14)',
    bgLight: '#f0f9ff',
    borderDark: 'rgba(56, 189, 248, 0.35)',
    borderLight: '#bae6fd',
    accent: '#0284c7',
    glyph: 'tool',
  },
  'health-and-fitness': {
    bgDark: 'rgba(20, 184, 166, 0.14)',
    bgLight: '#f0fdfa',
    borderDark: 'rgba(20, 184, 166, 0.35)',
    borderLight: '#99f6e4',
    accent: '#0d9488',
    glyph: 'heart',
  },
  'health-fitness-and-wellness': {
    bgDark: 'rgba(20, 184, 166, 0.14)',
    bgLight: '#f0fdfa',
    borderDark: 'rgba(20, 184, 166, 0.35)',
    borderLight: '#99f6e4',
    accent: '#0d9488',
    glyph: 'heart',
  },
  'pet-care': {
    bgDark: 'rgba(20, 184, 166, 0.14)',
    bgLight: '#f0fdfa',
    borderDark: 'rgba(20, 184, 166, 0.35)',
    borderLight: '#99f6e4',
    accent: '#0d9488',
    glyph: 'heart',
  },
  'agriculture-and-farming': {
    bgDark: 'rgba(34, 197, 94, 0.14)',
    bgLight: '#f0fdf4',
    borderDark: 'rgba(34, 197, 94, 0.35)',
    borderLight: '#bbf7d0',
    accent: '#16a34a',
    glyph: 'leaf',
  },
  vehicles: {
    bgDark: 'rgba(99, 102, 241, 0.14)',
    bgLight: '#eef2ff',
    borderDark: 'rgba(99, 102, 241, 0.35)',
    borderLight: '#c7d2fe',
    accent: '#4f46e5',
    glyph: 'truck',
  },
  automobiles: {
    bgDark: 'rgba(99, 102, 241, 0.14)',
    bgLight: '#eef2ff',
    borderDark: 'rgba(99, 102, 241, 0.35)',
    borderLight: '#c7d2fe',
    accent: '#4f46e5',
    glyph: 'truck',
  },
  'rental-services': {
    bgDark: 'rgba(99, 102, 241, 0.14)',
    bgLight: '#eef2ff',
    borderDark: 'rgba(99, 102, 241, 0.35)',
    borderLight: '#c7d2fe',
    accent: '#4f46e5',
    glyph: 'truck',
  },
  'property-and-construction': {
    bgDark: 'rgba(234, 179, 8, 0.14)',
    bgLight: '#fefce8',
    borderDark: 'rgba(234, 179, 8, 0.35)',
    borderLight: '#fde047',
    accent: '#ca8a04',
    glyph: 'layers',
  },
  'construction-and-materials': {
    bgDark: 'rgba(234, 179, 8, 0.14)',
    bgLight: '#fefce8',
    borderDark: 'rgba(234, 179, 8, 0.35)',
    borderLight: '#fde047',
    accent: '#ca8a04',
    glyph: 'layers',
  },
  'beauty-and-personal-care': {
    bgDark: 'rgba(236, 72, 153, 0.14)',
    bgLight: '#fdf2f8',
    borderDark: 'rgba(236, 72, 153, 0.35)',
    borderLight: '#fbcfe8',
    accent: '#db2777',
    glyph: 'scissors',
  },
  'beauty-fashion-and-lifestyle': {
    bgDark: 'rgba(236, 72, 153, 0.14)',
    bgLight: '#fdf2f8',
    borderDark: 'rgba(236, 72, 153, 0.35)',
    borderLight: '#fbcfe8',
    accent: '#db2777',
    glyph: 'scissors',
  },
  'events-and-celebrations': {
    bgDark: 'rgba(168, 85, 247, 0.14)',
    bgLight: '#faf5ff',
    borderDark: 'rgba(168, 85, 247, 0.35)',
    borderLight: '#e9d5ff',
    accent: '#9333ea',
    glyph: 'camera',
  },
  'events-and-weddings': {
    bgDark: 'rgba(168, 85, 247, 0.14)',
    bgLight: '#faf5ff',
    borderDark: 'rgba(168, 85, 247, 0.35)',
    borderLight: '#e9d5ff',
    accent: '#9333ea',
    glyph: 'camera',
  },
  'education-and-skills': {
    bgDark: 'rgba(59, 130, 246, 0.14)',
    bgLight: '#eff6ff',
    borderDark: 'rgba(59, 130, 246, 0.35)',
    borderLight: '#bfdbfe',
    accent: '#2563eb',
    glyph: 'book',
  },
  'education-and-coaching': {
    bgDark: 'rgba(59, 130, 246, 0.14)',
    bgLight: '#eff6ff',
    borderDark: 'rgba(59, 130, 246, 0.35)',
    borderLight: '#bfdbfe',
    accent: '#2563eb',
    glyph: 'book',
  },
  'jobs-and-careers': {
    bgDark: 'rgba(148, 163, 184, 0.16)',
    bgLight: '#f8fafc',
    borderDark: 'rgba(148, 163, 184, 0.35)',
    borderLight: '#cbd5e1',
    accent: '#475569',
    glyph: 'briefcase',
  },
  'professional-services': {
    bgDark: 'rgba(148, 163, 184, 0.16)',
    bgLight: '#f8fafc',
    borderDark: 'rgba(148, 163, 184, 0.35)',
    borderLight: '#cbd5e1',
    accent: '#475569',
    glyph: 'briefcase',
  },
  'shopping-and-local-retail': {
    bgDark: 'rgba(212, 175, 55, 0.15)',
    bgLight: '#fffbeb',
    borderDark: 'rgba(212, 175, 55, 0.38)',
    borderLight: '#fde68a',
    accent: '#b45309',
    glyph: 'shopping-bag',
  },
  'shops-and-retail': {
    bgDark: 'rgba(212, 175, 55, 0.15)',
    bgLight: '#fffbeb',
    borderDark: 'rgba(212, 175, 55, 0.38)',
    borderLight: '#fde68a',
    accent: '#b45309',
    glyph: 'shopping-bag',
  },
  'travel-stay-and-experiences': {
    bgDark: 'rgba(6, 182, 212, 0.14)',
    bgLight: '#ecfeff',
    borderDark: 'rgba(6, 182, 212, 0.35)',
    borderLight: '#a5f3fc',
    accent: '#0891b2',
    glyph: 'compass',
  },
  'travel-and-stay': {
    bgDark: 'rgba(6, 182, 212, 0.14)',
    bgLight: '#ecfeff',
    borderDark: 'rgba(6, 182, 212, 0.35)',
    borderLight: '#a5f3fc',
    accent: '#0891b2',
    glyph: 'compass',
  },
  'it-media-and-printing': {
    bgDark: 'rgba(139, 92, 246, 0.14)',
    bgLight: '#f5f3ff',
    borderDark: 'rgba(139, 92, 246, 0.35)',
    borderLight: '#ddd6fe',
    accent: '#7c3aed',
    glyph: 'cpu',
  },
};

const DEFAULT_DIVISION_THEME: DivisionFallbackTheme = {
  bgDark: 'rgba(212, 175, 55, 0.14)',
  bgLight: '#fffbeb',
  borderDark: 'rgba(212, 175, 55, 0.35)',
  borderLight: '#fde68a',
  accent: '#d4af37',
  glyph: 'shopping-bag',
};

export function getDivisionFallbackTheme(categorySlug?: string | null): DivisionFallbackTheme {
  if (!categorySlug) return DEFAULT_DIVISION_THEME;
  return DIVISION_THEMES[categorySlug] ?? DEFAULT_DIVISION_THEME;
}

export function resolveListingPhotoUri(
  photoUrl: string | null | undefined,
  apiBase?: string,
): string | null {
  if (!photoUrl || typeof photoUrl !== 'string') return null;
  const trimmed = photoUrl.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (!trimmed.startsWith('/')) return null;
  if (!apiBase || apiBase === '/api') return trimmed;
  // Native Expo client where `apiBase` is e.g. `https://api.vistrah.in`
  const stripped = trimmed.startsWith('/api/') ? trimmed.slice(4) : trimmed;
  return `${apiBase.replace(/\/$/, '')}${stripped}`;
}

export function nearbyServicesUrl(params: {
  category: string;
  subcategory?: string;
  type?: string;
}): string {
  const qs = new URLSearchParams();
  if (params.category) qs.set('category', params.category);
  if (params.subcategory) qs.set('subcategory', params.subcategory);
  if (params.type) qs.set('type', params.type);
  return `/services/nearby${qs.size ? `?${qs.toString()}` : ''}`;
}

export function buildNearbyMarketplacePath(params: {
  category: string;
  subcategory?: string;
  businessType?: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
}): string {
  const qs = new URLSearchParams({
    category: params.category,
    lat: params.latitude.toFixed(6),
    lng: params.longitude.toFixed(6),
    radius_km: String(params.radiusKm),
  });
  if (params.subcategory) {
    qs.set('subcategory', params.subcategory);
  }
  if (params.businessType) {
    qs.set('business_type', params.businessType);
  }
  return `/marketplace/nearby?${qs.toString()}`;
}

export function formatDistanceAway(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return '';
  if (distanceKm < 0.1) return '< 0.1 km away';
  if (distanceKm < 10) return `${distanceKm.toFixed(1)} km away`;
  return `${Math.round(distanceKm)} km away`;
}

export function phoneCallHref(rawPhone: string | null | undefined): string | null {
  if (!rawPhone) return null;
  const trimmed = rawPhone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  return `tel:${hasPlus ? '+' : ''}${digits}`;
}

export function websiteExternalHref(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 500 || /\s/.test(trimmed)) return null;
  let candidate = trimmed;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    if (!/^https?:\/\//i.test(trimmed)) return null;
  } else {
    if (trimmed.startsWith('/')) return null;
    candidate = `https://${trimmed}`;
  }
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password) return null;
    const host = parsed.hostname.toLowerCase();
    if (!host || !host.includes('.') || host === 'localhost' || host.endsWith('.local')) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function whatsappChatHref(
  rawWhatsappOrPhone: string | null | undefined,
  serviceTitle: string,
  businessName?: string,
): string | null {
  if (!rawWhatsappOrPhone) return null;
  let digits = rawWhatsappOrPhone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  if (digits.length < 10 || digits.length > 15) return null;
  const greeting = businessName
    ? `Hi ${businessName}, I found your ${serviceTitle} listing on VISTRAH and would like to enquire.`
    : `Hi, I found your ${serviceTitle} listing on VISTRAH and would like to enquire.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(greeting)}`;
}

export function googleMapsDirectionsHrefForPin(
  latitude: number,
  longitude: number,
  directionsUrl?: string | null,
): string {
  if (directionsUrl && /^https:\/\/(?:www\.)?google\.com\/maps\//.test(directionsUrl)) {
    return directionsUrl;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

export function googleMapsHybridSearchHref(
  serviceTitle: string,
  locality: string,
  latitude: number,
  longitude: number,
): string {
  const area = locality.trim() || `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const query = `${serviceTitle.trim()} near ${area}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
