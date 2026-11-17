export const NEARBY_DISCOVERY_RADII = [5, 10, 25, 50] as const;
export type NearbyDiscoveryRadius = (typeof NEARBY_DISCOVERY_RADII)[number];

export function normalizeNearbyRadius(value?: number | null): NearbyDiscoveryRadius {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 5) return 5;
  if (value <= 10) return 10;
  if (value <= 25) return 25;
  return 50;
}

export type NearbyBusinessItem = {
  id: number;
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
};

export type NearbyServicesResponse = {
  category: { slug: string; title: string };
  business_type: { slug: string; title: string } | null;
  radius_km: number;
  total: number;
  items: NearbyBusinessItem[];
};

export function nearbyServicesUrl(params: { category: string; type?: string }): string {
  const qs = new URLSearchParams();
  if (params.category) qs.set('category', params.category);
  if (params.type) qs.set('type', params.type);
  return `/services/nearby${qs.size ? `?${qs.toString()}` : ''}`;
}

export function buildNearbyMarketplacePath(params: {
  category: string;
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

export function googleMapsDirectionsHrefForPin(latitude: number, longitude: number): string {
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
