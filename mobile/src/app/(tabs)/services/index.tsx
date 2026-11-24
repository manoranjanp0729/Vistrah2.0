import {useDirectMarketplace} from '../../../lib/direct-marketplace';
import {croppedPhoto} from '../../../lib/photo-crop';
import {BannerGeometry} from '../../../components/banner-geometry';
import {useBannerTheme} from '../../../lib/banner-theme';
import {Text} from '../../../components/typography';
import {EditVistrahContent} from '../../../components/edit-vistrah-content';
import {UiText, UiElement} from '../../../components/localized-ui';
import {SellerSignInAction} from '../../../components/seller-sign-in-action';
import {useLanguage} from '../../../lib/language';
import {useEffect, useRef, useState} from 'react';
import {Linking,ScrollView,View,Pressable,StyleSheet,Platform,Image,useWindowDimensions} from 'react-native';
import {router, useLocalSearchParams} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Field, Heading, ErrorPanel, Action} from '../../../components/ui';
import {MarketplaceCategories} from '../../../components/marketplace-categories';
import {
  legacyMarketplaceSelection,
  marketplaceItemId,
  resolveMarketplaceSelection,
  searchMarketplaceEntries,
  type MarketplaceSelection,
} from '../../../lib/marketplace';
import {nativeMarketplacePhoto, nativeMarketplaceAlt} from '../../../lib/marketplace-photo';
import {useTheme,spacing,typography} from '../../../lib/theme';
import {useSession} from '../../../lib/session';
import {isSellerUser} from '../../../lib/types';
import {MobileNearbyServiceDiscovery} from '../../../components/nearby-service-discovery';
import {customerListingCopy, listingEnquiryHref} from '../../../../../shared/customer-listing';
import {officialContact} from '../../../../../shared/public-contact';
import {servicesNavigationAction} from '../../../lib/marketplace-navigation';

export default function Services() {
  const {resolveMarketplaceSelection,legacyMarketplaceSelection,marketplaceCategories,searchMarketplaceEntries}=useDirectMarketplace();
  const banner=useBannerTheme();
  const {styles, colors, mode, accentGradient} = useTheme();
  const {t, label} = useLanguage();
  const session = useSession();
  const scroll = useRef<ScrollView>(null);
  const optionsTop = useRef(0);
  const optionsOffset = useRef(0);
  const isDark = mode === 'dark';

  const {width} = useWindowDimensions();
  const horizontalPadding = width >= 768 ? spacing.pagePaddingDesktop : spacing.pagePadding;
  const [cardsWidth,setCardsWidth]=useState(0);
  const cardWidth=cardsWidth>12?(cardsWidth-12)/2:undefined;
  const seller = isSellerUser(session.user);
  const sellerLabel = !session.ready
    ? 'Checking account...'
    : seller
    ? `Welcome, ${session.user!.name}`
    : session.user
    ? 'List your business'
    : 'Sign in to offer services';
  const openSeller = () =>
    session.user
      ? router.push('/seller/onboard')
      : router.push({pathname: '/auth', params: {next: '/seller/onboard'}});

  const raw = useLocalSearchParams<{category?: string; subcategory?: string; type?: string; q?: string}>();
  const params: MarketplaceSelection = {
    category: typeof raw.category === 'string' ? raw.category : undefined,
    subcategory: typeof raw.subcategory === 'string' ? raw.subcategory : undefined,
    type: typeof raw.type === 'string' ? raw.type : undefined,
    q: typeof raw.q === 'string' ? raw.q : undefined,
  };

  const scope = JSON.stringify(params);
  const [draft, setDraft] = useState<{scope: string; value: string} | null>(null);
  const [showAllResults, setShowAllResults] = useState(false);
  const query = draft?.scope === scope ? draft.value : params.q ?? '';
  const selected = resolveMarketplaceSelection(params);
  const needle = query.trim();
  // Older links (pre-simplification categories) move to the matching business type.
  const legacySelection = selected ? null : legacyMarketplaceSelection(params);
  useEffect(() => {
    if (legacySelection) router.replace({pathname: '/services', params: legacySelection});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const open = (selection: MarketplaceSelection) => {
    setDraft(null);
    const action=servicesNavigationAction(params,selection);
    if(action==='none')return;
    const destination={pathname:'/services' as const,params:selection};
    if(action==='dismissTo')router.dismissTo(destination);
    else router.push(destination);
  };

  if (!selected) {
    return (
      <SafeAreaView edges={['left', 'right']} style={styles.page}>
        <View style={[styles.content, {paddingHorizontal: horizontalPadding}]}>
          <UiElement as={Heading} title={t('discovery.notFound')} />
          <Text style={styles.muted}>{t('discovery.chooseValid')}</Text>
          <UiElement as={Action} secondary label={t('catalogue.all')} onPress={() => open({})} />
        </View>
      </SafeAreaView>
    );
  }

  const {category, subcategory, listingType} = selected;
  // Business types carry one implicit listing type, so the business type screen is the results screen.
  const singleType = Boolean(subcategory && listingType && subcategory.listing_types.length === 1 && listingType.slug === subcategory.slug);
  const results = searchMarketplaceEntries(query);
  const displayedResults = showAllResults ? results : results.slice(0, 60);

  const categoryName = category ? label(marketplaceItemId(category.slug), category.title) : '';
  const subcategoryName =
    category && subcategory
      ? label(marketplaceItemId(category.slug, subcategory.slug), subcategory.title)
      : '';
  const listingTypeName =
    category && subcategory && listingType
      ? label(marketplaceItemId(category.slug, subcategory.slug, listingType.slug), listingType.title)
      : '';

  // Determine hierarchical depth
  const isListingTypeLevel = Boolean(listingType);
  const isSubcategoryLevel = Boolean(subcategory && !listingType);
  const isCategoryLevel = Boolean(category && !subcategory && !listingType);
  const isRootLevel = !category && !subcategory && !listingType;

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.page}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={[styles.content, {paddingHorizontal: horizontalPadding, gap: spacing.sectionGap}]}
        keyboardShouldPersistTaps="handled"
      >
        {isRootLevel&&<EditVistrahContent slug="services"/>}
        {/* Top Seller Bar */}
        <View style={s.topBarRow}>
          {seller ? (
            <View style={s.sellerWelcomeBadge}>
              <View style={s.sellerDot} />
              <Text accessibilityRole="header" style={[s.sellerWelcomeText, {color: colors.text}]}>
                <UiText value="Welcome, " />
                {session.user!.name}
              </Text>
            </View>
          ) : !isListingTypeLevel ? (
            <SellerSignInAction label={sellerLabel} disabled={!session.ready} onPress={openSeller} />
          ) : null}
        </View>

        {/* INTERACTIVE BREADCRUMB FLOW BAR (When drilled down) */}
        {!isRootLevel && (
          <View
            style={[
              s.breadcrumbBar,
              {
                backgroundColor: isDark ? '#0f233d' : '#f1f5f9',
                borderColor: isDark ? '#1e3a5f' : '#cbd5e1',
              },
            ]}
          >
            {/* Quick 1-Step Back Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back one level"
              onPress={() => {
                if (isListingTypeLevel && !singleType) {
                  open({category: category!.slug, subcategory: subcategory!.slug});
                } else if (isSubcategoryLevel || singleType) {
                  open({category: category!.slug});
                } else {
                  open({});
                }
              }}
              style={({pressed}) => [
                s.backCircle,
                {backgroundColor: isDark ? '#132f54' : '#ffffff', opacity: pressed ? 0.7 : 1},
              ]}
            >
              <Feather name="arrow-left" size={16} color={colors.accent} />
            </Pressable>

            {/* Breadcrumb Trail */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.crumbScroll}
            >
              <Pressable onPress={() => open({})} style={s.crumbItem}>
                <Feather name="grid" size={12} color={colors.accent} />
                <Text style={[s.crumbText, {color: colors.accent}]}>Services</Text>
              </Pressable>

              {Boolean(category) && (
                <>
                  <Feather name="chevron-right" size={12} color={colors.muted} />
                  <Pressable
                    onPress={() => (subcategory ? open({category: category!.slug}) : null)}
                    style={[s.crumbItem, isCategoryLevel && s.crumbActiveItem]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        s.crumbText,
                        {color: isCategoryLevel ? (isDark ? '#fff' : '#0F294A') : colors.accent},
                        isCategoryLevel && s.crumbActiveText,
                      ]}
                    >
                      {categoryName}
                    </Text>
                  </Pressable>
                </>
              )}

              {Boolean(subcategory) && (
                <>
                  <Feather name="chevron-right" size={12} color={colors.muted} />
                  <Pressable
                    onPress={() =>
                      listingType && !singleType
                        ? open({category: category!.slug, subcategory: subcategory!.slug})
                        : null
                    }
                    style={[s.crumbItem, (isSubcategoryLevel || singleType) && s.crumbActiveItem]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        s.crumbText,
                        {color: isSubcategoryLevel || singleType ? (isDark ? '#fff' : '#0F294A') : colors.accent},
                        (isSubcategoryLevel || singleType) && s.crumbActiveText,
                      ]}
                    >
                      {subcategoryName}
                    </Text>
                  </Pressable>
                </>
              )}

              {Boolean(listingType) && !singleType && (
                <>
                  <Feather name="chevron-right" size={12} color={colors.muted} />
                  <View style={[s.crumbItem, s.crumbActiveItem]}>
                    <Text
                      numberOfLines={1}
                      style={[
                        s.crumbText,
                        {color: isDark ? '#fff' : '#0F294A'},
                        s.crumbActiveText,
                      ]}
                    >
                      {listingTypeName}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        )}

        {/* PROGRESSIVE CONTEXTUAL HERO BANNER (50% TRANSPARENCY UNIFIED THEME) */}
        <LinearGradient
          colors={['rgba(15, 41, 74, 0.5)', 'rgba(19, 47, 84, 0.5)']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={[s.hero, {backgroundColor: isDark ? 'rgba(15, 41, 74, 0.5)' : 'rgba(15, 41, 74, 0.5)', borderColor: 'rgba(249, 115, 22, 0.3)'}]}
        >
          <BannerGeometry/>

          {isRootLevel ? (
            <>
              <View style={s.heroBadgeRow}>
                <LinearGradient
                  colors={['#0F294A', '#132F54']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={s.heroBadge}
                >
                  <Text style={s.heroBadgeText}>Vistrah Marketplace</Text>
                </LinearGradient>
                <View style={s.heroPill}>
                  <Feather name="shield" size={11} color="#F97316" />
                  <Text style={[s.heroPillText,{color:banner.muted}]}>Verified Providers</Text>
                </View>
              </View>
              <Text accessibilityRole="header" style={s.heroTitle}>
                {t('discovery.title')}
              </Text>
              <Text style={[s.heroSubtitle,{color:banner.muted}]}>
                <UiText value="Verified local businesses & services across India." />
              </Text>
            </>
          ) : isCategoryLevel ? (
            <>
              <View style={s.heroBadgeRow}>
                <LinearGradient
                  colors={['#0F294A', '#132F54']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={s.heroBadge}
                >
                  <Text style={s.heroBadgeText}>MAIN CATEGORY</Text>
                </LinearGradient>
                <View style={s.heroPill}>
                  <Text style={[s.heroPillText,{color:banner.muted}]}>
                    {category!.subcategories.length} <UiText value="Service Types" />
                  </Text>
                </View>
              </View>
              <Text accessibilityRole="header" style={s.heroTitle}>
                {categoryName}
              </Text>
              <Text style={[s.heroSubtitle,{color:banner.muted}]}>
                <UiText value="Choose a service type to see nearby businesses." />
              </Text>
            </>
          ) : isSubcategoryLevel ? (
            <>
              <View style={s.heroBadgeRow}>
                <LinearGradient
                  colors={['#0F294A', '#132F54']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={s.heroBadge}
                >
                  <Text style={s.heroBadgeText}>{categoryName.toUpperCase()}</Text>
                </LinearGradient>
                <View style={s.heroPill}>
                  <Text style={[s.heroPillText,{color:banner.muted}]}>
                    {singleType ? <UiText value="Business type" /> : <>{subcategory!.listing_types.length} <UiText value="Service Types" /></>}
                  </Text>
                </View>
              </View>
              <Text accessibilityRole="header" style={s.heroTitle}>
                {subcategoryName}
              </Text>
              <Text style={[s.heroSubtitle,{color:banner.muted}]}>
                <UiText value="Choose an exact service listing type to browse offers, get quotations, and contact verified specialists." />
              </Text>
            </>
          ) : (
            <>
              <View style={s.heroBadgeRow}>
                <LinearGradient
                  colors={['#0F294A', '#132F54']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={s.heroBadge}
                >
                  <Text style={s.heroBadgeText}>{subcategoryName.toUpperCase()}</Text>
                </LinearGradient>
                <View style={s.heroPill}>
                  <Feather name="check-circle" size={11} color="#F97316" />
                  <Text style={[s.heroPillText,{color:banner.muted}]}>Direct Listings</Text>
                </View>
              </View>
              <Text accessibilityRole="header" style={s.heroTitle}>
                {listingTypeName}
              </Text>
              <Text style={[s.heroSubtitle,{color:banner.muted}]}>
                <UiText value="Review available packages, verify provider details, and submit direct enquiries." />
              </Text>
            </>
          )}
        </LinearGradient>

        {/* SEARCH BAR (Available on Root, Category, and Subcategory levels) */}
        {(!isListingTypeLevel || Boolean(needle)) && (
          <View style={s.searchWrap}>
            <UiElement
              as={Field}
              hideLabel
              label={t('discovery.searchLabel')}
              placeholder={
                category
                  ? `Search within ${categoryName}...`
                  : t('discovery.searchPlaceholder')
              }
              value={query}
              onChangeText={(value) => { setShowAllResults(false); setDraft({scope, value}); }}
            />
          </View>
        )}

        {/* SEARCH RESULTS VIEW */}
        {needle ? (
          <View style={{gap: 12}}>
            <UiElement
              as={Heading}
              title={t('discovery.results')}
              action={t('common.clear')}
              onPress={() => { setShowAllResults(false); setDraft({scope, value: ''}); }}
            />
            <View style={{gap: 10}}>
              {displayedResults.map((result) => (
                <Pressable
                  key={result.id}
                  accessibilityRole="button"
                  onPress={() => {
                    if (result.selection.category && result.selection.subcategory && result.selection.type) {
                      setDraft(null);
                      router.push({
                        pathname: '/services/nearby',
                        params: {
                          category: result.selection.category,
                          subcategory: result.selection.subcategory,
                          type: result.selection.type,
                        },
                      });
                    } else {
                      open(result.selection);
                    }
                  }}
                  style={({pressed}) => [
                    s.flowCard,
                    {
                      backgroundColor: isDark ? '#0f233dd9' : '#ffffffd9',
                      borderColor: isDark ? '#1e3a5f' : '#e2e8f0',
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <View style={s.flowPhoto}>
                    <Image
                      source={croppedPhoto(nativeMarketplacePhoto(result.id),'square')}
                      resizeMode="cover"
                      accessibilityLabel={nativeMarketplaceAlt(result.id) ?? result.title}
                      style={[StyleSheet.absoluteFill,s.flowImage]}
                    />
                  </View>
                  <View style={{flex: 1, minWidth: 0, gap: 3}}>
                    <Text numberOfLines={2} style={[s.flowCardTitle, {color: colors.text}]}>
                      {label(result.id, result.title)}
                    </Text>
                    <Text style={{fontSize: 11, color: colors.muted}}>
                      <UiText value="Direct Service Listing" />
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.accent} />
                </Pressable>
              ))}
            </View>
            {results.length > displayedResults.length && (
              <UiElement
                as={Action}
                secondary
                label={`Show all ${results.length} matches`}
                onPress={() => setShowAllResults(true)}
              />
            )}
            {!results.length && <Text style={styles.muted}>{t('discovery.noMatches')}</Text>}
          </View>
        ) : isListingTypeLevel ? (
          /* LEVEL 4: NEARBY SERVICE MAP + DISTANCE-SORTED LISTINGS */
          <View onLayout={(event) => { optionsTop.current = event.nativeEvent.layout.y; }} style={{gap: 14}}>
            <View onLayout={(event) => { optionsOffset.current = event.nativeEvent.layout.y; }}>
              <MobileNearbyServiceDiscovery
                key={category!.slug + '/' + subcategory!.slug + '/' + listingType!.slug}
                categorySlug={category!.slug}
                categoryTitle={categoryName}
                subcategorySlug={subcategory!.slug}
                typeSlug={listingType!.slug}
                serviceTitle={singleType ? subcategoryName : listingTypeName}
              />
            </View>

            {/* Inquiries & Help */}
            <ListingHelp
              title={listingTypeName}
              context={category!.title + ' / ' + subcategory!.title}
            />

            {/* Seller Add-Service Callout */}
            {seller && (
              <View
                style={[
                  s.sellerOfferCard,
                  {
                    backgroundColor: isDark ? '#0f233d' : '#ffffff',
                    borderColor: isDark ? '#1e3a5f' : '#e2e8f0',
                  },
                ]}
              >
                <View style={{flex: 1, minWidth: 0, gap: 2}}>
                  <Text style={[s.sellerOfferTitle, {color: colors.text}]}>
                    <UiText value="Do you provide " />
                    {listingTypeName}?
                  </Text>
                  <Text style={{fontSize: 12, color: colors.muted}}>
                    <UiText value="List your packages on Vistrah marketplace" />
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: '/seller/onboard',
                      params: {
                        category: category!.slug,
                        subcategory: subcategory!.slug,
                        type: listingType!.slug,
                      },
                    })
                  }
                  style={({pressed}) => [s.addServiceBtn, {opacity: pressed ? 0.85 : 1}]}
                >
                  <LinearGradient
                    colors={accentGradient}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={s.addServiceGradient}
                  >
                    <Feather name="plus" size={14} color="#fff" />
                    <Text style={s.addServiceText}>Add Service</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}

            {/* Sister Listing Types Flow Rail (only when a business type has several options) */}
            {!singleType && <View style={{gap: 8, marginTop: 4}}>
              <Text style={[s.sectionSubtitleLabel, {color: colors.muted}]}>
                <UiText value="Other options in " />
                {subcategoryName}
              </Text>
              <View style={s.sisterChipsRow}>
                {subcategory!.listing_types
                  .filter((tItem) => tItem.slug !== listingType!.slug)
                  .slice(0, 5)
                  .map((tItem) => (
                    <Pressable
                      key={tItem.slug}
                      accessibilityRole="button"
                      onPress={() =>
                        open({
                          category: category!.slug,
                          subcategory: subcategory!.slug,
                          type: tItem.slug,
                        })
                      }
                      style={({pressed}) => [
                        s.sisterChip,
                        {
                          backgroundColor: isDark ? '#0f233d' : '#ffffff',
                          borderColor: isDark ? '#1e3a5f' : '#e2e8f0',
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Text style={[s.sisterChipText, {color: colors.text}]}>
                        {label(
                          marketplaceItemId(category!.slug, subcategory!.slug, tItem.slug),
                          tItem.title
                        )}
                      </Text>
                      <Feather name="arrow-right" size={11} color={colors.accent} />
                    </Pressable>
                  ))}
              </View>
            </View>}
          </View>
        ) : isSubcategoryLevel ? (
          /* LEVEL 3: SUBCATEGORY SELECTED -> LISTING TYPES LIST */
          <View style={{gap: 12}}>
            <View style={s.sectionHeader}>
              <View style={{flex: 1, minWidth: 0}}>
                <Text style={[s.sectionEyebrow, {color: '#EA580C'}]}>Service Types</Text>
                <Text accessibilityRole="header" style={[s.sectionTitle, {color: colors.text}]}>
                  {t('discovery.types')}
                </Text>
              </View>
              <Text style={{fontSize: 12, fontWeight: '600', color: colors.muted}}>
                {subcategory!.listing_types.length} <UiText value="types" />
              </Text>
            </View>

            <View onLayout={event=>setCardsWidth(event.nativeEvent.layout.width)} style={s.flowGrid}>
              {subcategory!.listing_types.map((type) => {
                const itemId = marketplaceItemId(category!.slug, subcategory!.slug, type.slug);
                return (
                  <Pressable
                    key={type.slug}
                    accessibilityRole="button"
                    testID={`marketplace-type-${type.slug}`}
                    onPress={() =>
                      router.push({
                        pathname: '/services/nearby',
                        params: {
                          category: category!.slug,
                          subcategory: subcategory!.slug,
                          type: type.slug,
                        },
                      })
                    }
                    style={({pressed}) => [
                      s.flowCard,
                      s.flowGridCard,
                      {width: cardWidth ?? '48%', flexGrow: 0, flexShrink: 0, paddingBottom: 10},
                      {
                        backgroundColor: isDark ? '#0f233dd9' : '#ffffffd9',
                        borderColor: isDark ? '#1e3a5f' : '#e2e8f0',
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    <View style={s.flowGridPhoto}>
                      <Image
                        source={croppedPhoto(nativeMarketplacePhoto(itemId),'wide')}
                        resizeMode="cover"
                        accessibilityLabel={nativeMarketplaceAlt(itemId) ?? type.title}
                        style={[StyleSheet.absoluteFill,s.flowImage]}
                      />
                    </View>
                    <View style={{flex: 1, minWidth: 0, gap: 4}}>
                      <Text numberOfLines={2} style={[s.flowCardTitle, {color: colors.text}]}>
                        {label(itemId, type.title)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <UiElement
              as={Action}
              secondary
              label={t('discovery.allSubcategories', {name: categoryName})}
              onPress={() => open({category: category!.slug})}
            />
          </View>
        ) : isCategoryLevel ? (
          /* LEVEL 2: CATEGORY SELECTED -> SUBCATEGORIES LIST */
          <View style={{gap: 12}}>
            <View style={s.sectionHeader}>
              <View style={{flex: 1, minWidth: 0}}>
                <Text style={[s.sectionEyebrow, {color: '#EA580C'}]}>Available Services</Text>
                <Text accessibilityRole="header" style={[s.sectionTitle, {color: colors.text}]}>
                  {t('discovery.types')}
                </Text>
              </View>
              <Text style={{fontSize: 12, fontWeight: '600', color: colors.muted}}>
                {category!.subcategories.length} <UiText value="available" />
              </Text>
            </View>

            <View onLayout={event=>setCardsWidth(event.nativeEvent.layout.width)} style={s.flowGrid}>
              {category!.subcategories.map((sub) => {
                const itemId = marketplaceItemId(category!.slug, sub.slug);
                return (
                  <Pressable
                    key={sub.slug}
                    testID={`marketplace-subcategory-${sub.slug}`}
                    accessibilityRole="button"
                    onPress={() => router.push({pathname:'/services/nearby',params:{category:category!.slug,subcategory:sub.slug,type:sub.listing_types[0].slug}})}
                    style={({pressed}) => [
                      s.flowCard,
                      s.flowGridCard,
                      {width:cardWidth??'48%',flexGrow:0,flexShrink:0},
                      {
                        backgroundColor: isDark ? '#0f233dd9' : '#ffffffd9',
                        borderColor: isDark ? '#1e3a5f' : '#e2e8f0',
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    <View style={s.flowGridPhoto}>
                      <Image
                        source={croppedPhoto(nativeMarketplacePhoto(itemId),'wide')}
                        resizeMode="cover"
                        accessibilityLabel={nativeMarketplaceAlt(itemId) ?? sub.title}
                        style={[StyleSheet.absoluteFill,s.flowImage]}
                      />
                    </View>
                    <View style={{flex: 1, minWidth: 0, gap: 4}}>
                      <Text numberOfLines={2} style={[s.flowCardTitle, {color: colors.text}]}>
                        {label(itemId, sub.title)}
                      </Text>
                      {Boolean(sub.description) && (
                        <Text numberOfLines={2} style={{fontSize: 11, lineHeight: 15, color: colors.muted}}>
                          {sub.description}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <UiElement
              as={Action}
              secondary
              label={t('catalogue.all')}
              onPress={() => open({})}
            />
          </View>
        ) : (
          /* LEVEL 1: ALL CATEGORIES GRID */
          <MarketplaceCategories />
        )}

        {/* BOTTOM SELLER FOOTER ACTIONS */}
        {!seller && !isListingTypeLevel && (
          <View style={[s.bottomSellerBox, {borderTopColor: colors.border}]}>
            <SellerSignInAction
              label={sellerLabel}
              disabled={!session.ready}
              onPress={openSeller}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ListingHelp({title, context}: {title: string; context: string}) {
  const {styles} = useTheme();
  const [error, setError] = useState('');
  async function contact() {
    setError('');
    try {
      await Linking.openURL(listingEnquiryHref(title, context));
    } catch {
      setError('Could not open your email app. You can email ' + officialContact.email + ' directly.');
    }
  }
  return (
    <View style={styles.card}>
      <Heading title={customerListingCopy.helpTitle} />
      <Text style={styles.muted}>{customerListingCopy.helpCopy}</Text>
      <Action label={customerListingCopy.helpAction} secondary onPress={() => void contact()} />
      {Boolean(error) && <ErrorPanel error={error} />}
    </View>
  );
}

const s = StyleSheet.create({
  topBarRow: {
    paddingVertical: 2,
  },
  sellerWelcomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sellerDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34d399',
  },
  sellerWelcomeText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Interactive Breadcrumb Flow Bar
  breadcrumbBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  backCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  crumbScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 8,
  },
  crumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  crumbActiveItem: {
    backgroundColor: '#ffffff28',
  },
  crumbText: {
    fontSize: 12,
    fontWeight: '600',
  },
  crumbActiveText: {
    fontWeight: '600',
  },

  // Hero
  hero: {
    borderRadius: 22,
    padding: 18,
    gap: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#ffffff1a',
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F97316',
    opacity: 0.2,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.1,
    color: '#fff',
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#ffffff14',
  },
  heroPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  heroTextSurface: {
    backgroundColor: '#172c26',
    alignSelf: 'flex-start',
    borderRadius: 4,
  },
  heroTitle: {
    fontSize: Platform.OS === 'android' ? 22 : 20,
    lineHeight: Platform.OS === 'android' ? 26 : 24,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: '#ffffff',
  },
  heroSubtitle: {
    fontSize: 12.5,
    lineHeight: 19,
    color: '#cbd5e1',
  },

  searchWrap: {
    marginTop: 4,
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.1,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'android' ? 18 : 16,
    lineHeight: Platform.OS === 'android' ? 22 : 19,
    fontWeight: '600',
    letterSpacing: -0.4,
  },

  flowGrid:{flexDirection:'row',flexWrap:'wrap',gap:12,alignItems:'stretch'},
  flowGridCard:{flexDirection:'column',alignItems:'stretch',gap:8,flexGrow:1},
  flowGridPhoto:{width:'100%',aspectRatio:16/9,borderRadius:12,overflow:'hidden',backgroundColor:'#eeeeeed9',flexShrink:0},
  flowImage:{width:'100%',height:'100%'},
  // Flow Cards (Subcategories & Listing Types)
  flowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#0F294A',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  flowPhoto: {
    width: 68,
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#eeeeeed9',
    flexShrink: 0,
  },
  flowCardTitle: {
    ...typography.cardTitle,
  },
  // Level 4 Journey Card
  journeyCard: {
    padding: 16,
    borderRadius: 18,
    gap: 8,
    borderWidth: 1,
  },
  journeyEyebrow: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  journeyTitle: {
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: -0.23,
    fontWeight: '600',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0F294A',
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  stepText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Seller Offer Box
  sellerOfferCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  sellerOfferTitle: {
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.2,
    fontWeight: '600',
  },
  addServiceBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addServiceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addServiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  // Sister Listing Chips
  sectionSubtitleLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  sisterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sisterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  sisterChipText: {
    fontSize: 11,
    fontWeight: '600',
  },

  bottomSellerBox: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
});
