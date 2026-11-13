import {test} from 'node:test';
import assert from 'node:assert/strict';
import {primeResource, getCachedResource, clearResourceCache} from '../src/lib/resource-cache.ts';
import {fetchBootstrap} from '../src/lib/bootstrap.ts';

test('primeResource stores and getCachedResource retrieves data synchronously', () => {
  clearResourceCache();
  assert.equal(getCachedResource('/catalogue'), undefined);

  const mockCatalogue = [{id: 1, title: 'Cleaning', slug: 'cleaning', active: true, services: [], subcategories: []}];
  primeResource('/catalogue', mockCatalogue);

  assert.deepEqual(getCachedResource('/catalogue'), mockCatalogue);
  clearResourceCache();
  assert.equal(getCachedResource('/catalogue'), undefined);
});

test('fetchBootstrap calls /bootstrap and primes catalogue and homepage in resource cache', async () => {
  clearResourceCache();
  Object.assign(globalThis, {__DEV__: true});
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8100';

  const originalFetch = globalThis.fetch;
  try {
    const mockPayload = {
      catalogue: [{id: 1, title: 'Agri', slug: 'agri', active: true, services: [], subcategories: []}],
      homepage: {version: 1, layout: {schema_version: 1, sections: []}},
      user: {id: 42, name: 'Bootstrap User', email: 'user@example.com', role: 'CUSTOMER', seller_enabled: false},
      membership: {active: true, expires_at: null, records: []},
      location: {lat: 12.97, lng: 77.59, label: 'Bengaluru'},
      business: null,
    };

    globalThis.fetch = async (url) => {
      assert.equal(String(url), 'http://localhost:8100/bootstrap');
      return new Response(JSON.stringify(mockPayload), {
        status: 200,
        headers: {'Content-Type': 'application/json'},
      });
    };

    const result = await fetchBootstrap('customer');
    assert.notEqual(result, null);
    assert.equal(result?.user?.id, 42);

    // Verify cache has been primed
    assert.deepEqual(getCachedResource('/catalogue'), mockPayload.catalogue);
    assert.deepEqual(getCachedResource('/homepage'), mockPayload.homepage);
    assert.deepEqual(getCachedResource('/me/membership', 42), mockPayload.membership);
  } finally {
    globalThis.fetch = originalFetch;
    clearResourceCache();
  }
});

