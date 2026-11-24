import {croppedPhoto} from '../../lib/photo-crop';
import {Text,TextInput} from '../../components/typography';
import {EditVistrahContent} from '../../components/edit-vistrah-content';
import {UiText, UiElement} from '../../components/localized-ui';
import {HomepageVideo} from '../../components/homepage-video';
import {useState} from 'react';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import {LinearGradient} from 'expo-linear-gradient';
import {HOMEPAGE_EXCLUDED_CATEGORY_SLUGS} from '../../../../shared/vibe-finder';
import {DiscoveryGuide} from '../../components/discovery-guide';
import {HomepagePartnerBanner} from '../../components/homepage-partner-banner';
import {PublishedHomepage, type Homepage} from '../../components/published-homepage';
import {useLanguage} from '../../lib/language';
import {buildQuickAccessShortcuts} from '../../lib/service-photos';
import {Platform,Image,Pressable,ScrollView,View,StyleSheet,} from 'react-native';
import {router} from 'expo-router';
import {AdsMarketing} from '../../components/ads-marketing';
import {Page, Heading, Action} from '../../components/ui';
import {MarketplaceCategories} from '../../components/marketplace-categories';
import {ServiceCarousel} from '../../components/service-carousel';
import {useResource} from '../../lib/resource';
import {type Category} from '../../lib/catalogue';
import brandTheme from '../../../../shared/brand-theme.json';
import {useTheme,spacing,typography} from '../../lib/theme';

export default function Discover() {
  const {colors, mode, accentGradient} = useTheme();
  const {copy, t} = useLanguage();
  const catalogue = useResource<Category[]>('/catalogue');
  const homepage = useResource<Homepage>('/homepage');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [failedShortcutPhotos, setFailedShortcutPhotos] = useState<Record<string, boolean>>({});
  const isDark = mode === 'dark';

  // Area 1: Top Hero Greeting & Search Bar with Quick Filter Tags
  const searchSection = (
    <View style={s.topGreetingWrap}>
      {/* Eyebrow badge */}
      <View style={s.topBadgeRow}>
        <LinearGradient
          colors={accentGradient}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={s.topBadgePill}
        >
          <Text style={s.topBadgeText}>Vistrah India</Text>
        </LinearGradient>
        <Text style={[s.topTagline, {color: colors.muted}]}>
          <UiText value={copy.home.tagline} />
        </Text>
      </View>

      {/* Search Input Box */}
      <View
        style={[
          s.searchContainer,
          {
            backgroundColor: isDark ? '#0f233d' : '#ffffff',
            borderColor: searchFocused ? colors.accent : isDark ? '#1e3a5f' : '#cbd5e1',
            shadowColor: '#0F294A',
            shadowOffset: {width: 0, height: searchFocused ? 3 : 1},
            shadowOpacity: searchFocused ? 0.16 : 0.06,
            shadowRadius: 8,
            elevation: searchFocused ? 3 : 1,
          },
        ]}
      >
        <View style={[s.searchIconWrap, {backgroundColor: isDark ? '#132f54' : '#f1f5f9'}]}>
          <Feather name="search" size={16} color={colors.accent} />
        </View>
        <UiElement
          as={TextInput}
          accessibilityLabel={t('home.search.placeholder')}
          placeholder={searchFocused ? '' : t('home.search.placeholder')}
          placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
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

      {/* Quick Search Category Tags */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.quickTagsScroll}
      >
        {[
          {label: '🍽️ Restaurants & Dining', category: 'restaurants-and-dining'},
          {label: '🏨 Hotels & Stay', category: 'hotels-and-stay'},
          {label: '🏥 Hospitals & Labs', category: 'hospitals-and-labs'},
          {label: '💇 Salons & Wellness', category: 'salons-and-beauty-parlour'},
          {label: '🏗️ Civil & Construction', category: 'civil-and-construction'},
          {label: '⚡ Fuel & EV Charging', category: 'fuel-and-charging-stations'},
        ].map((tag) => (
          <Pressable
            key={tag.category}
            accessibilityRole="button"
            onPress={() => router.push({pathname: '/services', params: {category: tag.category}})}
            style={({pressed}) => [
              s.quickTagPill,
              {
                backgroundColor: isDark ? '#0f233d' : '#f8fafc',
                borderColor: isDark ? '#1e3a5f' : '#e2e8f0',
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[s.quickTagText, {color: colors.text}]}>{tag.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  // Area 1: Elevated Provider Partnership Banner
  const providerBanner = (
    <UiElement
      as={Pressable}
      accessibilityRole="link"
      accessibilityLabel={[t('home.providerTitle'), t('home.providerOffer'), t('home.membershipPlans')].join('. ')}
      onPress={() => router.push('/seller/onboard')}
      style={({pressed}) => [
        s.elevatedProviderCard,
        {
          backgroundColor: isDark ? '#0f233d' : '#f8fafc',
          borderColor: isDark ? '#1e3a5f' : '#cbd5e1',
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <LinearGradient
        colors={[brandTheme.gradient[0], brandTheme.gradient[1], brandTheme.gradient[2]]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={s.providerIconBadge}
      >
        <Feather name="briefcase" size={18} color="#fff" />
      </LinearGradient>
      <View style={{flex: 1, gap: 5}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
          <View style={s.providerVerifiedDot} />
          <Text style={[s.providerEyebrow, {color: colors.accent}]}>{t('home.providerEyebrow')}</Text>
        </View>
        <Text style={[s.providerTitle, {color: colors.text}]}>{t('home.providerTitle')}</Text>
        <Text style={[s.providerCopy, {color: colors.muted}]}>{t('home.providerCopy')}</Text>
        <View style={s.providerBottomRow}>
          <Text style={[s.providerOfferText, {color: colors.accent}]}>{t('home.providerOffer')}</Text>
          <View style={s.providerCtaPill}>
            <Text style={[s.providerCtaText, {color: colors.accent}]}>{t('home.membershipPlans')}</Text>
            <Feather name="arrow-right" size={14} color={colors.accent} />
          </View>
        </View>
      </View>
    </UiElement>
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
          <Text style={[s.sectionEyebrow, {color: '#EA580C'}]}>Popular Categories</Text>
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
              accessibilityLabel={`${item.title} — Verified`}
              onPress={item.open}
              style={({pressed}) => [
                s.shortcutCard,
                {
                  backgroundColor: isDark ? '#0f233d' : '#ffffff',
                  borderColor: isDark ? '#1e3a5f' : '#e2e8f0',
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
                      <Feather name={item.icon} size={12} color="#fff" />
                    </View>
                  </>
                ) : (
                  <LinearGradient
                    colors={['#091B33', '#0F294A', '#163A66']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={s.shortcutFallback}
                  >
                    <View style={s.shortcutFallbackIconCircle}>
                      <Feather name={item.icon} size={17} color="#F97316" />
                    </View>
                    <Text style={s.shortcutFallbackLabel}>Vistrah</Text>
                  </LinearGradient>
                )}
              </View>
              <View style={s.shortcutCopy}>
                <Text numberOfLines={2} style={[s.shortcutTitle, {color: colors.text}]}>
                  {item.title}
                </Text>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                  <Text style={[s.shortcutMeta, {color: colors.muted}]}>Verified</Text>
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
        {providerBanner}
        {marketingSection}
        <Action label="VISTRAH Ads & Marketing pricing →" onPress={() => router.push('/marketing-pricing')} />
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
      {providerBanner}
      {marketingSection}
      <Action label="VISTRAH Ads & Marketing pricing →" onPress={() => router.push('/marketing-pricing')} />
      <HomepageVideo />
      {shortcutsSection}
      <DiscoveryGuide />
      <HomepagePartnerBanner />
    </EditVistrahContent></Page>
  );
}

const s = StyleSheet.create({
  // Area 1: Top Greeting & Search
  topGreetingWrap: {
    gap: spacing.elementGap,
    paddingVertical: 2,
  },
  topBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.elementGap,
  },
  topBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  topBadgeText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 1,
  },
  topTagline: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
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
    borderRadius: 8,
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
  quickTagsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  quickTagPill: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickTagText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Area 1: Elevated Provider Banner
  elevatedProviderCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: spacing.cardPaddingCompact,
    borderRadius: 20,
    borderWidth: 1,
  },
  providerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerEyebrow: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 1,
  },
  providerVerifiedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#34d399',
  },
  providerTitle: {
    fontSize: Platform.OS === 'android' ? 16 : 15,
    lineHeight: Platform.OS === 'android' ? 19 : 18,
    letterSpacing: -0.23,
    fontWeight: '600',
  },
  providerCopy: {
    fontSize: 12,
    lineHeight: 18,
  },
  providerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  providerOfferText: {
    fontSize: 11,
    fontWeight: '600',
  },
  providerCtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  providerCtaText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Area 2: Section Header
  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.elementGap,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  sectionTitle: {
    ...typography.sectionHeading,
  },

  // Area 2: Essentials Section
  essentialsSectionWrap: {
    gap: spacing.elementGap,
    marginTop: 0,
  },

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
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#0F294A',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  shortcutPhoto: {
    margin: 7,
    width: 124,
    height: 90,
    flexShrink: 0,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0F294A',
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
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutFallbackLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#cbd5e1',
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
  shortcutMeta: {
    fontSize: 10,
    fontWeight: '600',
  },
});
