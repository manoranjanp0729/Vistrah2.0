import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CustomerLocationProvider } from '../components/customer-location';
import { LanguageProvider } from '../components/language-provider';
import { NearbyServiceDiscovery } from '../components/nearby-service-discovery';
import {
  LatestSearch,
  locationProviders,
  providerBlocker,
  radii,
  requestGps,
  resolveAddress,
  validPoint,
  wrapPoint,
} from './location';
import {
  GPS_FALLBACK_OPTIONS,
  GPS_HARD_TIMEOUT_MS,
  GPS_HIGH_ACCURACY_OPTIONS,
  GPS_PERMISSION_BLOCKED_MESSAGE,
  GPS_TIMEOUT_MESSAGE,
  createDebouncedMovementWatcher,
  haversineDistanceMeters,
  shouldAutoSyncStoredLocation,
} from '../../shared/live-geolocation';
import {
  isCoordinateFormattedLabel,
  lookupLocalAreaCity,
  resolveAreaCityLabel,
} from '../../shared/reverse-geocode-fallback';
import { buildNearbyListingsPath } from '../../shared/nearby-services';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) =>
    createElement('a', { href, ...props }, children),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/services/nearby',
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

afterEach(() => {
  vi.useRealTimers();
});

describe('location privacy, Use GPS recovery, and live movement watcher', () => {
  it('keeps manual fallback when no map key is configured and exposes only the approved radii', () => {
    expect(locationProviders).toEqual({ tiles: null, geocoder: null });
    expect(radii).toEqual([2, 5, 10, 25]);
    expect(providerBlocker).toContain('MapTiler API key');
  });

  it('validates ranges, nonfinite values and date-line wrapping', () => {
    expect(validPoint({ latitude: 90, longitude: 180 })).toBe(true);
    for (const point of [
      { latitude: 91, longitude: 0 },
      { latitude: 0, longitude: -181 },
      { latitude: NaN, longitude: 0 },
      { latitude: 0, longitude: Infinity },
    ]) {
      expect(validPoint(point)).toBe(false);
    }
    expect(wrapPoint({ latitude: 0, longitude: 181 })).toEqual({ latitude: 0, longitude: -179 });
  });

  it('supports a replaceable mock geocoder and preserves manual fallback on error', async () => {
    const signal = new AbortController().signal;
    await expect(resolveAddress('private address', locationProviders, signal)).rejects.toThrow(
      'MapTiler API key',
    );
    const fixture = {
      latitude: 12,
      longitude: 77,
      locality: 'Mock locality',
      postal_code: '560001',
      address: '',
      landmark: '',
    };
    expect(
      await resolveAddress(
        'fixture',
        { tiles: null, geocoder: { id: 'mock', search: async () => [fixture, { ...fixture, latitude: 91 }] } },
        signal,
      ),
    ).toEqual([fixture]);
    await expect(
      resolveAddress(
        'private address',
        {
          tiles: null,
          geocoder: {
            id: 'mock',
            search: async () => {
              throw new Error('private query');
            },
          },
        },
        signal,
      ),
    ).rejects.toThrow('manual pin');
  });

  it('Use GPS checks permissions, passes maximumAge: 0, retries standard accuracy on timeout, and surfaces clear messages', async () => {
    // 1. Pre-flight navigator.permissions denied -> immediate actionable guidance without hanging
    let geoCalledWhenBlocked = 0;
    const mockGeo = {
      getCurrentPosition: () => {
        geoCalledWhenBlocked++;
      },
    };
    await expect(
      requestGps(mockGeo, { query: async () => ({ state: 'denied' }) }),
    ).rejects.toThrow(GPS_PERMISSION_BLOCKED_MESSAGE);
    expect(geoCalledWhenBlocked).toBe(0);

    // 2. Runtime code === 1 (denied) & undefined geolocation
    let deniedCalls = 0;
    const denied = {
      getCurrentPosition: (_s: PositionCallback, failure?: PositionErrorCallback | null) => {
        deniedCalls++;
        failure?.({ code: 1 } as GeolocationPositionError);
      },
    };
    await expect(requestGps(denied)).rejects.toThrow('denied');
    expect(deniedCalls).toBe(1);
    await expect(requestGps(undefined)).rejects.toThrow('unavailable');

    // 3. High-accuracy timeout (code === 3) automatically retries once with enableHighAccuracy: false
    const seenOptions: PositionOptions[] = [];
    const indoorGeo = {
      getCurrentPosition: (
        success: PositionCallback,
        failure?: PositionErrorCallback | null,
        options?: PositionOptions,
      ) => {
        seenOptions.push(options ?? {});
        if (seenOptions.length === 1) {
          failure?.({ code: 3 } as GeolocationPositionError);
          return;
        }
        success({
          coords: { latitude: 12.9784, longitude: 77.6408, accuracy: 42 },
        } as GeolocationPosition);
      },
    };
    const fix = await requestGps(indoorGeo, { query: async () => ({ state: 'granted' }) });
    expect(seenOptions).toEqual([GPS_HIGH_ACCURACY_OPTIONS, GPS_FALLBACK_OPTIONS]);
    expect(seenOptions[0]?.maximumAge).toBe(0);
    expect(fix).toEqual({ point: { latitude: 12.9784, longitude: 77.6408 }, accuracy: 42 });

    // 4. Both high-accuracy and fallback timeout -> clear timeout message
    const alwaysTimeout = {
      getCurrentPosition: (_s: PositionCallback, failure?: PositionErrorCallback | null) => {
        failure?.({ code: 3 } as GeolocationPositionError);
      },
    };
    await expect(requestGps(alwaysTimeout)).rejects.toThrow(GPS_TIMEOUT_MESSAGE);
  });

  it('retains GPS accuracy, rejects invalid fixes, and builds fresh /marketplace/listings query paths + Use GPS button', async () => {
    const gps = (latitude: number, accuracy: number) => ({
      getCurrentPosition: (success: PositionCallback) =>
        success({ coords: { latitude, longitude: 77, accuracy } } as GeolocationPosition),
    });
    expect(await requestGps(gps(12, 1200))).toEqual({
      point: { latitude: 12, longitude: 77 },
      accuracy: 1200,
    });
    await expect(requestGps(gps(NaN, 10))).rejects.toThrow('invalid');

    expect(
      buildNearbyListingsPath({
        category: 'restaurants-and-dining',
        serviceType: 'cafes',
        latitude: 12.9784,
        longitude: 77.6408,
        radiusKm: 5,
      }),
    ).toBe(
      '/marketplace/listings?category=restaurants-and-dining&lat=12.978400&lng=77.640800&radius_km=5&service_type=cafes&business_type=cafes',
    );

    const html = renderToStaticMarkup(
      createElement(
        LanguageProvider,
        null,
        createElement(
          CustomerLocationProvider,
          null,
          createElement(NearbyServiceDiscovery, {
            categorySlug: 'restaurants-and-dining',
            categoryTitle: 'Restaurants & Dining',
            typeSlug: 'cafes',
            serviceTitle: 'Cafes',
          }),
        ),
      ),
    );
    expect(html).toContain('Use GPS');
  });

  it('debounces automatic watchPosition updates >= 50m, preserves manual overrides, and cleans up on unmount', () => {
    vi.useFakeTimers();

    // Respects manual/preset/google city overrides while auto-syncing empty or GPS-managed state
    expect(shouldAutoSyncStoredLocation(null)).toBe(true);
    expect(shouldAutoSyncStoredLocation({ source: 'gps' })).toBe(true);
    expect(shouldAutoSyncStoredLocation({ source: 'manual' })).toBe(false);
    expect(shouldAutoSyncStoredLocation({ source: 'preset' })).toBe(false);
    expect(shouldAutoSyncStoredLocation({ source: 'google' })).toBe(false);

    let watchCallback: PositionCallback | null = null;
    const clearedIds: number[] = [];
    const mockWatchGeo = {
      getCurrentPosition: vi.fn(),
      watchPosition: (cb: PositionCallback) => {
        watchCallback = cb;
        return 77;
      },
      clearWatch: (id: number) => {
        clearedIds.push(id);
      },
    };

    const moves: Array<{ latitude: number; longitude: number }> = [];
    const watcher = createDebouncedMovementWatcher({
      geolocation: mockWatchGeo,
      initialPoint: { latitude: 12.9716, longitude: 77.5946 },
      minDistanceMeters: 50,
      debounceMs: 500,
      onSignificantMove: fix => moves.push(fix.point),
    });

    // Small 12m jitter (< 50m) is ignored completely
    const jitterPoint = { latitude: 12.9717, longitude: 77.5946 };
    expect(
      haversineDistanceMeters({ latitude: 12.9716, longitude: 77.5946 }, jitterPoint),
    ).toBeLessThan(50);
    watchCallback!({
      coords: { ...jitterPoint, accuracy: 15 },
    } as GeolocationPosition);
    vi.advanceTimersByTime(1000);
    expect(moves).toHaveLength(0);

    // Rapid 120m + 220m movement coalesces cleanly into a single debounced update
    watchCallback!({
      coords: { latitude: 12.9728, longitude: 77.5946, accuracy: 18 },
    } as GeolocationPosition);
    vi.advanceTimersByTime(200);
    watchCallback!({
      coords: { latitude: 12.9738, longitude: 77.5946, accuracy: 14 },
    } as GeolocationPosition);
    expect(moves).toHaveLength(0);

    vi.advanceTimersByTime(500);
    expect(moves).toEqual([{ latitude: 12.9738, longitude: 77.5946 }]);

    // Unmount cleanup cancels pending timers and invokes clearWatch(77)
    watcher.stop();
    expect(clearedIds).toEqual([77]);
  });

  it('ignores stale filter responses even when the provider ignores abort', async () => {
    const gate = new LatestSearch();
    let oldResolve!: (value: string) => void;
    let firstSignal!: AbortSignal;
    const old = gate.run(signal => {
      firstSignal = signal;
      return new Promise<string>(resolve => {
        oldResolve = resolve;
      });
    });
    const current = await gate.run(async () => 'new radius/location');
    expect(firstSignal.aborted).toBe(true);
    oldResolve('stale');
    expect(await old).toEqual({ current: false });
    expect(current).toEqual({ current: true, value: 'new radius/location' });
  });

  it('clear cancels inflight responses and suppresses their stale errors', async () => {
    const gate = new LatestSearch();
    let reject!: (error: Error) => void;
    const pending = gate.run(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );
    gate.cancel();
    reject(new Error('late provider failure'));
    expect(await pending).toEqual({ current: false });
  });

  it('formats (12.892, 77.623) as Begur, Bengaluru via Nominatim + local Karnataka lookup on Google failure and enforces an 8s GPS timeout', async () => {
    expect(GPS_HARD_TIMEOUT_MS).toBe(8000);
    expect(isCoordinateFormattedLabel('12.892° N, 77.623° E')).toBe(true);
    expect(lookupLocalAreaCity({ latitude: 12.892, longitude: 77.623 })?.locality).toBe(
      'Begur, Bengaluru',
    );

    const nominatimFallback = await resolveAreaCityLabel(
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
                city: 'Bengaluru Urban',
                state: 'Karnataka',
                postcode: '560068',
              },
            }),
          }) as Response) as unknown as typeof fetch,
      },
    );
    expect(nominatimFallback.locality).toBe('Begur, Bengaluru');
    expect(nominatimFallback.locality).not.toContain('°');

    const offlineGazetteerFallback = await resolveAreaCityLabel(
      { latitude: 12.892, longitude: 77.623 },
      {
        primaryResolver: async () => {
          throw new Error('OVER_QUERY_LIMIT');
        },
        fetchImpl: (async () => {
          throw new Error('Network offline');
        }) as unknown as typeof fetch,
      },
    );
    expect(offlineGazetteerFallback.locality).toBe('Begur, Bengaluru');

    vi.useFakeTimers();
    const stalled = requestGps({
      getCurrentPosition: () => {
        // Stalled browser GPS never invoking callback
      },
    });
    const assertion = expect(stalled).rejects.toThrow(GPS_TIMEOUT_MESSAGE);
    await vi.advanceTimersByTimeAsync(8000);
    await assertion;
  });
});
