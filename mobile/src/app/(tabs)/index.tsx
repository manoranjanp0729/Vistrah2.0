import {Text,TextInput} from '../../components/typography';
import {EditVistrahContent} from '../../components/edit-vistrah-content';
import {UiText, UiElement} from '../../components/localized-ui';
import {HomepageVideo} from '../../components/homepage-video';
import {useState} from 'react';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import {LinearGradient} from 'expo-linear-gradient';
import {HomepageConnect} from '../../components/homepage-connect';
import {connectCategorySlugs} from '../../../../shared/homepage-connect';
import {DiscoveryGuide} from '../../components/discovery-guide';
import {HomepagePartnerBanner} from '../../components/homepage-partner-banner';
import {PublishedHomepage, type Homepage} from '../../components/published-homepage';
import {useLanguage} from '../../lib/language';
import {servicePhotos} from '../../lib/service-photos';
import {Platform,Image,Pressable,ScrollView,View,StyleSheet,} from 'react-native';
import {router} from 'expo-router';
import {AdsMarketing} from '../../components/ads-marketing';
import {Page, Heading} from '../../components/ui';
import {MarketplaceCategories} from '../../components/marketplace-categories';
import {ServiceCarousel} from '../../components/service-carousel';
import {useResource} from '../../lib/resource';
import {allServices, type Category} from '../../lib/catalogue';
import brandTheme from '../../../../shared/brand-theme.json';
import {useTheme} from '../../lib/theme';

export default function Discover() {
  const {styles, colors, mode, accentGradient} = useTheme();
  const {copy, t} = useLanguage();
  const catalogue = useResource<Category[]>('/catalogue');
  const homepage = useResource<Homepage>('/homepage');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const isDark = mode === 'dark';

  // Area 1: Top Hero Greeting & Search Bar with Quick Filter Tags
  const searchSection = (
    <View style={s.topGreetingWrap}>
      {/* Eyebrow badge with glowing sparkle */}
      <View style={s.topBadgeRow}>
        <LinearGradient
          colors={accentGradient}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={s.topBadgePill}
        >
          <Ionicons name="sparkles" size={10} color="#fff" />
          <Text style={s.topBadgeText}>VISTRAH INDIA</Text>
        </LinearGradient>
        <Text style={[s.topTagline, {color: colors.muted}]}>
          <UiText value={copy.home.tagline} />
        </Text>
      </View>

      {/* Warm Welcome Headline */}
      <Text accessibilityRole="header" style={[s.welcomeHeadline, {color: colors.text}]}>
        <UiText value="Find your everyday. Discover more." />
      </Text>

      {/* Search Input Box */}
      <View
        style={[
          s.searchContainer,
          {
            backgroundColor: isDark ? '#1f1a2e' : '#ffffff',
            borderColor: searchFocused ? colors.accent : isDark ? '#33294c' : '#e0d8eb',
            shadowColor: '#503fbd',
            shadowOffset: {width: 0, height: searchFocused ? 3 : 1},
            shadowOpacity: searchFocused ? 0.16 : 0.06,
            shadowRadius: 8,
            elevation: searchFocused ? 3 : 1,
          },
        ]}
      >
        <View style={[s.searchIconWrap, {backgroundColor: isDark ? '#2e2444' : '#f5effa'}]}>
          <Feather name="search" size={16} color={colors.accent} />
        </View>
        <UiElement
          as={TextInput}
          accessibilityLabel={t('home.search.placeholder')}
          placeholder={searchFocused ? '' : t('home.search.placeholder')}
          placeholderTextColor={isDark ? '#8b7f9d' : '#9ca3af'}
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
                backgroundColor: isDark ? '#241c36' : '#f7f4fb',
                borderColor: isDark ? '#382a53' : '#e5daef',
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
          backgroundColor: isDark ? '#1a122c' : '#f8f4fc',
          borderColor: isDark ? '#3b2a50' : '#e4d7ef',
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
            <Ionicons name="sparkles" size={12} color="#52b788" />
            <Text style={[s.sectionEyebrow, {color: colors.accent}]}>COMMUNITY LIFELINES</Text>
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
          <Text style={{color: colors.accent, fontSize: 13, fontWeight: '700'}}>
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
          <Text style={[s.sectionEyebrow, {color: colors.accent}]}>HANDPICKED SERVICES</Text>
          <Text accessibilityRole="header" style={[s.sectionTitle, {color: colors.text}]}>
            <UiText value={copy.home.quick} />
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/services')}
          style={({pressed}) => [{opacity: pressed ? 0.7 : 1}]}
        >
          <Text style={{color: colors.accent, fontSize: 13, fontWeight: '700'}}>
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
                backgroundColor: isDark ? '#1c172a' : '#ffffff',
                borderColor: isDark ? '#302644' : '#e6dced',
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <View style={s.shortcutPhoto}>
              {item.photo ? (
                <Image source={item.photo} resizeMode="cover" style={StyleSheet.absoluteFill} />
              ) : (
                <View style={[StyleSheet.absoluteFill, {backgroundColor: '#eee'}]} />
              )}
              <View style={s.shortcutIconBadge}>
                <Feather name={item.icon} size={12} color="#fff" />
              </View>
            </View>
            <View style={{gap: 3, padding: 8}}>
              <Text numberOfLines={2} style={[s.shortcutTitle, {color: colors.text}]}>
                {item.title}
              </Text>
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                <Text style={[s.shortcutMeta, {color: colors.muted}]}>Verified</Text>
                <Feather name="arrow-right" size={13} color={colors.accent} />
              </View>
            </View>
          </Pressable>
        ))}
      </UiElement>
    </View>
  );

  if (homepage.data?.version && homepage.data.layout.schema_version === 1 && homepage.data.layout.sections.length && catalogue.data) {
    return (
      <Page><EditVistrahContent slug="home" replace>
        {searchSection}
        <ServiceCarousel />
        <PublishedHomepage homepage={homepage.data} categories={catalogue.data} />
        <View testID="homepage-categories" style={{gap: 4}}>
          <UiElement as={Heading} title={copy.home.categories} action="View all" onPress={() => router.push('/services')} />
          <MarketplaceCategories compact homepage exclude={connectCategorySlugs} />
        </View>
        {providerBanner}
        {marketingSection}
        <HomepageVideo />
        {essentialsSection}
        {shortcutsSection}
        <DiscoveryGuide />
        <HomepagePartnerBanner />
      </EditVistrahContent></Page>
    );
  }

  return (
    <Page><EditVistrahContent slug="home" replace>
      {searchSection}
      <ServiceCarousel />
      <View style={styles.divider} />
      <View testID="homepage-categories" style={{gap: 4}}>
        <UiElement as={Heading} title={copy.home.categories} action="View all" onPress={() => router.push('/services')} />
        <MarketplaceCategories compact homepage exclude={connectCategorySlugs} />
      </View>
      {providerBanner}
      {marketingSection}
      <HomepageVideo />
      {essentialsSection}
      {shortcutsSection}
      <DiscoveryGuide />
      <HomepagePartnerBanner />
    </EditVistrahContent></Page>
  );
}

const s = StyleSheet.create({
  // Area 1: Top Greeting & Search
  topGreetingWrap: {
    gap: 8,
    paddingVertical: 2,
  },
  topBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    fontWeight: '800',
    letterSpacing: 1,
  },
  topTagline: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  welcomeHeadline: {
    fontSize: Platform.OS === 'android' ? 20 : 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    minHeight: 46,
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
    padding: 14,
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
    fontWeight: '800',
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
    fontWeight: '800',
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
    fontWeight: '700',
  },
  providerCtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  providerCtaText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // Area 2: Section Header
  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'android' ? 18 : 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // Area 2: Essentials Section
  essentialsSectionWrap: {
    gap: 8,
    marginTop: 2,
  },

  // Area 2: Popular Shortcuts
  shortcutsSectionWrap: {
    gap: 8,
    marginTop: 4,
  },
  shortcutsScrollContent: {
    gap: 10,
    paddingVertical: 2,
  },
  shortcutCard: {
    width: 140,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#503fbd',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },
  shortcutPhoto: {
    width: '100%',
    height: 90,
    backgroundColor: '#ede9f5',
    position: 'relative',
  },
  shortcutIconBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(24, 17, 38, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 16,
    minHeight: 32,
  },
  shortcutMeta: {
    fontSize: 10,
    fontWeight: '600',
  },
});
