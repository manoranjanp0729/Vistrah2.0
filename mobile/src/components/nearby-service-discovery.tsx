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
import { FLAGSHIP_SECTORS } from '../../../shared/flagship-sectors';
import {
  NEARBY_DISCOVERY_RADII,
  buildListingMoreOptions,
  buildNearbyMarketplacePath,
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
  typeSlug: string;
  serviceTitle: string;
}) {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const locCtx = useOptionalLocation();
  const session = useSession(false);
  const currentUser = session.user;
  const [sectorQuery, setSectorQuery] = useState('');
  const quickServiceHits = useMemo(
    () =>
      sectorQuery.trim()
        ? searchMarketplaceEntries(sectorQuery).filter(entry => Boolean(entry.selection.type)).slice(0, 6)
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
    api<NearbyServicesResponse>(path)
      .then(res => {
        if (!alive) return;
        const nextItems = res.items ?? [];
        setState({
          key: requestKey,
          items: nextItems,
          hasGooglePlaces: Boolean(
            res.has_google_places ||
              nextItems.some(item => item.source === 'google_places'),
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
  }, [categorySlug, subcategorySlug, typeSlug, activePoint.latitude, activePoint.longitude, radiusKm, requestKey]);

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

  return (
    <View style={s.container}>
      {/* 10 Unified Sectors Filter Pills + Fast Child Service Search */}
      <View
        style={[
          s.controlCard,
          {
            backgroundColor: isDark ? '#181426' : '#ffffff',
            borderColor: isDark ? '#32264b' : '#e2d8ef',
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
            borderColor: isDark ? '#32264b' : '#cbd5e1',
            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
          }}
        >
          <Feather name="search" size={14} color={colors.muted} />
          <TextInput
            value={sectorQuery}
            onChangeText={setSectorQuery}
            placeholder="Search child services across 10 sectors…"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Search child service types"
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
              borderColor: isDark ? '#32264b' : '#e2e8f0',
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
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
                  borderBottomColor: isDark ? '#1e293b' : '#e2e8f0',
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
                      subcategory: sector.defaultSubcategorySlug,
                      type: sector.defaultTypeSlug,
                    },
                  })
                }
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  borderWidth: 1,
                  backgroundColor: active ? '#0f172a' : isDark ? '#241c36' : '#f8fafc',
                  borderColor: active
                    ? 'rgba(212,175,55,0.75)'
                    : isDark
                      ? '#382a53'
                      : '#cbd5e1',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: active ? '#f8e7b0' : colors.text,
                  }}
                >
                  {sector.title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Header Bar: Nearby Title + Active Location Pill + Segmented Radius Filter */}
      <View
        style={[
          s.controlCard,
          {
            backgroundColor: isDark ? '#181426' : '#ffffff',
            borderColor: isDark ? '#32264b' : '#e2d8ef',
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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change search location"
            onPress={() => router.push('/location')}
            style={({ pressed }) => [
              s.locationPill,
              {
                backgroundColor: isDark ? 'rgba(212,175,55,0.15)' : 'rgba(212,175,55,0.18)',
                borderColor: 'rgba(212,175,55,0.45)',
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather name="map-pin" size={12} color="#d4af37" />
            <Text
              numberOfLines={1}
              style={[s.locationPillText, { color: isDark ? '#f8fafc' : '#0f172a' }]}
            >
              {locCtx?.detecting
                ? 'Locating…'
                : activePoint.hasCustomLocation
                  ? activePoint.locality
                  : `${activePoint.locality} · Change`}
            </Text>
          </Pressable>
        </View>

        {/* Segmented Radius Selector: 5 km / 10 km / 25 km / 50 km */}
        <View
          accessibilityRole="radiogroup"
          style={[
            s.radiusTrack,
            {
              backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
              borderColor: isDark ? '#2d3748' : '#e2e8f0',
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
                style={[s.radiusChip, active && { backgroundColor: '#d4af37' }]}
              >
                <Text
                  style={[
                    s.radiusChipText,
                    {
                      color: active ? '#0f172a' : colors.muted,
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
            backgroundColor: isDark ? 'rgba(212,175,55,0.09)' : '#fffbeb',
            borderColor: isDark ? 'rgba(212,175,55,0.42)' : 'rgba(180,134,11,0.38)',
          },
        ]}
      >
        <Text style={[s.compactBannerText, { color: colors.text }]}>
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
                type: typeSlug,
              },
            })
          }
          style={({ pressed }) => [s.primaryOnboardBtn, { opacity: pressed ? 0.88 : 1 }]}
        >
          <Feather name="plus" size={14} color="#0f172a" />
          <Text style={s.primaryOnboardText}>+ List Free on VISTRAH</Text>
        </Pressable>
      </View>

      {/* Interactive Map Stage */}
      <VistrahMobileMap
        center={{ latitude: activePoint.latitude, longitude: activePoint.longitude }}
        radiusKm={radiusKm}
        markers={markers}
        selectedId={selectedId}
        hideSelectedCard
        height={270}
        onSelectMarker={id => setSelectedId(id)}
      />

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
                    ? `nearby place within ${radiusKm} km`
                    : `nearby places within ${radiusKm} km`
                }
              />
            </>
          )}
        </Text>
        {selectedId !== null && (
          <Pressable onPress={() => setSelectedId(null)}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accent }}>
              <UiText value="Clear pin" />
            </Text>
          </Pressable>
        )}
      </View>

      {Boolean(error) && (
        <View
          style={[
            s.errorBox,
            {
              backgroundColor: isDark ? '#2c151b' : '#fef2f2',
              borderColor: isDark ? '#7f1d1d' : '#fecaca',
            },
          ]}
        >
          <Text style={{ fontSize: 13, color: isDark ? '#fca5a5' : '#991b1b' }}>{error}</Text>
        </View>
      )}

      {!loading && !error && items.length === 0 && (
        <View
          style={[
            s.emptyNotice,
            {
              backgroundColor: isDark ? '#1a1429' : '#ffffff',
              borderColor: isDark ? '#33264d' : '#e4daef',
            },
          ]}
        >
          <Text style={{ fontSize: 13, lineHeight: 19, color: colors.muted }}>
            <UiText
              value={`No ${serviceTitle} places found within ${radiusKm} km of ${activePoint.locality}. Tap 25 km or 50 km above to expand your search radius.`}
            />
          </Text>
        </View>
      )}

      {/* Unified Distance-Sorted Cards (VISTRAH Verified first, then Google Places) */}
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
                backgroundColor: isDark ? '#1a1429' : '#ffffff',
                borderColor: isSelected ? '#d4af37' : isDark ? '#33264d' : '#e4daef',
                borderWidth: isSelected ? 2 : 1,
                opacity: pressed ? 0.94 : 1,
              },
            ]}
          >
            <View style={s.bizTopRow}>
              {/* Shop Photo Thumbnail or Crisp Division-Themed Fallback Icon Tile */}
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
                      <Feather name="check-circle" size={11} color="#10b981" />
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
                          backgroundColor: isDark ? 'rgba(56,189,248,0.14)' : '#f0f9ff',
                          borderColor: isDark
                            ? 'rgba(56,189,248,0.32)'
                            : 'rgba(3,105,161,0.24)',
                        },
                      ]}
                    >
                      <Feather
                        name="map-pin"
                        size={11}
                        color={isDark ? '#7dd3fc' : '#0369a1'}
                      />
                      <Text
                        style={[
                          s.nearbyPlaceText,
                          { color: isDark ? '#7dd3fc' : '#0369a1' },
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

            {/* Direct Actions: Call (whenever phone is present) + WhatsApp (VISTRAH sellers) + Directions */}
            <View style={s.actionRow}>
              {Boolean(callUrl) && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${item.company || item.name}`}
                  onPress={() => void Linking.openURL(callUrl!)}
                  style={({ pressed }) => [
                    s.actionBtn,
                    { backgroundColor: '#0f172a', opacity: pressed ? 0.85 : 1 },
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
                      backgroundColor: isDark ? 'rgba(34,197,94,0.16)' : '#ecfdf5',
                      borderWidth: 1,
                      borderColor: 'rgba(34,197,94,0.4)',
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="logo-whatsapp"
                    size={14}
                    color={isDark ? '#4ade80' : '#15803d'}
                  />
                  <Text
                    style={{
                      color: isDark ? '#4ade80' : '#15803d',
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
                    backgroundColor: isDark ? '#251c38' : '#f8fafc',
                    borderWidth: 1,
                    borderColor: isDark ? '#3d2f5a' : '#cbd5e1',
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Feather name="navigation" size={13} color={colors.text} />
                <Text style={{ color: colors.text, fontSize: 12.5, fontWeight: '600' }}>
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
                      backgroundColor: isDark ? '#251c38' : '#f8fafc',
                      borderWidth: 1,
                      borderColor: isDark ? '#3d2f5a' : '#cbd5e1',
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Feather name="globe" size={13} color={colors.text} />
                  <Text style={{ color: colors.text, fontSize: 12.5, fontWeight: '600' }}>
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
                    backgroundColor: isDark ? '#251c38' : '#f8fafc',
                    borderWidth: 1,
                    borderColor: isDark ? '#3d2f5a' : '#cbd5e1',
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Feather name="more-horizontal" size={14} color={colors.text} />
                <Text style={{ color: colors.text, fontSize: 12.5, fontWeight: '600' }}>More</Text>
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
                backgroundColor: isDark ? '#181426' : '#ffffff',
                borderColor: isDark ? 'rgba(212,175,55,0.4)' : '#e2e8f0',
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
                        backgroundColor: isDark ? '#251c38' : '#f8fafc',
                        borderColor: isDark ? '#3d2f5a' : '#e2e8f0',
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.text }}>
                      {opt.label}
                    </Text>
                    <Feather name="chevron-right" size={15} color={colors.accent} />
                  </Pressable>
                ))}

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setActiveMoreItem(null)}
                  style={({ pressed }) => [
                    s.sheetCancelBtn,
                    {
                      borderColor: isDark ? '#3d2f5a' : '#cbd5e1',
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
            borderColor: isDark ? '#2e2444' : '#e2e8f0',
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
    fontSize: 12.5,
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
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
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
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    flexShrink: 0,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f8e7b0',
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
    backgroundColor: '#d4af37',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.55)',
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
    color: '#0f172a',
  },
});
