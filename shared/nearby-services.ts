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
  owner_user_id?: number | null;
  place_id?: string | null;
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

export type ListingMoreOptionId =
  | 'my-business-growth'
  | 'admin-business-audit'
  | 'join-vistrah'
  | 'request-website'
  | 'create-free-ad'
  | 'contact-vistrah';

export type ListingMoreOptionItem = {
  id: ListingMoreOptionId;
  label: string;
  href: string;
  pathname: '/seller/onboard' | '/contact' | '/seller/v-ads' | '/business/[id]';
  params: Record<string, string>;
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
  'real-estate-and-property': {
    bgDark: 'rgba(212, 175, 55, 0.16)',
    bgLight: '#fefce8',
    borderDark: 'rgba(212, 175, 55, 0.38)',
    borderLight: '#fde68a',
    accent: '#b45309',
    glyph: 'layers',
  },
  'interior-design-and-exteriors': {
    bgDark: 'rgba(56, 189, 248, 0.14)',
    bgLight: '#f0f9ff',
    borderDark: 'rgba(56, 189, 248, 0.35)',
    borderLight: '#bae6fd',
    accent: '#0284c7',
    glyph: 'tool',
  },
  'civil-construction-and-contractors': {
    bgDark: 'rgba(34, 197, 94, 0.14)',
    bgLight: '#f0fdf4',
    borderDark: 'rgba(34, 197, 94, 0.35)',
    borderLight: '#bbf7d0',
    accent: '#16a34a',
    glyph: 'layers',
  },
  'healthconnect-and-clinics': {
    bgDark: 'rgba(20, 184, 166, 0.14)',
    bgLight: '#f0fdfa',
    borderDark: 'rgba(20, 184, 166, 0.35)',
    borderLight: '#99f6e4',
    accent: '#0d9488',
    glyph: 'heart',
  },
  'hospitality-restaurants-and-cafes': {
    bgDark: 'rgba(249, 115, 22, 0.14)',
    bgLight: '#fff7ed',
    borderDark: 'rgba(249, 115, 22, 0.35)',
    borderLight: '#fed7aa',
    accent: '#ea580c',
    glyph: 'utensils',
  },
  'salons-bridal-and-wellness': {
    bgDark: 'rgba(236, 72, 153, 0.14)',
    bgLight: '#fdf2f8',
    borderDark: 'rgba(236, 72, 153, 0.35)',
    borderLight: '#fbcfe8',
    accent: '#db2777',
    glyph: 'scissors',
  },
  'events-weddings-and-media': {
    bgDark: 'rgba(168, 85, 247, 0.14)',
    bgLight: '#faf5ff',
    borderDark: 'rgba(168, 85, 247, 0.35)',
    borderLight: '#e9d5ff',
    accent: '#7e22ce',
    glyph: 'camera',
  },
  'automobiles-and-garages': {
    bgDark: 'rgba(99, 102, 241, 0.14)',
    bgLight: '#eef2ff',
    borderDark: 'rgba(99, 102, 241, 0.35)',
    borderLight: '#c7d2fe',
    accent: '#4f46e5',
    glyph: 'truck',
  },
  'legal-tax-and-business-compliance': {
    bgDark: 'rgba(14, 165, 233, 0.14)',
    bgLight: '#f0f9ff',
    borderDark: 'rgba(14, 165, 233, 0.35)',
    borderLight: '#bae6fd',
    accent: '#0369a1',
    glyph: 'briefcase',
  },
  'overseas-education-and-skill-academies': {
    bgDark: 'rgba(59, 130, 246, 0.14)',
    bgLight: '#eff6ff',
    borderDark: 'rgba(59, 130, 246, 0.35)',
    borderLight: '#bfdbfe',
    accent: '#2563eb',
    glyph: 'book',
  },
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

export function buildListingMoreOptions(input: {
  listingId?: number | string | null;
  placeId?: string | null;
  ownerUserId?: number | null;
  viewerUserId?: number | null;
  viewerRole?: string | null;
  businessName: string;
  categorySlug: string;
  subcategorySlug?: string;
  typeSlug: string;
  locality?: string;
  phone?: string | null;
  websiteUrl?: string | null;
}): ListingMoreOptionItem[] {
  const business = input.businessName.trim().slice(0, 140);
  const category = input.categorySlug.trim();
  const subcategory = input.subcategorySlug?.trim() || '';
  const type = input.typeSlug.trim();
  const locality = (input.locality || '').trim().slice(0, 120);
  const placeId =
    typeof input.placeId === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(input.placeId.trim())
      ? input.placeId.trim()
      : '';

  const onboardParams: Record<string, string> = {};
  if (placeId) onboardParams.place_id = placeId;
  onboardParams.category = category;
  if (subcategory) onboardParams.subcategory = subcategory;
  onboardParams.type = type;
  if (business) onboardParams.business = business;
  if (locality) onboardParams.locality = locality;

  const requestWebsiteParams: Record<string, string> = {
    intent: 'request-website',
    ...(business ? { business } : {}),
    category,
    type,
    ...(locality ? { locality } : {}),
  };

  const freeAdParams: Record<string, string> = {
    ...(business ? { business } : {}),
    category,
    type,
    ...(locality ? { locality } : {}),
  };

  const contactParams: Record<string, string> = {
    ...(business ? { business } : {}),
    category,
    type,
    ...(locality ? { locality } : {}),
  };

  const toHref = (pathname: string, params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const standardItems: ListingMoreOptionItem[] = [
    {
      id: 'join-vistrah',
      label: 'Join Vistrah',
      pathname: '/seller/onboard',
      params: onboardParams,
      href: toHref('/seller/onboard', onboardParams),
    },
    {
      id: 'request-website',
      label: 'Request website',
      pathname: '/contact',
      params: requestWebsiteParams,
      href: toHref('/contact', requestWebsiteParams),
    },
    {
      id: 'create-free-ad',
      label: 'Create & Upload Free Ad',
      pathname: '/seller/v-ads',
      params: freeAdParams,
      href: toHref('/seller/v-ads', freeAdParams),
    },
    {
      id: 'contact-vistrah',
      label: 'Contact Vistrah',
      pathname: '/contact',
      params: contactParams,
      href: toHref('/contact', contactParams),
    },
  ];

  const cleanListingId =
    input.listingId != null && /^[A-Za-z0-9_-]{1,120}$/.test(String(input.listingId).trim())
      ? String(input.listingId).trim()
      : '';
  const isOwner =
    input.viewerUserId != null &&
    input.ownerUserId != null &&
    Number(input.viewerUserId) === Number(input.ownerUserId);
  const isAdmin = String(input.viewerRole || '').toUpperCase() === 'ADMIN';

  if (isOwner && cleanListingId) {
    return [
      {
        id: 'my-business-growth',
        label: 'My Business Growth & Audit',
        pathname: '/business/[id]',
        params: { id: cleanListingId },
        href: `/business/${encodeURIComponent(cleanListingId)}`,
      },
      ...standardItems.filter(item => item.id !== 'join-vistrah'),
    ];
  }

  if (isAdmin && cleanListingId) {
    const auditParams: Record<string, string> = { id: cleanListingId };
    const queryForHref = new URLSearchParams();
    if (business) {
      auditParams.name = business;
      queryForHref.set('name', business);
    }
    if (category) {
      auditParams.sector = category;
      queryForHref.set('sector', category);
    }
    if (type) {
      auditParams.service_type = type;
      queryForHref.set('service_type', type);
    }
    if (locality) {
      auditParams.city = locality;
      queryForHref.set('city', locality);
    }
    if (input.phone && input.phone.trim()) {
      auditParams.phone = input.phone.trim().slice(0, 30);
      queryForHref.set('phone', auditParams.phone);
    }
    if (input.websiteUrl && input.websiteUrl.trim()) {
      auditParams.website_url = input.websiteUrl.trim().slice(0, 260);
      queryForHref.set('website_url', auditParams.website_url);
    }
    const qs = queryForHref.toString();
    return [
      {
        id: 'admin-business-audit',
        label: 'Open Business Audit & Strategy',
        pathname: '/business/[id]',
        params: auditParams,
        href: `/business/${encodeURIComponent(cleanListingId)}${qs ? `?${qs}` : ''}`,
      },
      ...standardItems,
    ];
  }

  return standardItems;
}

export function buildContactPrefillMailto(
  supportEmail: string,
  params: {
    intent?: string;
    business?: string;
    category?: string;
    type?: string;
    locality?: string;
  },
): string {
  const isWebsite = params.intent === 'request-website';
  const biz = (params.business || '').trim();
  const svc = (params.type || params.category || '').trim().replace(/-/g, ' ');
  const loc = (params.locality || '').trim();

  const subject = isWebsite
    ? `Business Website Request${biz ? ` — ${biz}` : ''}`
    : `VISTRAH Support Enquiry${biz ? ` — ${biz}` : ''}`;

  const lines = [
    isWebsite
      ? 'Hello VISTRAH Team, I would like to request a business website.'
      : 'Hello VISTRAH Team, I would like assistance regarding the following listing:',
    '',
    biz ? `Business Name: ${biz}` : null,
    svc ? `Service / Category: ${svc}` : null,
    loc ? `Locality: ${loc}` : null,
    '',
    'Additional details:',
  ].filter((line): line is string => line !== null);

  return `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}
