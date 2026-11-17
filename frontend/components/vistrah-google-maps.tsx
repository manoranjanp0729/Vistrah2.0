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
import { ChevronDown, ChevronUp, ExternalLink, LocateFixed, MapPin, Navigation, Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import { requestGps, validPoint, type NearbyProvider, type Point } from '@/lib/location';
import {
  CUSTOMER_SEARCH_RADII,
  KARNATAKA_QUICK_CITIES,
  SELLER_COVERAGE_RADII,
  presetToSelectedLocation,
  type QuickCityPreset,
  type SelectedLocation,
} from '../../shared/selected-location';
import {
  GOOGLE_WORDMARK_PATHS,
  GOOGLE_WORDMARK_VIEWBOX,
  googleWordmarkDimensions,
} from '../../shared/google-attribution';
import { LocationMap } from './location-map';
import s from './vistrah-google-maps.module.css';

export function GoogleWordmark({
  height = 14,
  monochromeColor,
  className,
}: {
  height?: number;
  monochromeColor?: string;
  className?: string;
}) {
  const { width, height: h } = googleWordmarkDimensions(height);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={h}
      viewBox={GOOGLE_WORDMARK_VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Google"
      className={className}
    >
      {GOOGLE_WORDMARK_PATHS.map((p, idx) => (
        <path key={idx} fill={monochromeColor ?? p.color} d={p.d} />
      ))}
    </svg>
  );
}

export function PoweredByGoogleAttribution({
  lightSurface = false,
}: {
  lightSurface?: boolean;
}) {
  return (
    <div
      className={s.poweredByFooter}
      aria-label="Powered by Google"
      data-google-attribution="powered-by-google"
    >
      <span>Powered by</span>
      <GoogleWordmark height={14} className={s.wordmarkColor} />
      {!lightSurface && (
        <GoogleWordmark height={14} monochromeColor="#FFFFFF" className={s.wordmarkMonoWhite} />
      )}
    </div>
  );
}

export function GoogleMapLogoBadge() {
  return (
    <div
      className={s.fallbackGoogleBadge}
      aria-label="Google"
      data-google-map-logo="bottom-left"
    >
      <GoogleWordmark height={15} />
    </div>
  );
}

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

function MapViewportSync({
  center,
  radiusKm,
  padding,
}: {
  center: Point;
  radiusKm?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
}) {
  const map = useMap();
  const prev = useRef<string>('');
  useEffect(() => {
    if (!map || !padding) return;
    (map as unknown as { setOptions: (opts: { padding: { top: number; right: number; bottom: number; left: number } }) => void }).setOptions({ padding });
  }, [map, padding]);
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
    const qs = new URLSearchParams({
      lat: String(point.latitude),
      lng: String(point.longitude),
    });
    const res = await api<BackendReverseGeocodeResponse>(`/maps/reverse-geocode?${qs.toString()}`);
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
    try {
      const pub = await api<{ items: Array<{ latitude: number; longitude: number; label: string; postal_code: string }> }>(
        '/locations/geocode',
        { method: 'POST', body: JSON.stringify({ latitude: point.latitude, longitude: point.longitude }) },
      );
      const top = pub.items?.[0];
      if (top && validPoint(top)) {
        return {
          formattedAddress: top.label,
          locality: top.label,
          city: top.label.split(',').pop()?.trim() || '',
          state: '',
          postalCode: top.postal_code || '',
          latitude: point.latitude,
          longitude: point.longitude,
        };
      }
    } catch {
      // Graceful silent fallback when offline or unconfigured.
    }
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
  label,
  placeholder = 'Search area, street, landmark, or PIN code...',
  defaultValue = '',
  disabled = false,
  preferBackendDetails = false,
  floating = false,
  onSelectPlace,
}: {
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  preferBackendDetails?: boolean;
  floating?: boolean;
  onSelectPlace: (place: ResolvedPlace) => void;
}) {
  const placesLib = useMapsLibrary('places');
  const listId = useId();
  const [inputValue, setInputValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

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
    async (query: string) => {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      ensureSession();
      setLoading(true);
      setStatusMsg('');

      if (serviceRef.current && placesLib) {
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
        return;
      }

      // Server autocomplete fallback if browser places library has not finished initializing
      try {
        const qs = new URLSearchParams({
          q: trimmed,
          ...(sessionStringRef.current ? { session_token: sessionStringRef.current } : {}),
        });
        const res = await api<{ suggestions: Array<{ place_id: string; main_text: string; secondary_text: string; description: string }> }>(
          `/maps/autocomplete?${qs.toString()}`,
        );
        const rows = (res.suggestions ?? []).map(item => ({
          placeId: item.place_id,
          mainText: item.main_text,
          secondaryText: item.secondary_text,
          description: item.description,
        }));
        setSuggestions(rows);
        setOpen(rows.length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
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
          const qs = new URLSearchParams({
            place_id: item.placeId,
            ...(currentSessionStr ? { session_token: currentSessionStr } : {}),
          });
          const detail = await api<BackendPlaceDetailsResponse>(`/maps/place-details?${qs.toString()}`);
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
          // Fall through to browser Places Essentials lookup if guest user or server key unset.
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
          return;
        }
      }

      // Final geocode fallback by description
      const fallback = await api<{ items: Array<{ latitude: number; longitude: number; label: string; postal_code: string }> }>(
        '/locations/geocode',
        { method: 'POST', body: JSON.stringify({ query: item.description }) },
      );
      const hit = fallback.items?.[0];
      if (hit && validPoint(hit)) {
        onSelectPlace({
          placeId: item.placeId,
          formattedAddress: item.description,
          locality: hit.label || item.mainText,
          city: hit.label.split(',').pop()?.trim() || '',
          state: '',
          postalCode: hit.postal_code || '',
          latitude: hit.latitude,
          longitude: hit.longitude,
        });
      }
    } catch {
      setStatusMsg('Could not resolve coordinates for that place. Pan the map pin or select a city chip.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.autocompleteWrap}>
      {label && !floating && (
        <label htmlFor={`${listId}-input`} style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          {label}
        </label>
      )}
      <div className={floating ? s.floatingSearchInner : s.autocompleteInputRow}>
        {floating && <Search size={16} color="#475569" aria-hidden="true" />}
        <input
          id={`${listId}-input`}
          type="search"
          aria-label={label || 'Search area, street, landmark, or PIN code'}
          className={floating ? s.floatingSearchInput : s.autocompleteInput}
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
            debounceRef.current = setTimeout(() => {
              void fetchPredictions(next);
            }, 260);
          }}
          onBlur={() => {
            setTimeout(() => setOpen(false), 180);
          }}
        />
        {inputValue && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setInputValue('');
              setSuggestions([]);
              setOpen(false);
            }}
            style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 4, display: 'inline-flex', color: '#64748b' }}
          >
            <X size={15} />
          </button>
        )}
      </div>
      {loading && !floating && (
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
        <div className={`${s.suggestionsPopover} ${floating ? s.suggestionsPopoverLight : s.suggestionsPopoverAuto}`}>
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
          <PoweredByGoogleAttribution lightSurface={floating} />
        </div>
      )}
    </div>
  );
}

/**
 * Session-based Google Places Autocomplete input with graceful server/manual fallback
 * when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is unset.
 */
export function PlaceAutocompleteInput(props: {
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  preferBackendDetails?: boolean;
  floating?: boolean;
  onSelectPlace: (place: ResolvedPlace) => void;
}) {
  const fallbackId = useId();
  const [fallbackQuery, setFallbackQuery] = useState(props.defaultValue ?? '');
  const [fallbackSuggestions, setFallbackSuggestions] = useState<SuggestionItem[]>([]);
  const [fallbackBusy, setFallbackBusy] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!googleMapsWebApiKey) {
    async function fetchServerAutocomplete(q: string) {
      if (q.trim().length < 2) {
        setFallbackSuggestions([]);
        return;
      }
      try {
        const qs = new URLSearchParams({ q: q.trim() });
        const res = await api<{ suggestions: Array<{ place_id: string; main_text: string; secondary_text: string; description: string }> }>(
          `/maps/autocomplete?${qs.toString()}`,
        );
        setFallbackSuggestions(
          (res.suggestions ?? []).map(item => ({
            placeId: item.place_id,
            mainText: item.main_text,
            secondaryText: item.secondary_text,
            description: item.description,
          })),
        );
      } catch {
        setFallbackSuggestions([]);
      }
    }

    async function tryServerLookup(queryText: string) {
      if (queryText.trim().length < 2) return;
      setFallbackBusy(true);
      setFallbackNotice('');
      setFallbackSuggestions([]);
      try {
        const res = await api<{ items: Array<{ latitude: number; longitude: number; label: string; postal_code: string }> }>(
          '/locations/geocode',
          { method: 'POST', body: JSON.stringify({ query: queryText.trim() }) },
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
          setFallbackNotice('');
        } else {
          setFallbackNotice('No match found. Tap a city chip or pan the map pin.');
        }
      } catch {
        setFallbackNotice('Tap a city chip above, adjust the map pin, or edit street/PIN below.');
      } finally {
        setFallbackBusy(false);
      }
    }

    return (
      <div className={s.autocompleteWrap}>
        {props.label && !props.floating && (
          <label htmlFor={fallbackId} style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            {props.label}
          </label>
        )}
        <div className={props.floating ? s.floatingSearchInner : s.autocompleteInputRow}>
          {props.floating && <Search size={16} color="#475569" aria-hidden="true" />}
          <input
            id={fallbackId}
            type="search"
            aria-label={props.label || 'Search area, street, landmark, or PIN code'}
            className={props.floating ? s.floatingSearchInput : s.autocompleteInput}
            placeholder={props.placeholder ?? 'Search area, street, landmark, or PIN code...'}
            value={fallbackQuery}
            disabled={props.disabled || fallbackBusy}
            onChange={e => {
              const v = e.target.value;
              setFallbackQuery(v);
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => void fetchServerAutocomplete(v), 280);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void tryServerLookup(fallbackQuery);
              }
            }}
          />
          {!props.floating && (
            <button
              type="button"
              className="button secondary"
              disabled={props.disabled || fallbackBusy || fallbackQuery.trim().length < 2}
              onClick={() => void tryServerLookup(fallbackQuery)}
            >
              <Search size={15} aria-hidden="true" /> Search
            </button>
          )}
        </div>
        {fallbackSuggestions.length > 0 && (
          <div className={`${s.suggestionsPopover} ${props.floating ? s.suggestionsPopoverLight : s.suggestionsPopoverAuto}`}>
            <ul role="listbox" className={s.suggestionsList}>
              {fallbackSuggestions.map(item => (
                <li key={item.placeId} role="option" aria-selected={false}>
                  <button
                    type="button"
                    className={s.suggestionBtn}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      setFallbackQuery(item.description);
                      void tryServerLookup(item.description);
                    }}
                  >
                    <span className={s.suggestionMain}>{item.mainText}</span>
                    {item.secondaryText && <span className={s.suggestionSecondary}>{item.secondaryText}</span>}
                  </button>
                </li>
              ))}
            </ul>
            <PoweredByGoogleAttribution lightSurface={Boolean(props.floating)} />
          </div>
        )}
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
            Interactive fallback map active.
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
            <MapViewportSync
              center={safeCenter}
              radiusKm={radiusKm}
              padding={{ top: 8, right: 8, bottom: 8, left: 8 }}
            />

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

/**
 * Modern Map-First Pin-Drop + Floating Search + Quick Karnataka City Chips + Bottom Confirmation Card.
 * Maintains a single canonical `SelectedLocation` state so map pans, search, GPS, and manual edits
 * never drift out of sync.
 */
export function MapFirstLocationPicker({
  value,
  onChange,
  onConfirm,
  onQuickCommit,
  confirmLabel = 'Confirm Location',
  mode = 'customer',
  radiusOptions,
  disabled = false,
  busy = false,
  preferBackendDetails = false,
  extraFields,
  secondaryActions,
}: {
  value: SelectedLocation;
  onChange: (next: SelectedLocation) => void;
  onConfirm?: (confirmed: SelectedLocation) => void;
  onQuickCommit?: (committed: SelectedLocation) => void;
  confirmLabel?: string;
  mode?: 'customer' | 'seller';
  radiusOptions?: readonly number[];
  disabled?: boolean;
  busy?: boolean;
  preferBackendDetails?: boolean;
  extraFields?: ReactNode;
  secondaryActions?: ReactNode;
}) {
  const radiiList = radiusOptions ?? (mode === 'seller' ? SELLER_COVERAGE_RADII : CUSTOMER_SEARCH_RADII);
  const safePoint: Point = validPoint(value) ? { latitude: value.latitude, longitude: value.longitude } : DEFAULT_INDIA_CENTER;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [resolvingPin, setResolvingPin] = useState(false);
  const [gpsRecoveryMsg, setGpsRecoveryMsg] = useState('');

  const programmaticPanUntilRef = useRef<number>(0);
  const pendingIdleCenterRef = useRef<Point | null>(null);
  const latestValueRef = useRef(value);
  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  const defaultZoom = useMemo(() => {
    const r = value.radiusKm;
    if (!r || r <= 2) return 14;
    if (r <= 5) return 13;
    if (r <= 12) return 12;
    if (r <= 30) return 11;
    return 10;
  }, [value.radiusKm]);

  const applyPointAndResolve = useCallback(
    async (point: Point, sourceKind: SelectedLocation['source'] = 'google') => {
      const roundedLat = Number(point.latitude.toFixed(6));
      const roundedLon = Number(point.longitude.toFixed(6));
      const cur = latestValueRef.current;
      if (Math.abs(cur.latitude - roundedLat) < 0.00004 && Math.abs(cur.longitude - roundedLon) < 0.00004) {
        return;
      }
      setResolvingPin(true);
      try {
        const resolved = await reverseGeocodePoint({ latitude: roundedLat, longitude: roundedLon });
        const latest = latestValueRef.current;
        if (resolved) {
          onChange({
            ...latest,
            latitude: roundedLat,
            longitude: roundedLon,
            locality: resolved.locality || latest.locality || 'Pinned location',
            formattedAddress: resolved.formattedAddress || resolved.locality || latest.formattedAddress,
            city: resolved.city || latest.city,
            state: resolved.state || latest.state,
            pincode: resolved.postalCode || latest.pincode,
            source: sourceKind,
          });
        } else {
          onChange({
            ...latest,
            latitude: roundedLat,
            longitude: roundedLon,
            locality: latest.locality || `${roundedLat.toFixed(4)}, ${roundedLon.toFixed(4)}`,
            formattedAddress: latest.formattedAddress || `Pinned at ${roundedLat.toFixed(4)}, ${roundedLon.toFixed(4)}`,
            source: sourceKind,
          });
        }
      } finally {
        setResolvingPin(false);
      }
    },
    [onChange],
  );

  function selectQuickCity(preset: QuickCityPreset) {
    if (disabled || busy) return;
    setGpsRecoveryMsg('');
    programmaticPanUntilRef.current = Date.now() + 1200;
    const committed = presetToSelectedLocation(preset, value.radiusKm, value.landmark);
    onChange(committed);
    onQuickCommit?.(committed);
  }

  async function triggerCurrentGps() {
    if (disabled || busy || gpsBusy) return;
    setGpsBusy(true);
    setGpsRecoveryMsg('');
    try {
      const fix = await requestGps(typeof navigator !== 'undefined' ? navigator.geolocation : undefined);
      programmaticPanUntilRef.current = Date.now() + 1400;
      const resolved = await reverseGeocodePoint(fix.point);
      const roundedLat = Number(fix.point.latitude.toFixed(6));
      const roundedLon = Number(fix.point.longitude.toFixed(6));
      const fallbackLabel = `${roundedLat.toFixed(3)}° N, ${roundedLon.toFixed(3)}° E`;
      const committed: SelectedLocation = {
        ...latestValueRef.current,
        latitude: roundedLat,
        longitude: roundedLon,
        locality: resolved?.locality || fallbackLabel,
        formattedAddress: resolved?.formattedAddress || `GPS (${Math.round(fix.accuracy)}m accuracy)`,
        city: resolved?.city || '',
        state: resolved?.state || '',
        pincode: resolved?.postalCode || '',
        source: 'gps',
      };
      onChange(committed);
      onQuickCommit?.(committed);
    } catch {
      setGpsRecoveryMsg(
        'Location permission was denied or GPS timed out. Tap a Karnataka city chip above, pan the map pin, or edit your street / PIN below.',
      );
      setDrawerOpen(true);
    } finally {
      setGpsBusy(false);
    }
  }

  const activeCityId = useMemo(() => {
    const hit = KARNATAKA_QUICK_CITIES.find(
      c => Math.abs(c.latitude - safePoint.latitude) < 0.03 && Math.abs(c.longitude - safePoint.longitude) < 0.03,
    );
    return hit?.id ?? '';
  }, [safePoint.latitude, safePoint.longitude]);

  return (
    <div className={s.stageCard}>
      <div className={s.stageMapViewport}>
        {/* Floating Top Search + Quick-Select Karnataka City Chips */}
        <div className={s.floatingTopBar}>
          <div className={s.floatingSearchBox}>
            <PlaceAutocompleteInput
              floating
              placeholder="Search area, street, landmark, or PIN code..."
              disabled={disabled || busy}
              preferBackendDetails={preferBackendDetails}
              onSelectPlace={place => {
                setGpsRecoveryMsg('');
                programmaticPanUntilRef.current = Date.now() + 1200;
                const committed: SelectedLocation = {
                  ...latestValueRef.current,
                  latitude: Number(place.latitude.toFixed(6)),
                  longitude: Number(place.longitude.toFixed(6)),
                  locality: place.locality || place.city || 'Selected area',
                  formattedAddress: place.formattedAddress || place.locality,
                  city: place.city,
                  state: place.state,
                  pincode: place.postalCode || latestValueRef.current.pincode,
                  source: 'google',
                };
                onChange(committed);
                onQuickCommit?.(committed);
              }}
            />
          </div>

          <div className={s.cityChipRail} role="group" aria-label="Quick select Karnataka cities">
            {KARNATAKA_QUICK_CITIES.map(city => (
              <button
                key={city.id}
                type="button"
                disabled={disabled || busy}
                className={`${s.cityChip} ${activeCityId === city.id ? s.cityChipActive : ''}`}
                onClick={() => selectQuickCity(city)}
              >
                {city.label}
              </button>
            ))}
          </div>
        </div>

        {/* Map Canvas or Graceful Fallback */}
        {googleMapsWebApiKey ? (
          <VistrahMapsProvider>
            <GoogleMapCanvas
              style={{ width: '100%', height: '100%' }}
              defaultCenter={{ lat: safePoint.latitude, lng: safePoint.longitude }}
              defaultZoom={defaultZoom}
              gestureHandling="greedy"
              streetViewControl={false}
              mapTypeControl={false}
              fullscreenControl={false}
              clickableIcons={false}
              onClick={event => {
                if (disabled || busy) return;
                const ll = event.detail?.latLng;
                if (ll) {
                  programmaticPanUntilRef.current = Date.now() + 900;
                  void applyPointAndResolve({ latitude: ll.lat, longitude: ll.lng }, 'google');
                }
              }}
              onCameraChanged={event => {
                const c = event.detail?.center;
                if (c) pendingIdleCenterRef.current = { latitude: c.lat, longitude: c.lng };
              }}
              onIdle={() => {
                if (disabled || busy || Date.now() < programmaticPanUntilRef.current) return;
                const nextCenter = pendingIdleCenterRef.current;
                if (nextCenter) {
                  void applyPointAndResolve(nextCenter, 'google');
                }
              }}
            >
              <MapViewportSync
                center={safePoint}
                radiusKm={value.radiusKm}
                padding={{ top: 96, right: 12, bottom: 8, left: 8 }}
              />
              {value.radiusKm > 0 && (
                <Circle
                  center={{ lat: safePoint.latitude, lng: safePoint.longitude }}
                  radius={value.radiusKm * 1000}
                  strokeColor="#0f172a"
                  strokeOpacity={0.6}
                  strokeWeight={1.5}
                  fillColor="#d4af37"
                  fillOpacity={0.13}
                  clickable={false}
                />
              )}
            </GoogleMapCanvas>

            {/* Center-Locked VISTRAH Navy & Gold Pin */}
            <div className={s.centerPinOverlay} aria-hidden="true">
              <span className={s.centerPinTooltip}>
                {resolvingPin ? 'Locating pin…' : mode === 'seller' ? 'Move map to place business pin' : 'Move map to adjust pin'}
              </span>
              <svg width="40" height="48" viewBox="0 0 36 44">
                <path
                  d="M18 2C9.716 2 3 8.716 3 17c0 10.75 15 25 15 25s15-14.25 15-25c0-8.284-6.716-15-15-15z"
                  fill="#0f172a"
                  stroke="#d4af37"
                  strokeWidth="2.5"
                />
                <circle cx="18" cy="17" r="6" fill="#d4af37" />
              </svg>
            </div>
          </VistrahMapsProvider>
        ) : (
          <div className={s.fallbackMapWrap}>
            <LocationMap
              point={safePoint}
              onPin={p => {
                if (!disabled && !busy) void applyPointAndResolve(p, 'manual');
              }}
              onView={() => {}}
              onSelect={() => {}}
            />
            {value.source === 'google' && <GoogleMapLogoBadge />}
          </div>
        )}

        {/* Floating Use Current GPS Button */}
        <button
          type="button"
          className={s.floatingGpsBtn}
          disabled={disabled || busy || gpsBusy}
          onClick={() => void triggerCurrentGps()}
        >
          <Navigation size={15} aria-hidden="true" />
          {gpsBusy ? 'Detecting GPS…' : 'Use Current GPS'}
        </button>
      </div>

      {/* Bottom Confirmation Card */}
      <div className={s.bottomCard}>
        {gpsRecoveryMsg && (
          <div role="alert" className={s.recoveryAlert}>
            {gpsRecoveryMsg}
          </div>
        )}

        <div className={s.resolvedRow}>
          <div className={s.resolvedMain}>
            <span className={s.pinIconBadge} aria-hidden="true">
              <MapPin size={18} />
            </span>
            <div>
              <h3 className={s.resolvedTitle}>
                {resolvingPin ? 'Updating locality…' : value.locality || 'Select your area on the map'}
              </h3>
              <p className={s.resolvedAddress}>
                {value.formattedAddress || 'Pan the map, search an address, or tap a city chip above.'}
              </p>
              <div className={s.metaPills}>
                {value.pincode && <span className={s.metaPill}>PIN {value.pincode}</span>}
                <span className={s.metaPill}>{value.radiusKm} km {mode === 'seller' ? 'coverage' : 'radius'}</span>
                <span className={s.metaPill}>
                  {safePoint.latitude.toFixed(4)}° N, {safePoint.longitude.toFixed(4)}° E
                </span>
              </div>
            </div>
          </div>

          <a
            href={googleMapsDirectionsHref(safePoint.latitude, safePoint.longitude)}
            target="_blank"
            rel="noopener noreferrer"
            className={s.infoSecondaryLink}
          >
            Open in Google Maps <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>

        {/* Segmented Radius Selector */}
        <div className={s.radiusRow}>
          <span className={s.radiusLabel}>
            {mode === 'seller' ? 'Service / Ad Coverage Radius' : 'Nearby Search Radius'}
          </span>
          <div className={s.segmentedGroup} role="group" aria-label="Coverage radius">
            {radiiList.map(km => (
              <button
                key={km}
                type="button"
                disabled={disabled || busy}
                aria-pressed={value.radiusKm === km}
                className={`${s.segmentBtn} ${value.radiusKm === km ? s.segmentBtnActive : ''}`}
                onClick={() => onChange({ ...value, radiusKm: km })}
              >
                {km} km
              </button>
            ))}
          </div>
        </div>

        {/* Collapsible Manual Street / Landmark / PIN Override Drawer */}
        <button
          type="button"
          className={s.drawerToggleBtn}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(o => !o)}
        >
          <LocateFixed size={14} aria-hidden="true" />
          Edit street / landmark / PIN
          {drawerOpen ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
        </button>

        {drawerOpen && (
          <div className={s.drawerGrid}>
            <label className={s.drawerField}>
              Locality / Area *
              <input
                value={value.locality}
                maxLength={150}
                disabled={disabled || busy}
                placeholder="e.g. Indiranagar, Tarikere"
                onChange={e =>
                  onChange({
                    ...value,
                    locality: e.target.value,
                    source: value.source === 'google' ? 'google' : 'manual',
                  })
                }
              />
            </label>
            <label className={s.drawerField}>
              6-Digit PIN Code
              <input
                value={value.pincode}
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]{6}"
                disabled={disabled || busy}
                placeholder="e.g. 560038"
                onChange={e =>
                  onChange({
                    ...value,
                    pincode: e.target.value.replace(/\D/g, '').slice(0, 6),
                  })
                }
              />
            </label>
            <label className={s.drawerField}>
              Street / Building / Door No.
              <input
                value={value.formattedAddress}
                maxLength={500}
                disabled={disabled || busy}
                placeholder="Optional building or street details"
                onChange={e =>
                  onChange({
                    ...value,
                    formattedAddress: e.target.value,
                  })
                }
              />
            </label>
            <label className={s.drawerField}>
              Landmark
              <input
                value={value.landmark}
                maxLength={200}
                disabled={disabled || busy}
                placeholder="e.g. Near Metro Station"
                onChange={e =>
                  onChange({
                    ...value,
                    landmark: e.target.value,
                  })
                }
              />
            </label>
          </div>
        )}

        {extraFields}

        {onConfirm && (
          <button
            type="button"
            className={s.confirmPrimaryCta}
            disabled={disabled || busy || value.locality.trim().length < 2}
            onClick={() => onConfirm(value)}
          >
            <MapPin size={17} aria-hidden="true" />
            {busy ? 'Saving…' : confirmLabel}
          </button>
        )}

        {secondaryActions}
      </div>
    </div>
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
