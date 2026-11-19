import { useEffect } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileNearbyServiceDiscovery } from '../../components/nearby-service-discovery';
import { Text } from '../../components/typography';
import { Action, Heading } from '../../components/ui';
import { UiElement } from '../../components/localized-ui';
import { useLanguage } from '../../lib/language';
import {
  legacyMarketplaceSelection,
  marketplaceCategories,
  marketplaceItemId,
  resolveMarketplaceSelection,
} from '../../lib/marketplace';
import { FLAGSHIP_SECTORS, getFlagshipSector } from '../../../../shared/flagship-sectors';
import { spacing, useTheme } from '../../lib/theme';

export default function NearbyServicesScreen() {
  const { styles } = useTheme();
  const { t, label } = useLanguage();
  const { width } = useWindowDimensions();
  const horizontalPadding = width >= 768 ? spacing.pagePaddingDesktop : spacing.pagePadding;

  const raw = useLocalSearchParams<{ category?: string; subcategory?: string; type?: string }>();
  const cat =
    typeof raw.category === 'string' && raw.category
      ? raw.category
      : FLAGSHIP_SECTORS[0].slug;
  let sub = typeof raw.subcategory === 'string' && raw.subcategory ? raw.subcategory : undefined;
  let typ = typeof raw.type === 'string' && raw.type ? raw.type : undefined;

  if (cat && !sub && !typ) {
    const flagship = getFlagshipSector(cat);
    if (flagship) {
      sub = flagship.defaultSubcategorySlug;
      typ = flagship.defaultTypeSlug;
    } else {
      const matchedCat = marketplaceCategories.find(c => c.slug === cat);
      const firstSub = matchedCat?.subcategories[0];
      if (firstSub) {
        sub = firstSub.slug;
        typ = firstSub.listing_types[0]?.slug;
      }
    }
  } else if (cat && !sub && typ) {
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
  const legacy = resolved
    ? null
    : legacyMarketplaceSelection({
        category: cat,
        subcategory: raw.subcategory || raw.type,
        type: raw.type,
      });

  useEffect(() => {
    if (legacy?.category && (legacy.type || legacy.subcategory)) {
      router.replace({
        pathname: '/services/nearby',
        params: {
          category: legacy.category,
          ...(legacy.subcategory ? { subcategory: legacy.subcategory } : {}),
          type: legacy.type || legacy.subcategory!,
        },
      });
    }
  }, [legacy]);

  if (!resolved?.category || !resolved?.subcategory) {
    return (
      <SafeAreaView edges={['left', 'right']} style={styles.page}>
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
  const subcategoryTitle = label(
    marketplaceItemId(resolved.category.slug, resolved.subcategory.slug),
    resolved.subcategory.title,
  );
  const activeType = resolved.listingType ?? resolved.subcategory.listing_types[0];
  const serviceTitle = activeType
    ? label(
        marketplaceItemId(resolved.category.slug, resolved.subcategory.slug, activeType.slug),
        activeType.title,
      )
    : subcategoryTitle;

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.page}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: horizontalPadding, gap: spacing.sectionGap },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <MobileNearbyServiceDiscovery
          categorySlug={resolved.category.slug}
          categoryTitle={categoryTitle}
          subcategorySlug={resolved.subcategory.slug}
          typeSlug={activeType ? activeType.slug : resolved.subcategory.slug}
          serviceTitle={serviceTitle}
        />
        <UiElement
          as={Action}
          secondary
          label={t('discovery.backTo', { name: subcategoryTitle })}
          onPress={() =>
            router.push({
              pathname: '/services',
              params: {
                category: resolved.category!.slug,
                subcategory: resolved.subcategory!.slug,
              },
            })
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}
