import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Alert, AppState, Platform } from 'react-native';
import * as GPS from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { useSession } from '../lib/session';
import { api } from '../lib/api';
import {
  GPS_MOVEMENT_THRESHOLD_METERS,
  NATIVE_GPS_DENIED_MESSAGE,
  acquireNativeExpoGpsFix,
  createDebouncedMovementWatcher,
  createNativeExpoMovementWatcher,
  formatCoordinateFallbackLabel,
  haversineDistanceMeters,
  queryGeolocationPermissionState,
  requestBrowserGpsFix,
  shouldAutoSyncStoredLocation,
  type GeolocationPermissionsLike,
  type GeoPoint,
  type GpsFix,
} from '../../../shared/live-geolocation';
import { isValidCoordinatePair, type SelectedLocation } from '../../../shared/selected-location';

export const LOCATION_STORAGE_KEY = 'vistrah.selected_location.v1';

export type Location = {
  label: string;
  latitude: number;
  longitude: number;
  radius: 2 | 5 | 10 | 25;
  postal_code?: string;
  address?: string;
  landmark?: string;
  city?: string;
  state?: string;
  source?: 'google' | 'gps' | 'preset' | 'manual';
};

type LocationContextValue = {
  selectedLocation: SelectedLocation | null;
  location: Location | null;
  detecting: boolean;
  hydrated: boolean;
  gpsError: string;
  clearGpsError: () => void;
  requestCurrentGps: (opts?: { showAlertOnDenied?: boolean }) => Promise<SelectedLocation | null>;
  locationRevision: number;
  commitSelectedLocation: (value: SelectedLocation) => void;
  clearSelectedLocation: () => void;
  setLocation: (value: Location | null) => void;
};

function getWebPermissions(): GeolocationPermissionsLike | null {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return null;
  return (navigator as unknown as { permissions?: GeolocationPermissionsLike }).permissions ?? null;
}

const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return typeof window !== 'undefined' && window.localStorage
          ? window.localStorage.getItem(key)
          : null;
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, val: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, val);
        }
        return;
      }
      await SecureStore.setItemAsync(key, val);
    } catch {
      // Non-blocking storage failure.
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Non-blocking storage failure.
    }
  },
};

function clampCustomerRadius(r: number | undefined): 2 | 5 | 10 | 25 {
  if (r === 2 || r === 5 || r === 10 || r === 25) return r;
  if (typeof r === 'number' && r <= 3) return 2;
  if (typeof r === 'number' && r <= 7) return 5;
  if (typeof r === 'number' && r <= 18) return 10;
  return 25;
}

export function selectedToLegacyLocation(sel: SelectedLocation | null): Location | null {
  if (!sel || !isValidCoordinatePair(sel.latitude, sel.longitude)) return null;
  return {
    label:
      sel.locality ||
      sel.city ||
      formatCoordinateFallbackLabel({ latitude: sel.latitude, longitude: sel.longitude }),
    latitude: sel.latitude,
    longitude: sel.longitude,
    radius: clampCustomerRadius(sel.radiusKm),
    postal_code: sel.pincode || '',
    address: sel.formattedAddress || '',
    landmark: sel.landmark || '',
    city: sel.city || '',
    state: sel.state || '',
    source: sel.source,
  };
}

export function legacyToSelectedLocation(loc: Location): SelectedLocation {
  return {
    latitude: loc.latitude,
    longitude: loc.longitude,
    formattedAddress: loc.address || loc.label,
    locality: loc.label,
    city: loc.city || loc.label.split(',').pop()?.trim() || '',
    state: loc.state || 'Karnataka',
    pincode: loc.postal_code || '',
    landmark: loc.landmark || '',
    radiusKm: loc.radius,
    source: loc.source ?? 'manual',
  };
}

function parseStoredLocation(raw: string | null): SelectedLocation | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SelectedLocation>;
    if (typeof parsed.latitude !== 'number' || typeof parsed.longitude !== 'number') return null;
    if (!isValidCoordinatePair(parsed.latitude, parsed.longitude)) return null;
    const locality = String(parsed.locality || parsed.city || '').trim();
    if (!locality) return null;
    return {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      formattedAddress: String(parsed.formattedAddress || locality),
      locality,
      city: String(parsed.city || ''),
      state: String(parsed.state || 'Karnataka'),
      pincode: String(parsed.pincode || ''),
      landmark: String(parsed.landmark || ''),
      radiusKm: typeof parsed.radiusKm === 'number' && parsed.radiusKm > 0 ? parsed.radiusKm : 5,
      source: parsed.source,
    };
  } catch {
    return null;
  }
}

async function reverseGeocodeWithOfflineFallback(
  lat: number,
  lon: number,
  radiusKm = 5,
): Promise<SelectedLocation> {
  const coordLabel = formatCoordinateFallbackLabel({ latitude: lat, longitude: lon });
  try {
    const res = await api<{
      formatted_address: string;
      locality: string;
      city: string;
      state: string;
      postal_code: string;
      latitude: number;
      longitude: number;
    }>(
      `/maps/reverse-geocode?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lon))}`,
    );
    const locality = (res.locality || res.city || coordLabel).trim();
    return {
      latitude: lat,
      longitude: lon,
      formattedAddress: res.formatted_address || locality,
      locality,
      city: res.city || '',
      state: res.state || 'Karnataka',
      pincode: res.postal_code || '',
      landmark: '',
      radiusKm,
      source: 'gps',
    };
  } catch {
    return {
      latitude: lat,
      longitude: lon,
      formattedAddress: coordLabel,
      locality: coordLabel,
      city: '',
      state: '',
      pincode: '',
      landmark: '',
      radiusKm,
      source: 'gps',
    };
  }
}

async function acquirePlatformGpsFix(): Promise<GpsFix> {
  if (Platform.OS === 'web') {
    return requestBrowserGpsFix(
      typeof navigator !== 'undefined' ? navigator.geolocation : undefined,
      getWebPermissions(),
    );
  }
  return acquireNativeExpoGpsFix(GPS);
}

const Context = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const { user } = useSession(false);
  const [selectedLocation, setSelectedState] = useState<SelectedLocation | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [locationRevision, setLocationRevision] = useState(0);

  const generationRef = useRef(0);
  const manualLockRef = useRef(false);
  const activePointRef = useRef<GeoPoint | null>(null);
  const radiusKmRef = useRef<number>(5);
  const watcherRef = useRef<{ stop: () => void; updateAnchor: (pt: GeoPoint) => void } | null>(null);
  const previousUserIdRef = useRef<number | null | undefined>(undefined);

  radiusKmRef.current = selectedLocation?.radiusKm ?? 5;

  const stopLiveWatcher = useCallback(() => {
    watcherRef.current?.stop();
    watcherRef.current = null;
  }, []);

  const clearGpsError = useCallback(() => {
    setGpsError('');
  }, []);

  const applyGpsFixToState = useCallback(
    async (fix: GpsFix, expectedGen?: number): Promise<SelectedLocation | null> => {
      const lat = Number(fix.point.latitude.toFixed(6));
      const lon = Number(fix.point.longitude.toFixed(6));
      const coordLabel = formatCoordinateFallbackLabel({ latitude: lat, longitude: lon });

      // Immediate coordinate update so map & nearby listings query update without waiting on reverse-geocoding
      const provisional: SelectedLocation = {
        latitude: lat,
        longitude: lon,
        formattedAddress: coordLabel,
        locality: selectedLocation?.locality || coordLabel,
        city: selectedLocation?.city || '',
        state: selectedLocation?.state || 'Karnataka',
        pincode: selectedLocation?.pincode || '',
        landmark: '',
        radiusKm: radiusKmRef.current,
        source: 'gps',
      };
      activePointRef.current = { latitude: lat, longitude: lon };
      watcherRef.current?.updateAnchor({ latitude: lat, longitude: lon });
      setSelectedState(provisional);
      setLocationRevision(r => r + 1);

      const resolved = await reverseGeocodeWithOfflineFallback(lat, lon, radiusKmRef.current);
      if (expectedGen !== undefined && expectedGen !== generationRef.current) return null;
      if (manualLockRef.current) return null;

      activePointRef.current = { latitude: resolved.latitude, longitude: resolved.longitude };
      watcherRef.current?.updateAnchor({ latitude: resolved.latitude, longitude: resolved.longitude });
      setSelectedState(resolved);
      setLocationRevision(r => r + 1);
      await storage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(resolved));
      return resolved;
    },
    [selectedLocation?.city, selectedLocation?.locality, selectedLocation?.pincode, selectedLocation?.state],
  );

  const ensureLiveWatcher = useCallback(
    (initialPoint: GeoPoint | null) => {
      if (manualLockRef.current) return;
      watcherRef.current?.stop();
      if (Platform.OS === 'web') {
        watcherRef.current = createDebouncedMovementWatcher({
          geolocation: typeof navigator !== 'undefined' ? navigator.geolocation : undefined,
          initialPoint,
          minDistanceMeters: GPS_MOVEMENT_THRESHOLD_METERS,
          onSignificantMove: fix => {
            if (manualLockRef.current) return;
            void applyGpsFixToState(fix);
          },
        });
      } else {
        watcherRef.current = createNativeExpoMovementWatcher({
          expoLocation: GPS,
          initialPoint,
          minDistanceMeters: GPS_MOVEMENT_THRESHOLD_METERS,
          onSignificantMove: fix => {
            if (manualLockRef.current) return;
            void applyGpsFixToState(fix);
          },
        });
      }
    },
    [applyGpsFixToState],
  );

  const requestCurrentGps = useCallback(
    async (opts?: { showAlertOnDenied?: boolean }): Promise<SelectedLocation | null> => {
      const gen = ++generationRef.current;
      manualLockRef.current = false;
      setGpsError('');
      setDetecting(true);
      try {
        const fix = await acquirePlatformGpsFix();
        if (gen !== generationRef.current) return null;
        const applied = await applyGpsFixToState(fix, gen);
        if (gen === generationRef.current && !manualLockRef.current) {
          ensureLiveWatcher(fix.point);
        }
        return applied;
      } catch (err) {
        const msg = (err as Error)?.message || NATIVE_GPS_DENIED_MESSAGE;
        if (gen === generationRef.current) {
          setGpsError(msg);
          if (
            Platform.OS !== 'web' &&
            opts?.showAlertOnDenied !== false &&
            msg.toLowerCase().includes('permission')
          ) {
            Alert.alert('Location Permission Needed', msg);
          }
        }
        return null;
      } finally {
        if (gen === generationRef.current) {
          setDetecting(false);
        }
      }
    },
    [applyGpsFixToState, ensureLiveWatcher],
  );

  const commitSelectedLocation = useCallback(
    (next: SelectedLocation) => {
      generationRef.current++;
      setGpsError('');
      const isGps = next.source === 'gps';
      manualLockRef.current = !isGps;
      activePointRef.current = { latitude: next.latitude, longitude: next.longitude };
      radiusKmRef.current = next.radiusKm;
      if (!isGps) {
        stopLiveWatcher();
      } else {
        ensureLiveWatcher({ latitude: next.latitude, longitude: next.longitude });
      }
      setSelectedState(next);
      setLocationRevision(r => r + 1);
      void storage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(next));
    },
    [ensureLiveWatcher, stopLiveWatcher],
  );

  const clearSelectedLocation = useCallback(() => {
    generationRef.current++;
    manualLockRef.current = false;
    activePointRef.current = null;
    stopLiveWatcher();
    setGpsError('');
    setSelectedState(null);
    setLocationRevision(r => r + 1);
    void storage.removeItem(LOCATION_STORAGE_KEY);
  }, [stopLiveWatcher]);

  const setLocation = useCallback(
    (next: Location | null) => {
      if (next === null) {
        clearSelectedLocation();
      } else {
        commitSelectedLocation(legacyToSelectedLocation(next));
      }
    },
    [clearSelectedLocation, commitSelectedLocation],
  );

  // Initial hydration + automatic GPS sync & movement watcher (without overwriting manual overrides)
  useEffect(() => {
    let alive = true;
    const bootGen = ++generationRef.current;

    void (async () => {
      const raw = await storage.getItem(LOCATION_STORAGE_KEY);
      const stored = parseStoredLocation(raw);
      if (!alive) return;

      if (stored && bootGen === generationRef.current) {
        radiusKmRef.current = stored.radiusKm;
        activePointRef.current = { latitude: stored.latitude, longitude: stored.longitude };
        setSelectedState(stored);
        setHydrated(true);

        if (!shouldAutoSyncStoredLocation(stored)) {
          manualLockRef.current = true;
          return;
        }
        manualLockRef.current = false;
      } else {
        setHydrated(true);
      }

      if (!alive || manualLockRef.current || bootGen !== generationRef.current) return;

      if (Platform.OS === 'web') {
        const permState = await queryGeolocationPermissionState(getWebPermissions());
        if (!alive || manualLockRef.current || permState === 'denied') return;
        if (stored && permState !== 'granted') return;
      } else if (stored) {
        try {
          const existingPerm = await GPS.getForegroundPermissionsAsync();
          if (!alive || manualLockRef.current || existingPerm.status !== 'granted') return;
        } catch {
          return;
        }
      }

      setDetecting(true);
      try {
        const fix = await acquirePlatformGpsFix();
        if (!alive || manualLockRef.current || bootGen !== generationRef.current) return;
        await applyGpsFixToState(fix, bootGen);
        if (alive && !manualLockRef.current) {
          ensureLiveWatcher(fix.point);
        }
      } catch {
        // Silent on background load; manual fallback remains cleanly available.
        if (alive && !manualLockRef.current && stored?.source === 'gps') {
          ensureLiveWatcher({ latitude: stored.latitude, longitude: stored.longitude });
        }
      } finally {
        if (alive) setDetecting(false);
      }
    })();

    const resyncOnForeground = () => {
      if (!alive || manualLockRef.current) return;
      void (async () => {
        try {
          if (Platform.OS === 'web') {
            if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
            const permState = await queryGeolocationPermissionState(getWebPermissions());
            if (!alive || manualLockRef.current || permState !== 'granted') return;
          } else {
            const existingPerm = await GPS.getForegroundPermissionsAsync();
            if (!alive || manualLockRef.current || existingPerm.status !== 'granted') return;
          }
          const fix = await acquirePlatformGpsFix();
          if (!alive || manualLockRef.current) return;
          const prev = activePointRef.current;
          if (!prev || haversineDistanceMeters(prev, fix.point) >= GPS_MOVEMENT_THRESHOLD_METERS) {
            await applyGpsFixToState(fix);
          }
          ensureLiveWatcher(fix.point);
        } catch {
          // Silent on foreground re-sync
        }
      })();
    };

    const appSub =
      Platform.OS !== 'web'
        ? AppState.addEventListener('change', st => {
            if (st === 'active') resyncOnForeground();
          })
        : null;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', resyncOnForeground);
      window.addEventListener('focus', resyncOnForeground);
    }

    return () => {
      alive = false;
      appSub?.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', resyncOnForeground);
        window.removeEventListener('focus', resyncOnForeground);
      }
      stopLiveWatcher();
    };
  }, [applyGpsFixToState, ensureLiveWatcher, stopLiveWatcher]);

  // Sync account-level saved location if signed in and no local selection was made yet
  useEffect(() => {
    let active = true;
    const id = user?.id ?? null;
    if (
      previousUserIdRef.current !== undefined &&
      previousUserIdRef.current !== null &&
      previousUserIdRef.current !== id
    ) {
      clearSelectedLocation();
    }
    previousUserIdRef.current = id;

    const epoch = generationRef.current;
    if (user) {
      api<{
        location: {
          locality: string;
          latitude: number;
          longitude: number;
          postal_code: string;
          address: string;
          landmark: string;
        } | null;
      }>('/me/location')
        .then(result => {
          if (!active || epoch !== generationRef.current || !result.location) return;
          const pt = result.location;
          if (!isValidCoordinatePair(pt.latitude, pt.longitude)) return;
          setSelectedState(prev => {
            if (prev) return prev;
            manualLockRef.current = true;
            stopLiveWatcher();
            const synced: SelectedLocation = {
              latitude: pt.latitude,
              longitude: pt.longitude,
              formattedAddress: pt.address || pt.locality,
              locality: pt.locality,
              city: pt.locality.split(',').pop()?.trim() || '',
              state: 'Karnataka',
              pincode: pt.postal_code || '',
              landmark: pt.landmark || '',
              radiusKm: 5,
              source: 'manual',
            };
            activePointRef.current = { latitude: pt.latitude, longitude: pt.longitude };
            void storage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(synced));
            return synced;
          });
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [user, clearSelectedLocation, stopLiveWatcher]);

  const legacyLocation = useMemo(
    () => selectedToLegacyLocation(selectedLocation),
    [selectedLocation],
  );

  const ctxValue = useMemo<LocationContextValue>(
    () => ({
      selectedLocation,
      location: legacyLocation,
      detecting,
      hydrated,
      gpsError,
      clearGpsError,
      requestCurrentGps,
      locationRevision,
      commitSelectedLocation,
      clearSelectedLocation,
      setLocation,
    }),
    [
      selectedLocation,
      legacyLocation,
      detecting,
      hydrated,
      gpsError,
      clearGpsError,
      requestCurrentGps,
      locationRevision,
      commitSelectedLocation,
      clearSelectedLocation,
      setLocation,
    ],
  );

  return <Context.Provider value={ctxValue}>{children}</Context.Provider>;
}

export function useLocation() {
  const value = useContext(Context);
  if (!value) throw new Error('Missing LocationProvider');
  return value;
}

export function useOptionalLocation() {
  return useContext(Context);
}

export function parsePoint(latitude: string, longitude: string) {
  if (!latitude.trim() || !longitude.trim()) throw new Error('Enter both latitude and longitude.');
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    throw new Error('Use latitude -90 to 90 and longitude -180 to 180.');
  }
  return { latitude: lat, longitude: lon };
}
