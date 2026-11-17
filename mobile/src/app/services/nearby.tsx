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
  marketplaceItemId,
  resolveMarketplaceSelection,
} from '../../lib/marketplace';
import { spacing, useTheme } from '../../lib/theme';

export default function NearbyServicesScreen() {
  const { styles } = useTheme();
  const { t, label } = useLanguage();
  const { width } = useWindowDimensions();
  const horizontalPadding = width >= 768 ? spacing.pagePaddingDesktop : spacing.pagePadding;

  const raw = useLocalSearchParams<{ category?: string; subcategory?: string; type?: string }>();
  const sub =
    typeof raw.subcategory === 'string' && raw.subcategory
      ? raw.subcategory
      : typeof raw.type === 'string' && raw.type
        ? raw.type
        : undefined;
  const cat = typeof raw.category === 'string' && raw.category ? raw.category : undefined;

  const resolved = resolveMarketplaceSelection({ category: cat, subcategory: sub, type: sub });
  const legacy = resolved ? null : legacyMarketplaceSelection({ category: cat, subcategory: sub });

  useEffect(() => {
    if (legacy?.category && legacy?.subcategory) {
      router.replace({
        pathname: '/services/nearby',
        params: { category: legacy.category, type: legacy.subcategory },
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
  const serviceTitle = label(
    marketplaceItemId(resolved.category.slug, resolved.subcategory.slug),
    resolved.subcategory.title,
  );

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
          typeSlug={resolved.subcategory.slug}
          serviceTitle={serviceTitle}
        />
        <UiElement
          as={Action}
          secondary
          label={t('discovery.allSubcategories', { name: categoryTitle })}
          onPress={() =>
            router.push({
              pathname: '/services',
              params: { category: resolved.category!.slug },
            })
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}
