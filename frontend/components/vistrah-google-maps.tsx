'use client';

import {
  APIProvider,
  APIProviderContext,
  Circle,
  InfoWindow,
  Map as GoogleMapCanvas,
  Marker,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import Link from 'next/link';
import { useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { ExternalLink, LocateFixed, MapPin, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { validPoint, type NearbyProvider, type Point } from '@/lib/location';
import { LocationMap } from './location-map';
import s from './vistrah-google-maps.module.css';

export const googleMapsWebApiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim();

export type ResolvedPlace = {
  placeId?: string;
  formattedAddress: string;
  locality: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
};

export type VistrahMapMarker = {
  id: string | number;
  latitude: number;
  longitude: number;
  title: string;
  subtitle?: string;
  description?: string;
  distanceKm?: number | null;
  badge?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
};

export function googleMapsDirectionsHref(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

function svgMarkerDataUrl(variant: 'center' | 'item' | 'selected'): string {
  const fill = variant === 'center' ? '#d4af37' : variant === 'selected' ? '#d4af37' : '#0f172a';
  const stroke = variant === 'center' ? '#0f172a' : variant === 'selected' ? '#0f172a' : '#d4af37';
  const inner = variant === 'center' ? '#0f172a' : variant === 'selected' ? '#0f172a' : '#f8e7b0';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44"><path d="M18 2C9.716 2 3 8.716 3 17c0 10.75 15 25 15 25s15-14.25 15-25c0-8.284-6.716-15-15-15z" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/><circle cx="18" cy="17" r="6" fill="${inner}"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function extractAddressSummary(
  components: Array<{ long_name?: string; longText?: string; types?: string[] }> | undefined,
  fallbackLabel = '',
) {
  const list = components ?? [];
  const find = (...kinds: string[]) => {
    for (const kind of kinds) {
      const hit = list.find(c => (c.types ?? []).includes(kind));
      const text = (hit?.longText ?? hit?.long_name ?? '').trim();
      if (text) return text;
    }
    return '';
  };
  const area = find('sublocality_level_1', 'sublocality', 'neighborhood', 'route');
  const city = find('locality', 'administrative_area_level_2');
  const state = find('administrative_area_level_1');
  const rawPin = find('postal_code');
  const postalCode = /^[0-9]{6}$/.test(rawPin) ? rawPin : '';
  const locality = [area, city].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ') || city || state || fallbackLabel;
  return { locality: locality.slice(0, 150), city: city.slice(0, 120), state: state.slice(0, 120), postalCode };
}

/** Ensures `<APIProvider>` is mounted at most once per subtree when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is configured. */
export function VistrahMapsProvider({ children }: { children: ReactNode }) {
  const existing = useContext(APIProviderContext);
  if (!googleMapsWebApiKey || existing) {
    return <>{children}</>;
  }
  return <APIProvider apiKey={googleMapsWebApiKey}>{children}</APIProvider>;
}

function MapViewportSync({ center, radiusKm }: { center: Point; radiusKm?: number }) {
  const map = useMap();
  const prev = useRef<string>('');
  useEffect(() => {
    if (!map || !validPoint(center)) return;
    const key = `${center.latitude.toFixed(5)}:${center.longitude.toFixed(5)}:${radiusKm ?? ''}`;
    if (prev.current === key) return;
    prev.current = key;
    map.panTo({ lat: center.latitude, lng: center.longitude });
  }, [map, center, radiusKm]);
  return null;
}

type BackendPlaceDetailsResponse = {
  place_id: string;
  formatted_address: string;
  locality: string;
  city: string;
  state: string;
  postal_code: string;
  latitude: number;
  longitude: number;
};

type BackendReverseGeocodeResponse = {
  formatted_address: string;
  locality: string;
  city: string;
  state: string;
  postal_code: string;
  latitude: number;
  longitude: number;
};

export async function reverseGeocodePoint(point: Point): Promise<ResolvedPlace | null> {
  try {
    const res = await api<BackendReverseGeocodeResponse>('/maps/reverse-geocode', {
      method: 'POST',
      body: JSON.stringify({ latitude: point.latitude, longitude: point.longitude }),
    });
    if (validPoint(res)) {
      return {
        formattedAddress: res.formatted_address,
        locality: res.locality,
        city: res.city,
        state: res.state,
        postalCode: res.postal_code,
        latitude: res.latitude,
        longitude: res.longitude,
      };
    }
  } catch {
    // Graceful fallback when unauthenticated or server key unset.
  }
  return null;
}

type SuggestionItem = {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
};

function PlaceAutocompleteInner({
  label = 'Search locality, landmark, or address',
  placeholder = 'e.g. Indiranagar, Bengaluru or 560038',
  defaultValue = '',
  disabled = false,
  preferBackendDetails = false,
  onSelectPlace,
}: {
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  preferBackendDetails?: boolean;
  onSelectPlace: (place: ResolvedPlace) => void;
}) {
  const placesLib = useMapsLibrary('places');
  const listId = useId();
  const [inputValue, setInputValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Session token groups all keystrokes + final Place Details lookup into ONE billed session.
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const sessionStringRef = useRef<string>('');
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceNodeRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ensureSession = useCallback(() => {
    if (placesLib && !sessionTokenRef.current) {
      sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
    }
    if (!sessionStringRef.current) {
      const raw = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID().replace(/[^A-Za-z0-9_-]/g, '')
        : `vst_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      sessionStringRef.current = raw;
    }
  }, [placesLib]);

  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
    sessionStringRef.current = '';
  }, []);

  useEffect(() => {
    if (placesLib && !serviceRef.current) {
      serviceRef.current = new placesLib.AutocompleteService();
    }
  }, [placesLib]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const fetchPredictions = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (trimmed.length < 2 || !serviceRef.current || !placesLib) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      ensureSession();
      setLoading(true);
      setStatusMsg('');
      serviceRef.current.getPlacePredictions(
        {
          input: trimmed,
          sessionToken: sessionTokenRef.current ?? undefined,
          componentRestrictions: { country: 'in' },
        },
        (predictions, status) => {
          setLoading(false);
          if (status !== placesLib.PlacesServiceStatus.OK || !predictions?.length) {
            setSuggestions([]);
            setOpen(false);
            return;
          }
          setSuggestions(
            predictions.slice(0, 6).map(p => ({
              placeId: p.place_id,
              mainText: p.structured_formatting?.main_text || p.description,
              secondaryText: p.structured_formatting?.secondary_text || '',
              description: p.description,
            })),
          );
          setOpen(true);
        },
      );
    },
    [ensureSession, placesLib],
  );

  async function selectSuggestion(item: SuggestionItem) {
    setInputValue(item.description);
    setSuggestions([]);
    setOpen(false);
    setLoading(true);
    setStatusMsg('');
    const currentSessionStr = sessionStringRef.current || undefined;
    const currentJsToken = sessionTokenRef.current ?? undefined;
    resetSession();

    try {
      if (preferBackendDetails) {
        try {
          const detail = await api<BackendPlaceDetailsResponse>('/maps/place-details', {
            method: 'POST',
            body: JSON.stringify({ place_id: item.placeId, session_token: currentSessionStr }),
          });
          if (validPoint(detail)) {
            onSelectPlace({
              placeId: detail.place_id,
              formattedAddress: detail.formatted_address || item.description,
              locality: detail.locality || item.mainText,
              city: detail.city,
              state: detail.state,
              postalCode: detail.postal_code,
              latitude: detail.latitude,
              longitude: detail.longitude,
            });
            setLoading(false);
            return;
          }
        } catch {
          // Fall through to browser Places Essentials lookup if server key unset or guest user.
        }
      }

      if (placesLib) {
        if (!placesServiceNodeRef.current && typeof document !== 'undefined') {
          placesServiceNodeRef.current = document.createElement('div');
        }
        if (placesServiceNodeRef.current) {
          const svc = new placesLib.PlacesService(placesServiceNodeRef.current);
          await new Promise<void>((resolve, reject) => {
            svc.getDetails(
              {
                placeId: item.placeId,
                sessionToken: currentJsToken,
                // Essentials-only fields
                fields: ['formatted_address', 'geometry.location', 'address_components'],
              },
              (place, status) => {
                if (status !== placesLib.PlacesServiceStatus.OK || !place?.geometry?.location) {
                  reject(new Error('Could not resolve place coordinates.'));
                  return;
                }
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                const summary = extractAddressSummary(place.address_components, item.mainText);
                onSelectPlace({
                  placeId: item.placeId,
                  formattedAddress: place.formatted_address || item.description,
                  locality: summary.locality || item.mainText,
                  city: summary.city,
                  state: summary.state,
                  postalCode: summary.postalCode,
                  latitude: lat,
                  longitude: lng,
                });
                resolve();
              },
            );
          });
        }
      }
    } catch {
      setStatusMsg('Could not resolve coordinates for that place. Drag the pin or enter coordinates manually.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.autocompleteWrap}>
      {label && (
        <label htmlFor={`${listId}-input`} style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          {label}
        </label>
      )}
      <div className={s.autocompleteInputRow}>
        <input
          id={`${listId}-input`}
          type="search"
          className={s.autocompleteInput}
          placeholder={placeholder}
          value={inputValue}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          onChange={event => {
            const next = event.target.value;
            setInputValue(next);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => fetchPredictions(next), 280);
          }}
          onBlur={() => {
            setTimeout(() => setOpen(false), 180);
          }}
        />
      </div>
      {loading && (
        <small role="status" style={{ display: 'block', marginTop: 4, color: 'var(--text-secondary)' }}>
          Looking up places…
        </small>
      )}
      {statusMsg && (
        <small role="alert" style={{ display: 'block', marginTop: 4, color: '#b45309' }}>
          {statusMsg}
        </small>
      )}
      {open && suggestions.length > 0 && (
        <ul id={listId} role="listbox" className={s.suggestionsList}>
          {suggestions.map(item => (
            <li key={item.placeId} role="option" aria-selected={false}>
              <button
                type="button"
                className={s.suggestionBtn}
                onMouseDown={e => e.preventDefault()}
                onClick={() => void selectSuggestion(item)}
              >
                <span className={s.suggestionMain}>{item.mainText}</span>
                {item.secondaryText && <span className={s.suggestionSecondary}>{item.secondaryText}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Session-based Google Places Autocomplete input with graceful local-dev fallback
 * when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is unset.
 */
export function PlaceAutocompleteInput(props: {
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  preferBackendDetails?: boolean;
  onSelectPlace: (place: ResolvedPlace) => void;
}) {
  const fallbackId = useId();
  const [fallbackQuery, setFallbackQuery] = useState(props.defaultValue ?? '');
  const [fallbackBusy, setFallbackBusy] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState('');

  if (!googleMapsWebApiKey) {
    async function tryServerLookup() {
      if (fallbackQuery.trim().length < 2) return;
      setFallbackBusy(true);
      setFallbackNotice('');
      try {
        const res = await api<{ items: Array<{ latitude: number; longitude: number; label: string; postal_code: string }> }>(
          '/locations/geocode',
          { method: 'POST', body: JSON.stringify({ query: fallbackQuery.trim() }) },
        );
        const first = res.items?.[0];
        if (first && validPoint(first)) {
          props.onSelectPlace({
            formattedAddress: first.label,
            locality: first.label,
            city: first.label,
            state: '',
            postalCode: first.postal_code || '',
            latitude: first.latitude,
            longitude: first.longitude,
          });
          setFallbackNotice(`Selected ${first.label}.`);
        } else {
          setFallbackNotice('No match found. Click or drag the map pin or enter coordinates below.');
        }
      } catch {
        setFallbackNotice('Google Places key not set in local dev — click/drag the map pin or enter coordinates manually.');
      } finally {
        setFallbackBusy(false);
      }
    }

    return (
      <div className={s.autocompleteWrap}>
        {props.label && (
          <label htmlFor={fallbackId} style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            {props.label}
          </label>
        )}
        <div className={s.autocompleteInputRow}>
          <input
            id={fallbackId}
            type="search"
            className={s.autocompleteInput}
            placeholder={props.placeholder ?? 'Enter locality or area (manual fallback active)'}
            value={fallbackQuery}
            disabled={props.disabled || fallbackBusy}
            onChange={e => setFallbackQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void tryServerLookup();
              }
            }}
          />
          <button
            type="button"
            className="button secondary"
            disabled={props.disabled || fallbackBusy || fallbackQuery.trim().length < 2}
            onClick={() => void tryServerLookup()}
          >
            <Search size={15} aria-hidden="true" /> Search
          </button>
        </div>
        {fallbackNotice && (
          <small role="status" style={{ display: 'block', marginTop: 4, color: 'var(--text-secondary)' }}>
            {fallbackNotice}
          </small>
        )}
      </div>
    );
  }

  return (
    <VistrahMapsProvider>
      <PlaceAutocompleteInner {...props} />
    </VistrahMapsProvider>
  );
}

const DEFAULT_INDIA_CENTER: Point = { latitude: 12.9716, longitude: 77.5946 };

export function VistrahMap({
  center,
  radiusKm,
  markers = [],
  selectedId = null,
  editable = false,
  disabled = false,
  height = 360,
  autoReverseGeocode = false,
  onPinChange,
  onResolvedAddress,
  onViewCenterChange,
  onSelectMarker,
  ariaLabel = 'VISTRAH interactive Google Map',
}: {
  center: Point;
  radiusKm?: number;
  markers?: VistrahMapMarker[];
  selectedId?: string | number | null;
  editable?: boolean;
  disabled?: boolean;
  height?: number;
  autoReverseGeocode?: boolean;
  onPinChange?: (point: Point) => void;
  onResolvedAddress?: (place: ResolvedPlace) => void;
  onViewCenterChange?: (point: Point) => void;
  onSelectMarker?: (id: string | number) => void;
  ariaLabel?: string;
}) {
  const safeCenter = validPoint(center) ? center : DEFAULT_INDIA_CENTER;
  const [activeMarkerId, setActiveMarkerId] = useState<string | number | null>(selectedId);
  const [reverseBusy, setReverseBusy] = useState(false);

  useEffect(() => {
    if (selectedId !== undefined) setActiveMarkerId(selectedId);
  }, [selectedId]);

  const activeMarker = useMemo(
    () => markers.find(m => m.id === activeMarkerId) ?? null,
    [markers, activeMarkerId],
  );

  const centerIcon = useMemo(() => svgMarkerDataUrl('center'), []);
  const itemIcon = useMemo(() => svgMarkerDataUrl('item'), []);
  const selectedIcon = useMemo(() => svgMarkerDataUrl('selected'), []);

  const handlePinUpdate = useCallback(
    async (nextPoint: Point) => {
      if (disabled || !editable) return;
      const rounded = {
        latitude: Number(nextPoint.latitude.toFixed(6)),
        longitude: Number(nextPoint.longitude.toFixed(6)),
      };
      onPinChange?.(rounded);
      if (autoReverseGeocode && onResolvedAddress) {
        setReverseBusy(true);
        try {
          const resolved = await reverseGeocodePoint(rounded);
          if (resolved) onResolvedAddress(resolved);
        } finally {
          setReverseBusy(false);
        }
      }
    },
    [autoReverseGeocode, disabled, editable, onPinChange, onResolvedAddress],
  );

  const defaultZoom = useMemo(() => {
    if (!radiusKm || radiusKm <= 2) return 14;
    if (radiusKm <= 5) return 13;
    if (radiusKm <= 12) return 12;
    if (radiusKm <= 30) return 11;
    return 9;
  }, [radiusKm]);

  // Graceful local-dev fallback when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is unset
  if (!googleMapsWebApiKey) {
    const legacyItems: NearbyProvider[] = markers
      .filter((m): m is VistrahMapMarker & { id: number } => typeof m.id === 'number')
      .map(m => ({
        id: m.id,
        slug: String(m.id),
        name: m.title,
        company: m.title,
        location: m.subtitle ?? '',
        verification_status: 'VERIFIED',
        latitude: m.latitude,
        longitude: m.longitude,
        description: m.description ?? '',
        distance_km: m.distanceKm ?? 0,
      }));

    return (
      <div className={s.mapShell} style={{ ['--vistrah-map-height' as string]: `${height}px` }}>
        <div className={s.fallbackBanner}>
          <span>
            <MapPin size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} aria-hidden="true" />
            Interactive fallback map active (<code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> unset in this environment).
          </span>
          <a
            href={googleMapsDirectionsHref(safeCenter.latitude, safeCenter.longitude)}
            target="_blank"
            rel="noopener noreferrer"
            className={s.infoSecondaryLink}
          >
            Open in Google Maps <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>
        <LocationMap
          point={safeCenter}
          items={legacyItems}
          selectedId={typeof activeMarkerId === 'number' ? activeMarkerId : null}
          onPin={p => {
            if (editable && !disabled) void handlePinUpdate(p);
          }}
          onView={p => onViewCenterChange?.(p)}
          onSelect={id => {
            setActiveMarkerId(id);
            onSelectMarker?.(id);
          }}
        />
        {activeMarker && (
          <div className={s.mapToolbar}>
            <div>
              <strong>{activeMarker.title}</strong>
              {activeMarker.subtitle ? ` · ${activeMarker.subtitle}` : ''}
              {typeof activeMarker.distanceKm === 'number' ? ` · ${activeMarker.distanceKm.toFixed(2)} km` : ''}
            </div>
            <div className={s.infoActions} style={{ marginTop: 0 }}>
              {activeMarker.actionHref && (
                <Link href={activeMarker.actionHref} className={s.infoPrimaryBtn}>
                  {activeMarker.actionLabel || 'View details'}
                </Link>
              )}
              {activeMarker.onAction && (
                <button type="button" className={s.infoPrimaryBtn} onClick={activeMarker.onAction}>
                  {activeMarker.actionLabel || 'Open'}
                </button>
              )}
              <a
                href={googleMapsDirectionsHref(activeMarker.latitude, activeMarker.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className={s.infoSecondaryLink}
              >
                Open in Google Maps <ExternalLink size={12} aria-hidden="true" />
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <VistrahMapsProvider>
      <div className={s.mapShell} style={{ ['--vistrah-map-height' as string]: `${height}px` }} aria-label={ariaLabel}>
        <div className={s.mapToolbar}>
          <div className={s.legendGroup}>
            <span className={s.legendItem}>
              <span className={s.dotGold} aria-hidden="true" />
              {editable ? 'Drag or click map to set pin' : 'Your search center'}
              {radiusKm ? ` (${radiusKm} km radius)` : ''}
            </span>
            {markers.length > 0 && (
              <span className={s.legendItem}>
                <span className={s.dotNavy} aria-hidden="true" />
                {markers.length} {markers.length === 1 ? 'nearby pin' : 'nearby pins'}
              </span>
            )}
            {reverseBusy && <span role="status">Resolving pin address…</span>}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {editable && onResolvedAddress && (
              <button
                type="button"
                className={s.infoSecondaryLink}
                disabled={disabled || reverseBusy}
                onClick={() => {
                  void (async () => {
                    setReverseBusy(true);
                    try {
                      const resolved = await reverseGeocodePoint(safeCenter);
                      if (resolved) onResolvedAddress(resolved);
                    } finally {
                      setReverseBusy(false);
                    }
                  })();
                }}
              >
                <LocateFixed size={12} aria-hidden="true" /> Resolve pin address
              </button>
            )}
            <a
              href={googleMapsDirectionsHref(safeCenter.latitude, safeCenter.longitude)}
              target="_blank"
              rel="noopener noreferrer"
              className={s.infoSecondaryLink}
            >
              Open in Google Maps <ExternalLink size={12} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className={s.mapCanvas}>
          <GoogleMapCanvas
            defaultCenter={{ lat: safeCenter.latitude, lng: safeCenter.longitude }}
            defaultZoom={defaultZoom}
            gestureHandling="cooperative"
            streetViewControl={false}
            mapTypeControl={false}
            fullscreenControl={true}
            onClick={event => {
              if (!editable || disabled) return;
              const latLng = event.detail?.latLng;
              if (latLng) {
                void handlePinUpdate({ latitude: latLng.lat, longitude: latLng.lng });
              }
            }}
            onCameraChanged={event => {
              const c = event.detail?.center;
              if (c) onViewCenterChange?.({ latitude: c.lat, longitude: c.lng });
            }}
          >
            <MapViewportSync center={safeCenter} radiusKm={radiusKm} />

            {typeof radiusKm === 'number' && radiusKm > 0 && (
              <Circle
                center={{ lat: safeCenter.latitude, lng: safeCenter.longitude }}
                radius={radiusKm * 1000}
                strokeColor="#0f172a"
                strokeOpacity={0.55}
                strokeWeight={1.5}
                fillColor="#d4af37"
                fillOpacity={0.12}
                clickable={false}
              />
            )}

            <Marker
              position={{ lat: safeCenter.latitude, lng: safeCenter.longitude }}
              draggable={editable && !disabled}
              title={editable ? 'Drag to position exact pin' : 'Selected search location'}
              icon={centerIcon}
              onDragEnd={event => {
                const ll = event.latLng;
                if (ll) {
                  void handlePinUpdate({ latitude: ll.lat(), longitude: ll.lng() });
                }
              }}
            />

            {markers.map(marker => {
              const isSelected = marker.id === activeMarkerId;
              return (
                <Marker
                  key={marker.id}
                  position={{ lat: marker.latitude, lng: marker.longitude }}
                  title={marker.title}
                  icon={isSelected ? selectedIcon : itemIcon}
                  onClick={() => {
                    setActiveMarkerId(marker.id);
                    onSelectMarker?.(marker.id);
                  }}
                />
              );
            })}

            {activeMarker && (
              <InfoWindow
                position={{ lat: activeMarker.latitude, lng: activeMarker.longitude }}
                onCloseClick={() => setActiveMarkerId(null)}
              >
                <div className={s.infoCard}>
                  {activeMarker.badge && <span className={s.infoBadge}>{activeMarker.badge}</span>}
                  <h4 className={s.infoTitle}>{activeMarker.title}</h4>
                  {activeMarker.subtitle && <p className={s.infoSubtitle}>{activeMarker.subtitle}</p>}
                  {typeof activeMarker.distanceKm === 'number' && (
                    <p className={s.infoDistance}>{activeMarker.distanceKm.toFixed(2)} km away</p>
                  )}
                  {activeMarker.description && <p className={s.infoSubtitle}>{activeMarker.description}</p>}
                  <div className={s.infoActions}>
                    {activeMarker.actionHref && (
                      <Link href={activeMarker.actionHref} className={s.infoPrimaryBtn}>
                        {activeMarker.actionLabel || 'View details'}
                      </Link>
                    )}
                    {activeMarker.onAction && (
                      <button type="button" className={s.infoPrimaryBtn} onClick={activeMarker.onAction}>
                        {activeMarker.actionLabel || 'Watch Reel'}
                      </button>
                    )}
                    <a
                      href={googleMapsDirectionsHref(activeMarker.latitude, activeMarker.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={s.infoSecondaryLink}
                    >
                      Open in Google Maps <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMapCanvas>
        </div>
      </div>
    </VistrahMapsProvider>
  );
}

export function MapListViewToggle({
  mode,
  onChange,
  mapLabel = 'Map view',
  listLabel = 'List view',
}: {
  mode: 'list' | 'map' | 'split';
  onChange: (next: 'list' | 'map' | 'split') => void;
  mapLabel?: string;
  listLabel?: string;
}) {
  return (
    <div className={s.viewToggle} role="group" aria-label="View mode">
      <button
        type="button"
        className={`${s.viewToggleBtn} ${mode === 'split' ? s.viewToggleBtnActive : ''}`}
        aria-pressed={mode === 'split'}
        onClick={() => onChange('split')}
      >
        Map + List
      </button>
      <button
        type="button"
        className={`${s.viewToggleBtn} ${mode === 'map' ? s.viewToggleBtnActive : ''}`}
        aria-pressed={mode === 'map'}
        onClick={() => onChange('map')}
      >
        {mapLabel}
      </button>
      <button
        type="button"
        className={`${s.viewToggleBtn} ${mode === 'list' ? s.viewToggleBtnActive : ''}`}
        aria-pressed={mode === 'list'}
        onClick={() => onChange('list')}
      >
        {listLabel}
      </button>
    </div>
  );
}
