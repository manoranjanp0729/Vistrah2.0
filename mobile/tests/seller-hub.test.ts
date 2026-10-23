import test from 'node:test';
import assert from 'node:assert/strict';
import {primeResource, getCachedResource, clearResourceCache} from '../src/lib/resource-cache.ts';

test('seller hub primes businesses and commerce listings synchronously', () => {
  clearResourceCache();
  const userId = 42;

  const mockHubData = {
    businesses: [
      {
        id: 101,
        name: 'Organic Farm Co',
        company: 'Organic Farm Co',
        verification_status: 'VERIFIED',
        active: true,
        recent_listings: {
          items: [{id: 'item-1', title: 'Fresh Strawberries'}],
          total: 1,
          page: 1,
          page_size: 20,
        },
      },
    ],
    v_ads_summary: {
      accounts_count: 1,
      total_ads: 3,
      active_approved: 2,
      pending_review: 1,
      rejected: 0,
      total_views: 450,
    },
    membership: {active: true, expires_at: null},
  };

  // Simulate Seller Hub priming
  primeResource('/seller/hub', mockHubData, userId);
  primeResource('/seller/businesses', mockHubData.businesses, userId);
  for (const b of mockHubData.businesses) {
    if (b.recent_listings) {
      primeResource(`/seller/businesses/${b.id}/commerce-listings?page=1`, b.recent_listings, userId);
    }
  }

  // Verify instant synchronous cache retrieval
  const cachedHub = getCachedResource('/seller/hub', userId);
  assert.deepEqual(cachedHub, mockHubData);

  const cachedBusinesses = getCachedResource('/seller/businesses', userId) as any[];
  assert.equal(cachedBusinesses.length, 1);
  assert.equal(cachedBusinesses[0].name, 'Organic Farm Co');

  const cachedListings = getCachedResource(`/seller/businesses/101/commerce-listings?page=1`, userId) as any;
  assert.equal(cachedListings.items.length, 1);
  assert.equal(cachedListings.items[0].title, 'Fresh Strawberries');
});

