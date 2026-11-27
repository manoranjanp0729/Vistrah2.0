import type { SelectedLocation } from './selected-location';

function isValidCoordinatePair(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type GpsFix = {
  point: GeoPoint;
  accuracy: number;
};

export type GeolocationPermissionState = 'granted' | 'prompt' | 'denied' | 'unknown';

export type GeolocationPermissionsLike = {
  query?: (descriptor: { name: 'geolocation' }) => Promise<{ state?: string }>;
};

export type BrowserGeolocationLike = Pick<Geolocation, 'getCurrentPosition'> &
  Partial<Pick<Geolocation, 'watchPosition' | 'clearWatch'>>;

export const GPS_MOVEMENT_THRESHOLD_METERS = 50;
export const GPS_WATCH_DEBOUNCE_MS = 1000;
export const GPS_HARD_TIMEOUT_MS = 6000;

export const GPS_HIGH_ACCURACY_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 3500,
  maximumAge: 0,
};

export const GPS_FALLBACK_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 2500,
  maximumAge: 30000,
};

export const GPS_WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 15000,
  maximumAge: 15000,
};

export const GPS_PERMISSION_BLOCKED_MESSAGE =
  'Location permission is blocked in your browser — click the lock/site icon in the address bar to allow Location, or pick a city manually.';

export const GPS_PERMISSION_DENIED_MESSAGE =
  'Location permission was denied in your browser — click the lock/site icon in the address bar to allow Location, or pick a city manually.';

export const GPS_TIMEOUT_MESSAGE =
  'GPS timed out while acquiring your location — move near a window, retry Use GPS, or pick a city manually.';

export const GPS_UNAVAILABLE_MESSAGE =
  'GPS is unavailable. Enter your location and adjust the manual pin.';

export const NATIVE_GPS_DENIED_MESSAGE =
  'Location permission is turned off — enable Location access in Settings, or pick a city manually.';

export const NATIVE_GPS_TIMEOUT_MESSAGE =
  'Could not lock onto GPS right now — check that Location Services are enabled, or pick a city manually.';

export function haversineDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLon * sinLon;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatCoordinateFallbackLabel(point: GeoPoint): string {
  return `${point.latitude.toFixed(3)}° N, ${point.longitude.toFixed(3)}° E`;
}

export function shouldAutoSyncStoredLocation(
  stored: Pick<SelectedLocation, 'source'> | null | undefined,
): boolean {
  if (!stored) return true;
  return stored.source === 'gps';
}

export async function queryGeolocationPermissionState(
  permissions?: GeolocationPermissionsLike | null,
): Promise<GeolocationPermissionState> {
  if (!permissions || typeof permissions.query !== 'function') return 'unknown';
  try {
    const status = await permissions.query({ name: 'geolocation' });
    if (
      status?.state === 'granted' ||
      status?.state === 'prompt' ||
      status?.state === 'denied'
    ) {
      return status.state;
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function getSinglePosition(
  geolocation: Pick<Geolocation, 'getCurrentPosition'>,
  options: PositionOptions,
): Promise<GeolocationPosition> {
  const timeoutMs =
    typeof options.timeout === 'number' && options.timeout > 0
      ? options.timeout
      : GPS_HARD_TIMEOUT_MS;

  return new Promise((resolve, reject) => {
    let settled = false;
    const watchdog = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject({ code: 3, message: GPS_TIMEOUT_MESSAGE } as GeolocationPositionError);
    }, timeoutMs);

    geolocation.getCurrentPosition(
      pos => {
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        resolve(pos);
      },
      err => {
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        reject(err);
      },
      options,
    );
  });
}

function validateGeolocationPosition(pos: GeolocationPosition): GpsFix {
  const point = {
    latitude: Number(pos.coords.latitude.toFixed(6)),
    longitude: Number(pos.coords.longitude.toFixed(6)),
  };
  const accuracy = pos.coords.accuracy;
  if (!isValidCoordinatePair(point.latitude, point.longitude) || !Number.isFinite(accuracy) || accuracy < 0) {
    throw new Error('GPS returned an invalid position. Use the manual pin.');
  }
  return { point, accuracy };
}

export async function requestBrowserGpsFix(
  geolocation: Pick<Geolocation, 'getCurrentPosition'> | undefined,
  permissions?: GeolocationPermissionsLike | null,
  hardTimeoutMs: number = GPS_HARD_TIMEOUT_MS,
): Promise<GpsFix> {
  if (!geolocation || typeof geolocation.getCurrentPosition !== 'function') {
    throw new Error(GPS_UNAVAILABLE_MESSAGE);
  }

  let ceilingTimer: ReturnType<typeof setTimeout> | null = null;
  const runLookup = async (): Promise<GpsFix> => {
    const permState = await Promise.race([
      queryGeolocationPermissionState(permissions),
      new Promise<GeolocationPermissionState>(resolve =>
        setTimeout(() => resolve('unknown'), 1200),
      ),
    ]);
    if (permState === 'denied') {
      throw new Error(GPS_PERMISSION_BLOCKED_MESSAGE);
    }

    try {
      const highAccPos = await getSinglePosition(geolocation, GPS_HIGH_ACCURACY_OPTIONS);
      return validateGeolocationPosition(highAccPos);
    } catch (firstErr) {
      if (
        firstErr instanceof Error &&
        firstErr.message.startsWith('GPS returned an invalid position')
      ) {
        throw firstErr;
      }
      const code = (firstErr as GeolocationPositionError | undefined)?.code;
      if (code === 1) {
        throw new Error(GPS_PERMISSION_DENIED_MESSAGE);
      }
      if (code === 3) {
        // High-accuracy hardware GPS timed out (common on indoor desktops/laptops) -> retry once with network/Wi-Fi accuracy
        try {
          const fallbackPos = await getSinglePosition(geolocation, GPS_FALLBACK_OPTIONS);
          return validateGeolocationPosition(fallbackPos);
        } catch (retryErr) {
          if (
            retryErr instanceof Error &&
            retryErr.message.startsWith('GPS returned an invalid position')
          ) {
            throw retryErr;
          }
          const retryCode = (retryErr as GeolocationPositionError | undefined)?.code;
          if (retryCode === 1) {
            throw new Error(GPS_PERMISSION_DENIED_MESSAGE);
          }
          throw new Error(GPS_TIMEOUT_MESSAGE);
        }
      }
      throw new Error('GPS was denied or unavailable. Enter your location and adjust the manual pin.');
    }
  };

  try {
    return await Promise.race([
      runLookup(),
      new Promise<never>((_, reject) => {
        ceilingTimer = setTimeout(() => reject(new Error(GPS_TIMEOUT_MESSAGE)), hardTimeoutMs);
      }),
    ]);
  } finally {
    if (ceilingTimer !== null) clearTimeout(ceilingTimer);
  }
}

export function createDebouncedMovementWatcher(params: {
  geolocation: BrowserGeolocationLike | undefined;
  initialPoint?: GeoPoint | null;
  minDistanceMeters?: number;
  debounceMs?: number;
  onSignificantMove: (fix: GpsFix) => void;
}): { stop: () => void; updateAnchor: (point: GeoPoint) => void } {
  const {
    geolocation,
    initialPoint = null,
    minDistanceMeters = GPS_MOVEMENT_THRESHOLD_METERS,
    debounceMs = GPS_WATCH_DEBOUNCE_MS,
    onSignificantMove,
  } = params;

  let anchorPoint: GeoPoint | null = initialPoint ? { ...initialPoint } : null;
  let pendingFix: GpsFix | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  if (!geolocation || typeof geolocation.watchPosition !== 'function') {
    return {
      stop: () => {
        stopped = true;
      },
      updateAnchor: (pt: GeoPoint) => {
        anchorPoint = { ...pt };
      },
    };
  }

  const watchId = geolocation.watchPosition(
    pos => {
      if (stopped) return;
      let fix: GpsFix;
      try {
        fix = validateGeolocationPosition(pos);
      } catch {
        return;
      }

      if (anchorPoint && haversineDistanceMeters(anchorPoint, fix.point) < minDistanceMeters) {
        return;
      }

      pendingFix = fix;
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        if (stopped || !pendingFix) return;
        const committed = pendingFix;
        pendingFix = null;
        anchorPoint = { ...committed.point };
        onSignificantMove(committed);
      }, debounceMs);
    },
    () => {
      // Silent on background watch errors so manual/existing location stays intact.
    },
    GPS_WATCH_OPTIONS,
  );

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      if (typeof geolocation.clearWatch === 'function') {
        geolocation.clearWatch(watchId);
      }
    },
    updateAnchor(pt: GeoPoint) {
      anchorPoint = { ...pt };
    },
  };
}

export type ExpoLocationPositionLike = {
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  };
};

export type ExpoLocationModuleLike = {
  Accuracy: { Balanced: number };
  requestForegroundPermissionsAsync: () => Promise<{ status: string }>;
  getForegroundPermissionsAsync?: () => Promise<{ status: string }>;
  getCurrentPositionAsync: (opts: { accuracy: number }) => Promise<ExpoLocationPositionLike>;
  getLastKnownPositionAsync?: () => Promise<ExpoLocationPositionLike | null>;
  watchPositionAsync?: (
    opts: { accuracy: number; distanceInterval: number },
    callback: (pos: ExpoLocationPositionLike) => void,
  ) => Promise<{ remove: () => void }>;
};

export async function acquireNativeExpoGpsFix(
  expoLocation: ExpoLocationModuleLike,
  options?: { fastFallbackAfterMs?: number; hardTimeoutMs?: number },
): Promise<GpsFix> {
  const fastFallbackAfterMs = options?.fastFallbackAfterMs ?? 3500;
  const hardTimeoutMs = options?.hardTimeoutMs ?? GPS_HARD_TIMEOUT_MS;

  const perm = await expoLocation.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new Error(NATIVE_GPS_DENIED_MESSAGE);
  }

  const currentPromise = expoLocation.getCurrentPositionAsync({
    accuracy: expoLocation.Accuracy.Balanced,
  });

  let fastTimer: ReturnType<typeof setTimeout> | null = null;
  const fastOutcome = await Promise.race([
    currentPromise.then(pos => ({ kind: 'live' as const, pos })),
    new Promise<{ kind: 'slow' }>(resolve => {
      fastTimer = setTimeout(() => resolve({ kind: 'slow' }), fastFallbackAfterMs);
    }),
  ]).catch(() => ({ kind: 'slow' as const }));

  if (fastTimer !== null) clearTimeout(fastTimer);

  const normalizeExpoPos = (pos: ExpoLocationPositionLike | null | undefined): GpsFix | null => {
    if (!pos?.coords) return null;
    const lat = Number(pos.coords.latitude.toFixed(6));
    const lon = Number(pos.coords.longitude.toFixed(6));
    if (!isValidCoordinatePair(lat, lon)) return null;
    const acc =
      typeof pos.coords.accuracy === 'number' && Number.isFinite(pos.coords.accuracy) && pos.coords.accuracy >= 0
        ? pos.coords.accuracy
        : 50;
    return { point: { latitude: lat, longitude: lon }, accuracy: acc };
  };

  if (fastOutcome.kind === 'live') {
    const valid = normalizeExpoPos(fastOutcome.pos);
    if (valid) return valid;
  }

  // GPS lock took > 5s (or failed): check getLastKnownPositionAsync() fast fallback immediately
  if (typeof expoLocation.getLastKnownPositionAsync === 'function') {
    try {
      const lastKnown = await expoLocation.getLastKnownPositionAsync();
      const validLast = normalizeExpoPos(lastKnown);
      if (validLast) return validLast;
    } catch {
      // Continue waiting up to remaining hardTimeoutMs
    }
  }

  const remainingMs = Math.max(1000, hardTimeoutMs - fastFallbackAfterMs);
  let hardTimer: ReturnType<typeof setTimeout> | null = null;
  try {
    const finalPos = await Promise.race([
      currentPromise,
      new Promise<never>((_, reject) => {
        hardTimer = setTimeout(() => reject(new Error(NATIVE_GPS_TIMEOUT_MESSAGE)), remainingMs);
      }),
    ]);
    const validFinal = normalizeExpoPos(finalPos);
    if (!validFinal) throw new Error(NATIVE_GPS_TIMEOUT_MESSAGE);
    return validFinal;
  } catch {
    throw new Error(NATIVE_GPS_TIMEOUT_MESSAGE);
  } finally {
    if (hardTimer !== null) clearTimeout(hardTimer);
  }
}

export function createNativeExpoMovementWatcher(params: {
  expoLocation: ExpoLocationModuleLike;
  initialPoint?: GeoPoint | null;
  minDistanceMeters?: number;
  debounceMs?: number;
  onSignificantMove: (fix: GpsFix) => void;
}): { stop: () => void; updateAnchor: (point: GeoPoint) => void } {
  const {
    expoLocation,
    initialPoint = null,
    minDistanceMeters = GPS_MOVEMENT_THRESHOLD_METERS,
    debounceMs = GPS_WATCH_DEBOUNCE_MS,
    onSignificantMove,
  } = params;

  let anchorPoint: GeoPoint | null = initialPoint ? { ...initialPoint } : null;
  let pendingFix: GpsFix | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let subscription: { remove: () => void } | null = null;
  let stopped = false;

  if (typeof expoLocation.watchPositionAsync === 'function') {
    void expoLocation
      .watchPositionAsync(
        {
          accuracy: expoLocation.Accuracy.Balanced,
          distanceInterval: minDistanceMeters,
        },
        pos => {
          if (stopped || !pos?.coords) return;
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lon = Number(pos.coords.longitude.toFixed(6));
          if (!isValidCoordinatePair(lat, lon)) return;
          const accuracy =
            typeof pos.coords.accuracy === 'number' && Number.isFinite(pos.coords.accuracy)
              ? Math.max(0, pos.coords.accuracy)
              : 50;
          const fix: GpsFix = { point: { latitude: lat, longitude: lon }, accuracy };

          if (anchorPoint && haversineDistanceMeters(anchorPoint, fix.point) < minDistanceMeters) {
            return;
          }

          pendingFix = fix;
          if (debounceTimer !== null) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            debounceTimer = null;
            if (stopped || !pendingFix) return;
            const committed = pendingFix;
            pendingFix = null;
            anchorPoint = { ...committed.point };
            onSignificantMove(committed);
          }, debounceMs);
        },
      )
      .then(sub => {
        if (stopped) {
          sub.remove();
        } else {
          subscription = sub;
        }
      })
      .catch(() => {
        // Non-blocking if background watch fails.
      });
  }

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      if (subscription) {
        subscription.remove();
        subscription = null;
      }
    },
    updateAnchor(pt: GeoPoint) {
      anchorPoint = { ...pt };
    },
  };
}
