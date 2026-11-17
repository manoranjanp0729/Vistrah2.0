/** Browser-only Maps JS loader shared by Next and Expo Web. No server key here. */
import type { GooglePoint } from './google-location';

type LatLng = { lat: () => number; lng: () => number };
type Listener = { remove: () => void };
type MapInstance = {
  panTo: (p: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  addListener: (name: string, handler: (event: { latLng: LatLng | null }) => void) => Listener;
};
type CircleInstance = {
  setCenter: (p: { lat: number; lng: number }) => void;
  setRadius: (radiusMeters: number) => void;
  setMap: (map: MapInstance | null) => void;
};
type MarkerInstance = {
  setPosition: (p: { lat: number; lng: number }) => void;
  setIcon: (icon: string) => void;
  setMap: (map: MapInstance | null) => void;
  addListener: (name: string, handler: () => void) => Listener;
};
type Maps = {
  Map: new (node: HTMLElement, options: object) => MapInstance;
  Circle: new (options: object) => CircleInstance;
  Marker?: new (options: object) => MarkerInstance;
};

export type WebOverlayMarker = {
  id: string | number;
  latitude: number;
  longitude: number;
  title: string;
};

function webMarkerIconUrl(variant: 'center' | 'item' | 'selected'): string {
  const fill = variant === 'center' || variant === 'selected' ? '#d4af37' : '#0f172a';
  const stroke = variant === 'center' || variant === 'selected' ? '#0f172a' : '#d4af37';
  const inner = variant === 'center' || variant === 'selected' ? '#0f172a' : '#f8e7b0';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 36 44"><path d="M18 2C9.716 2 3 8.716 3 17c0 10.75 15 25 15 25s15-14.25 15-25c0-8.284-6.716-15-15-15z" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/><circle cx="18" cy="17" r="6" fill="${inner}"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function zoomForRadiusKm(radiusKm?: number): number {
  if (!radiusKm || radiusKm <= 2) return 14;
  if (radiusKm <= 5) return 13;
  if (radiusKm <= 12) return 12;
  if (radiusKm <= 30) return 11;
  return 9;
}

let pending: Promise<Maps> | null = null;
export function loadGoogleMap(key: string): Promise<Maps> {
  if (!key.trim()) return Promise.reject(new Error('Google Maps is not configured. Use manual location.'));
  if (pending) return pending;
  pending = new Promise<Maps>((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => {
      script.remove();
      pending = null;
      reject(new Error('Google Maps timed out. Use manual location.'));
    }, 15000);
    const finish = () => {
      const maps = (window as unknown as { google?: { maps?: Maps } }).google?.maps;
      if (!maps) {
        pending = null;
        reject(new Error('Google Maps is unavailable.'));
      } else resolve(maps);
      clearTimeout(timer);
    };
    script.src = 'https://maps.googleapis.com/maps/api/js?' + new URLSearchParams({ key, v: 'quarterly' });
    script.async = true;
    script.onload = finish;
    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
      pending = null;
      reject(new Error('Google Maps could not load. Use manual location.'));
    };
    document.head.appendChild(script);
  });
  return pending;
}

export async function mountGoogleMap(
  node: HTMLElement,
  key: string,
  point: GooglePoint,
  onPin: (p: GooglePoint) => void,
  isCurrent = () => true,
) {
  const maps = await loadGoogleMap(key);
  if (!isCurrent()) throw new Error('Map was closed.');
  const initial = { lat: point.latitude, lng: point.longitude };
  const map = new maps.Map(node, {
    center: initial,
    zoom: 13,
    streetViewControl: false,
    fullscreenControl: false,
    mapTypeControl: false,
    gestureHandling: 'cooperative',
    padding: { top: 8, right: 8, bottom: 8, left: 8 },
  });
  const centerDot = new maps.Circle({
    map,
    center: initial,
    radius: 20,
    fillColor: '#d4af37',
    fillOpacity: 1,
    strokeColor: '#0f172a',
    strokeWeight: 3,
    clickable: false,
  });
  let radiusCircle: CircleInstance | null = null;
  let lastRadiusKm: number | undefined;
  let pinEntries: Array<{ marker: MarkerInstance; clickListener: Listener }> = [];

  const clearPins = () => {
    for (const entry of pinEntries) {
      entry.clickListener.remove();
      entry.marker.setMap(null);
    }
    pinEntries = [];
  };

  const listener = map.addListener('click', event => {
    if (event.latLng) onPin({ latitude: event.latLng.lat(), longitude: event.latLng.lng() });
  });

  return {
    update: (p: GooglePoint) => {
      const centre = { lat: p.latitude, lng: p.longitude };
      centerDot.setCenter(centre);
      if (radiusCircle) radiusCircle.setCenter(centre);
      map.panTo(centre);
    },
    syncOverlays: (opts: {
      center: GooglePoint;
      radiusKm?: number;
      markers?: WebOverlayMarker[];
      selectedId?: string | number | null;
      onSelectMarker?: (id: string | number) => void;
    }) => {
      const centre = { lat: opts.center.latitude, lng: opts.center.longitude };
      centerDot.setCenter(centre);
      if (typeof opts.radiusKm === 'number' && opts.radiusKm > 0) {
        if (!radiusCircle) {
          radiusCircle = new maps.Circle({
            map,
            center: centre,
            radius: opts.radiusKm * 1000,
            fillColor: '#d4af37',
            fillOpacity: 0.14,
            strokeColor: '#0f172a',
            strokeOpacity: 0.65,
            strokeWeight: 1.5,
            clickable: false,
          });
        } else {
          radiusCircle.setCenter(centre);
          radiusCircle.setRadius(opts.radiusKm * 1000);
        }
        if (lastRadiusKm !== opts.radiusKm) {
          lastRadiusKm = opts.radiusKm;
          map.setZoom(zoomForRadiusKm(opts.radiusKm));
        }
      } else if (radiusCircle) {
        radiusCircle.setMap(null);
        radiusCircle = null;
      }

      clearPins();
      if (maps.Marker && opts.markers?.length) {
        for (const item of opts.markers) {
          const isSelected = opts.selectedId != null && item.id === opts.selectedId;
          const mk = new maps.Marker({
            map,
            position: { lat: item.latitude, lng: item.longitude },
            title: item.title,
            icon: webMarkerIconUrl(isSelected ? 'selected' : 'item'),
          });
          const clickListener = mk.addListener('click', () => {
            opts.onSelectMarker?.(item.id);
          });
          pinEntries.push({ marker: mk, clickListener });
          if (isSelected) {
            map.panTo({ lat: item.latitude, lng: item.longitude });
          }
        }
      }
    },
    destroy: () => {
      listener.remove();
      clearPins();
      if (radiusCircle) radiusCircle.setMap(null);
      centerDot.setMap(null);
      node.replaceChildren();
    },
  };
}
