import {croppedPhoto} from '../../lib/photo-crop';
import {Text,TextInput} from '../../components/typography';
import {EditVistrahContent} from '../../components/edit-vistrah-content';
import {UiText, UiElement} from '../../components/localized-ui';
import {HomepageVideo} from '../../components/homepage-video';
import {useMemo,useState} from 'react';
import Feather from '@expo/vector-icons/Feather';
import {HOMEPAGE_EXCLUDED_CATEGORY_SLUGS} from '../../../../shared/vibe-finder';
import {DiscoveryGuide} from '../../components/discovery-guide';
import {HomepagePartnerBanner} from '../../components/homepage-partner-banner';
import {PublishedHomepage, type Homepage} from '../../components/published-homepage';
import {useLanguage} from '../../lib/language';
import {buildQuickAccessShortcuts} from '../../lib/service-photos';
import {Image,Pressable,ScrollView,View,StyleSheet} from 'react-native';
import {router} from 'expo-router';
import {AdsMarketing} from '../../components/ads-marketing';
import {Page, Heading} from '../../components/ui';
import {MarketplaceCategories} from '../../components/marketplace-categories';
import {ServiceCarousel} from '../../components/service-carousel';
import {useResource} from '../../lib/resource';
import {type Category} from '../../lib/catalogue';
import {useTheme,spacing,typography,radii,type ThemeColors} from '../../lib/theme';

export default function Discover() {
  const {colors} = useTheme();
  const s=useMemo(()=>makeStyles(colors),[colors]);
  const {copy, t} = useLanguage();
  const catalogue = useResource<Category[]>('/catalogue');
  const homepage = useResource<Homepage>('/homepage');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [failedShortcutPhotos, setFailedShortcutPhotos] = useState<Record<string, boolean>>({});

  // Area 1: Top Hero Greeting & Search Bar with Quick Filter Tags
  const searchSection = (
    <View style={s.topGreetingWrap}>
      {/* Search Input Box */}
      <View
        style={[
          s.searchContainer,
          {
            backgroundColor: colors.surface,
            borderColor: searchFocused ? colors.accent : colors.border,
          },
        ]}
      >
        <View style={[s.searchIconWrap, {backgroundColor: colors.soft}]}>
          <Feather name="search" size={16} color={colors.accent} />
        </View>
        <UiElement
          as={TextInput}
          accessibilityLabel={t('home.search.placeholder')}
          placeholder={searchFocused ? '' : t('home.search.placeholder')}
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          returnKeyType="search"
          onSubmitEditing={() =>
            router.push({pathname: '/services', params: {q: search.trim()}})
          }
          style={[s.searchInputField, {color: colors.text}]}
        />
        {Boolean(search.trim()) && (
          <Pressable onPress={() => setSearch('')} hitSlop={8} style={{padding: 4}}>
            <Feather name="x-circle" size={16} color={colors.muted} />
          </Pressable>
        )}
      </View>


    </View>
  );

  const marketingSection = <AdsMarketing/>;

  // Area 2: Popular Quick Shortcuts (Self-hosted catalogue assets + verified taxonomy fallback)
  const shortcuts = buildQuickAccessShortcuts(catalogue.data ?? [], 10)
    .filter(item => item.categorySlug !== 'vibe-finder')
    .map((item) => ({
      ...item,
      open: () =>
        item.serviceId != null
          ? router.push({pathname: '/service/[id]', params: {id: item.serviceId}})
          : router.push({
              pathname: '/services/nearby',
              params: {
                category: item.categorySlug,
                subcategory: item.serviceSlug,
                type: item.serviceSlug,
              },
            }),
    }));

  // Area 2: Elevated Popular Shortcuts Rail
  const shortcutsSection = (
    <View style={s.shortcutsSectionWrap}>
      <View style={s.sectionHeaderWrap}>
        <View style={{flex: 1, minWidth: 0}}>

          <Text accessibilityRole="header" style={[s.sectionTitle, {color: colors.text}]}>
            <UiText value={copy.home.quick} />
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/services')}
          style={({pressed}) => [{opacity: pressed ? 0.7 : 1}]}
        >
          <Text style={{color: colors.accent, fontSize: 13, fontWeight: '600'}}>
            <UiText value="View all" /> →
          </Text>
        </Pressable>
      </View>

      <UiElement
        as={ScrollView}
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={t('home.quickAccessibility')}
        contentContainerStyle={s.shortcutsScrollContent}
      >
        {shortcuts.map((item) => {
          const showPhoto = Boolean(item.photo) && !failedShortcutPhotos[item.key];
          return (
            <Pressable
              key={item.key}
              testID={`quick-access-card-${item.serviceSlug}`}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              onPress={item.open}
              style={({pressed}) => [
                s.shortcutCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <View style={s.shortcutPhoto}>
                {showPhoto ? (
                  <>
                    <Image
                      source={croppedPhoto(item.photo!, 'landscape')}
                      resizeMode="cover"
                      accessibilityLabel={item.alt}
                      onError={() =>
                        setFailedShortcutPhotos((prev) =>
                          prev[item.key] ? prev : {...prev, [item.key]: true},
                        )
                      }
                      style={s.shortcutImage}
                    />
                    <View style={s.shortcutIconBadge}>
                      <Feather name={item.icon} size={12} color={colors.text} />
                    </View>
                  </>
                ) : (
                  <View style={s.shortcutFallback}>
                    <View style={s.shortcutFallbackIconCircle}>
                      <Feather name={item.icon} size={17} color={colors.accent} />
                    </View>
                    <Text style={s.shortcutFallbackLabel}>Vistrah</Text>
                  </View>
                )}
              </View>
              <View style={s.shortcutCopy}>
                <Text numberOfLines={2} style={[s.shortcutTitle, {color: colors.text}]}>
                  {item.title}
                </Text>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                  <Feather name="arrow-right" size={13} color={colors.accent} />
                </View>
              </View>
            </Pressable>
          );
        })}
      </UiElement>
    </View>
  );

  if (homepage.data?.version && homepage.data.layout.schema_version === 1 && homepage.data.layout.sections.length && catalogue.data) {
    return (
      <Page sectioned><EditVistrahContent slug="home" replace>
        {searchSection}
        <ServiceCarousel />
        <PublishedHomepage homepage={homepage.data} categories={catalogue.data} />
        <View testID="homepage-categories" style={{gap: spacing.elementGap}}>
          <UiElement as={Heading} title={copy.home.categories} action="View all" onPress={() => router.push('/services')} />
          <MarketplaceCategories compact homepage exclude={HOMEPAGE_EXCLUDED_CATEGORY_SLUGS} />
        </View>
        {marketingSection}
        <HomepageVideo />
        {shortcutsSection}
        <DiscoveryGuide />
        <HomepagePartnerBanner />
      </EditVistrahContent></Page>
    );
  }

  return (
    <Page sectioned><EditVistrahContent slug="home" replace>
      {searchSection}
      <ServiceCarousel />
      <View testID="homepage-categories" style={{gap: spacing.elementGap}}>
        <UiElement as={Heading} title={copy.home.categories} action="View all" onPress={() => router.push('/services')} />
        <MarketplaceCategories compact homepage exclude={HOMEPAGE_EXCLUDED_CATEGORY_SLUGS} />
      </View>
      {marketingSection}
      <HomepageVideo />
      {shortcutsSection}
      <DiscoveryGuide />
      <HomepagePartnerBanner />
    </EditVistrahContent></Page>
  );
}

const makeStyles = (colors:ThemeColors) => StyleSheet.create({
  // Area 1: Top Greeting & Search
  topGreetingWrap: {
    gap: spacing.elementGap,
    paddingVertical: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputField: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 8,
  },

  // Area 1: Elevated Provider Banner

  // Area 2: Section Header
  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.elementGap,
  },
  sectionTitle: {
    ...typography.sectionHeading,
  },

  // Area 2: Essentials Section

  // Area 2: Popular Shortcuts
  shortcutsSectionWrap: {
    gap: spacing.elementGap,
    marginTop: 0,
  },
  shortcutsScrollContent: {
    gap: 12,
    paddingVertical: 2,
  },
  shortcutCard: {
    width: 140,
    flexDirection: 'column',
    borderRadius: radii.surface,
    borderWidth: 1,
    overflow: 'hidden',
  },
  shortcutPhoto: {
    margin: 7,
    width: 124,
    height: 90,
    flexShrink: 0,
    borderRadius: radii.input,
    overflow: 'hidden',
    backgroundColor: colors.soft,
    position: 'relative',
  },
  shortcutImage: {
    width: 124,
    height: 90,
  },
  shortcutFallback: {
    width: 124,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    position: 'relative',
  },
  shortcutFallbackIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutFallbackLabel: {
    fontSize: 8.5,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: colors.muted,
  },
  shortcutCopy: {
    gap: 3,
    paddingHorizontal: 8,
    paddingBottom: 8,
    flexShrink: 0,
  },
  shortcutIconBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(9, 27, 51, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTitle: {
    ...typography.cardTitle,
    minHeight: 32,
  },
});
