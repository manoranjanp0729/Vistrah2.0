import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../components/language-provider';
import { NearbyServiceDiscovery } from '../components/nearby-service-discovery';
import { safeDestination } from './destinations';
import {
  NEARBY_DISCOVERY_RADII,
  buildNearbyMarketplacePath,
  formatDistanceAway,
  getDivisionFallbackTheme,
  googleMapsDirectionsHrefForPin,
  googleMapsHybridSearchHref,
  nearbyServicesUrl,
  normalizeNearbyRadius,
  phoneCallHref,
  resolveListingPhotoUri,
  whatsappChatHref,
} from '../../shared/nearby-services';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) =>
    createElement('a', { href, ...props }, children),
}));

describe('In-app Nearby Services Map + Listings contract', () => {
  it('supports 5/10/25/50 km radius normalization and contact deep-link builders', () => {
    expect(NEARBY_DISCOVERY_RADII).toEqual([5, 10, 25, 50]);
    expect(normalizeNearbyRadius(2)).toBe(5);
    expect(normalizeNearbyRadius(10)).toBe(10);
    expect(normalizeNearbyRadius(25)).toBe(25);
    expect(normalizeNearbyRadius(50)).toBe(50);

    expect(formatDistanceAway(1.24)).toBe('1.2 km away');
    expect(formatDistanceAway(18.6)).toBe('19 km away');

    expect(phoneCallHref('+91 98450-11111')).toBe('tel:+919845011111');
    expect(phoneCallHref('080 2221 9988')).toBe('tel:08022219988');
    expect(phoneCallHref('')).toBeNull();
    expect(phoneCallHref('invalid')).toBeNull();

    expect(
      resolveListingPhotoUri('/api/marketplace/place-photo?ref=places%2FChIJ%2Fphotos%2F1'),
    ).toBe('/api/marketplace/place-photo?ref=places%2FChIJ%2Fphotos%2F1');
    expect(
      resolveListingPhotoUri(
        '/api/marketplace/place-photo?ref=places%2FChIJ%2Fphotos%2F1',
        'https://api.vistrah.in',
      ),
    ).toBe('https://api.vistrah.in/marketplace/place-photo?ref=places%2FChIJ%2Fphotos%2F1');
    expect(resolveListingPhotoUri(null)).toBeNull();

    expect(getDivisionFallbackTheme('food-and-dining').glyph).toBe('utensils');
    expect(getDivisionFallbackTheme('agriculture-and-farming').glyph).toBe('leaf');

    const wa = whatsappChatHref('9845011111', 'Restaurant / Mess / Dhaba', 'Sri Krishna Bhavan');
    expect(wa).toMatch(/^https:\/\/wa\.me\/919845011111\?text=/);
    expect(decodeURIComponent(wa!)).toContain('Sri Krishna Bhavan');

    expect(googleMapsDirectionsHrefForPin(13.7091, 75.8132)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=13.7091%2C75.8132',
    );
    expect(googleMapsHybridSearchHref('Electrician', 'Tarikere', 13.7091, 75.8132)).toContain(
      'https://www.google.com/maps/search/?api=1&query=Electrician%20near%20Tarikere',
    );
    expect(
      buildNearbyMarketplacePath({
        category: 'food-and-dining',
        businessType: 'restaurant',
        latitude: 13.7091,
        longitude: 75.8132,
        radiusKm: 10,
      }),
    ).toBe(
      '/marketplace/nearby?category=food-and-dining&lat=13.709100&lng=75.813200&radius_km=10&business_type=restaurant',
    );
  });

  it('allowlists /services/nearby destinations and renders in-app radius pills without external redirect', () => {
    const url = nearbyServicesUrl({ category: 'food-and-dining', type: 'restaurant' });
    expect(url).toBe('/services/nearby?category=food-and-dining&type=restaurant');
    expect(safeDestination(url)).toBe(url);

    const html = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(NearbyServiceDiscovery, {
          categorySlug: 'food-and-dining',
          categoryTitle: 'Food & Dining',
          typeSlug: 'restaurant',
          serviceTitle: 'Restaurant / Mess / Dhaba',
        }),
      ),
    );
    expect(html).toContain('Nearby');
    expect(html).toContain('Restaurant / Mess / Dhaba');
    expect(html).toContain('+ List Free on VISTRAH');
    for (const r of [5, 10, 25, 50]) {
      expect(html).toContain(`${r} km`);
    }
  });
});
