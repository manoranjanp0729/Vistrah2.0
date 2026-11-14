import {croppedPhoto} from '../../lib/photo-crop';
import {Text,TextInput} from '../../components/typography';
import {EditVistrahContent} from '../../components/edit-vistrah-content';
import {UiText, UiElement} from '../../components/localized-ui';
import {HomepageVideo} from '../../components/homepage-video';
import {useState} from 'react';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import {HomepageConnect} from '../../components/homepage-connect';
import {connectCategorySlugs} from '../../../../shared/homepage-connect';
import {DiscoveryGuide} from '../../components/discovery-guide';
import {HomepagePartnerBanner} from '../../components/homepage-partner-banner';
import {PublishedHomepage, type Homepage} from '../../components/published-homepage';
import {useLanguage} from '../../lib/language';
import {servicePhotos} from '../../lib/service-photos';
import {Platform,Image,Pressable,ScrollView,View,StyleSheet} from 'react-native';
import {router} from 'expo-router';
import {AdsMarketing} from '../../components/ads-marketing';
import {Page, Heading, Action} from '../../components/ui';
import {MarketplaceCategories} from '../../components/marketplace-categories';
import {ServiceCarousel} from '../../components/service-carousel';
import {useResource} from '../../lib/resource';
import {allServices, type Category} from '../../lib/catalogue';
import {useTheme,spacing,typography,radii} from '../../lib/theme';

export default function Discover() {
  const {colors} = useTheme();
  const {copy, t} = useLanguage();
  const catalogue = useResource<Category[]>('/catalogue');
  const homepage = useResource<Homepage>('/homepage');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Area 1: Top Hero Greeting & Search Bar with Quick Filter Tags
  const searchSection = (
    <View style={s.topGreetingWrap}>
      {/* Eyebrow badge with brand orange anchor */}
      <View style={s.topBadgeRow}>
        <View style={[s.topBadgePill, {backgroundColor: colors.brandPrimary}]}>
          <Ionicons name="sparkles" size={10} color="#fff" />
          <Text style={s.topBadgeText}>VISTRAH INDIA</Text>
        </View>
        <Text style={[s.topTagline, {color: colors.muted}]}>
          <UiText value={copy.home.tagline} />
        </Text>
      </View>

      {/* Search Input Box */}
      <View
        style={[
          s.searchContainer,
          {
            backgroundColor: colors.surface,
            borderColor: searchFocused ? colors.accent : colors.borderSubtle,
            shadowColor: searchFocused ? colors.accent : '#000000',
            shadowOffset: {width: 0, height: searchFocused ? 3 : 1},
            shadowOpacity: searchFocused ? 0.14 : 0.05,
            shadowRadius: 8,
            elevation: searchFocused ? 3 : 1,
          },
        ]}
      >
        <View style={[s.searchIconWrap, {backgroundColor: colors.elevated}]}>
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

      {/* Quick Search Category Tags */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.quickTagsScroll}
      >
        {[
          {label: '🚜 Farm & Agriculture', category: 'agriculture-and-farming'},
          {label: '🏠 Home Care', category: 'home-and-everyday-services'},
          {label: '🩺 Healthcare', category: 'health-fitness-and-wellness'},
          {label: '🛍️ Shopping', category: 'shopping-and-local-retail'},
          {label: '🚗 Automobiles', category: 'automobiles'},
        ].map((tag) => (
          <Pressable
            key={tag.category}
            accessibilityRole="button"
            onPress={() => router.push({pathname: '/services', params: {category: tag.category}})}
            style={({pressed}) => [
              s.quickTagPill,
              {
                backgroundColor: colors.elevated,
                borderColor: colors.borderSubtle,
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
      onPress={() => router.push('/membership')}
      style={({pressed}) => [
        s.elevatedProviderCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <View style={[s.providerIconBadge, {backgroundColor: colors.brandPrimary}]}>
        <Feather name="briefcase" size={18} color="#fff" />
      </View>
      <View style={{flex: 1, gap: 5}}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
          <View style={s.providerVerifiedDot} />
          <Text style={[s.providerEyebrow, {color: colors.brandPrimary}]}>{t('home.providerEyebrow')}</Text>
        </View>
        <Text style={[s.providerTitle, {color: colors.text}]}>{t('home.providerTitle')}</Text>
        <Text style={[s.providerCopy, {color: colors.muted}]}>{t('home.providerCopy')}</Text>
        <View style={s.providerBottomRow}>
          <Text style={[s.providerOfferText, {color: colors.brandPrimary}]}>{t('home.providerOffer')}</Text>
          <View style={s.providerCtaPill}>
            <Text style={[s.providerCtaText, {color: colors.brandPrimary}]}>{t('home.membershipPlans')}</Text>
            <Feather name="arrow-right" size={14} color={colors.brandPrimary} />
          </View>
        </View>
      </View>
    </UiElement>
  );

  const marketingSection = <AdsMarketing/>;

  // Area 2: Popular Quick Shortcuts
  const shortcuts = allServices(catalogue.data ?? [])
    .filter((item) => item.service.active && item.category.slug !== 'marketing')
    .sort(
      (a, b) =>
        Number(b.service.slug === 'digital-marketing') - Number(a.service.slug === 'digital-marketing') ||
        Number(b.service.popular) - Number(a.service.popular)
    )
    .slice(0, 10)
    .map(({category, service}) => ({
      key: String(service.id),
      title: service.title,
      photo: servicePhotos[service.slug]?.source,
      icon:
        service.slug === 'digital-marketing'
          ? ('volume-2' as const)
          : category.slug === 'real-estate'
          ? ('home' as const)
          : category.slug === 'tax-compliance'
          ? ('credit-card' as const)
          : ('briefcase' as const),
      open: () => router.push({pathname: '/service/[id]', params: {id: service.id}}),
    }));

  // Area 2: Framed Essentials (AgriConnect & HealthConnect) Section
  const essentialsSection = (
    <View style={s.essentialsSectionWrap}>
      <View style={s.sectionHeaderWrap}>
        <View style={{flex: 1, minWidth: 0}}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <Ionicons name="sparkles" size={12} color={colors.brandPrimary} />
            <Text style={[s.sectionEyebrow, {color: colors.brandPrimary}]}>COMMUNITY LIFELINES</Text>
          </View>
          <Text accessibilityRole="header" style={[s.sectionTitle, {color: colors.text}]}>
            <UiText value="Vistrah Essentials" />
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/requests')}
          style={({pressed}) => [{opacity: pressed ? 0.7 : 1}]}
        >
          <Text style={{color: colors.brandPrimary, fontSize: 13, fontWeight: '600'}}>
            <UiText value="Explore Hub" /> →
          </Text>
        </Pressable>
      </View>
      <HomepageConnect />
    </View>
  );

  // Area 2: Elevated Popular Shortcuts Rail
  const shortcutsSection = (
    <View style={s.shortcutsSectionWrap}>
      <View style={s.sectionHeaderWrap}>
        <View style={{flex: 1, minWidth: 0}}>
          <Text style={[s.sectionEyebrow, {color: colors.brandPrimary}]}>HANDPICKED SERVICES</Text>
          <Text accessibilityRole="header" style={[s.sectionTitle, {color: colors.text}]}>
            <UiText value={copy.home.quick} />
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/services')}
          style={({pressed}) => [{opacity: pressed ? 0.7 : 1}]}
        >
          <Text style={{color: colors.brandPrimary, fontSize: 13, fontWeight: '600'}}>
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
        {shortcuts.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            onPress={item.open}
            style={({pressed}) => [
              s.shortcutCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <View style={[s.shortcutPhoto, {backgroundColor: colors.elevated}]}>
              {item.photo ? (
                <Image source={croppedPhoto(item.photo,'landscape')} resizeMode="cover" style={s.shortcutImage} />
              ) : (
                <View style={[StyleSheet.absoluteFill, {backgroundColor: colors.elevated}]} />
              )}
              <View style={s.shortcutIconBadge}>
                <Feather name={item.icon} size={12} color="#fff" />
              </View>
            </View>
            <View style={s.shortcutCopy}>
              <Text numberOfLines={2} style={[s.shortcutTitle, {color: colors.text}]}>
                {item.title}
              </Text>
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                <Text style={[s.shortcutMeta, {color: colors.muted}]}>Verified</Text>
                <Feather name="arrow-right" size={13} color={colors.brandPrimary} />
              </View>
            </View>
          </Pressable>
        ))}
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
          <MarketplaceCategories compact homepage exclude={connectCategorySlugs} />
        </View>
        {providerBanner}
        {marketingSection}
        <Action label="VISTRAH Ads & Marketing pricing →" onPress={() => router.push('/marketing-pricing')} />
        <HomepageVideo />
        {essentialsSection}
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
        <MarketplaceCategories compact homepage exclude={connectCategorySlugs} />
      </View>
      {providerBanner}
      {marketingSection}
      <Action label="VISTRAH Ads & Marketing pricing →" onPress={() => router.push('/marketing-pricing')} />
      <HomepageVideo />
      {essentialsSection}
      {shortcutsSection}
      <DiscoveryGuide />
      <HomepagePartnerBanner />
    </EditVistrahContent></Page>
  );
}

const s = StyleSheet.create({
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
    borderRadius: radii.pill,
  },
  topBadgeText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '700',
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
    gap: 9,
    borderRadius: radii.input,
    borderWidth: 1,
    paddingHorizontal: 10,
    minHeight: 46,
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
    fontSize: 13.5,
    lineHeight: 19,
    paddingVertical: 8,
  },
  quickTagsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  quickTagPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  quickTagText: {
    fontSize: 11,
    fontWeight: '600',
  },

  elevatedProviderCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: spacing.pagePadding,
    borderRadius: radii.surface,
    borderWidth: 1,
  },
  providerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.action,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerEyebrow: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1,
  },
  providerVerifiedDot: {
    width: 5,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: '#34d399',
  },
  providerTitle: {
    fontSize: Platform.OS === 'android' ? 16 : 15,
    fontWeight: '600',
  },
  providerCopy: {
    fontSize: 12,
    lineHeight: 16,
  },
  providerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    flexWrap: 'wrap',
    gap: 6,
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
    fontWeight: '700',
  },

  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.elementGap,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionTitle: {
    ...typography.sectionHeading,
    letterSpacing: -0.2,
  },

  essentialsSectionWrap: {
    gap: spacing.elementGap,
    marginTop: 0,
  },

  shortcutsSectionWrap: {
    gap: spacing.elementGap,
    marginTop: 0,
  },
  shortcutsScrollContent: {
    gap: 10,
    paddingVertical: 2,
  },
  shortcutCard: {
    width: 140,
    flexDirection: 'column',
    borderRadius: radii.surface,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },
  shortcutPhoto: {
    margin: 7,
    height: 90,
    flexShrink: 0,
    borderRadius: radii.input,
    overflow: 'hidden',
    position: 'relative',
  },
  shortcutImage: {
    width: '100%',
    height: '100%',
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
    borderRadius: radii.pill,
    backgroundColor: 'rgba(7, 20, 38, 0.78)',
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
