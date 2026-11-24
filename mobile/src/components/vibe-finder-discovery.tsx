import { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { api, getApiBase } from '../lib/api';
import { useOptionalLocation } from '../lib/location';
import { marketplacePhotos } from '../lib/marketplace-photos';
import { useTheme } from '../lib/theme';
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
} from '../../../shared/nearby-services';
import {
  DEFAULT_VIBE_RADIUS_KM,
  VIBE_FINDER_RADIUS_OPTIONS_KM,
  VIBE_MOODS,
  dedupeAndSortVibeListings,
  getVibeMoodById,
} from '../../../shared/vibe-finder';
import { UiText } from './localized-ui';
import { Text, TextInput } from './typography';

const DEFAULT_POINT = {
  latitude: 12.9716,
  longitude: 77.5946,
  locality: 'Bengaluru',
};

export function MobileVibeFinderDiscovery({ initialMoodId = 'all-vibes' }: { initialMoodId?: string }) {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const locCtx = useOptionalLocation();

  const [moodId, setMoodId] = useState<string>(() => getVibeMoodById(initialMoodId).id);
  const [radiusKm, setRadiusKm] = useState<NearbyDiscoveryRadius>(() =>
    normalizeNearbyRadius(locCtx?.selectedLocation?.radiusKm ?? DEFAULT_VIBE_RADIUS_KM),
  );
  const [search, setSearch] = useState('');
  const [failedPhotos, setFailedPhotos] = useState<Record<string, boolean>>({});

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
      };
    }
    return DEFAULT_POINT;
  }, [locCtx?.selectedLocation]);

  const activeMood = useMemo(() => getVibeMoodById(moodId), [moodId]);

  const [state, setState] = useState<{
    loading: boolean;
    items: NearbyBusinessItem[];
    error: string;
  }>({ loading: true, items: [], error: '' });

  useEffect(() => {
    let alive = true;
    setState(prev => ({ ...prev, loading: true, error: '' }));

    Promise.all(
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
        ).then(r => r.items ?? []),
      ),
    )
      .then(batches => {
        if (!alive) return;
        setState({
          loading: false,
          items: dedupeAndSortVibeListings(batches),
          error: '',
        });
      })
      .catch(err => {
        if (!alive) return;
        setState({
          loading: false,
          items: [],
          error: (err as Error).message || 'Could not load nearby vibes right now.',
        });
      });

    return () => {
      alive = false;
    };
  }, [activeMood, activePoint.latitude, activePoint.longitude, radiusKm, locCtx?.locationRevision]);

  const filteredItems = useMemo(
    () => (search.trim() ? dedupeAndSortVibeListings([state.items], search) : state.items),
    [state.items, search],
  );

  const primaryQuery = activeMood.queries[0] ?? { category: 'vibe-finder' };
  const openMap = () => {
    router.push({
      pathname: '/services/nearby',
      params: {
        category: primaryQuery.category,
        ...(primaryQuery.serviceType
          ? { subcategory: primaryQuery.serviceType, type: primaryQuery.serviceType }
          : {}),
      },
    });
  };

  return (
    <View style={s.page} testID="vibe-finder-screen">
      {/* VISTRAH Navy + Orange Vibe Finder Hero */}
      <LinearGradient
        colors={['#091B33', '#0F294A', '#163A66']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <Text style={s.heroEyebrow}>
          <UiText value="Discover. Connect. Grow." />
        </Text>
        <Text accessibilityRole="header" style={s.heroTitle}>
          <UiText value="Vibe Finder" />
        </Text>
        <Text style={s.heroSubtitle}>
          <UiText value="Pick your mood to explore cinemas, live social events, specialty cafes, evening hangouts, and weekend getaways around you." />
        </Text>

        <View style={s.heroActionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={openMap}
            style={({ pressed }) => [s.primaryBtn, { opacity: pressed ? 0.88 : 1 }]}
          >
            <Feather name="map-pin" size={14} color="#ffffff" />
            <Text style={s.primaryBtnText}>
              <UiText value="Explore on Map" />
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({ pathname: '/seller/onboard', params: { category: 'vibe-finder' } })
            }
            style={({ pressed }) => [s.secondaryHeroBtn, { opacity: pressed ? 0.88 : 1 }]}
          >
            <Text style={s.secondaryHeroBtnText}>
              <UiText value="List Your Venue Free" />
            </Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* Search, GPS Location & Mood / Radius Filter Controls */}
      <View
        style={[
          s.controlsCard,
          {
            backgroundColor: isDark ? '#0f233d' : '#ffffff',
            borderColor: isDark ? '#1e3a5f' : '#e2e8f0',
          },
        ]}
      >
        <View
          style={[
            s.searchWrap,
            {
              backgroundColor: isDark ? '#09192e' : '#f8fafc',
              borderColor: isDark ? '#1e3a5f' : '#cbd5e1',
            },
          ]}
        >
          <Feather name="search" size={16} color="#F97316" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Filter theatres, cafes, social events..."
            placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
            accessibilityLabel="Search Vibe Finder places"
            style={[s.searchInput, { color: colors.text }]}
          />
          {Boolean(search.trim()) && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Feather name="x-circle" size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>

        <View style={s.locationBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Feather name="map-pin" size={14} color="#F97316" />
            <Text numberOfLines={1} style={[s.localityText, { color: colors.text }]}>
              {activePoint.locality}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={Boolean(locCtx?.detecting)}
            onPress={() => void locCtx?.requestCurrentGps({ showAlertOnDenied: true })}
            style={({ pressed }) => [
              s.gpsBtn,
              { opacity: locCtx?.detecting ? 0.7 : pressed ? 0.86 : 1 },
            ]}
          >
            <Feather name="crosshair" size={13} color="#ffffff" />
            <Text style={s.gpsBtnText}>{locCtx?.detecting ? 'Locating…' : 'Use GPS'}</Text>
          </Pressable>
        </View>

        {Boolean(locCtx?.gpsError) && (
          <Text style={{ fontSize: 12.5, color: '#EA580C' }}>{locCtx?.gpsError}</Text>
        )}

        {/* Mood / Vibe Selector Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pillsScroll}
        >
          {VIBE_MOODS.map(mood => {
            const selected = mood.id === activeMood.id;
            return (
              <Pressable
                key={mood.id}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setMoodId(mood.id)}
                style={[
                  s.pill,
                  selected
                    ? s.moodPillActive
                    : {
                        backgroundColor: isDark ? '#09192e' : '#f8fafc',
                        borderColor: isDark ? '#1e3a5f' : '#cbd5e1',
                      },
                ]}
              >
                <Feather
                  name={mood.icon}
                  size={13}
                  color={selected ? '#ffffff' : '#F97316'}
                />
                <Text
                  style={[
                    s.pillText,
                    { color: selected ? '#ffffff' : colors.text },
                  ]}
                >
                  {mood.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Radius Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pillsScroll}
        >
          {VIBE_FINDER_RADIUS_OPTIONS_KM.map(km => {
            const selected = radiusKm === km;
            return (
              <Pressable
                key={km}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setRadiusKm(km)}
                style={[
                  s.pill,
                  selected
                    ? s.radiusPillActive
                    : {
                        backgroundColor: isDark ? '#09192e' : '#f8fafc',
                        borderColor: isDark ? '#1e3a5f' : '#cbd5e1',
                      },
                ]}
              >
                <Text
                  style={[
                    s.pillText,
                    { color: selected ? '#ffffff' : colors.text },
                  ]}
                >
                  {km} km
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={[s.moodSubtitle, { color: colors.muted }]}>{activeMood.subtitle}</Text>
      </View>

      {/* Results Header */}
      <View style={s.resultsHeader}>
        <Text accessibilityRole="header" style={[s.resultsTitle, { color: colors.text }]}>
          {activeMood.label}
        </Text>
        <Text style={[s.resultsCount, { color: colors.muted }]}>
          {state.loading
            ? 'Finding places…'
            : `${filteredItems.length} ${filteredItems.length === 1 ? 'place' : 'places'} within ${radiusKm} km`}
        </Text>
      </View>

      {/* Matching Places & Experiences */}
      {state.error ? (
        <View
          style={[
            s.emptyCard,
            {
              backgroundColor: isDark ? '#0f233d' : '#f8fafc',
              borderColor: isDark ? '#1e3a5f' : '#e2e8f0',
            },
          ]}
        >
          <Text style={[s.cardMeta, { color: colors.muted, textAlign: 'center' }]}>
            {state.error}
          </Text>
          <Pressable onPress={openMap} style={s.primaryBtn}>
            <Text style={s.primaryBtnText}>Open Nearby Map</Text>
          </Pressable>
        </View>
      ) : state.loading ? (
        <View
          style={[
            s.emptyCard,
            {
              backgroundColor: isDark ? '#0f233d' : '#f8fafc',
              borderColor: isDark ? '#1e3a5f' : '#e2e8f0',
            },
          ]}
        >
          <Text style={[s.cardMeta, { color: colors.muted }]}>
            Loading matching places and experiences…
          </Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View
          style={[
            s.emptyCard,
            {
              backgroundColor: isDark ? '#0f233d' : '#f8fafc',
              borderColor: isDark ? '#1e3a5f' : '#e2e8f0',
            },
          ]}
        >
          <Feather name="compass" size={26} color="#F97316" />
          <Text style={[s.cardTitle, { color: colors.text, textAlign: 'center' }]}>
            No listings found within {radiusKm} km — try expanding your radius
          </Text>
          <Text style={[s.cardMeta, { color: colors.muted, textAlign: 'center' }]}>
            Switch to a wider radius or explore another vibe near {activePoint.locality}.
          </Text>
          {radiusKm < 50 && (
            <Pressable onPress={() => setRadiusKm(50)} style={s.gpsBtn}>
              <Text style={s.gpsBtnText}>Expand to 50 km</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {filteredItems.map(item => {
            const key = String(item.id);
            const resolvedUri = resolveListingPhotoUri(item.photo_url, safeApiBase);
            const fallbackBundled =
              marketplacePhotos[activeMood.photoKey as keyof typeof marketplacePhotos];
            const showRemote = Boolean(resolvedUri) && !failedPhotos[key];
            const telHref = phoneCallHref(item.phone);
            const webHref = websiteExternalHref(item.website_url);
            const dirHref = googleMapsDirectionsHrefForPin(
              item.latitude,
              item.longitude,
              item.directions_url,
            );

            return (
              <View
                key={key}
                style={[
                  s.card,
                  {
                    backgroundColor: isDark ? '#0f233d' : '#ffffff',
                    borderColor: isDark ? '#1e3a5f' : '#e2e8f0',
                  },
                ]}
              >
                <View style={s.photoWrap}>
                  {showRemote ? (
                    <Image
                      source={{ uri: resolvedUri! }}
                      resizeMode="cover"
                      accessibilityLabel={item.company || item.name}
                      onError={() =>
                        setFailedPhotos(prev => (prev[key] ? prev : { ...prev, [key]: true }))
                      }
                      style={s.photoImg}
                    />
                  ) : fallbackBundled ? (
                    <Image
                      source={fallbackBundled}
                      resizeMode="cover"
                      accessibilityLabel={item.company || item.name}
                      style={s.photoImg}
                    />
                  ) : (
                    <LinearGradient
                      colors={['#091B33', '#0F294A', '#163A66']}
                      style={s.photoFallback}
                    >
                      <Feather name="compass" size={28} color="#F97316" />
                    </LinearGradient>
                  )}

                  <View style={s.badgeStrip}>
                    {typeof item.distance_km === 'number' ? (
                      <View style={s.distanceBadge}>
                        <Text style={s.badgeText}>{formatDistanceAway(item.distance_km)}</Text>
                      </View>
                    ) : (
                      <View />
                    )}
                    {item.source === 'vistrah' && (
                      <View style={s.verifiedBadge}>
                        <Text style={s.badgeText}>Verified</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={s.cardBody}>
                  <Text style={s.cardCategory}>
                    {item.service_title || activeMood.shortLabel}
                  </Text>
                  <Text style={[s.cardTitle, { color: colors.text }]}>
                    {item.company || item.name}
                  </Text>

                  {Boolean(item.address || item.location) && (
                    <Text style={[s.cardMeta, { color: colors.muted }]}>
                      {item.address || item.location}
                    </Text>
                  )}

                  <View style={s.cardActions}>
                    {telHref && (
                      <Pressable
                        accessibilityRole="link"
                        onPress={() => void Linking.openURL(telHref)}
                        style={s.actionPrimary}
                      >
                        <Feather name="phone" size={13} color="#ffffff" />
                        <Text style={s.actionPrimaryText}>Call</Text>
                      </Pressable>
                    )}

                    <Pressable
                      accessibilityRole="link"
                      onPress={() => void Linking.openURL(dirHref)}
                      style={[
                        s.actionSecondary,
                        {
                          backgroundColor: isDark ? '#09192e' : '#f8fafc',
                          borderColor: isDark ? '#1e3a5f' : '#cbd5e1',
                        },
                      ]}
                    >
                      <Feather name="navigation" size={13} color={colors.text} />
                      <Text style={[s.actionSecondaryText, { color: colors.text }]}>
                        Directions
                      </Text>
                    </Pressable>

                    {webHref && (
                      <Pressable
                        accessibilityRole="link"
                        onPress={() => void Linking.openURL(webHref)}
                        style={[
                          s.actionSecondary,
                          {
                            backgroundColor: isDark ? '#09192e' : '#f8fafc',
                            borderColor: isDark ? '#1e3a5f' : '#cbd5e1',
                          },
                        ]}
                      >
                        <Feather name="globe" size={13} color={colors.text} />
                        <Text style={[s.actionSecondaryText, { color: colors.text }]}>
                          Website
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: {
    gap: 16,
    paddingBottom: 24,
  },
  hero: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    gap: 8,
  },
  heroEyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FB923C',
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: '#ffffff',
  },
  heroSubtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#CBD5E1',
  },
  heroActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F97316',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
  secondaryHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  secondaryHeroBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '600',
  },
  controlsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  localityText: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0F294A',
  },
  gpsBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  pillsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  moodPillActive: {
    backgroundColor: '#F97316',
    borderColor: '#EA580C',
  },
  radiusPillActive: {
    backgroundColor: '#0F294A',
    borderColor: '#0F294A',
  },
  pillText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  moodSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  resultsCount: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  photoWrap: {
    width: '100%',
    height: 176,
    position: 'relative',
    backgroundColor: '#0F294A',
  },
  photoImg: {
    width: '100%',
    height: 176,
  },
  photoFallback: {
    width: '100%',
    height: 176,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeStrip: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  distanceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: '#0F294A',
  },
  verifiedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: '#EA580C',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    padding: 14,
    gap: 6,
  },
  cardCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EA580C',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  actionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F97316',
  },
  actionPrimaryText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  actionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionSecondaryText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});
