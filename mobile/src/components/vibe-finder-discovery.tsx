import { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { api, getApiBase } from '../lib/api';
import { useOptionalLocation } from '../lib/location';
import { marketplacePhotos } from '../lib/marketplace-photos';
import { useTheme, typography, spacing, radii, controlHeights, type ThemeColors } from '../lib/theme';
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
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
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
      <View style={s.hero}>
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
            <Feather name="map-pin" size={14} color={colors.ink} />
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
      </View>

      {/* Search, GPS Location & Mood / Radius Filter Controls */}
      <View
        style={[
          s.controlsCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            s.searchWrap,
            {
              backgroundColor: colors.soft,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather name="search" size={16} color={colors.accent} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Filter theatres, cafes, social events..."
            placeholderTextColor={colors.muted}
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
            <Feather name="map-pin" size={14} color={colors.accent} />
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
            <Feather name="crosshair" size={13} color={colors.ink} />
            <Text style={s.gpsBtnText}>{locCtx?.detecting ? 'Locating…' : 'Use GPS'}</Text>
          </Pressable>
        </View>

        {Boolean(locCtx?.gpsError) && (
          <Text style={{ fontSize: typography.supporting.fontSize, color: colors.accent }}>{locCtx?.gpsError}</Text>
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
                        backgroundColor: colors.soft,
                        borderColor: colors.border,
                      },
                ]}
              >
                <Feather
                  name={mood.icon}
                  size={13}
                  color={selected ? colors.ink : colors.accent}
                />
                <Text
                  style={[
                    s.pillText,
                    { color: selected ? colors.ink : colors.text },
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
                        backgroundColor: colors.soft,
                        borderColor: colors.border,
                      },
                ]}
              >
                <Text
                  style={[
                    s.pillText,
                    { color: selected ? colors.ink : colors.text },
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
              backgroundColor: colors.surface,
              borderColor: colors.border,
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
              backgroundColor: colors.surface,
              borderColor: colors.border,
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
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather name="compass" size={26} color={colors.accent} />
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
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
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
                    <View style={s.photoFallback}>
                      <Feather name="compass" size={28} color={colors.accent} />
                    </View>
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
                        <Feather name="phone" size={13} color={colors.ink} />
                        <Text style={s.actionPrimaryText}>Call</Text>
                      </Pressable>
                    )}

                    <Pressable
                      accessibilityRole="link"
                      onPress={() => void Linking.openURL(dirHref)}
                      style={[
                        s.actionSecondary,
                        {
                          backgroundColor: colors.soft,
                          borderColor: colors.border,
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
                            backgroundColor: colors.soft,
                            borderColor: colors.border,
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

const makeStyles = (colors:ThemeColors) => StyleSheet.create({
  page: {
    gap: spacing.pageGap,
    paddingBottom: 24,
  },
  hero: {paddingVertical:spacing.regular,borderBottomWidth:1,borderColor:colors.border,gap:spacing.fieldGap},
  heroEyebrow: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.accent,
  },
  heroTitle: {...typography.title,color:colors.text},
  heroSubtitle: {
    fontSize: typography.body.fontSize,
    lineHeight: 20,
    color: colors.muted,
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
    minHeight: controlHeights.standard,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.input,
    backgroundColor: colors.accent,
  },
  primaryBtnText: {
    color: colors.ink,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  secondaryHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: controlHeights.standard,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.tileBorder,
    backgroundColor: colors.surface,
  },
  secondaryHeroBtnText: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  controlsCard: {
    borderRadius: radii.surface,
    borderWidth: 1,
    padding: 14,
    gap: spacing.regular,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.fieldGap,
    borderWidth: 1,
    borderRadius: radii.input,
    paddingHorizontal: 12,
    minHeight: controlHeights.standard,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.body.fontSize,
    paddingVertical: 8,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  localityText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    flexShrink: 1,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: controlHeights.standard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.input,
    backgroundColor: colors.accent,
  },
  gpsBtnText: {
    color: colors.ink,
    fontSize: typography.supporting.fontSize,
    fontWeight: '600',
  },
  pillsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.fieldGap,
    paddingVertical: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: controlHeights.standard,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  moodPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  radiusPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pillText: {
    fontSize: typography.supporting.fontSize,
    fontWeight: '600',
  },
  moodSubtitle: {
    fontSize: typography.body.fontSize,
    lineHeight: 18,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.fieldGap,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  resultsCount: {
    fontSize: typography.supporting.fontSize,
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: radii.surface,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  card: {
    borderRadius: radii.surface,
    borderWidth: 1,
    overflow: 'hidden',
  },
  photoWrap: {
    width: '100%',
    height: 176,
    position: 'relative',
    backgroundColor: colors.accent,
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
    borderRadius: radii.pill,
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  verifiedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#99f6e4',
  },
  badgeText: {
    color: '#0f766e',
    fontSize: 11,
    fontWeight: '600',
  },
  cardBody: {
    padding: 14,
    gap: 6,
  },
  cardCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: typography.body.fontSize,
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.fieldGap,
    marginTop: 6,
  },
  actionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: controlHeights.standard,
    paddingHorizontal: 12,
    borderRadius: radii.input,
    backgroundColor: colors.accent,
  },
  actionPrimaryText: {
    color: colors.ink,
    fontSize: typography.supporting.fontSize,
    fontWeight: '600',
  },
  actionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: controlHeights.standard,
    paddingHorizontal: 12,
    borderRadius: radii.input,
    borderWidth: 1,
  },
  actionSecondaryText: {
    fontSize: typography.supporting.fontSize,
    fontWeight: '600',
  },
});
