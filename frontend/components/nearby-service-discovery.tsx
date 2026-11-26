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
  Globe,
  HardHat,
  HeartPulse,
  Loader2,
  LocateFixed,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Navigation,
  Phone,
  Plus,
  Scissors,
  Search,
  ShoppingBag,
  Sprout,
  Utensils,
  Video,
  Wrench,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { LatestSearch, validPoint, type Point } from '@/lib/location';
import {
  isCoordinateFormattedLabel,
  lookupLocalAreaCity,
} from '../../shared/reverse-geocode-fallback';
import { searchMarketplaceEntries } from '@/lib/marketplace-taxonomy';
import { FLAGSHIP_SECTORS, getFlagshipSector } from '../../shared/flagship-sectors';
import {
  NEARBY_DISCOVERY_RADII,
  buildListingMoreOptions,
  buildNearbyListingsPath,
  formatDistanceAway,
  getDivisionFallbackTheme,
  googleMapsDirectionsHrefForPin,
  nearbyServicesUrl,
  nearbyVAdsUrl,
  normalizeNearbyRadius,
  phoneCallHref,
  resolveListingPhotoUri,
  websiteExternalHref,
  whatsappChatHref,
  type DivisionFallbackTheme,
  type ListingMoreOptionItem,
  type NearbyBusinessItem,
  type NearbyDiscoveryRadius,
  type NearbyServicesResponse,
} from '../../shared/nearby-services';
import { selfOnboardingUrl } from '../../shared/self-onboarding';
import { useUser } from './customer';
import { defaultMapPoint, useOptionalCustomerLocation } from './customer-location';
import { UiText } from './localized-ui';
import {
  MapListViewToggle,
  PoweredByGoogleAttribution,
  VistrahMap,
  type VistrahMapMarker,
} from './vistrah-google-maps';
import s from './nearby-service-discovery.module.css';

function approxDistanceKm(a: Point, b: Point): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLng * sinLng;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

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
  typeSlug?: string;
  serviceTitle: string;
}) {
  const locCtx = useOptionalCustomerLocation();
  const { user: currentUser } = useUser();
  const [sectorQuery, setSectorQuery] = useState('');
  const activeSector = useMemo(() => getFlagshipSector(categorySlug), [categorySlug]);
  const quickServiceHits = useMemo(
    () =>
      sectorQuery.trim()
        ? searchMarketplaceEntries(sectorQuery)
            .filter(entry => Boolean(entry.selection.type))
            .slice(0, 8)
        : [],
    [sectorQuery],
  );
  const activePoint = useMemo(() => {
    const src = locCtx?.active ?? locCtx?.draft;
    if (src && validPoint(src)) {
      const rawLoc = (src.locality || '').trim();
      const upgraded =
        !rawLoc || isCoordinateFormattedLabel(rawLoc)
          ? lookupLocalAreaCity({ latitude: src.latitude, longitude: src.longitude })?.locality ||
            rawLoc ||
            'Bengaluru'
          : rawLoc;
      return {
        latitude: src.latitude,
        longitude: src.longitude,
        locality: upgraded,
      };
    }
    return {
      latitude: defaultMapPoint.latitude,
      longitude: defaultMapPoint.longitude,
      locality: 'Bengaluru',
    };
  }, [locCtx?.active, locCtx?.draft]);

  const [customCenter, setCustomCenter] = useState<Point | null>(null);
  const [pannedCenter, setPannedCenter] = useState<Point | null>(null);

  useEffect(() => {
    setCustomCenter(null);
    setPannedCenter(null);
  }, [activePoint.latitude, activePoint.longitude, locCtx?.locationRevision]);

  const queryCenter = customCenter ?? {
    latitude: activePoint.latitude,
    longitude: activePoint.longitude,
  };
  const displayLocality = customCenter ? 'Moved map area' : activePoint.locality;

  const [radiusKm, setRadiusKm] = useState<NearbyDiscoveryRadius>(() =>
    normalizeNearbyRadius(locCtx?.radius ?? 10),
  );
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'split'>('split');
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [openMoreKey, setOpenMoreKey] = useState<string | null>(null);
  const [failedPhotos, setFailedPhotos] = useState<Record<string, boolean>>({});
  const moreContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMoreKey) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenMoreKey(null);
    }
    function onPointerDown(e: PointerEvent) {
      if (moreContainerRef.current && !moreContainerRef.current.contains(e.target as Node)) {
        setOpenMoreKey(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [openMoreKey]);

  function getMoreOptionsForListing(item: NearbyBusinessItem): ListingMoreOptionItem[] {
    return buildListingMoreOptions({
      listingId: item.id,
      placeId: item.place_id ?? (item.source === 'google_places' ? item.slug : null),
      ownerUserId: item.owner_user_id ?? null,
      viewerUserId: currentUser?.id ?? null,
      viewerRole: currentUser?.role ?? null,
      businessName: item.company || item.name,
      categorySlug: item.category_slug || categorySlug,
      subcategorySlug,
      typeSlug: item.business_type || typeSlug,
      locality: item.location || activePoint.locality,
      phone: item.phone,
      websiteUrl: item.website_url,
    });
  }

  const [state, setState] = useState<{
    key: string;
    items: NearbyBusinessItem[];
    hasGooglePlaces: boolean;
    error: string;
  } | null>(null);

  const searchRunner = useRef(new LatestSearch());
  const normalizedTypeSlug = (typeSlug || '').trim();
  const requestKey = `${categorySlug}:${subcategorySlug || ''}:${normalizedTypeSlug}:${queryCenter.latitude.toFixed(5)}:${queryCenter.longitude.toFixed(5)}:${radiusKm}:${locCtx?.locationRevision ?? 0}`;

  useEffect(() => {
    let alive = true;
    const path = buildNearbyListingsPath({
      category: categorySlug,
      subcategory: subcategorySlug,
      serviceType: normalizedTypeSlug || undefined,
      latitude: queryCenter.latitude,
      longitude: queryCenter.longitude,
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
  }, [
    categorySlug,
    subcategorySlug,
    normalizedTypeSlug,
    queryCenter.latitude,
    queryCenter.longitude,
    radiusKm,
    requestKey,
  ]);

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
    type: normalizedTypeSlug || undefined,
  });

  const largerRadii = NEARBY_DISCOVERY_RADII.filter(r => r > radiusKm);

  return (
    <section
      className={s.wrapper}
      aria-label={`Nearby ${serviceTitle} map and listings`}
      data-nearby-service={normalizedTypeSlug || categorySlug}
      data-brand-palette="vistrah-navy-orange"
    >
      {/* 10 Main Categories + Direct Service Type Filter Chips */}
      <div className={s.sectorFilterBar} aria-label="Category and service type filters">
        <div className={s.sectorSearchWrap}>
          <div className={s.sectorSearchBox}>
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              value={sectorQuery}
              onChange={e => setSectorQuery(e.target.value)}
              placeholder="Search service types across 10 categories (e.g. cafes, hospitals, EV charging)…"
              aria-label="Search service types"
              className={s.sectorSearchInput}
            />
            {sectorQuery && (
              <button
                type="button"
                className={s.sectorSearchClear}
                aria-label="Clear service search"
                onClick={() => setSectorQuery('')}
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>
          {quickServiceHits.length > 0 && (
            <div
              className={s.sectorSearchResults}
              role="listbox"
              aria-label="Matching service types"
            >
              {quickServiceHits.map(hit => (
                <Link
                  key={hit.id}
                  href={nearbyServicesUrl({
                    category: hit.selection.category!,
                    subcategory: hit.selection.subcategory,
                    type: hit.selection.type,
                  })}
                  className={s.sectorSearchHit}
                  onClick={() => setSectorQuery('')}
                >
                  <span>{hit.title}</span>
                  <span className={s.sectorSearchPath}>{hit.path}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <nav className={s.sectorPillsRail} aria-label="VISTRAH 10 Main Categories">
          {FLAGSHIP_SECTORS.map(sector => {
            const isActiveSector = sector.slug === categorySlug;
            return (
              <Link
                key={sector.slug}
                href={nearbyServicesUrl({ category: sector.slug })}
                aria-current={isActiveSector ? 'true' : undefined}
                className={`${s.sectorPill} ${isActiveSector ? s.sectorPillActive : ''}`}
              >
                <UiText value={sector.title} />
              </Link>
            );
          })}
        </nav>

        {activeSector && activeSector.serviceTypes.length > 0 && (
          <nav
            className={s.serviceTypeRail}
            aria-label={`${activeSector.title} service types`}
          >
            <Link
              href={nearbyServicesUrl({ category: activeSector.slug })}
              aria-current={!normalizedTypeSlug ? 'true' : undefined}
              className={`${s.typeChip} ${!normalizedTypeSlug ? s.typeChipActive : ''}`}
            >
              <UiText value={`All in ${activeSector.shortTitle || activeSector.title}`} />
            </Link>
            {activeSector.serviceTypes.map(st => {
              const isActiveType = normalizedTypeSlug === st.slug;
              return (
                <Link
                  key={st.slug}
                  href={nearbyServicesUrl({
                    category: activeSector.slug,
                    serviceType: st.slug,
                  })}
                  aria-current={isActiveType ? 'true' : undefined}
                  className={`${s.typeChip} ${isActiveType ? s.typeChipActive : ''}`}
                >
                  <UiText value={st.title} />
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {/* Top Location + Radius Control Bar */}
      <div className={s.toolbar}>
        <div className={s.toolbarTitleGroup}>
          <h2 className={s.toolbarHeading}>
            <UiText value="Nearby" /> {serviceTitle}
          </h2>
          <div className={s.locationPillRow}>
            <Link href="/location" className={s.locationPill} aria-label="Change active location">
              <MapPin size={14} aria-hidden="true" />
              <span>{displayLocality}</span>
            </Link>
            {locCtx && (
              <button
                type="button"
                className={s.gpsQuickBtn}
                disabled={locCtx.busy || locCtx.detecting}
                aria-busy={locCtx.busy || locCtx.detecting}
                onClick={() => {
                  setCustomCenter(null);
                  setPannedCenter(null);
                  void locCtx.gps();
                }}
              >
                {locCtx.busy || locCtx.detecting ? (
                  <Loader2 size={13} className={s.spinIcon} aria-hidden="true" />
                ) : (
                  <LocateFixed size={13} aria-hidden="true" />
                )}
                <UiText value={locCtx.busy || locCtx.detecting ? 'Locating…' : 'Use GPS'} />
              </button>
            )}
            {customCenter && (
              <button
                type="button"
                className={s.gpsQuickBtn}
                onClick={() => {
                  setCustomCenter(null);
                  setPannedCenter(null);
                }}
              >
                <UiText value="Reset area" />
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
          <Link
            href={nearbyVAdsUrl({
              category: categorySlug,
              serviceType: normalizedTypeSlug || undefined,
              radiusKm,
            })}
            className={s.vAdsFilterBtn}
            data-nearby-v-ads-link="true"
            aria-label={`Watch V Ads for ${serviceTitle}`}
          >
            <Video size={14} aria-hidden="true" />
            <UiText value="V Ads" />
          </Link>
          <MapListViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {locCtx?.error && (
        <div className={s.gpsErrorBanner} role="alert">
          <div className={s.gpsErrorCopy}>
            <span>{locCtx.error}</span>
            <Link href="/location" className={s.gpsErrorAction}>
              <UiText value="Pick city manually" />
            </Link>
          </div>
          <button
            type="button"
            className={s.gpsErrorDismiss}
            aria-label="Dismiss location notice"
            onClick={() => locCtx.clearError()}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Compact Non-Blocking Seller Banner */}
      <div className={s.compactBanner} data-seller-banner="true">
        <p className={s.compactBannerText}>
          <UiText value="Own a" /> {serviceTitle} <UiText value="business here?" />
        </p>
        <Link href={onboardHref} className={s.onboardCta}>
          <Plus size={15} aria-hidden="true" />
          <UiText value="List Free on VISTRAH" />
        </Link>
      </div>

      {/* Interactive Map + Unified Synchronized Listings */}
      <div className={viewMode === 'split' ? s.splitGrid : undefined}>
        {viewMode !== 'list' && (
          <div className={s.mapColumn}>
            {pannedCenter && (
              <div className={s.searchHereOverlay}>
                <button
                  type="button"
                  className={s.searchHereBtn}
                  onClick={() => {
                    setCustomCenter(pannedCenter);
                    setPannedCenter(null);
                  }}
                >
                  <Search size={14} aria-hidden="true" />
                  <UiText value="Search Here" />
                </button>
              </div>
            )}
            <VistrahMap
              center={{ latitude: queryCenter.latitude, longitude: queryCenter.longitude }}
              radiusKm={radiusKm}
              markers={markers}
              selectedId={selectedId}
              height={420}
              onViewCenterChange={pt => {
                if (!validPoint(pt)) return;
                if (approxDistanceKm(queryCenter, pt) > 0.25) {
                  setPannedCenter({
                    latitude: Number(pt.latitude.toFixed(6)),
                    longitude: Number(pt.longitude.toFixed(6)),
                  });
                } else {
                  setPannedCenter(null);
                }
              }}
              onSelectMarker={id => {
                if (viewMode === 'map') setViewMode('split');
                selectListing(id, true);
              }}
              ariaLabel={`Nearby ${serviceTitle} businesses around ${displayLocality}`}
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
                          ? `listing within ${radiusKm} km (nearest first)`
                          : `listings within ${radiusKm} km (nearest first)`
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
              <div className={s.emptyBox} role="status">
                <p className={s.emptyTitle}>
                  <UiText
                    value={`No listings found within ${radiusKm} km — try expanding your radius`}
                  />
                </p>
                {largerRadii.length > 0 && (
                  <div className={s.emptyRadiusActions}>
                    {largerRadii.map(nextRadius => (
                      <button
                        key={nextRadius}
                        type="button"
                        className={s.expandRadiusBtn}
                        onClick={() => setRadiusKm(nextRadius)}
                      >
                        Try {nextRadius} km
                      </button>
                    ))}
                  </div>
                )}
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
                  const websiteUrl = websiteExternalHref(item.website_url);
                  const isMoreOpen = openMoreKey === itemKey;
                  const moreOptions = isMoreOpen ? getMoreOptionsForListing(item) : [];
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
                          className={`${s.actionBtn} ${s.secondaryNavyBtn}`}
                        >
                          <Navigation size={14} aria-hidden="true" />
                          <UiText value="Directions" />
                        </a>
                        {websiteUrl && (
                          <a
                            href={websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${s.actionBtn} ${s.secondaryNavyBtn}`}
                          >
                            <Globe size={14} aria-hidden="true" />
                            <UiText value="Website" />
                          </a>
                        )}
                        <div
                          className={s.moreWrap}
                          ref={isMoreOpen ? moreContainerRef : undefined}
                        >
                          <button
                            type="button"
                            className={`${s.actionBtn} ${s.moreBtn}`}
                            aria-haspopup="menu"
                            aria-expanded={isMoreOpen}
                            aria-label={`More options for ${item.company || item.name}`}
                            onClick={() =>
                              setOpenMoreKey(prev => (prev === itemKey ? null : itemKey))
                            }
                          >
                            <MoreHorizontal size={15} aria-hidden="true" />
                            <UiText value="More Options" />
                          </button>
                          {isMoreOpen && (
                            <div
                              className={s.morePopover}
                              role="menu"
                              aria-label={`More options for ${item.company || item.name}`}
                            >
                              <div className={s.morePopoverHeader}>
                                <span className={s.morePopoverTitle}>
                                  {item.company || item.name}
                                </span>
                                <button
                                  type="button"
                                  className={s.moreCloseBtn}
                                  aria-label="Close options menu"
                                  onClick={() => setOpenMoreKey(null)}
                                >
                                  <X size={13} aria-hidden="true" />
                                </button>
                              </div>
                              {moreOptions.map(opt => (
                                <Link
                                  key={opt.id}
                                  href={opt.href}
                                  role="menuitem"
                                  className={s.moreMenuItem}
                                  onClick={() => setOpenMoreKey(null)}
                                >
                                  <UiText value={opt.label} />
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
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
