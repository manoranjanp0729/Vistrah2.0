import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  GPS_FALLBACK_OPTIONS,
  GPS_HARD_TIMEOUT_MS,
  GPS_HIGH_ACCURACY_OPTIONS,
  GPS_TIMEOUT_MESSAGE,
  NATIVE_GPS_DENIED_MESSAGE,
  acquireNativeExpoGpsFix,
  createDebouncedMovementWatcher,
  createNativeExpoMovementWatcher,
  requestBrowserGpsFix,
  type ExpoLocationPositionLike,
} from '../../shared/live-geolocation.ts';
import {
  isCoordinateFormattedLabel,
  lookupLocalAreaCity,
  resolveAreaCityLabel,
} from '../../shared/reverse-geocode-fallback.ts';
import { buildNearbyListingsPath } from '../../shared/nearby-services.ts';

test('mobile native & web Use GPS handles permission denial, >5s last-known fallback, and >=50m watchPosition cleanup', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });

  // 1. Native permission denied -> clear message
  await assert.rejects(
    acquireNativeExpoGpsFix({
      Accuracy: { Balanced: 3 },
      requestForegroundPermissionsAsync: async () => ({ status: 'denied' }),
      getCurrentPositionAsync: async () => ({ coords: { latitude: 12.97, longitude: 77.59 } }),
    }),
    new RegExp(NATIVE_GPS_DENIED_MESSAGE.slice(0, 24)),
  );

  // 2. Native slow GPS lock (>5s) uses getLastKnownPositionAsync() fast fallback immediately
  let neverResolve!: (pos: ExpoLocationPositionLike) => void;
  const slowNativePromise = acquireNativeExpoGpsFix(
    {
      Accuracy: { Balanced: 3 },
      requestForegroundPermissionsAsync: async () => ({ status: 'granted' }),
      getCurrentPositionAsync: () =>
        new Promise<ExpoLocationPositionLike>(resolve => {
          neverResolve = resolve;
        }),
      getLastKnownPositionAsync: async () => ({
        coords: { latitude: 13.3161, longitude: 75.772, accuracy: 35 },
      }),
    },
    { fastFallbackAfterMs: 5000, hardTimeoutMs: 9000 },
  );
  await Promise.resolve();
  t.mock.timers.tick(5000);
  const fallbackFix = await slowNativePromise;
  assert.deepEqual(fallbackFix, {
    point: { latitude: 13.3161, longitude: 75.772 },
    accuracy: 35,
  });
  neverResolve({ coords: { latitude: 13.3161, longitude: 75.772, accuracy: 20 } });

  // 3. Native watchPositionAsync updates on >= 50m movement and removes subscription on unmount
  let nativeWatchCb: ((pos: ExpoLocationPositionLike) => void) | null = null;
  let removed = 0;
  const nativeMoves: Array<{ latitude: number; longitude: number }> = [];
  const nativeWatcher = createNativeExpoMovementWatcher({
    expoLocation: {
      Accuracy: { Balanced: 3 },
      requestForegroundPermissionsAsync: async () => ({ status: 'granted' }),
      getCurrentPositionAsync: async () => ({ coords: { latitude: 12.9716, longitude: 77.5946 } }),
      watchPositionAsync: async (opts, cb) => {
        assert.equal(opts.distanceInterval, 50);
        nativeWatchCb = cb;
        return {
          remove: () => {
            removed++;
          },
        };
      },
    },
    initialPoint: { latitude: 12.9716, longitude: 77.5946 },
    minDistanceMeters: 50,
    debounceMs: 400,
    onSignificantMove: fix => nativeMoves.push(fix.point),
  });
  await Promise.resolve();

  // < 50m jitter ignored
  nativeWatchCb!({ coords: { latitude: 12.9717, longitude: 77.5946, accuracy: 12 } });
  t.mock.timers.tick(500);
  assert.equal(nativeMoves.length, 0);

  // >= 50m move updates cleanly after debounce
  nativeWatchCb!({ coords: { latitude: 12.9732, longitude: 77.5946, accuracy: 12 } });
  t.mock.timers.tick(400);
  assert.deepEqual(nativeMoves, [{ latitude: 12.9732, longitude: 77.5946 }]);

  nativeWatcher.stop();
  assert.equal(removed, 1);

  // 4. Mobile Web (/app/) high-accuracy maximumAge:0 -> standard accuracy retry + clearWatch cleanup
  const seenOpts: PositionOptions[] = [];
  const webFix = await requestBrowserGpsFix({
    getCurrentPosition: (ok, err, opts) => {
      seenOpts.push(opts ?? {});
      if (seenOpts.length === 1) {
        err?.({ code: 3 } as GeolocationPositionError);
        return;
      }
      ok({ coords: { latitude: 12.2958, longitude: 76.6394, accuracy: 28 } } as GeolocationPosition);
    },
  });
  assert.deepEqual(seenOpts, [GPS_HIGH_ACCURACY_OPTIONS, GPS_FALLBACK_OPTIONS]);
  assert.deepEqual(webFix.point, { latitude: 12.2958, longitude: 76.6394 });

  let clearedWebWatch = 0;
  const webWatcher = createDebouncedMovementWatcher({
    geolocation: {
      getCurrentPosition: () => {},
      watchPosition: () => 42,
      clearWatch: id => {
        if (id === 42) clearedWebWatch++;
      },
    },
    onSignificantMove: () => {},
  });
  webWatcher.stop();
  assert.equal(clearedWebWatch, 1);

  // 5. Verify mobile source wiring for Use GPS button & /marketplace/listings query
  assert.equal(
    buildNearbyListingsPath({
      category: 'hospitals-and-labs',
      serviceType: 'clinics',
      latitude: 12.2958,
      longitude: 76.6394,
      radiusKm: 10,
    }),
    '/marketplace/listings?category=hospitals-and-labs&lat=12.295800&lng=76.639400&radius_km=10&service_type=clinics&business_type=clinics',
  );

  const nearbySrc = readFileSync(
    new URL('../src/components/nearby-service-discovery.tsx', import.meta.url),
    'utf8',
  );
  assert.ok(nearbySrc.includes('requestCurrentGps'));
  assert.ok(nearbySrc.includes('Use GPS'));
  assert.ok(nearbySrc.includes('buildNearbyListingsPath'));

  // 6. Reverse-geocoding fallback formats (12.892, 77.623) as "Begur, Bengaluru" (never raw 12.892° N, 77.623° E)
  assert.equal(isCoordinateFormattedLabel('12.892° N, 77.623° E'), true);
  assert.equal(isCoordinateFormattedLabel('Begur, Bengaluru'), false);
  const localBegur = lookupLocalAreaCity({ latitude: 12.892, longitude: 77.623 });
  assert.ok(localBegur);
  assert.equal(localBegur.locality, 'Begur, Bengaluru');

  const resolvedWhenGoogleDenied = await resolveAreaCityLabel(
    { latitude: 12.892, longitude: 77.623 },
    {
      primaryResolver: async () => {
        throw new Error('REQUEST_DENIED');
      },
      fetchImpl: (async () =>
        ({
          ok: true,
          json: async () => ({
            address: {
              suburb: 'Begur',
              city: 'Bangalore',
              state: 'Karnataka',
              postcode: '560068',
            },
          }),
        }) as Response) as unknown as typeof fetch,
    },
  );
  assert.equal(resolvedWhenGoogleDenied.locality, 'Begur, Bengaluru');
  assert.equal(isCoordinateFormattedLabel(resolvedWhenGoogleDenied.locality), false);

  const resolvedWhenOffline = await resolveAreaCityLabel(
    { latitude: 12.892, longitude: 77.623 },
    {
      primaryResolver: async () => {
        throw new Error('OVER_QUERY_LIMIT');
      },
      fetchImpl: (async () => {
        throw new Error('Offline');
      }) as unknown as typeof fetch,
    },
  );
  assert.equal(resolvedWhenOffline.locality, 'Begur, Bengaluru');

  // 7. Hard 6s timeout guarantees stalled geolocation never hangs infinitely on "Locating..."
  assert.equal(GPS_HARD_TIMEOUT_MS, 6000);
  const hungPromise = requestBrowserGpsFix({
    getCurrentPosition: () => {
      // Simulates hung browser geolocation that never invokes callback
    },
  });
  await Promise.resolve();
  t.mock.timers.tick(6000);
  await assert.rejects(hungPromise, new RegExp(GPS_TIMEOUT_MESSAGE.slice(0, 18)));
});
