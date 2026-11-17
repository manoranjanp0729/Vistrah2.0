import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { backFallback } from '../src/lib/navigation-policy.ts';
import {
  NEARBY_DISCOVERY_RADII,
  buildListingMoreOptions,
  buildNearbyMarketplacePath,
  getDivisionFallbackTheme,
  phoneCallHref,
  resolveListingPhotoUri,
  websiteExternalHref,
  whatsappChatHref,
} from '../../shared/nearby-services.ts';

test('mobile services tab and /services/nearby wire in-app map + synchronized listings', () => {
  assert.deepEqual(NEARBY_DISCOVERY_RADII, [5, 10, 25, 50]);
  assert.equal(phoneCallHref('98450 12345'), 'tel:9845012345');
  assert.equal(phoneCallHref(''), null);
  assert.equal(websiteExternalHref('malnadspice.in'), 'https://malnadspice.in/');
  assert.equal(websiteExternalHref('https://vistrah.in'), 'https://vistrah.in/');
  assert.equal(websiteExternalHref(null), null);
  assert.equal(websiteExternalHref('javascript:void(0)'), null);

  const more = buildListingMoreOptions({
    businessName: 'Malnad Spice Mess',
    categorySlug: 'food-and-dining',
    subcategorySlug: 'restaurants-and-dining',
    typeSlug: 'restaurants',
    locality: 'Tarikere',
  });
  assert.deepEqual(
    more.map(m => m.label),
    ['Join Vistrah', 'Request website', 'Create & Upload Free Ad', 'Contact Vistrah'],
  );
  assert.equal(more[0].pathname, '/seller/onboard');
  assert.equal(more[0].params.business, 'Malnad Spice Mess');
  assert.equal(more[1].pathname, '/contact');
  assert.equal(more[1].params.intent, 'request-website');
  assert.equal(more[2].pathname, '/seller/v-ads');
  assert.equal(more[3].pathname, '/contact');
  assert.equal(
    backFallback('/contact', { category: 'food-and-dining', type: 'restaurants' }),
    '/services/nearby?category=food-and-dining&type=restaurants',
  );
  assert.equal(
    resolveListingPhotoUri('/api/marketplace/place-photo?ref=places%2F1%2Fphotos%2F2', 'https://api.vistrah.in'),
    'https://api.vistrah.in/marketplace/place-photo?ref=places%2F1%2Fphotos%2F2',
  );
  assert.equal(getDivisionFallbackTheme('health-and-fitness').glyph, 'heart');
  assert.match(whatsappChatHref('09845012345', 'Plumber') ?? '', /^https:\/\/wa\.me\/919845012345\?/);
  assert.equal(
    buildNearbyMarketplacePath({
      category: 'home-services',
      businessType: 'plumber',
      latitude: 12.9716,
      longitude: 77.5946,
      radiusKm: 25,
    }),
    '/marketplace/nearby?category=home-services&lat=12.971600&lng=77.594600&radius_km=25&business_type=plumber',
  );

  assert.equal(
    backFallback('/services/nearby', { category: 'food-and-dining', type: 'restaurant' }),
    '/services?category=food-and-dining',
  );
  assert.equal(backFallback('/services/nearby'), '/services');

  const servicesScreen = readFileSync(
    new URL('../src/app/(tabs)/services/index.tsx', import.meta.url),
    'utf8',
  );
  assert.ok(servicesScreen.includes('MobileNearbyServiceDiscovery'));
  const layout = readFileSync(new URL('../src/app/_layout.tsx', import.meta.url), 'utf8');
  assert.ok(layout.includes('name="services/nearby"'));
});
