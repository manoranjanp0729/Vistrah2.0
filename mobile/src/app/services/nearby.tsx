import { useDirectMarketplace } from '../../lib/direct-marketplace';
import { useEffect } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { MobileNearbyServiceDiscovery } from '../../components/nearby-service-discovery';
import { Text } from '../../components/typography';
import { Action, Heading } from '../../components/ui';
import { UiElement } from '../../components/localized-ui';
import { useLanguage } from '../../lib/language';
import { marketplaceItemId } from '../../lib/marketplace';
import { FLAGSHIP_SECTORS } from '../../../../shared/flagship-sectors';
import { spacing, useTheme } from '../../lib/theme';

export default function NearbyServicesScreen() {
  const { resolveMarketplaceSelection, legacyMarketplaceSelection, marketplaceCategories } =
    useDirectMarketplace();
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
