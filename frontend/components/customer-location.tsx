'use client';
import { UiText, UiSection } from './localized-ui';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { destinationLink } from '@/lib/destinations';
import { googleMapsWebKey } from './google-location-picker';
import { MapFirstLocationPicker, reverseGeocodePoint } from './vistrah-google-maps';
import { googlePlaces, googlePrivacy } from '../../shared/google-location';
import {
  GPS_HARD_TIMEOUT_MS,
  GPS_MOVEMENT_THRESHOLD_METERS,
  GPS_TIMEOUT_MESSAGE,
  createDebouncedMovementWatcher,
  formatCoordinateFallbackLabel,
  haversineDistanceMeters,
  queryGeolocationPermissionState,
  shouldAutoSyncStoredLocation,
  type GeolocationPermissionsLike,
  type GpsFix,
} from '../../shared/live-geolocation';
import {
  isCoordinateFormattedLabel,
  lookupLocalAreaCity,
} from '../../shared/reverse-geocode-fallback';
import {
  DEFAULT_SELECTED_LOCATION,
  isValidCoordinatePair,
  type SelectedLocation,
} from '../../shared/selected-location';
import {
  lookupGpsPlace,
  radii,
  requestGps,
  validPoint,
  type CustomerLocation,
  type Point,
  type Radius,
} from '@/lib/location';

export const WEB_LOCATION_STORAGE_KEY = 'vistrah.selected_location.v1';
export const defaultMapPoint = { latitude: 12.9716, longitude: 77.5946 };

const emptyLocation: CustomerLocation = {
  latitude: defaultMapPoint.latitude,
  longitude: defaultMapPoint.longitude,
  locality: 'Bengaluru',
  postal_code: '',
  address: 'Bengaluru, Karnataka',
  landmark: '',
};

function getBrowserPermissions(): GeolocationPermissionsLike | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as unknown as { permissions?: GeolocationPermissionsLike }).permissions ?? null;
}

function readStoredWebLocation(): SelectedLocation | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(WEB_LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SelectedLocation>;
    if (typeof parsed.latitude !== 'number' || typeof parsed.longitude !== 'number') return null;
    if (!isValidCoordinatePair(parsed.latitude, parsed.longitude)) return null;
    const rawLocality = String(parsed.locality || parsed.city || '').trim();
    if (!rawLocality) return null;
    const localUpgrade = isCoordinateFormattedLabel(rawLocality)
      ? lookupLocalAreaCity({ latitude: parsed.latitude, longitude: parsed.longitude })
      : null;
    const locality = localUpgrade?.locality || rawLocality;
    const rawFormatted = String(parsed.formattedAddress || locality);
    const formattedAddress =
      isCoordinateFormattedLabel(rawFormatted) && localUpgrade
        ? localUpgrade.formattedAddress
        : rawFormatted;
    return {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      formattedAddress,
      locality,
      city: String(parsed.city || localUpgrade?.city || ''),
      state: String(parsed.state || localUpgrade?.state || 'Karnataka'),
      pincode: String(parsed.pincode || localUpgrade?.postalCode || ''),
      landmark: String(parsed.landmark || ''),
      radiusKm: typeof parsed.radiusKm === 'number' && parsed.radiusKm > 0 ? parsed.radiusKm : 5,
      source: parsed.source,
    };
  } catch {
    return null;
  }
}

function writeStoredWebLocation(sel: SelectedLocation | null) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (!sel) window.localStorage.removeItem(WEB_LOCATION_STORAGE_KEY);
    else window.localStorage.setItem(WEB_LOCATION_STORAGE_KEY, JSON.stringify(sel));
  } catch {
    // Ignore private-mode storage quota errors.
  }
}

function customerToSelected(loc: CustomerLocation, radiusKm: Radius): SelectedLocation {
  const hasPoint = validPoint(loc);
  return {
    latitude: hasPoint ? loc.latitude : DEFAULT_SELECTED_LOCATION.latitude,
    longitude: hasPoint ? loc.longitude : DEFAULT_SELECTED_LOCATION.longitude,
    formattedAddress: loc.address || loc.locality || DEFAULT_SELECTED_LOCATION.formattedAddress,
    locality: loc.locality || DEFAULT_SELECTED_LOCATION.locality,
    city: loc.locality.split(',').pop()?.trim() || DEFAULT_SELECTED_LOCATION.city,
    state: 'Karnataka',
    pincode: loc.postal_code || '',
    landmark: loc.landmark || '',
    radiusKm,
    source: loc.source ?? 'manual',
  };
}

function selectedToCustomer(sel: SelectedLocation): CustomerLocation {
  return {
    latitude: sel.latitude,
    longitude: sel.longitude,
    locality: sel.locality.trim(),
    postal_code: sel.pincode.trim(),
    address: sel.formattedAddress.trim(),
    landmark: sel.landmark.trim(),
    ...(sel.source ? { source: sel.source } : {}),
  };
}

async function resolveHumanReadableGpsLocation(
  point: Point,
  accuracy: number,
  radiusKm: Radius,
): Promise<{ selected: SelectedLocation; customer: CustomerLocation }> {
  const lat = Number(point.latitude.toFixed(6));
  const lon = Number(point.longitude.toFixed(6));
  const fallbackLabel = formatCoordinateFallbackLabel({ latitude: lat, longitude: lon });

  let locality = '';
  let formattedAddress = '';
  let city = '';
  let state = 'Karnataka';
  let postalCode = '';

  try {
    const resolved = await reverseGeocodePoint({ latitude: lat, longitude: lon });
    if (resolved?.locality) {
      locality = resolved.locality.trim();
      formattedAddress = (resolved.formattedAddress || locality).trim();
      city = (resolved.city || '').trim();
      state = (resolved.state || 'Karnataka').trim();
      postalCode = (resolved.postalCode || '').trim();
    }
  } catch {
    // Fall through to secondary lookup
  }

  if (!locality) {
    try {
      const secondary = googleMapsWebKey
        ? (await googlePlaces(api, { latitude: lat, longitude: lon }))[0]
        : await lookupGpsPlace({ latitude: lat, longitude: lon });
      if (secondary?.label) {
        locality = secondary.label.trim();
        formattedAddress = locality;
        postalCode = (secondary.postal_code || '').trim();
      }
    } catch {
      // Fall through to coordinate fallback label
    }
  }

  const localFallback = lookupLocalAreaCity({ latitude: lat, longitude: lon });
  const finalLocality =
    (locality && !isCoordinateFormattedLabel(locality) ? locality : '') ||
    localFallback?.locality ||
    locality ||
    fallbackLabel;
  const finalAddress =
    (formattedAddress && !isCoordinateFormattedLabel(formattedAddress) ? formattedAddress : '') ||
    localFallback?.formattedAddress ||
    (accuracy > 0 ? `${finalLocality} (GPS ~${Math.round(accuracy)}m)` : finalLocality);

  const selected: SelectedLocation = {
    latitude: lat,
    longitude: lon,
    locality: finalLocality,
    formattedAddress: finalAddress,
    city: city || localFallback?.city || finalLocality.split(',').pop()?.trim() || '',
    state: state || localFallback?.state || 'Karnataka',
    pincode: postalCode || localFallback?.postalCode || '',
    landmark: '',
    radiusKm,
    source: 'gps',
  };

  return {
    selected,
    customer: selectedToCustomer(selected),
  };
}

function useLocationState() {
  const [draft, setDraft] = useState<CustomerLocation>(emptyLocation);
  const [active, setActive] = useState<CustomerLocation | null>(null);
  const [radius, setRadiusState] = useState<Radius>(5);
  const [detecting, setDetecting] = useState(false);
  const [locationRevision, setLocationRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const edits = useRef(0);
  const gpsGeneration = useRef(0);
  const identity = useRef<number | null | undefined>(undefined);
  const hasEdits = useRef(false);
  const identityEpoch = useRef(0);
  const manualLockRef = useRef(false);
  const activePointRef = useRef<Point | null>(null);
  const radiusRef = useRef<Radius>(5);
  const watcherRef = useRef<{ stop: () => void; updateAnchor: (point: Point) => void } | null>(null);
  const path = usePathname();

  radiusRef.current = radius;

  const stopGpsWatcher = useCallback(() => {
    watcherRef.current?.stop();
    watcherRef.current = null;
  }, []);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  const applyGpsFix = useCallback(
    async (fix: GpsFix, showUserMessage: boolean, expectedGen?: number) => {
      const lat = Number(fix.point.latitude.toFixed(6));
      const lon = Number(fix.point.longitude.toFixed(6));
      const pt = { latitude: lat, longitude: lon };
      const coordFallback = formatCoordinateFallbackLabel(pt);
      const localGuess = lookupLocalAreaCity(pt);
      const existingCleanLocality =
        active?.locality && !isCoordinateFormattedLabel(active.locality) ? active.locality : '';

      // Apply immediate coordinate + neighbourhood update first so map center + radius query never flash raw degree coordinates
      const immediateCustomer: CustomerLocation = {
        latitude: lat,
        longitude: lon,
        locality: localGuess?.locality || existingCleanLocality || coordFallback,
        postal_code: localGuess?.postalCode || '',
        address: localGuess?.formattedAddress || existingCleanLocality || coordFallback,
        landmark: '',
        source: 'gps',
      };
      activePointRef.current = { latitude: lat, longitude: lon };
      watcherRef.current?.updateAnchor({ latitude: lat, longitude: lon });
      setDraft(immediateCustomer);
      setActive(immediateCustomer);
      setLocationRevision(r => r + 1);

      const { selected, customer } = await resolveHumanReadableGpsLocation(
        { latitude: lat, longitude: lon },
        fix.accuracy,
        radiusRef.current,
      );
      if (expectedGen !== undefined && expectedGen !== gpsGeneration.current) return;
      if (manualLockRef.current) return;

      activePointRef.current = { latitude: selected.latitude, longitude: selected.longitude };
      watcherRef.current?.updateAnchor({ latitude: selected.latitude, longitude: selected.longitude });
      setDraft(customer);
      setActive(customer);
      writeStoredWebLocation(selected);
      setLocationRevision(r => r + 1);
      if (showUserMessage) {
        setMessage(`Using ${selected.locality} (GPS ~${Math.round(fix.accuracy)}m).`);
      }
    },
    [active?.locality],
  );

  const ensureLiveWatcherStarted = useCallback(
    (initialPoint: Point | null) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation || manualLockRef.current) {
        return;
      }
      watcherRef.current?.stop();
      watcherRef.current = createDebouncedMovementWatcher({
        geolocation: navigator.geolocation,
        initialPoint,
        minDistanceMeters: GPS_MOVEMENT_THRESHOLD_METERS,
        onSignificantMove: fix => {
          if (manualLockRef.current) return;
          void applyGpsFix(fix, false);
        },
      });
    },
    [applyGpsFix],
  );

  const setRadius = useCallback((nextRadius: Radius) => {
    setRadiusState(nextRadius);
    setLocationRevision(r => r + 1);
  }, []);

  const syncIdentity = useCallback(
    (id: number | null) => {
      if (identity.current === id) return;
      identityEpoch.current++;
      if (identity.current != null) {
        edits.current++;
        gpsGeneration.current++;
        hasEdits.current = false;
        manualLockRef.current = false;
        activePointRef.current = null;
        stopGpsWatcher();
        setActive(null);
        setDraft(emptyLocation);
        setRadiusState(5);
        setMessage('');
        setError('');
        writeStoredWebLocation(null);
        setLocationRevision(r => r + 1);
      }
      identity.current = id;
    },
    [stopGpsWatcher],
  );

  // 1. Hydrate from localStorage + automatic GPS sync & movement watcher (without overwriting manual overrides)
  useEffect(() => {
    let alive = true;
    const stored = readStoredWebLocation();

    if (stored) {
      const nextRadius = (radii as readonly number[]).includes(stored.radiusKm)
        ? (stored.radiusKm as Radius)
        : 5;
      const cust = selectedToCustomer(stored);
      hasEdits.current = true;
      radiusRef.current = nextRadius;
      setRadiusState(nextRadius);
      setDraft(cust);
      setActive(cust);
      activePointRef.current = { latitude: stored.latitude, longitude: stored.longitude };
      setLocationRevision(r => r + 1);

      if (!shouldAutoSyncStoredLocation(stored)) {
        // User explicitly chose a manual/preset/search city — respect manual override!
        manualLockRef.current = true;
        return () => {
          alive = false;
        };
      }
      manualLockRef.current = false;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return () => {
        alive = false;
      };
    }

    const bootGen = ++gpsGeneration.current;
    void (async () => {
      const permState = await queryGeolocationPermissionState(getBrowserPermissions());
      if (!alive || manualLockRef.current || bootGen !== gpsGeneration.current) return;
      // On initial load: auto-fetch when permission is 'granted' OR on first visit (!stored) unless explicitly 'denied'
      if (permState === 'denied') return;
      if (stored && permState !== 'granted') return;

      setDetecting(true);
      const bootSafetyTimer = setTimeout(() => {
        if (alive) setDetecting(false);
      }, GPS_HARD_TIMEOUT_MS);
      try {
        const fix = await Promise.race([
          requestGps(navigator.geolocation, getBrowserPermissions()),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(GPS_TIMEOUT_MESSAGE)), GPS_HARD_TIMEOUT_MS),
          ),
        ]);
        if (!alive || manualLockRef.current || bootGen !== gpsGeneration.current) return;
        await applyGpsFix(fix, false, bootGen);
        if (alive && !manualLockRef.current) {
          ensureLiveWatcherStarted(fix.point);
        }
      } catch {
        // Silent on background load so manual/fallback browsing is never interrupted.
        if (alive && !manualLockRef.current && stored?.source === 'gps') {
          ensureLiveWatcherStarted({ latitude: stored.latitude, longitude: stored.longitude });
        }
      } finally {
        clearTimeout(bootSafetyTimer);
        if (alive) setDetecting(false);
      }
    })();

    function handleVisibilityOrFocus() {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (!alive || manualLockRef.current || typeof navigator === 'undefined' || !navigator.geolocation) {
        return;
      }
      void (async () => {
        const permState = await queryGeolocationPermissionState(getBrowserPermissions());
        if (!alive || manualLockRef.current || permState !== 'granted') return;
        try {
          const fix = await requestGps(navigator.geolocation, getBrowserPermissions());
          if (!alive || manualLockRef.current) return;
          const prevPt = activePointRef.current;
          if (!prevPt || haversineDistanceMeters(prevPt, fix.point) >= GPS_MOVEMENT_THRESHOLD_METERS) {
            await applyGpsFix(fix, false);
          }
          ensureLiveWatcherStarted(fix.point);
        } catch {
          // Silent on tab visibility re-sync
        }
      })();
    }

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      stopGpsWatcher();
    };
  }, [applyGpsFix, ensureLiveWatcherStarted, stopGpsWatcher]);

  // 2. Account saved location fallback when signed in and local selection is empty
  useEffect(() => {
    let alive = true;
    const profileEpoch = identityEpoch.current;
    api<{ id: number }>('/me')
      .then(async user => {
        if (!alive || profileEpoch !== identityEpoch.current) return;
        syncIdentity(user.id);
        if (hasEdits.current || readStoredWebLocation()) return;
        const generation = edits.current;
        const preferenceEpoch = identityEpoch.current;
        try {
          const { location } = await api<{ location: CustomerLocation | null }>('/me/location');
          if (
            alive &&
            identityEpoch.current === preferenceEpoch &&
            edits.current === generation &&
            location &&
            validPoint(location)
          ) {
            const manualLoc: CustomerLocation = { ...location, source: 'manual' };
            manualLockRef.current = true;
            stopGpsWatcher();
            setDraft(manualLoc);
            setActive(manualLoc);
            activePointRef.current = { latitude: manualLoc.latitude, longitude: manualLoc.longitude };
            writeStoredWebLocation(customerToSelected(manualLoc, radius));
            setLocationRevision(r => r + 1);
          }
        } catch {
          // Silent fallback.
        }
      })
      .catch(() => {
        if (alive && profileEpoch === identityEpoch.current) syncIdentity(null);
      });
    return () => {
      alive = false;
    };
  }, [path, syncIdentity, radius, stopGpsWatcher]);

  const edit = useCallback(
    (values: Partial<CustomerLocation>) => {
      hasEdits.current = true;
      edits.current++;
      gpsGeneration.current++;
      if (values.source !== 'gps') {
        manualLockRef.current = true;
        stopGpsWatcher();
      }
      setDraft(previous => ({ ...previous, ...values }));
    },
    [stopGpsWatcher],
  );

  const confirmLocation = useCallback(
    (location: CustomerLocation, nextRadius?: Radius) => {
      if (
        !validPoint(location) ||
        location.locality.trim().length < 2 ||
        !/^([0-9]{6})?$/.test(location.postal_code)
      ) {
        setError('Select an area on the map or enter a locality (and optional 6-digit PIN).');
        return false;
      }
      const appliedRadius = nextRadius ?? radius;
      hasEdits.current = true;
      edits.current++;
      gpsGeneration.current++;
      setError('');
      setRadiusState(appliedRadius);
      radiusRef.current = appliedRadius;

      const isGps = location.source === 'gps';
      manualLockRef.current = !isGps;
      if (!isGps) {
        stopGpsWatcher();
      } else {
        ensureLiveWatcherStarted({ latitude: location.latitude, longitude: location.longitude });
      }

      activePointRef.current = { latitude: location.latitude, longitude: location.longitude };
      setActive({ ...location });
      setDraft({ ...location });
      writeStoredWebLocation(customerToSelected(location, appliedRadius));
      setLocationRevision(r => r + 1);
      setMessage(
        `Location set to ${location.locality}${location.postal_code ? ` (${location.postal_code})` : ''}.`,
      );
      return true;
    },
    [ensureLiveWatcherStarted, radius, stopGpsWatcher],
  );

  const gps = useCallback(async () => {
    const generation = ++gpsGeneration.current;
    hasEdits.current = true;
    edits.current++;
    // Explicitly clear manual override lock when user clicks Use GPS
    manualLockRef.current = false;
    setError('');
    setMessage('');
    setBusy(true);
    setDetecting(true);
    const safetyTimer = setTimeout(() => {
      if (generation === gpsGeneration.current) {
        setBusy(false);
        setDetecting(false);
      }
    }, GPS_HARD_TIMEOUT_MS);
    try {
      const fix = await Promise.race([
        requestGps(
          typeof navigator !== 'undefined' ? navigator.geolocation : undefined,
          getBrowserPermissions(),
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(GPS_TIMEOUT_MESSAGE)), GPS_HARD_TIMEOUT_MS),
        ),
      ]);
      if (generation !== gpsGeneration.current) return;
      await applyGpsFix(fix, true, generation);
      if (generation === gpsGeneration.current && !manualLockRef.current) {
        ensureLiveWatcherStarted(fix.point);
      }
    } catch (e) {
      if (generation === gpsGeneration.current) {
        setError((e as Error).message);
      }
    } finally {
      clearTimeout(safetyTimer);
      if (generation === gpsGeneration.current) {
        setBusy(false);
        setDetecting(false);
      }
    }
  }, [applyGpsFix, ensureLiveWatcherStarted]);

  async function save() {
    if (active?.source === 'google') {
      setError(
        'Google search results stay saved in this browser; edit locality/PIN manually to sync to account.',
      );
      return;
    }
    if (!active) return;
    setBusy(true);
    setError('');
    try {
      await api('/me/location', { method: 'PUT', body: JSON.stringify(active) });
      setMessage('Location saved to your VISTRAH account.');
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? 'Sign in to sync this location to your account.'
          : 'Saving is unavailable. ' + (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    hasEdits.current = true;
    edits.current++;
    gpsGeneration.current++;
    manualLockRef.current = false;
    activePointRef.current = null;
    stopGpsWatcher();
    setActive(null);
    setDraft(emptyLocation);
    writeStoredWebLocation(null);
    setLocationRevision(r => r + 1);
    setBusy(true);
    setError('');
    try {
      await api('/me/location', { method: 'DELETE' });
      setMessage('Saved and browser locations cleared.');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setMessage('Location cleared.');
      else setError('Browser location cleared; account location could not be cleared.');
    } finally {
      setBusy(false);
    }
  }

  return {
    draft,
    active,
    radius,
    setRadius,
    detecting,
    locationRevision,
    busy,
    error,
    clearError,
    message,
    edit,
    confirmLocation,
    gps,
    save,
    clear,
    syncIdentity,
  };
}

type LocationState = ReturnType<typeof useLocationState>;
const CustomerLocationContext = createContext<LocationState | null>(null);
export function CustomerLocationProvider({ children }: { children: ReactNode }) {
  const value = useLocationState();
  return <CustomerLocationContext.Provider value={value}>{children}</CustomerLocationContext.Provider>;
}
export function useCustomerLocation() {
  const value = useContext(CustomerLocationContext);
  if (!value) throw new Error('Customer location provider missing');
  return value;
}
export function useOptionalCustomerLocation() {
  return useContext(CustomerLocationContext);
}

export function LocationChooser({
  expanded = false,
  onCommitted,
}: {
  expanded?: boolean;
  onCommitted?: () => void;
}) {
  const state = useCustomerLocation();
  const id = useId();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(expanded);
  const { draft, active, radius, busy, error, message } = state;

  const selectedValue = useMemo(() => customerToSelected(active ?? draft, radius), [active, draft, radius]);

  function handleSelectedChange(next: SelectedLocation) {
    const nextRadius = (radii as readonly number[]).includes(next.radiusKm)
      ? (next.radiusKm as Radius)
      : radius;
    if (nextRadius !== radius) state.setRadius(nextRadius);
    state.edit(selectedToCustomer(next));
  }

  function commitAndDismiss(confirmed: SelectedLocation) {
    const nextRadius = (radii as readonly number[]).includes(confirmed.radiusKm)
      ? (confirmed.radiusKm as Radius)
      : radius;
    const ok = state.confirmLocation(selectedToCustomer(confirmed), nextRadius);
    if (!ok) return;
    if (onCommitted) {
      onCommitted();
      return;
    }
    if (!expanded) {
      setOpen(false);
      return;
    }
    if (path === '/location') {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back();
      } else {
        router.push('/');
      }
    }
  }

  return (
    <UiSection className="customer-location-entry" aria-label="Customer location">
      {!expanded && (
        <div className="location-entry-heading">
          <button
            type="button"
            className="button secondary"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen(value => !value)}
          >
            <MapPin size={18} aria-hidden="true" />
            <UiText value={active ? `${active.locality} · ${radius} km` : 'Select Location'} />
          </button>
          <p className="tabular-nums">
            <UiText
              value={
                active
                  ? `${active.locality}${active.postal_code ? ' · ' + active.postal_code : ''} · within ${radius} km`
                  : 'Select your area on the map for nearby service discovery.'
              }
            />
          </p>
        </div>
      )}

      <div id={id} hidden={!open}>
        {error && (
          <p className="notice error" role="alert">
            <UiText value={error} />
            {error.startsWith('Sign in') && (
              <>
                {' '}
                <Link href={destinationLink('/login', path)}>
                  <UiText value={'Sign in'} />
                </Link>
              </>
            )}
          </p>
        )}
        {message && (
          <p className="notice" role="status">
            <UiText value={message} />
          </p>
        )}

        {open && (
          <MapFirstLocationPicker
            mode="customer"
            value={selectedValue}
            onChange={handleSelectedChange}
            onConfirm={commitAndDismiss}
            onQuickCommit={commitAndDismiss}
            confirmLabel="Confirm Location"
            radiusOptions={radii}
            disabled={busy}
            busy={busy}
            secondaryActions={
              <div style={{ display: 'grid', gap: 8 }}>
                <div className="button-row">
                  <button
                    type="button"
                    className="button secondary"
                    disabled={!active || busy || active.source === 'google'}
                    onClick={() => void state.save()}
                  >
                    <UiText value={'Save to account'} />
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={() => void state.clear()}
                  >
                    <UiText value={'Clear location'} />
                  </button>
                </div>
                <small style={{ color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  {googleMapsWebKey ? (
                    googlePrivacy
                  ) : (
                    <UiText
                      value={
                        'Your selected area is saved in this browser so every page and the header stay synchronized.'
                      }
                    />
                  )}
                </small>
              </div>
            }
          />
        )}
      </div>
    </UiSection>
  );
}
