import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { backFallback } from '../src/lib/navigation-policy.ts';
import {
  NEARBY_DISCOVERY_RADII,
  buildNearbyMarketplacePath,
  getDivisionFallbackTheme,
  phoneCallHref,
  resolveListingPhotoUri,
  whatsappChatHref,
} from '../../shared/nearby-services.ts';

test('mobile services tab and /services/nearby wire in-app map + synchronized listings', () => {
  assert.deepEqual(NEARBY_DISCOVERY_RADII, [5, 10, 25, 50]);
  assert.equal(phoneCallHref('98450 12345'), 'tel:9845012345');
  assert.equal(phoneCallHref(''), null);
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
