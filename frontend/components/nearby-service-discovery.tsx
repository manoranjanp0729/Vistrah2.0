'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  LocateFixed,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Plus,
} from 'lucide-react';
import { api } from '@/lib/api';
import { LatestSearch, validPoint } from '@/lib/location';
import {
  NEARBY_DISCOVERY_RADII,
  buildNearbyMarketplacePath,
  formatDistanceAway,
  googleMapsDirectionsHrefForPin,
  googleMapsHybridSearchHref,
  normalizeNearbyRadius,
  phoneCallHref,
  whatsappChatHref,
  type NearbyBusinessItem,
  type NearbyDiscoveryRadius,
  type NearbyServicesResponse,
} from '../../shared/nearby-services';
import { selfOnboardingUrl } from '../../shared/self-onboarding';
import { defaultMapPoint, useOptionalCustomerLocation } from './customer-location';
import { UiText } from './localized-ui';
import { MapListViewToggle, VistrahMap, type VistrahMapMarker } from './vistrah-google-maps';
import s from './nearby-service-discovery.module.css';

export function NearbyServiceDiscovery({
  categorySlug,
  categoryTitle,
  typeSlug,
  serviceTitle,
}: {
  categorySlug: string;
  categoryTitle: string;
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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [state, setState] = useState<{
    key: string;
    items: NearbyBusinessItem[];
    error: string;
  } | null>(null);

  const searchRunner = useRef(new LatestSearch());
  const requestKey = `${categorySlug}:${typeSlug}:${activePoint.latitude.toFixed(5)}:${activePoint.longitude.toFixed(5)}:${radiusKm}:${locCtx?.locationRevision ?? 0}`;

  useEffect(() => {
    let alive = true;
    const path = buildNearbyMarketplacePath({
      category: categorySlug,
      businessType: typeSlug,
      latitude: activePoint.latitude,
      longitude: activePoint.longitude,
      radiusKm,
    });
    searchRunner.current
      .run(signal => api<NearbyServicesResponse>(path, { signal }))
      .then(res => {
        if (alive && res.current) {
          setState({
            key: requestKey,
            items: res.value.items ?? [],
            error: '',
          });
          setSelectedId(prev =>
            prev != null && res.value.items.some(item => item.id === prev) ? prev : null,
          );
        }
      })
      .catch(err => {
        if (alive) {
          setState({
            key: requestKey,
            items: [],
            error: (err as Error).message || 'Could not load nearby businesses.',
          });
        }
      });

    const current = searchRunner.current;
    return () => {
      alive = false;
      current.cancel();
    };
  }, [categorySlug, typeSlug, activePoint.latitude, activePoint.longitude, radiusKm, requestKey]);

  const loading = state?.key !== requestKey;
  const items = state?.key === requestKey ? state.items : [];
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
        badge: item.verification_status === 'VERIFIED' ? 'Verified on VISTRAH' : undefined,
        actionLabel: 'Directions',
        actionHref: googleMapsDirectionsHrefForPin(item.latitude, item.longitude),
      })),
    [items],
  );

  function selectListing(id: number, scrollCard = false) {
    setSelectedId(id);
    if (scrollCard && typeof document !== 'undefined') {
      document.getElementById(`nearby-biz-card-${id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }

  const onboardHref = selfOnboardingUrl({ category: categorySlug, type: typeSlug });
  const googleMapsSearchUrl = googleMapsHybridSearchHref(
    serviceTitle,
    activePoint.locality,
    activePoint.latitude,
    activePoint.longitude,
  );
  const showHybridPrompt = !loading && !error && items.length < 3;

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
              <span>
                {locCtx?.detecting ? 'Locating…' : activePoint.locality}
              </span>
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

      {/* Interactive Map + Synchronized Distance-Sorted Listings */}
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
                if (typeof id === 'number') {
                  if (viewMode === 'map') setViewMode('split');
                  selectListing(id, true);
                }
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
                          ? `verified business within ${radiusKm} km`
                          : `verified businesses within ${radiusKm} km`
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

            {items.length > 0 && (
              <div className={s.cardsScroll}>
                {items.map(item => {
                  const isSelected = selectedId === item.id;
                  const callUrl = phoneCallHref(item.phone);
                  const waUrl = whatsappChatHref(
                    item.whatsapp || item.phone,
                    serviceTitle,
                    item.company || item.name,
                  );
                  const directionsUrl = googleMapsDirectionsHrefForPin(
                    item.latitude,
                    item.longitude,
                  );

                  return (
                    <article
                      id={`nearby-biz-card-${item.id}`}
                      key={item.id}
                      className={`${s.businessCard} ${isSelected ? s.businessCardSelected : ''}`}
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => selectListing(item.id, false)}
                    >
                      <div className={s.cardTop}>
                        <div>
                          <h3 className={s.businessName}>{item.company || item.name}</h3>
                          <div className={s.badgesRow}>
                            {item.verification_status === 'VERIFIED' && (
                              <span className={s.verifiedBadge}>
                                <CheckCircle2 size={12} aria-hidden="true" />
                                <UiText value="Verified" />
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
                        </div>
                        <span className={s.distanceBadge}>
                          {formatDistanceAway(item.distance_km)}
                        </span>
                      </div>

                      <p className={s.metaLine}>
                        {item.address ? `${item.address} · ${item.location}` : item.location}
                      </p>

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

            {/* Zero-Result / Hybrid Discovery State (< 3 listings) */}
            {showHybridPrompt && (
              <div className={s.hybridCard} data-hybrid-discovery="true">
                <p className={s.hybridEyebrow}>
                  <UiText value="LOCAL NETWORK EXPANDING" />
                </p>
                <h3 className={s.hybridTitle}>
                  {items.length === 0 ? (
                    <>
                      <UiText value="No" /> {serviceTitle}{' '}
                      <UiText value={`businesses listed within ${radiusKm} km of ${activePoint.locality} yet`} />
                    </>
                  ) : (
                    <>
                      <UiText value={`Do you run a ${serviceTitle} business near ${activePoint.locality}?`} />
                    </>
                  )}
                </h3>
                <p className={s.hybridCopy}>
                  <UiText value="Onboard your business in 3 minutes so nearby customers can call, WhatsApp, and navigate directly to you—with 90 days free Basic membership and 30 days V Ads at ₹0." />
                </p>
                <div className={s.hybridActions}>
                  <Link href={onboardHref} className={s.onboardCta}>
                    <Plus size={16} aria-hidden="true" />
                    <UiText value="+ Add Your Business" />
                  </Link>
                  <a
                    href={googleMapsSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={s.mapsFallbackLink}
                  >
                    <UiText value="Open in Google Maps" />
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
