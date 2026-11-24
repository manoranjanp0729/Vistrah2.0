'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Coffee,
  Compass,
  Film,
  Globe,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Music,
  Navigation,
  Phone,
  Search,
  Sun,
  Sunset,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { LatestSearch, requestGps, validPoint } from '@/lib/location';
import {
  buildNearbyListingsPath,
  formatDistanceAway,
  googleMapsDirectionsHrefForPin,
  normalizeNearbyRadius,
  phoneCallHref,
  resolveListingPhotoUri,
  websiteExternalHref,
  type NearbyBusinessItem,
  type NearbyDiscoveryRadius,
  type NearbyServicesResponse,
} from '../../shared/nearby-services';
import {
  DEFAULT_VIBE_RADIUS_KM,
  VIBE_FINDER_RADIUS_OPTIONS_KM,
  VIBE_MOODS,
  buildVibeFinderNearbyMapHref,
  dedupeAndSortVibeListings,
  getVibeMoodById,
  type VibeMood,
} from '../../shared/vibe-finder';
import { defaultMapPoint, useOptionalCustomerLocation } from './customer-location';
import { UiText } from './localized-ui';
import styles from './vibe-finder-discovery.module.css';

function MoodIcon({ icon, size = 15 }: { icon: VibeMood['icon']; size?: number }) {
  switch (icon) {
    case 'film':
      return <Film size={size} aria-hidden="true" />;
    case 'music':
      return <Music size={size} aria-hidden="true" />;
    case 'coffee':
      return <Coffee size={size} aria-hidden="true" />;
    case 'sunset':
      return <Sunset size={size} aria-hidden="true" />;
    case 'map':
      return <MapIcon size={size} aria-hidden="true" />;
    case 'sun':
      return <Sun size={size} aria-hidden="true" />;
    default:
      return <Compass size={size} aria-hidden="true" />;
  }
}

export function VibeFinderDiscovery({ initialMoodId = 'all-vibes' }: { initialMoodId?: string }) {
  const locCtx = useOptionalCustomerLocation();
  const [moodId, setMoodId] = useState<string>(() => getVibeMoodById(initialMoodId).id);
  const [radiusKm, setRadiusKm] = useState<NearbyDiscoveryRadius>(() =>
    normalizeNearbyRadius(locCtx?.radius ?? DEFAULT_VIBE_RADIUS_KM),
  );
  const [search, setSearch] = useState('');
  const [locatingGps, setLocatingGps] = useState(false);
  const [gpsNotice, setGpsNotice] = useState('');
  const [localGpsPoint, setLocalGpsPoint] = useState<{
    latitude: number;
    longitude: number;
    locality: string;
  } | null>(null);
  const [failedPhotos, setFailedPhotos] = useState<Record<string, boolean>>({});

  const activePoint = useMemo(() => {
    if (localGpsPoint) return localGpsPoint;
    const src = locCtx?.active ?? locCtx?.draft;
    if (src && validPoint(src)) {
      return {
        latitude: src.latitude,
        longitude: src.longitude,
        locality: src.locality || 'Bengaluru',
      };
    }
    return {
      latitude: defaultMapPoint.latitude,
      longitude: defaultMapPoint.longitude,
      locality: 'Bengaluru',
    };
  }, [localGpsPoint, locCtx?.active, locCtx?.draft]);

  const activeMood = useMemo(() => getVibeMoodById(moodId), [moodId]);

  const [state, setState] = useState<{
    loading: boolean;
    items: NearbyBusinessItem[];
    error: string;
  }>({ loading: true, items: [], error: '' });

  const runner = useRef(new LatestSearch());

  useEffect(() => {
    let alive = true;
    setState(prev => ({ ...prev, loading: true, error: '' }));

    runner.current
      .run(async signal => {
        const batches = await Promise.all(
          activeMood.queries.map(q =>
            api<NearbyServicesResponse>(
              buildNearbyListingsPath({
                category: q.category,
                subcategory: q.serviceType,
                serviceType: q.serviceType,
                latitude: activePoint.latitude,
                longitude: activePoint.longitude,
                radiusKm,
              }),
              { signal },
            ).then(r => r.items ?? []),
          ),
        );
        return dedupeAndSortVibeListings(batches);
      })
      .then(res => {
        if (alive && res.current) {
          setState({ loading: false, items: res.value, error: '' });
        }
      })
      .catch(err => {
        if (alive) {
          setState({
            loading: false,
            items: [],
            error: (err as Error).message || 'Could not load nearby vibes right now.',
          });
        }
      });

    return () => {
      alive = false;
    };
  }, [activeMood, activePoint.latitude, activePoint.longitude, radiusKm, locCtx?.locationRevision]);

  const filteredItems = useMemo(
    () => (search.trim() ? dedupeAndSortVibeListings([state.items], search) : state.items),
    [state.items, search],
  );

  async function handleUseGps() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsNotice('Location is unavailable in this browser.');
      return;
    }
    setLocatingGps(true);
    setGpsNotice('');
    try {
      const fix = await requestGps(navigator.geolocation, navigator.permissions);
      setLocalGpsPoint({
        latitude: fix.point.latitude,
        longitude: fix.point.longitude,
        locality: 'Current GPS location',
      });
    } catch (err) {
      setGpsNotice((err as Error).message || 'Could not detect GPS location.');
    } finally {
      setLocatingGps(false);
    }
  }

  const mapHref = buildVibeFinderNearbyMapHref(activeMood.id, radiusKm);

  return (
    <div className={`container ${styles.page}`} data-vibe-finder="true">
      <section className={styles.hero} aria-labelledby="vibe-finder-heading">
        <div className={styles.heroTop}>
          <div>
            <p className={styles.heroEyebrow}>
              <UiText value="Discover. Connect. Grow." />
            </p>
            <h1 id="vibe-finder-heading" className={styles.heroTitle}>
              <UiText value="Vibe Finder" />
            </h1>
            <p className={styles.heroSubtitle}>
              <UiText value="Pick your mood to explore cinemas, live social events, specialty cafes, evening hangouts, and weekend getaways around you." />
            </p>
          </div>
          <div className={styles.heroActions}>
            <Link href={mapHref} className={styles.primaryBtn}>
              <MapPin size={16} aria-hidden="true" />
              <span>
                <UiText value="Explore on Map" />
              </span>
            </Link>
            <Link
              href="/seller/onboard?category=vibe-finder"
              className={styles.secondaryHeroBtn}
            >
              <span>
                <UiText value="List Your Venue Free" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.controlsCard} aria-label="Vibe Finder filters">
        <div className={styles.filterRow}>
          <div className={styles.searchWrap}>
            <Search size={16} color="#F97316" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter venues, theatres, cafes, events..."
              aria-label="Search Vibe Finder places"
              className={styles.searchInput}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 4 }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className={styles.locationCluster}>
            <span className={styles.filterLabel}>
              <MapPin size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
              {activePoint.locality}
            </span>
            <button
              type="button"
              onClick={() => void handleUseGps()}
              disabled={locatingGps}
              className={styles.gpsBtn}
            >
              <LocateFixed size={14} aria-hidden="true" />
              <span>{locatingGps ? 'Locating…' : 'Use GPS'}</span>
            </button>
          </div>
        </div>

        {gpsNotice && (
          <p role="status" className={styles.moodSummary}>
            {gpsNotice}
          </p>
        )}

        <div className={styles.moodRow} role="tablist" aria-label="Choose a vibe">
          {VIBE_MOODS.map(mood => {
            const selected = mood.id === activeMood.id;
            return (
              <button
                key={mood.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setMoodId(mood.id)}
                className={`${styles.chip} ${selected ? styles.moodChipActive : ''}`}
              >
                <MoodIcon icon={mood.icon} />
                <span>{mood.label}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.radiusRow} role="group" aria-label="Distance radius">
          <span className={styles.filterLabel}>Radius:</span>
          {VIBE_FINDER_RADIUS_OPTIONS_KM.map(km => {
            const active = radiusKm === km;
            return (
              <button
                key={km}
                type="button"
                aria-pressed={active}
                onClick={() => setRadiusKm(km)}
                className={`${styles.chip} ${active ? styles.chipActive : ''}`}
              >
                {km} km
              </button>
            );
          })}
        </div>

        <p className={styles.moodSummary}>{activeMood.subtitle}</p>
      </section>

      <section aria-live="polite" style={{ display: 'grid', gap: 16 }}>
        <div className={styles.resultsHeader}>
          <h2 className={styles.resultsTitle}>{activeMood.label}</h2>
          <p className={`${styles.resultsCount} tabular-nums`}>
            {state.loading
              ? 'Finding places near you…'
              : `${filteredItems.length} ${filteredItems.length === 1 ? 'place' : 'places'} within ${radiusKm} km`}
          </p>
        </div>

        {state.error ? (
          <div className={styles.emptyCard}>
            <p className={styles.cardMeta}>{state.error}</p>
            <Link href={mapHref} className={styles.actionPrimary}>
              <span>Open Nearby Map</span>
            </Link>
          </div>
        ) : state.loading ? (
          <div className={styles.emptyCard}>
            <p className={styles.cardMeta}>Loading matching places and experiences…</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className={styles.emptyCard}>
            <Compass size={28} color="#F97316" aria-hidden="true" />
            <h3 className={styles.cardTitle}>
              No listings found within {radiusKm} km — try expanding your radius
            </h3>
            <p className={styles.cardMeta}>
              Switch to a wider radius or explore another vibe near {activePoint.locality}.
            </p>
            <div className={styles.radiusRow}>
              {radiusKm < 50 && (
                <button
                  type="button"
                  onClick={() => setRadiusKm(50)}
                  className={styles.gpsBtn}
                >
                  Expand to 50 km
                </button>
              )}
              <Link href="/seller/onboard?category=vibe-finder" className={styles.actionSecondary}>
                List Your Venue Free
              </Link>
            </div>
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredItems.map(item => {
              const key = String(item.id);
              const photoUri = resolveListingPhotoUri(item.photo_url);
              const showPhoto = Boolean(photoUri) && !failedPhotos[key];
              const telHref = phoneCallHref(item.phone);
              const webHref = websiteExternalHref(item.website_url);
              const dirHref = googleMapsDirectionsHrefForPin(
                item.latitude,
                item.longitude,
                item.directions_url,
              );

              return (
                <article key={key} className={styles.card}>
                  <div className={styles.photoBox}>
                    {showPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUri!}
                        alt={item.company || item.name}
                        loading="lazy"
                        onError={() =>
                          setFailedPhotos(prev => (prev[key] ? prev : { ...prev, [key]: true }))
                        }
                        className={styles.photoImg}
                      />
                    ) : (
                      <div className={styles.photoFallback}>
                        <Compass size={32} aria-hidden="true" />
                      </div>
                    )}
                    <div className={styles.badgeStrip}>
                      {typeof item.distance_km === 'number' ? (
                        <span className={`${styles.distanceBadge} tabular-nums`}>
                          {formatDistanceAway(item.distance_km)}
                        </span>
                      ) : (
                        <span />
                      )}
                      {item.source === 'vistrah' && (
                        <span className={styles.verifiedBadge}>Verified</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.cardBody}>
                    <p className={styles.cardCategory}>
                      {item.service_title || activeMood.shortLabel}
                    </p>
                    <h3 className={styles.cardTitle}>{item.company || item.name}</h3>
                    {Boolean(item.address || item.location) && (
                      <p className={styles.cardMeta}>{item.address || item.location}</p>
                    )}

                    <div className={styles.cardActions}>
                      {telHref && (
                        <a href={telHref} className={styles.actionPrimary}>
                          <Phone size={13} aria-hidden="true" />
                          <span>Call</span>
                        </a>
                      )}
                      <a
                        href={dirHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.actionSecondary}
                      >
                        <Navigation size={13} aria-hidden="true" />
                        <span>Directions</span>
                      </a>
                      {webHref && (
                        <a
                          href={webHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.actionSecondary}
                        >
                          <Globe size={13} aria-hidden="true" />
                          <span>Website</span>
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
