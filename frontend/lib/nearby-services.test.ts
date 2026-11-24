import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../components/language-provider';
import { NearbyServiceDiscovery } from '../components/nearby-service-discovery';
import { safeDestination } from './destinations';
import {
  NEARBY_DISCOVERY_RADII,
  buildContactPrefillMailto,
  buildListingMoreOptions,
  buildNearbyMarketplacePath,
  formatDistanceAway,
  getDivisionFallbackTheme,
  googleMapsDirectionsHrefForPin,
  googleMapsHybridSearchHref,
  nearbyServicesUrl,
  normalizeNearbyRadius,
  phoneCallHref,
  resolveListingPhotoUri,
  websiteExternalHref,
  whatsappChatHref,
} from '../../shared/nearby-services';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) =>
    createElement('a', { href, ...props }, children),
}));

describe('In-app Nearby Services Map + Listings contract', () => {
  it('supports 2/5/10/25/50 km radius normalization and contact deep-link builders', () => {
    expect(NEARBY_DISCOVERY_RADII).toEqual([2, 5, 10, 25, 50]);
    expect(normalizeNearbyRadius(2)).toBe(2);
    expect(normalizeNearbyRadius(4)).toBe(5);
    expect(normalizeNearbyRadius(10)).toBe(10);
    expect(normalizeNearbyRadius(25)).toBe(25);
    expect(normalizeNearbyRadius(50)).toBe(50);

    expect(formatDistanceAway(1.24)).toBe('1.2 km away');
    expect(formatDistanceAway(18.6)).toBe('19 km away');

    expect(phoneCallHref('+91 98450-11111')).toBe('tel:+919845011111');
    expect(phoneCallHref('080 2221 9988')).toBe('tel:08022219988');
    expect(phoneCallHref('')).toBeNull();
    expect(phoneCallHref('invalid')).toBeNull();

    expect(websiteExternalHref('www.malnadclinic.in')).toBe('https://www.malnadclinic.in/');
    expect(websiteExternalHref('https://cubbonservices.in/book')).toBe(
      'https://cubbonservices.in/book',
    );
    expect(websiteExternalHref(null)).toBeNull();
    expect(websiteExternalHref('')).toBeNull();
    expect(websiteExternalHref('javascript:alert(1)')).toBeNull();
    expect(websiteExternalHref('http://localhost:3000')).toBeNull();

    const moreItems = buildListingMoreOptions({
      listingId: 'gp_ChIJ_place_near_08',
      placeId: 'ChIJ_place_near_08',
      businessName: 'Sri Krishna Clinic',
      categorySlug: 'hospitals-and-labs',
      subcategorySlug: 'clinics',
      typeSlug: 'clinics',
      locality: 'Indiranagar, Bengaluru',
    });
    expect(moreItems.map(i => i.label)).toEqual([
      'Join Vistrah',
      'Request website',
      'Create & Upload Free Ad',
      'Contact Vistrah',
    ]);
    expect(moreItems[0].href).toBe(
      '/seller/onboard?place_id=ChIJ_place_near_08&category=hospitals-and-labs&subcategory=clinics&type=clinics&business=Sri+Krishna+Clinic&locality=Indiranagar%2C+Bengaluru',
    );
    expect(moreItems[1].href).toBe(
      '/contact?intent=request-website&business=Sri+Krishna+Clinic&category=hospitals-and-labs&type=clinics&locality=Indiranagar%2C+Bengaluru',
    );
    expect(moreItems[2].href).toBe(
      '/seller/v-ads?business=Sri+Krishna+Clinic&category=hospitals-and-labs&type=clinics&locality=Indiranagar%2C+Bengaluru',
    );
    expect(moreItems[3].href).toBe(
      '/contact?business=Sri+Krishna+Clinic&category=hospitals-and-labs&type=clinics&locality=Indiranagar%2C+Bengaluru',
    );
    for (const item of moreItems) {
      expect(safeDestination(item.href)).toBe(item.href);
    }

    // Joined business owner sees My Business Growth & Audit at the top linking exclusively to /business/{listing.id}
    const ownerItems = buildListingMoreOptions({
      listingId: 42,
      ownerUserId: 77,
      viewerUserId: 77,
      viewerRole: 'USER',
      businessName: 'Sri Krishna Clinic',
      categorySlug: 'hospitals-and-labs',
      typeSlug: 'clinics',
    });
    expect(ownerItems[0]).toMatchObject({
      id: 'my-business-growth',
      label: 'My Business Growth & Audit',
      href: '/business/42',
    });
    expect(safeDestination(ownerItems[0].href)).toBe('/business/42');

    // Non-owner seller does NOT see My Business Growth & Audit on someone else's business
    const nonOwnerItems = buildListingMoreOptions({
      listingId: 42,
      ownerUserId: 77,
      viewerUserId: 88,
      viewerRole: 'USER',
      businessName: 'Sri Krishna Clinic',
      categorySlug: 'hospitals-and-labs',
      typeSlug: 'clinics',
    });
    expect(nonOwnerItems.map(i => i.label)).toEqual([
      'Join Vistrah',
      'Request website',
      'Create & Upload Free Ad',
      'Contact Vistrah',
    ]);

    // Admin sees Open Business Audit & Strategy at the top followed by the 4 standard items
    const adminItems = buildListingMoreOptions({
      listingId: 'gp_ChIJ_place_near_08',
      placeId: 'ChIJ_place_near_08',
      ownerUserId: null,
      viewerUserId: 1,
      viewerRole: 'ADMIN',
      businessName: 'Sri Krishna Clinic',
      categorySlug: 'hospitals-and-labs',
      typeSlug: 'clinics',
    });
    expect(adminItems.map(i => i.label)).toEqual([
      'Open Business Audit & Strategy',
      'Join Vistrah',
      'Request website',
      'Create & Upload Free Ad',
      'Contact Vistrah',
    ]);
    expect(adminItems[0].href).toBe(
      '/business/gp_ChIJ_place_near_08?name=Sri+Krishna+Clinic&sector=hospitals-and-labs&service_type=clinics',
    );
    expect(safeDestination(adminItems[0].href)).toBe(adminItems[0].href);

    const mailto = buildContactPrefillMailto('support@vistrah.in', {
      intent: 'request-website',
      business: 'Sri Krishna Clinic',
      category: 'health-fitness-and-wellness',
      type: 'dental-clinics',
      locality: 'Indiranagar',
    });
    expect(mailto).toMatch(/^mailto:support@vistrah\.in\?subject=/);
    expect(decodeURIComponent(mailto)).toContain('Sri Krishna Clinic');

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
        category: 'restaurants-and-dining',
        businessType: 'restaurant',
        latitude: 13.7091,
        longitude: 75.8132,
        radiusKm: 10,
      }),
    ).toBe(
      '/marketplace/nearby?category=restaurants-and-dining&lat=13.709100&lng=75.813200&radius_km=10&service_type=restaurant&business_type=restaurant',
    );
    expect(
      buildNearbyMarketplacePath({
        category: 'restaurants-and-dining',
        latitude: 13.7091,
        longitude: 75.8132,
        radiusKm: 5,
      }),
    ).toBe('/marketplace/nearby?category=restaurants-and-dining&lat=13.709100&lng=75.813200&radius_km=5');
  });

  it('allowlists /services/nearby destinations and renders in-app radius pills + direct service type chips without external redirect', () => {
    const url = nearbyServicesUrl({ category: 'restaurants-and-dining', type: 'restaurant' });
    expect(url).toBe('/services/nearby?category=restaurants-and-dining&type=restaurant');
    expect(safeDestination(url)).toBe(url);

    const html = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(NearbyServiceDiscovery, {
          categorySlug: 'restaurants-and-dining',
          categoryTitle: 'Restaurants & Dining',
          typeSlug: 'restaurant',
          serviceTitle: 'Restaurant',
        }),
      ),
    );
    expect(html).toContain('Nearby');
    expect(html).toContain('Restaurant');
    expect(html).toContain('Cafes');
    expect(html).toContain('data-brand-palette="vistrah-navy-orange"');
    expect(html).toContain('List Free on VISTRAH');
    for (const r of [2, 5, 10, 25, 50]) {
      expect(html).toContain(`${r} km`);
    }
  });
});
