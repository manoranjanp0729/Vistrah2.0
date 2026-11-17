'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  BookOpen,
  Briefcase,
  Camera,
  Car,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  HardHat,
  HeartPulse,
  LocateFixed,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Plus,
  Scissors,
  ShoppingBag,
  Sprout,
  Utensils,
  Wrench,
} from 'lucide-react';
import { api } from '@/lib/api';
import { LatestSearch, validPoint } from '@/lib/location';
import {
  NEARBY_DISCOVERY_RADII,
  buildNearbyMarketplacePath,
  formatDistanceAway,
  getDivisionFallbackTheme,
  googleMapsDirectionsHrefForPin,
  normalizeNearbyRadius,
  phoneCallHref,
  resolveListingPhotoUri,
  whatsappChatHref,
  type DivisionFallbackTheme,
  type NearbyBusinessItem,
  type NearbyDiscoveryRadius,
  type NearbyServicesResponse,
} from '../../shared/nearby-services';
import { selfOnboardingUrl } from '../../shared/self-onboarding';
import { defaultMapPoint, useOptionalCustomerLocation } from './customer-location';
import { UiText } from './localized-ui';
import {
  MapListViewToggle,
  PoweredByGoogleAttribution,
  VistrahMap,
  type VistrahMapMarker,
} from './vistrah-google-maps';
import s from './nearby-service-discovery.module.css';

function DivisionGlyph({
  glyph,
  size = 24,
}: {
  glyph: DivisionFallbackTheme['glyph'];
  size?: number;
}) {
  switch (glyph) {
    case 'utensils':
      return <Utensils size={size} aria-hidden="true" />;
    case 'tool':
      return <Wrench size={size} aria-hidden="true" />;
    case 'heart':
      return <HeartPulse size={size} aria-hidden="true" />;
    case 'leaf':
      return <Sprout size={size} aria-hidden="true" />;
    case 'truck':
      return <Car size={size} aria-hidden="true" />;
    case 'layers':
      return <HardHat size={size} aria-hidden="true" />;
    case 'scissors':
      return <Scissors size={size} aria-hidden="true" />;
    case 'camera':
      return <Camera size={size} aria-hidden="true" />;
    case 'book':
      return <BookOpen size={size} aria-hidden="true" />;
    case 'briefcase':
      return <Briefcase size={size} aria-hidden="true" />;
    case 'compass':
      return <Compass size={size} aria-hidden="true" />;
    case 'cpu':
      return <Cpu size={size} aria-hidden="true" />;
    default:
      return <ShoppingBag size={size} aria-hidden="true" />;
  }
}

export function NearbyServiceDiscovery({
  categorySlug,
  categoryTitle,
  subcategorySlug,
  typeSlug,
  serviceTitle,
}: {
  categorySlug: string;
  categoryTitle: string;
  subcategorySlug?: string;
  typeSlug: string;
  serviceTitle: string;
}) {
  const locCtx = useOptionalCustomerLocation();
  const activePoint = useMemo(() => {
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
  }, [locCtx?.active, locCtx?.draft]);

  const [radiusKm, setRadiusKm] = useState<NearbyDiscoveryRadius>(() =>
    normalizeNearbyRadius(locCtx?.radius ?? 10),
  );
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'split'>('split');
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [failedPhotos, setFailedPhotos] = useState<Record<string, boolean>>({});
  const [state, setState] = useState<{
    key: string;
    items: NearbyBusinessItem[];
    hasGooglePlaces: boolean;
    error: string;
  } | null>(null);

  const searchRunner = useRef(new LatestSearch());
  const requestKey = `${categorySlug}:${subcategorySlug || ''}:${typeSlug}:${activePoint.latitude.toFixed(5)}:${activePoint.longitude.toFixed(5)}:${radiusKm}:${locCtx?.locationRevision ?? 0}`;

  useEffect(() => {
    let alive = true;
    const path = buildNearbyMarketplacePath({
      category: categorySlug,
      subcategory: subcategorySlug,
      businessType: typeSlug,
      latitude: activePoint.latitude,
      longitude: activePoint.longitude,
      radiusKm,
    });
    searchRunner.current
      .run(signal => api<NearbyServicesResponse>(path, { signal }))
      .then(res => {
        if (alive && res.current) {
          const nextItems = res.value.items ?? [];
          setState({
            key: requestKey,
            items: nextItems,
            hasGooglePlaces: Boolean(
              res.value.has_google_places ||
                nextItems.some(item => item.source === 'google_places'),
            ),
            error: '',
          });
          setSelectedId(prev =>
            prev != null && nextItems.some(item => item.id === prev) ? prev : null,
          );
        }
      })
      .catch(err => {
        if (alive) {
          setState({
            key: requestKey,
            items: [],
            hasGooglePlaces: false,
            error: (err as Error).message || 'Could not load nearby businesses.',
          });
        }
      });

    const current = searchRunner.current;
    return () => {
      alive = false;
      current.cancel();
    };
  }, [categorySlug, subcategorySlug, typeSlug, activePoint.latitude, activePoint.longitude, radiusKm, requestKey]);

  const loading = state?.key !== requestKey;
  const items = state?.key === requestKey ? state.items : [];
  const hasGooglePlaces = state?.key === requestKey ? state.hasGooglePlaces : false;
  const error = state?.key === requestKey ? state.error : '';

  const markers = useMemo<VistrahMapMarker[]>(
    () =>
      items.map(item => ({
        id: item.id,
        latitude: item.latitude,
        longitude: item.longitude,
        title: item.company || item.name,
        subtitle: item.location || item.address,
        description: item.description || item.service_title,
        distanceKm: item.distance_km,
        badge: item.source === 'vistrah' ? 'VISTRAH Verified' : 'Nearby Place',
        actionLabel: 'Directions',
        actionHref: googleMapsDirectionsHrefForPin(
          item.latitude,
          item.longitude,
          item.directions_url,
        ),
      })),
    [items],
  );

  function selectListing(id: string | number, scrollCard = false) {
    setSelectedId(id);
    if (scrollCard && typeof document !== 'undefined') {
      document.getElementById(`nearby-biz-card-${String(id)}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }

  const onboardHref = selfOnboardingUrl({
    category: categorySlug,
    subcategory: subcategorySlug,
    type: typeSlug,
  });

  return (
    <section
      className={s.wrapper}
      aria-label={`Nearby ${serviceTitle} map and listings`}
      data-nearby-service={typeSlug}
    >
      {/* Top Location + Radius Control Bar */}
      <div className={s.toolbar}>
        <div className={s.toolbarTitleGroup}>
          <h2 className={s.toolbarHeading}>
            <UiText value="Nearby" /> {serviceTitle}
          </h2>
          <div className={s.locationPillRow}>
            <Link href="/location" className={s.locationPill} aria-label="Change active location">
              <MapPin size={14} aria-hidden="true" />
              <span>{locCtx?.detecting ? 'Locating…' : activePoint.locality}</span>
            </Link>
            {locCtx && (
              <button
                type="button"
                className={s.gpsQuickBtn}
                disabled={locCtx.busy || locCtx.detecting}
                onClick={() => void locCtx.gps()}
              >
                <LocateFixed size={13} aria-hidden="true" />
                <UiText value="Use GPS" />
              </button>
            )}
            <span>· {categoryTitle}</span>
          </div>
        </div>

        <div className={s.controlsRight}>
          <div className={s.radiusGroup} role="group" aria-label="Discovery radius">
            {NEARBY_DISCOVERY_RADII.map(r => (
              <button
                key={r}
                type="button"
                aria-pressed={radiusKm === r}
                className={`${s.radiusBtn} ${radiusKm === r ? s.radiusBtnActive : ''}`}
                onClick={() => setRadiusKm(r)}
              >
                {r} km
              </button>
            ))}
          </div>
          <MapListViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {/* Compact Non-Blocking Seller Banner */}
      <div className={s.compactBanner} data-seller-banner="true">
        <p className={s.compactBannerText}>
          <UiText value="Own a" /> {serviceTitle} <UiText value="business here?" />
        </p>
        <Link href={onboardHref} className={s.onboardCta}>
          <Plus size={15} aria-hidden="true" />
          <UiText value="+ List Free on VISTRAH" />
        </Link>
      </div>

      {/* Interactive Map + Unified Synchronized Listings */}
      <div className={viewMode === 'split' ? s.splitGrid : undefined}>
        {viewMode !== 'list' && (
          <div className={s.mapColumn}>
            <VistrahMap
              center={{ latitude: activePoint.latitude, longitude: activePoint.longitude }}
              radiusKm={radiusKm}
              markers={markers}
              selectedId={selectedId}
              height={420}
              onSelectMarker={id => {
                if (viewMode === 'map') setViewMode('split');
                selectListing(id, true);
              }}
              ariaLabel={`Nearby ${serviceTitle} businesses around ${activePoint.locality}`}
            />
          </div>
        )}

        {viewMode !== 'map' && (
          <div className={s.listColumn}>
            <div className={s.listHeader}>
              <span className="tabular-nums">
                {loading ? (
                  <UiText value="Searching nearby businesses…" />
                ) : (
                  <>
                    <strong>{items.length}</strong>{' '}
                    <UiText
                      value={
                        items.length === 1
                          ? `nearby place within ${radiusKm} km`
                          : `nearby places within ${radiusKm} km`
                      }
                    />
                  </>
                )}
              </span>
              {selectedId !== null && (
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setSelectedId(null)}
                >
                  <UiText value="Clear pin highlight" />
                </button>
              )}
            </div>

            {error && (
              <div className={s.statusBox} role="alert">
                {error}
              </div>
            )}

            {!loading && !error && items.length === 0 && (
              <div className={s.statusBox}>
                <UiText
                  value={`No ${serviceTitle} places found within ${radiusKm} km of ${activePoint.locality}. Tap 25 km or 50 km above to search a wider radius.`}
                />
              </div>
            )}

            {items.length > 0 && (
              <div className={s.cardsScroll}>
                {items.map(item => {
                  const itemKey = String(item.id);
                  const isSelected = selectedId === item.id;
                  const isVistrah = item.source === 'vistrah';
                  const callUrl = phoneCallHref(item.phone);
                  const waUrl = isVistrah
                    ? whatsappChatHref(
                        item.whatsapp || item.phone,
                        serviceTitle,
                        item.company || item.name,
                      )
                    : null;
                  const directionsUrl = googleMapsDirectionsHrefForPin(
                    item.latitude,
                    item.longitude,
                    item.directions_url,
                  );
                  const photoSrc = !failedPhotos[itemKey]
                    ? resolveListingPhotoUri(item.photo_url)
                    : null;
                  const divTheme = getDivisionFallbackTheme(item.category_slug || categorySlug);

                  return (
                    <article
                      id={`nearby-biz-card-${itemKey}`}
                      key={itemKey}
                      className={`${s.businessCard} ${isSelected ? s.businessCardSelected : ''}`}
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => selectListing(item.id, false)}
                    >
                      <div className={s.cardTop}>
                        <div className={s.mediaSlot}>
                          {photoSrc ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={photoSrc}
                              alt={`${item.company || item.name} photo`}
                              loading="lazy"
                              className={s.shopPhoto}
                              onError={() =>
                                setFailedPhotos(prev => ({ ...prev, [itemKey]: true }))
                              }
                            />
                          ) : (
                            <div
                              className={s.fallbackTile}
                              aria-hidden="true"
                              style={
                                {
                                  '--div-bg-dark': divTheme.bgDark,
                                  '--div-bg-light': divTheme.bgLight,
                                  '--div-border-dark': divTheme.borderDark,
                                  '--div-border-light': divTheme.borderLight,
                                  '--div-accent': divTheme.accent,
                                } as CSSProperties
                              }
                            >
                              <DivisionGlyph glyph={divTheme.glyph} size={24} />
                              <span className={s.fallbackTileLabel}>
                                {isVistrah ? 'VISTRAH' : 'LOCAL'}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className={s.cardHeaderMain}>
                          <div className={s.titleDistanceRow}>
                            <h3 className={s.businessName}>{item.company || item.name}</h3>
                            <span className={s.distanceBadge}>
                              {formatDistanceAway(item.distance_km)}
                            </span>
                          </div>

                          <div className={s.badgesRow}>
                            {isVistrah ? (
                              <span className={s.verifiedBadge}>
                                <CheckCircle2 size={12} aria-hidden="true" />
                                <UiText
                                  value={
                                    item.verification_status === 'VERIFIED'
                                      ? 'VISTRAH Verified'
                                      : 'VISTRAH Listed'
                                  }
                                />
                              </span>
                            ) : (
                              <span className={s.nearbyPlaceBadge}>
                                <MapPin size={12} aria-hidden="true" />
                                <UiText value="Nearby Place" />
                              </span>
                            )}
                            {item.timings && (
                              <span className={s.metaLine}>
                                <Clock
                                  size={12}
                                  style={{ verticalAlign: 'text-bottom', marginRight: 4 }}
                                  aria-hidden="true"
                                />
                                {item.timings}
                              </span>
                            )}
                          </div>

                          <p className={s.metaLine}>{item.address || item.location}</p>
                        </div>
                      </div>

                      {item.description && <p className={s.description}>{item.description}</p>}

                      <div className={s.actionRow} onClick={e => e.stopPropagation()}>
                        {callUrl && (
                          <a href={callUrl} className={`${s.actionBtn} ${s.callBtn}`}>
                            <Phone size={14} aria-hidden="true" />
                            <UiText value="Call" />
                          </a>
                        )}
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${s.actionBtn} ${s.whatsappBtn}`}
                          >
                            <MessageCircle size={14} aria-hidden="true" />
                            <UiText value="WhatsApp" />
                          </a>
                        )}
                        <a
                          href={directionsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={s.actionBtn}
                        >
                          <Navigation size={14} aria-hidden="true" />
                          <UiText value="Directions" />
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Official Google Attribution Footer whenever Google Places results are shown */}
            {hasGooglePlaces && (
              <div className={s.googleFooterWrap}>
                <PoweredByGoogleAttribution />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
