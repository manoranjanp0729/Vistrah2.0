import { useDirectMarketplace } from '../../lib/direct-marketplace';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { BannerGeometry } from '../../components/banner-geometry';
import { MobileNearbyServiceDiscovery } from '../../components/nearby-service-discovery';
import { Text } from '../../components/typography';
import { Action, Heading } from '../../components/ui';
import { UiElement, UiText } from '../../components/localized-ui';
import { useBannerTheme } from '../../lib/banner-theme';
import { useLanguage } from '../../lib/language';
import { marketplaceItemId } from '../../lib/marketplace';
import { customerListingCopy } from '../../../../shared/customer-listing';
import { FLAGSHIP_SECTORS } from '../../../../shared/flagship-sectors';
import { spacing, useTheme } from '../../lib/theme';

export default function NearbyServicesScreen() {
  const { resolveMarketplaceSelection, legacyMarketplaceSelection, marketplaceCategories } =
    useDirectMarketplace();
  const banner = useBannerTheme();
  const { styles, colors } = useTheme();
  const { t, label } = useLanguage();
  const { width } = useWindowDimensions();
  const horizontalPadding = width >= 768 ? spacing.pagePaddingDesktop : spacing.pagePadding;

  const raw = useLocalSearchParams<{
    category?: string;
    subcategory?: string;
    type?: string;
    service_type?: string;
  }>();
  const cat =
    typeof raw.category === 'string' && raw.category
      ? raw.category
      : FLAGSHIP_SECTORS[0].slug;
  let sub = typeof raw.subcategory === 'string' && raw.subcategory ? raw.subcategory : undefined;
  let typ =
    typeof raw.service_type === 'string' && raw.service_type
      ? raw.service_type
      : typeof raw.type === 'string' && raw.type
        ? raw.type
        : undefined;

  if (cat && !sub && typ) {
    const matchedCat = marketplaceCategories.find(c => c.slug === cat);
    const matchedSub =
      matchedCat?.subcategories.find(s => s.listing_types.some(lt => lt.slug === typ)) ??
      matchedCat?.subcategories.find(s => s.slug === typ);
    if (matchedSub) {
      sub = matchedSub.slug;
      if (!matchedSub.listing_types.some(lt => lt.slug === typ)) {
        typ = matchedSub.listing_types[0]?.slug;
      }
    }
  } else if (cat && sub && !typ) {
    const matchedCat = marketplaceCategories.find(c => c.slug === cat);
    const matchedSub = matchedCat?.subcategories.find(s => s.slug === sub);
    if (matchedSub && matchedSub.listing_types.length > 0) {
      typ = matchedSub.listing_types[0].slug;
    }
  }

  const resolved = resolveMarketplaceSelection({ category: cat, subcategory: sub, type: typ });
  const legacy = resolved?.category
    ? null
    : legacyMarketplaceSelection({
        category: cat,
        subcategory: raw.subcategory || raw.service_type || raw.type,
        type: raw.service_type || raw.type,
      });

  useEffect(() => {
    if (legacy?.category) {
      router.replace({
        pathname: '/services/nearby',
        params: {
          category: legacy.category,
          ...(legacy.type || legacy.subcategory
            ? { service_type: (legacy.type || legacy.subcategory)! }
            : {}),
        },
      });
    }
  }, [legacy]);

  if (!resolved?.category) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.page}>
        <View style={[styles.content, { paddingHorizontal: horizontalPadding }]}>
          <UiElement as={Heading} title={t('discovery.notFound')} />
          <Text style={styles.muted}>{t('discovery.chooseValid')}</Text>
          <UiElement
            as={Action}
            secondary
            label={t('catalogue.all')}
            onPress={() => router.replace('/services')}
          />
        </View>
      </SafeAreaView>
    );
  }

  const categoryTitle = label(
    marketplaceItemId(resolved.category.slug),
    resolved.category.title,
  );
  const subcategoryTitle = resolved.subcategory
    ? label(
        marketplaceItemId(resolved.category.slug, resolved.subcategory.slug),
        resolved.subcategory.title,
      )
    : '';
  const activeType =
    resolved.listingType ??
    (resolved.subcategory ? resolved.subcategory.listing_types[0] : undefined);
  const serviceTitle = activeType && resolved.subcategory
    ? label(
        marketplaceItemId(resolved.category.slug, resolved.subcategory.slug, activeType.slug),
        activeType.title,
      )
    : subcategoryTitle || categoryTitle;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.page}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: horizontalPadding, gap: spacing.sectionGap },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.push({
                  pathname: '/services',
                  params: {
                    category: resolved.category!.slug,
                    ...(resolved.subcategory ? { subcategory: resolved.subcategory.slug } : {}),
                  },
                })
          }
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            minHeight: 36,
            paddingVertical: 4,
            opacity: pressed ? 0.72 : 1,
          })}
        >
          <Feather name="arrow-left" size={16} color={colors.accent} />
          <Text style={{ color: colors.accent, fontWeight: '600', fontSize: 13.5 }}>
            {subcategoryTitle || categoryTitle}
          </Text>
        </Pressable>

        {/* Unified 50%-Transparent VISTRAH Marketplace Hero Banner */}
        <LinearGradient
          colors={['#0F294A', '#115E59', '#134E4A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={heroStyles.hero}
        >
          <BannerGeometry />
          <View style={heroStyles.heroBadgeRow}>
            <LinearGradient
              colors={['#0F294A', '#134E4A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={heroStyles.heroBadge}
            >
              <Text style={heroStyles.heroBadgeText}>Vistrah Marketplace</Text>
            </LinearGradient>
            <View style={heroStyles.heroPill}>
              <Feather name="map-pin" size={11} color="#2DD4BF" />
              <Text style={[heroStyles.heroPillText, { color: banner.muted }]}>
                Nearby Discovery
              </Text>
            </View>
          </View>
          <Text accessibilityRole="header" style={heroStyles.heroTitle}>
            {serviceTitle}
          </Text>
          <Text style={[heroStyles.heroSubtitle, { color: banner.muted }]}>
            <UiText value={customerListingCopy.intro} />
          </Text>
        </LinearGradient>

        <MobileNearbyServiceDiscovery
          categorySlug={resolved.category.slug}
          categoryTitle={categoryTitle}
          subcategorySlug={resolved.subcategory?.slug}
          typeSlug={activeType?.slug}
          serviceTitle={serviceTitle}
        />
        <UiElement
          as={Action}
          secondary
          label={
            subcategoryTitle
              ? t('discovery.backTo', { name: subcategoryTitle })
              : t('discovery.backTo', { name: categoryTitle })
          }
          onPress={() =>
            router.push({
              pathname: '/services',
              params: {
                category: resolved.category!.slug,
                ...(resolved.subcategory ? { subcategory: resolved.subcategory.slug } : {}),
              },
            })
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const heroStyles = StyleSheet.create({
  hero: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
    padding: 18,
    gap: 8,
    backgroundColor: '#134E4A',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.32)',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(19, 78, 74, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.35)',
  },
  heroPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
});
