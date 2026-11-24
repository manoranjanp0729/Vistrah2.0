import { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { api, getApiBase } from '../lib/api';
import { googleMapsDirectionsUrl } from '../lib/google-maps';
import { useOptionalLocation } from '../lib/location';
import { searchMarketplaceEntries } from '../lib/marketplace';
import { useSession } from '../lib/session';
import { useTheme } from '../lib/theme';
import { FLAGSHIP_SECTORS, getFlagshipSector } from '../../../shared/flagship-sectors';
import type { GooglePoint } from '../../../shared/google-location';
import {
  NEARBY_DISCOVERY_RADII,
  buildListingMoreOptions,
  buildNearbyListingsPath,
  formatDistanceAway,
  getDivisionFallbackTheme,
  googleMapsDirectionsHrefForPin,
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
} from '../../../shared/nearby-services';
import { MobilePoweredByGoogle } from './google-attribution';
import { UiText } from './localized-ui';
import { Text, TextInput } from './typography';
import { VistrahMobileMap, type MobileMapMarker } from './vistrah-mobile-map';

const DEFAULT_MOBILE_POINT = {
  latitude: 12.9716,
  longitude: 77.5946,
  locality: 'Bengaluru',
};

function approxDistanceKm(a: GooglePoint, b: GooglePoint): number {
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

function MobileDivisionGlyph({
  glyph,
  color,
}: {
  glyph: DivisionFallbackTheme['glyph'];
  color: string;
}) {
  switch (glyph) {
    case 'utensils':
      return <Ionicons name="restaurant-outline" size={22} color={color} />;
    case 'leaf':
      return <Ionicons name="leaf-outline" size={22} color={color} />;
    case 'heart':
      return <Feather name="heart" size={21} color={color} />;
    case 'tool':
      return <Feather name="tool" size={21} color={color} />;
    case 'truck':
      return <Feather name="truck" size={21} color={color} />;
    case 'layers':
      return <Feather name="layers" size={21} color={color} />;
    case 'scissors':
      return <Feather name="scissors" size={21} color={color} />;
    case 'camera':
      return <Feather name="camera" size={21} color={color} />;
    case 'book':
      return <Feather name="book-open" size={21} color={color} />;
    case 'briefcase':
      return <Feather name="briefcase" size={21} color={color} />;
    case 'compass':
      return <Feather name="compass" size={21} color={color} />;
    case 'cpu':
      return <Feather name="cpu" size={21} color={color} />;
    default:
      return <Feather name="shopping-bag" size={21} color={color} />;
  }
}

export function MobileNearbyServiceDiscovery({
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
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const locCtx = useOptionalLocation();
  const session = useSession(false);
  const currentUser = session.user;
  const [sectorQuery, setSectorQuery] = useState('');
  const activeSector = useMemo(() => getFlagshipSector(categorySlug), [categorySlug]);
  const quickServiceHits = useMemo(
    () =>
      sectorQuery.trim()
        ? searchMarketplaceEntries(sectorQuery)
            .filter(entry => Boolean(entry.selection.type))
            .slice(0, 6)
        : [],
    [sectorQuery],
  );

  const safeApiBase = useMemo(() => {
    try {
      return getApiBase();
    } catch {
      return '/api';
    }
  }, []);

  const activePoint = useMemo(() => {
    const sel = locCtx?.selectedLocation;
    if (
      sel &&
      Number.isFinite(sel.latitude) &&
      Number.isFinite(sel.longitude) &&
      Math.abs(sel.latitude) <= 90 &&
      Math.abs(sel.longitude) <= 180
    ) {
      return {
        latitude: sel.latitude,
        longitude: sel.longitude,
        locality: sel.locality || sel.city || 'Selected area',
        hasCustomLocation: true,
      };
    }
    return {
      ...DEFAULT_MOBILE_POINT,
      hasCustomLocation: false,
    };
  }, [locCtx?.selectedLocation]);

  const [customCenter, setCustomCenter] = useState<GooglePoint | null>(null);
  const [pannedCenter, setPannedCenter] = useState<GooglePoint | null>(null);

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
    normalizeNearbyRadius(locCtx?.selectedLocation?.radiusKm ?? 10),
  );
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [activeMoreItem, setActiveMoreItem] = useState<NearbyBusinessItem | null>(null);
  const [failedPhotos, setFailedPhotos] = useState<Record<string, boolean>>({});

  function getMobileMoreOptions(item: NearbyBusinessItem): ListingMoreOptionItem[] {
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

  function openMobileMoreOption(opt: ListingMoreOptionItem) {
    setActiveMoreItem(null);
    router.push({
      pathname: opt.pathname,
      params: opt.params,
    });
  }

  const [state, setState] = useState<{
    key: string;
    items: NearbyBusinessItem[];
    hasGooglePlaces: boolean;
    error: string;
  } | null>(null);

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
    api<NearbyServicesResponse>(path)
      .then(res => {
        if (!alive) return;
        const nextItems = res.items ?? [];
        setState({
          key: requestKey,
          items: nextItems,
          hasGooglePlaces: Boolean(
            res.has_google_places || nextItems.some(item => item.source === 'google_places'),
          ),
          error: '',
        });
        setSelectedId(prev =>
          prev != null && nextItems.some(item => item.id === prev) ? prev : null,
        );
      })
      .catch(err => {
        if (!alive) return;
        setState({
          key: requestKey,
          items: [],
          hasGooglePlaces: false,
          error: (err as Error).message || 'Could not load nearby businesses.',
        });
      });

    return () => {
      alive = false;
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

  const markers = useMemo<MobileMapMarker[]>(
    () =>
      items.map(item => ({
        id: item.id,
        latitude: item.latitude,
        longitude: item.longitude,
        title: item.company || item.name,
        subtitle: item.location || item.address,
        distanceKm: item.distance_km,
      })),
    [items],
  );

  const largerRadii = NEARBY_DISCOVERY_RADII.filter(r => r > radiusKm);
  const surfaceBg = isDark ? '#0F294A' : '#ffffff';
  const surfaceSubtle = isDark ? '#132F54' : '#f8fafc';
  const surfaceBorder = isDark ? 'rgba(148,163,184,0.28)' : '#cbd5e1';

  return (
    <View style={s.container}>
      {/* 10 Main Categories + Direct Service Type Filter Chips */}
      <View
        style={[
          s.controlCard,
          {
            backgroundColor: surfaceBg,
            borderColor: surfaceBorder,
            gap: 10,
          },
        ]}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 10,
            minHeight: 38,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: surfaceBorder,
            backgroundColor: surfaceSubtle,
          }}
        >
          <Feather name="search" size={14} color={colors.muted} />
          <TextInput
            value={sectorQuery}
            onChangeText={setSectorQuery}
            placeholder="Search services across 10 categories…"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Search service types"
            style={{ flex: 1, fontSize: 13, color: colors.text, paddingVertical: 6 }}
          />
          {Boolean(sectorQuery.trim()) && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear service search"
              onPress={() => setSectorQuery('')}
              hitSlop={8}
            >
              <Feather name="x-circle" size={15} color={colors.muted} />
            </Pressable>
          )}
        </View>

        {quickServiceHits.length > 0 && (
          <View
            style={{
              borderRadius: 10,
              borderWidth: 1,
              borderColor: surfaceBorder,
              backgroundColor: surfaceSubtle,
              overflow: 'hidden',
            }}
          >
            {quickServiceHits.map(hit => (
              <Pressable
                key={hit.id}
                accessibilityRole="button"
                onPress={() => {
                  setSectorQuery('');
                  router.push({
                    pathname: '/services/nearby',
                    params: {
                      category: hit.selection.category!,
                      ...(hit.selection.subcategory
                        ? { subcategory: hit.selection.subcategory }
                        : {}),
                      ...(hit.selection.type ? { type: hit.selection.type } : {}),
                    },
                  });
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  borderBottomWidth: 1,
                  borderBottomColor: surfaceBorder,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                  {hit.title}
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>{hit.path}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
        >
          {FLAGSHIP_SECTORS.map(sector => {
            const active = sector.slug === categorySlug;
            return (
              <Pressable
                key={sector.slug}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() =>
                  router.push({
                    pathname: '/services/nearby',
                    params: {
                      category: sector.slug,
                    },
                  })
                }
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  borderWidth: 1,
                  backgroundColor: active ? '#0F294A' : surfaceSubtle,
                  borderColor: active ? '#F97316' : surfaceBorder,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: active ? '#ffffff' : colors.text,
                  }}
                >
                  {sector.title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {activeSector && activeSector.serviceTypes.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: !normalizedTypeSlug }}
              onPress={() =>
                router.push({
                  pathname: '/services/nearby',
                  params: { category: activeSector.slug },
                })
              }
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                backgroundColor: !normalizedTypeSlug ? '#F97316' : surfaceSubtle,
                borderColor: !normalizedTypeSlug ? '#EA580C' : surfaceBorder,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: !normalizedTypeSlug ? '#ffffff' : colors.text,
                }}
              >
                All in {activeSector.shortTitle || activeSector.title}
              </Text>
            </Pressable>

            {activeSector.serviceTypes.map(st => {
              const active = normalizedTypeSlug === st.slug;
              return (
                <Pressable
                  key={st.slug}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() =>
                    router.push({
                      pathname: '/services/nearby',
                      params: {
                        category: activeSector.slug,
                        subcategory: st.slug,
                        type: st.slug,
                      },
                    })
                  }
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    backgroundColor: active ? '#F97316' : surfaceSubtle,
                    borderColor: active ? '#EA580C' : surfaceBorder,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: active ? '#ffffff' : colors.text,
                    }}
                  >
                    {st.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Header Bar: Nearby Title + Active Location Pill + Segmented Radius Filter */}
      <View
        style={[
          s.controlCard,
          {
            backgroundColor: surfaceBg,
            borderColor: surfaceBorder,
          },
        ]}
      >
        <View style={s.headerTopRow}>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Text accessibilityRole="header" style={[s.title, { color: colors.text }]}>
              <UiText value="Nearby " />
              {serviceTitle}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>{categoryTitle}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change search location"
              onPress={() => router.push('/location')}
              style={({ pressed }) => [
                s.locationPill,
                {
                  backgroundColor: isDark ? '#132F54' : '#fff7ed',
                  borderColor: 'rgba(249,115,22,0.5)',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Feather name="map-pin" size={12} color="#F97316" />
              <Text
                numberOfLines={1}
                style={[s.locationPillText, { color: isDark ? '#ffffff' : '#0F294A' }]}
              >
                {locCtx?.detecting
                  ? 'Locating…'
                  : activePoint.hasCustomLocation || customCenter
                    ? displayLocality
                    : `${displayLocality} · Change`}
              </Text>
            </Pressable>

            {locCtx && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Use GPS"
                disabled={locCtx.detecting}
                onPress={() => {
                  setCustomCenter(null);
                  setPannedCenter(null);
                  void locCtx.requestCurrentGps();
                }}
                style={({ pressed }) => [
                  s.gpsBtn,
                  {
                    backgroundColor: '#F97316',
                    borderColor: '#EA580C',
                    opacity: locCtx.detecting ? 0.72 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Feather name="crosshair" size={12} color="#ffffff" />
                <Text style={s.gpsBtnText}>
                  {locCtx.detecting ? 'Locating…' : 'Use GPS'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {Boolean(locCtx?.gpsError) && (
          <View
            accessibilityRole="alert"
            style={[
              s.gpsAlertRow,
              {
                backgroundColor: isDark ? 'rgba(249,115,22,0.14)' : '#fff7ed',
                borderColor: '#EA580C',
              },
            ]}
          >
            <Text style={{ flex: 1, fontSize: 12, lineHeight: 17, color: colors.text }}>
              {locCtx?.gpsError}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss location notice"
              onPress={() => locCtx?.clearGpsError()}
              hitSlop={8}
            >
              <Feather name="x" size={15} color={colors.muted} />
            </Pressable>
          </View>
        )}

        {/* Segmented Radius Selector: 2 km / 5 km / 10 km / 25 km / 50 km */}
        <View
          accessibilityRole="radiogroup"
          style={[
            s.radiusTrack,
            {
              backgroundColor: isDark ? '#132F54' : '#f1f5f9',
              borderColor: surfaceBorder,
            },
          ]}
        >
          {NEARBY_DISCOVERY_RADII.map(r => {
            const active = radiusKm === r;
            return (
              <Pressable
                key={r}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => setRadiusKm(r)}
                style={[s.radiusChip, active && { backgroundColor: '#F97316' }]}
              >
                <Text
                  style={[
                    s.radiusChipText,
                    {
                      color: active ? '#ffffff' : colors.muted,
                      fontWeight: active ? '700' : '600',
                    },
                  ]}
                >
                  {r} km
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Compact Seller Onboarding Banner (Never Blocks List) */}
      <View
        style={[
          s.compactBanner,
          {
            backgroundColor: isDark ? '#0F294A' : '#fff7ed',
            borderColor: isDark ? 'rgba(249,115,22,0.42)' : '#fed7aa',
          },
        ]}
      >
        <Text style={[s.compactBannerText, { color: isDark ? '#ffffff' : '#0F294A' }]}>
          <UiText value="Own a " />
          {serviceTitle}
          <UiText value=" business here?" />
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/seller/onboard',
              params: {
                category: categorySlug,
                ...(subcategorySlug ? { subcategory: subcategorySlug } : {}),
                ...(normalizedTypeSlug ? { type: normalizedTypeSlug } : {}),
              },
            })
          }
          style={({ pressed }) => [s.primaryOnboardBtn, { opacity: pressed ? 0.88 : 1 }]}
        >
          <Feather name="plus" size={14} color="#ffffff" />
          <Text style={s.primaryOnboardText}>List Free on VISTRAH</Text>
        </Pressable>
      </View>

      {/* Interactive Map Stage + Search Here Overlay */}
      <View style={{ position: 'relative' }}>
        {pannedCenter && (
          <View style={s.searchHereWrap} pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search Here"
              onPress={() => {
                setCustomCenter(pannedCenter);
                setPannedCenter(null);
              }}
              style={({ pressed }) => [
                s.searchHereBtn,
                { opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Feather name="search" size={13} color="#ffffff" />
              <Text style={s.searchHereText}>Search Here</Text>
            </Pressable>
          </View>
        )}
        <VistrahMobileMap
          center={{ latitude: queryCenter.latitude, longitude: queryCenter.longitude }}
          radiusKm={radiusKm}
          markers={markers}
          selectedId={selectedId}
          hideSelectedCard
          height={270}
          onViewCenterChange={pt => {
            if (approxDistanceKm(queryCenter, pt) > 0.25) {
              setPannedCenter({
                latitude: Number(pt.latitude.toFixed(6)),
                longitude: Number(pt.longitude.toFixed(6)),
              });
            } else {
              setPannedCenter(null);
            }
          }}
          onSelectMarker={id => setSelectedId(id)}
        />
      </View>

      {/* Synchronized Business List Header */}
      <View style={s.listMetaRow}>
        <Text style={{ fontSize: 13, color: colors.muted, fontVariant: ['tabular-nums'] }}>
          {loading ? (
            <UiText value="Searching nearby businesses…" />
          ) : (
            <>
              <Text style={{ fontWeight: '700', color: colors.text }}>{items.length}</Text>{' '}
              <UiText
                value={
                  items.length === 1
                    ? `listing within ${radiusKm} km (nearest first)`
                    : `listings within ${radiusKm} km (nearest first)`
                }
              />
            </>
          )}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {customCenter && (
            <Pressable
              onPress={() => {
                setCustomCenter(null);
                setPannedCenter(null);
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#F97316' }}>
                <UiText value="Reset area" />
              </Text>
            </Pressable>
          )}
          {selectedId !== null && (
            <Pressable onPress={() => setSelectedId(null)}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#F97316' }}>
                <UiText value="Clear pin" />
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {Boolean(error) && (
        <View
          style={[
            s.errorBox,
            {
              backgroundColor: isDark ? '#132F54' : '#fff7ed',
              borderColor: '#EA580C',
            },
          ]}
        >
          <Text style={{ fontSize: 13, color: isDark ? '#fed7aa' : '#9a3412' }}>{error}</Text>
        </View>
      )}

      {!loading && !error && items.length === 0 && (
        <View
          style={[
            s.emptyNotice,
            {
              backgroundColor: surfaceBg,
              borderColor: surfaceBorder,
            },
          ]}
        >
          <Text style={{ fontSize: 13.5, fontWeight: '600', lineHeight: 20, color: colors.text }}>
            <UiText
              value={`No listings found within ${radiusKm} km — try expanding your radius`}
            />
          </Text>
          {largerRadii.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {largerRadii.map(nextRadius => (
                <Pressable
                  key={nextRadius}
                  accessibilityRole="button"
                  onPress={() => setRadiusKm(nextRadius)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 999,
                    backgroundColor: '#F97316',
                    borderWidth: 1,
                    borderColor: '#EA580C',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                    Try {nextRadius} km
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Unified Nearest-First Cards */}
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
        const directionsUrl = isVistrah
          ? googleMapsDirectionsUrl(
              item.latitude,
              item.longitude,
              item.company || item.name,
            )
          : googleMapsDirectionsHrefForPin(
              item.latitude,
              item.longitude,
              item.directions_url,
            );
        const websiteUrl = websiteExternalHref(item.website_url);
        const photoUri = !failedPhotos[itemKey]
          ? resolveListingPhotoUri(item.photo_url, safeApiBase)
          : null;
        const divTheme = getDivisionFallbackTheme(item.category_slug || categorySlug);

        return (
          <Pressable
            key={itemKey}
            accessibilityRole="button"
            onPress={() => setSelectedId(item.id)}
            style={({ pressed }) => [
              s.bizCard,
              {
                backgroundColor: surfaceBg,
                borderColor: isSelected ? '#F97316' : surfaceBorder,
                borderWidth: isSelected ? 2 : 1,
                opacity: pressed ? 0.94 : 1,
              },
            ]}
          >
            <View style={s.bizTopRow}>
              <View style={s.photoSlot}>
                {photoUri ? (
                  <Image
                    source={{ uri: photoUri }}
                    accessibilityLabel={`${item.company || item.name} shop photo`}
                    resizeMode="cover"
                    onError={() =>
                      setFailedPhotos(prev => ({ ...prev, [itemKey]: true }))
                    }
                    style={s.shopPhoto}
                  />
                ) : (
                  <View
                    style={[
                      s.fallbackIconTile,
                      {
                        backgroundColor: isDark ? divTheme.bgDark : divTheme.bgLight,
                        borderColor: isDark ? divTheme.borderDark : divTheme.borderLight,
                      },
                    ]}
                  >
                    <MobileDivisionGlyph glyph={divTheme.glyph} color={divTheme.accent} />
                    <Text style={[s.fallbackLabel, { color: divTheme.accent }]}>
                      {isVistrah ? 'VISTRAH' : 'LOCAL'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                <View style={s.titleDistanceRow}>
                  <Text
                    numberOfLines={2}
                    style={[s.bizTitle, { color: colors.text, flex: 1 }]}
                  >
                    {item.company || item.name}
                  </Text>
                  <View style={s.distancePill}>
                    <Text style={s.distanceText}>{formatDistanceAway(item.distance_km)}</Text>
                  </View>
                </View>

                <View style={s.badgesRow}>
                  {isVistrah ? (
                    <View style={s.verifiedPill}>
                      <Feather name="check-circle" size={11} color="#F97316" />
                      <Text style={s.verifiedText}>
                        {item.verification_status === 'VERIFIED'
                          ? 'VISTRAH Verified'
                          : 'VISTRAH Listed'}
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        s.nearbyPlacePill,
                        {
                          backgroundColor: isDark ? '#132F54' : '#f1f5f9',
                          borderColor: surfaceBorder,
                        },
                      ]}
                    >
                      <Feather
                        name="map-pin"
                        size={11}
                        color={isDark ? '#ffffff' : '#0F294A'}
                      />
                      <Text
                        style={[
                          s.nearbyPlaceText,
                          { color: isDark ? '#ffffff' : '#0F294A' },
                        ]}
                      >
                        Nearby Place
                      </Text>
                    </View>
                  )}
                  {Boolean(item.timings) && (
                    <Text style={{ fontSize: 11, color: colors.muted }}>{item.timings}</Text>
                  )}
                </View>

                <Text
                  numberOfLines={2}
                  style={{ fontSize: 12, lineHeight: 17, color: colors.muted }}
                >
                  {item.address || item.location}
                </Text>
              </View>
            </View>

            {Boolean(item.description) && (
              <Text style={{ fontSize: 13, lineHeight: 19, color: colors.text }}>
                {item.description}
              </Text>
            )}

            {/* Direct Actions in VISTRAH Navy + Warm Orange Palette */}
            <View style={s.actionRow}>
              {Boolean(callUrl) && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${item.company || item.name}`}
                  onPress={() => void Linking.openURL(callUrl!)}
                  style={({ pressed }) => [
                    s.actionBtn,
                    {
                      backgroundColor: '#F97316',
                      borderWidth: 1,
                      borderColor: '#EA580C',
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Feather name="phone" size={13} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontSize: 12.5, fontWeight: '700' }}>Call</Text>
                </Pressable>
              )}

              {Boolean(waUrl) && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`WhatsApp ${item.company || item.name}`}
                  onPress={() => void Linking.openURL(waUrl!)}
                  style={({ pressed }) => [
                    s.actionBtn,
                    {
                      backgroundColor: isDark ? 'rgba(249,115,22,0.16)' : '#fff7ed',
                      borderWidth: 1,
                      borderColor: 'rgba(249,115,22,0.45)',
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="logo-whatsapp"
                    size={14}
                    color={isDark ? '#F97316' : '#EA580C'}
                  />
                  <Text
                    style={{
                      color: isDark ? '#F97316' : '#EA580C',
                      fontSize: 12.5,
                      fontWeight: '700',
                    }}
                  >
                    WhatsApp
                  </Text>
                </Pressable>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Directions to ${item.company || item.name}`}
                onPress={() => void Linking.openURL(directionsUrl)}
                style={({ pressed }) => [
                  s.actionBtn,
                  {
                    backgroundColor: '#0F294A',
                    borderWidth: 1,
                    borderColor: '#132F54',
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Feather name="navigation" size={13} color="#ffffff" />
                <Text style={{ color: '#ffffff', fontSize: 12.5, fontWeight: '600' }}>
                  Directions
                </Text>
              </Pressable>

              {Boolean(websiteUrl) && (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`Website for ${item.company || item.name}`}
                  onPress={() => void Linking.openURL(websiteUrl!)}
                  style={({ pressed }) => [
                    s.actionBtn,
                    {
                      backgroundColor: '#0F294A',
                      borderWidth: 1,
                      borderColor: '#132F54',
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Feather name="globe" size={13} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontSize: 12.5, fontWeight: '600' }}>
                    Website
                  </Text>
                </Pressable>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`More options for ${item.company || item.name}`}
                onPress={() => setActiveMoreItem(item)}
                style={({ pressed }) => [
                  s.actionBtn,
                  {
                    marginLeft: 'auto',
                    backgroundColor: surfaceSubtle,
                    borderWidth: 1,
                    borderColor: surfaceBorder,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Feather name="more-horizontal" size={14} color={colors.text} />
                <Text style={{ color: colors.text, fontSize: 12.5, fontWeight: '600' }}>
                  More Options
                </Text>
              </Pressable>
            </View>
          </Pressable>
        );
      })}

      {/* Extensible More Options Action Sheet */}
      <Modal
        transparent
        visible={Boolean(activeMoreItem)}
        animationType="fade"
        onRequestClose={() => setActiveMoreItem(null)}
      >
        <Pressable style={s.sheetBackdrop} onPress={() => setActiveMoreItem(null)}>
          <Pressable
            style={[
              s.sheetCard,
              {
                backgroundColor: surfaceBg,
                borderColor: isDark ? 'rgba(249,115,22,0.45)' : '#cbd5e1',
              },
            ]}
            onPress={() => {}}
          >
            {activeMoreItem && (
              <>
                <View style={s.sheetHeader}>
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 }}
                  >
                    {activeMoreItem.company || activeMoreItem.name}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close more options"
                    onPress={() => setActiveMoreItem(null)}
                    hitSlop={8}
                  >
                    <Feather name="x" size={18} color={colors.muted} />
                  </Pressable>
                </View>

                {getMobileMoreOptions(activeMoreItem).map(opt => (
                  <Pressable
                    key={opt.id}
                    accessibilityRole="button"
                    onPress={() => openMobileMoreOption(opt)}
                    style={({ pressed }) => [
                      s.sheetActionRow,
                      {
                        backgroundColor: surfaceSubtle,
                        borderColor: surfaceBorder,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.text }}>
                      {opt.label}
                    </Text>
                    <Feather name="chevron-right" size={15} color="#F97316" />
                  </Pressable>
                ))}

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setActiveMoreItem(null)}
                  style={({ pressed }) => [
                    s.sheetCancelBtn,
                    {
                      borderColor: surfaceBorder,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Close</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Official Google Attribution Footer whenever Google Places results are displayed */}
      {hasGooglePlaces && (
        <View
          style={{
            borderRadius: 10,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: surfaceBorder,
          }}
        >
          <MobilePoweredByGoogle dark={isDark} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 12,
  },
  controlCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 175,
  },
  locationPillText: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  gpsBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  gpsAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  radiusTrack: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 999,
    borderWidth: 1,
    gap: 4,
  },
  radiusChip: {
    flex: 1,
    minHeight: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusChipText: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  compactBanner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  compactBannerText: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  searchHereWrap: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    zIndex: 25,
    alignItems: 'center',
  },
  searchHereBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F97316',
    borderWidth: 1,
    borderColor: '#EA580C',
    elevation: 4,
  },
  searchHereText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  listMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 2,
  },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyNotice: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  bizCard: {
    padding: 14,
    borderRadius: 14,
    gap: 10,
  },
  bizTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  photoSlot: {
    width: 74,
    height: 74,
    borderRadius: 11,
    overflow: 'hidden',
    flexShrink: 0,
  },
  shopPhoto: {
    width: '100%',
    height: '100%',
  },
  fallbackIconTile: {
    width: '100%',
    height: '100%',
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  fallbackLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  titleDistanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  bizTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(249,115,22,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.38)',
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F97316',
  },
  nearbyPlacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  nearbyPlaceText: {
    fontSize: 11,
    fontWeight: '700',
  },
  distancePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#0F294A',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.45)',
    flexShrink: 0,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: 10,
  },
  primaryOnboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    minHeight: 34,
    borderRadius: 9,
    backgroundColor: '#F97316',
    borderWidth: 1,
    borderColor: '#EA580C',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,41,74,0.6)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  sheetCard: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingBottom: 4,
  },
  sheetActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  sheetCancelBtn: {
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  primaryOnboardText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
