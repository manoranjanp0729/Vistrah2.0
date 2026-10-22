import {UiText, UiElement} from '../../../components/localized-ui';
import {SellerSignInAction} from '../../../components/seller-sign-in-action';
import {useLanguage} from '../../../lib/language';
import {useRef, useState, type ReactNode} from 'react';
import {
  Linking,
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import {router, useLocalSearchParams} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {LinearGradient} from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import {Field, Heading, ErrorPanel, Action} from '../../../components/ui';
import {MarketplaceCategories} from '../../../components/marketplace-categories';
import {
  marketplaceItemId,
  resolveMarketplaceSelection,
  searchMarketplaceEntries,
  type MarketplaceSelection,
} from '../../../lib/marketplace';
import {nativeMarketplacePhoto, nativeMarketplaceAlt} from '../../../lib/marketplace-photo';
import {useTheme} from '../../../lib/theme';
import {useSession} from '../../../lib/session';
import {ClassifiedServices} from '../../../components/commerce-browser';
import {customerListingCopy, listingEnquiryHref} from '../../../../../shared/customer-listing';
import {officialContact} from '../../../../../shared/public-contact';
import {serviceSelection} from '../../../../../shared/service-listing';

export default function Services() {
  const {styles, colors, mode, accentGradient} = useTheme();
  const {t, label} = useLanguage();
  const session = useSession(true);
  const scroll = useRef<ScrollView>(null);
  const optionsTop = useRef(0);
  const optionsOffset = useRef(0);
  const isDark = mode === 'dark';

  const seller = Boolean(session.user?.seller_enabled);
  const sellerLabel = !session.ready
    ? 'Checking seller session...'
    : seller
    ? `Welcome, ${session.user!.name}`
    : 'Login/Signup as seller';
  const openSeller = () =>
    router.push({pathname: '/auth', params: {mode: 'seller', register: '1', next: '/services'}});

  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  async function logoutSeller() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError('');
    try {
      await session.signOut();
    } catch (error) {
      setLogoutError((error as Error).message);
    } finally {
      setLoggingOut(false);
    }
  }

  const raw = useLocalSearchParams<{category?: string; subcategory?: string; type?: string; q?: string}>();
  const params: MarketplaceSelection = {
    category: typeof raw.category === 'string' ? raw.category : undefined,
    subcategory: typeof raw.subcategory === 'string' ? raw.subcategory : undefined,
    type: typeof raw.type === 'string' ? raw.type : undefined,
    q: typeof raw.q === 'string' ? raw.q : undefined,
  };

  const scope = JSON.stringify(params);
  const [draft, setDraft] = useState<{scope: string; value: string} | null>(null);
  const query = draft?.scope === scope ? draft.value : params.q ?? '';
  const selected = resolveMarketplaceSelection(params);
  const needle = query.trim();

  const open = (selection: MarketplaceSelection) => {
    setDraft(null);
    router.push({pathname: '/services', params: selection});
  };

  if (!selected) {
    return (
      <SafeAreaView edges={['left', 'right']} style={styles.page}>
        <View style={styles.content}>
          <UiElement as={Heading} title={t('discovery.notFound')} />
          <Text style={styles.muted}>{t('discovery.chooseValid')}</Text>
          <UiElement as={Action} secondary label={t('catalogue.all')} onPress={() => open({})} />
        </View>
      </SafeAreaView>
    );
  }

  const {category, subcategory, listingType} = selected;
  const results = searchMarketplaceEntries(query);

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
        contentContainerStyle={[styles.content, {paddingBottom: 36}]}
        keyboardShouldPersistTaps="handled"
      >
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
                backgroundColor: isDark ? '#1a1329' : '#f5effc',
                borderColor: isDark ? '#322549' : '#e6daf2',
              },
            ]}
          >
            {/* Quick 1-Step Back Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back one level"
              onPress={() => {
                if (isListingTypeLevel) {
                  open({category: category!.slug, subcategory: subcategory!.slug});
                } else if (isSubcategoryLevel) {
                  open({category: category!.slug});
                } else {
                  open({});
                }
              }}
              style={({pressed}) => [
                s.backCircle,
                {backgroundColor: isDark ? '#2a1f42' : '#ffffff', opacity: pressed ? 0.7 : 1},
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
                        {color: isCategoryLevel ? (isDark ? '#fff' : '#1f1338') : colors.accent},
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
                      listingType
                        ? open({category: category!.slug, subcategory: subcategory!.slug})
                        : null
                    }
                    style={[s.crumbItem, isSubcategoryLevel && s.crumbActiveItem]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        s.crumbText,
                        {color: isSubcategoryLevel ? (isDark ? '#fff' : '#1f1338') : colors.accent},
                        isSubcategoryLevel && s.crumbActiveText,
                      ]}
                    >
                      {subcategoryName}
                    </Text>
                  </Pressable>
                </>
              )}

              {Boolean(listingType) && (
                <>
                  <Feather name="chevron-right" size={12} color={colors.muted} />
                  <View style={[s.crumbItem, s.crumbActiveItem]}>
                    <Text
                      numberOfLines={1}
                      style={[
                        s.crumbText,
                        {color: isDark ? '#fff' : '#1f1338'},
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

        {/* PROGRESSIVE CONTEXTUAL HERO BANNER */}
        <LinearGradient
          colors={isDark ? ['#150e26', '#22133e', '#361552'] : ['#180e2d', '#281347', '#421764']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={s.hero}
        >
          <View pointerEvents="none" style={s.heroGlow} />

          {isRootLevel ? (
            <>
              <View style={s.heroBadgeRow}>
                <LinearGradient
                  colors={accentGradient}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={s.heroBadge}
                >
                  <Ionicons name="sparkles" size={11} color="#fff" />
                  <Text style={s.heroBadgeText}>VISTRAH MARKETPLACE</Text>
                </LinearGradient>
                <View style={s.heroPill}>
                  <Feather name="shield" size={11} color="#34d399" />
                  <Text style={s.heroPillText}>Verified Providers</Text>
                </View>
              </View>
              <Text accessibilityRole="header" style={s.heroTitle}>
                {t('discovery.title')}
              </Text>
              <Text style={s.heroSubtitle}>
                <UiText value="Browse and connect with verified local professionals, equipment rentals, and specialized services across India." />
              </Text>
            </>
          ) : isCategoryLevel ? (
            <>
              <View style={s.heroBadgeRow}>
                <LinearGradient
                  colors={accentGradient}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={s.heroBadge}
                >
                  <Text style={s.heroBadgeText}>SECTOR CATEGORY</Text>
                </LinearGradient>
                <View style={s.heroPill}>
                  <Text style={s.heroPillText}>
                    {category!.subcategories.length} <UiText value="Subcategories" />
                  </Text>
                </View>
              </View>
              <Text accessibilityRole="header" style={s.heroTitle}>
                {categoryName}
              </Text>
              <Text style={s.heroSubtitle}>
                <UiText value="Select a specialized subcategory below to view dedicated providers and services." />
              </Text>
            </>
          ) : isSubcategoryLevel ? (
            <>
              <View style={s.heroBadgeRow}>
                <LinearGradient
                  colors={accentGradient}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={s.heroBadge}
                >
                  <Text style={s.heroBadgeText}>{categoryName.toUpperCase()}</Text>
                </LinearGradient>
                <View style={s.heroPill}>
                  <Text style={s.heroPillText}>
                    {subcategory!.listing_types.length} <UiText value="Service Types" />
                  </Text>
                </View>
              </View>
              <Text accessibilityRole="header" style={s.heroTitle}>
                {subcategoryName}
              </Text>
              <Text style={s.heroSubtitle}>
                <UiText value="Choose an exact service listing type to browse offers, get quotations, and contact verified specialists." />
              </Text>
            </>
          ) : (
            <>
              <View style={s.heroBadgeRow}>
                <LinearGradient
                  colors={accentGradient}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={s.heroBadge}
                >
                  <Text style={s.heroBadgeText}>{subcategoryName.toUpperCase()}</Text>
                </LinearGradient>
                <View style={s.heroPill}>
                  <Feather name="check-circle" size={11} color="#34d399" />
                  <Text style={s.heroPillText}>Direct Listings</Text>
                </View>
              </View>
              <Text accessibilityRole="header" style={s.heroTitle}>
                {listingTypeName}
              </Text>
              <Text style={s.heroSubtitle}>
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
              onChangeText={(value) => setDraft({scope, value})}
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
              onPress={() => setDraft({scope, value: ''})}
            />
            <View style={{gap: 10}}>
              {results.map((result) => (
                <Pressable
                  key={result.id}
                  accessibilityRole="button"
                  onPress={() => open(result.selection)}
                  style={({pressed}) => [
                    s.flowCard,
                    {
                      backgroundColor: isDark ? '#1d172b' : '#ffffff',
                      borderColor: isDark ? '#33264c' : '#e5dbee',
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <View style={s.flowPhoto}>
                    <Image
                      source={nativeMarketplacePhoto(result.id)}
                      resizeMode="cover"
                      accessibilityLabel={nativeMarketplaceAlt(result.id) ?? result.title}
                      style={StyleSheet.absoluteFill}
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
            {!results.length && <Text style={styles.muted}>{t('discovery.noMatches')}</Text>}
          </View>
        ) : isListingTypeLevel ? (
          /* LEVEL 4: LISTING TYPE & COMMERCE OFFERS */
          <View onLayout={(event) => { optionsTop.current = event.nativeEvent.layout.y; }} style={{gap: 14}}>
            {/* Visual Step Guide */}
            <View
              style={[
                s.journeyCard,
                {
                  backgroundColor: isDark ? '#1a132a' : '#f7f4fb',
                  borderColor: isDark ? '#322549' : '#e6daf0',
                },
              ]}
            >
              <Text style={[s.journeyEyebrow, {color: colors.accent}]}>DIRECT FULFILLMENT STEPS</Text>
              <Text accessibilityRole="header" style={[s.journeyTitle, {color: colors.text}]}>
                <UiText value="How it works" />
              </Text>
              <View style={s.stepsRow}>
                <View style={s.stepPill}>
                  <Text style={s.stepNum}>1</Text>
                  <Text style={[s.stepText, {color: colors.text}]}>
                    <UiText value="Review Offers" />
                  </Text>
                </View>
                <Feather name="arrow-right" size={13} color={colors.muted} />
                <View style={s.stepPill}>
                  <Text style={s.stepNum}>2</Text>
                  <Text style={[s.stepText, {color: colors.text}]}>
                    <UiText value="Direct Contact" />
                  </Text>
                </View>
                <Feather name="arrow-right" size={13} color={colors.muted} />
                <View style={s.stepPill}>
                  <Text style={s.stepNum}>3</Text>
                  <Text style={[s.stepText, {color: colors.text}]}>
                    <UiText value="Schedule" />
                  </Text>
                </View>
              </View>
            </View>

            {/* Classified Commerce Offers */}
            <View onLayout={(event) => { optionsOffset.current = event.nativeEvent.layout.y; }}>
              <ClassifiedServices
                selection={{
                  category: category!.slug,
                  subcategory: subcategory!.slug,
                  type: listingType!.slug,
                }}
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
                    backgroundColor: isDark ? '#1f1830' : '#ffffff',
                    borderColor: isDark ? '#372854' : '#e2d5ed',
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
                      pathname: '/seller/add-service',
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

            {/* Sister Listing Types Flow Rail */}
            <View style={{gap: 8, marginTop: 4}}>
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
                          backgroundColor: isDark ? '#231b34' : '#ffffff',
                          borderColor: isDark ? '#382a52' : '#e0d4ea',
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
            </View>
          </View>
        ) : isSubcategoryLevel ? (
          /* LEVEL 3: SUBCATEGORY SELECTED -> LISTING TYPES LIST */
          <View style={{gap: 12}}>
            <View style={s.sectionHeader}>
              <View style={{flex: 1, minWidth: 0}}>
                <Text style={[s.sectionEyebrow, {color: colors.accent}]}>STEP 3 OF 3</Text>
                <Text accessibilityRole="header" style={[s.sectionTitle, {color: colors.text}]}>
                  {t('discovery.types')}
                </Text>
              </View>
              <Text style={{fontSize: 12, fontWeight: '600', color: colors.muted}}>
                {subcategory!.listing_types.length} <UiText value="types" />
              </Text>
            </View>

            <View style={{gap: 10}}>
              {subcategory!.listing_types.map((type) => {
                const itemId = marketplaceItemId(category!.slug, subcategory!.slug, type.slug);
                return (
                  <TypeAction
                    key={type.slug}
                    seller={seller}
                    selection={{
                      category: category!.slug,
                      subcategory: subcategory!.slug,
                      type: type.slug,
                    }}
                    title={type.title}
                  >
                    <Pressable
                      accessibilityRole="button"
                      testID={`marketplace-type-${type.slug}`}
                      onPress={() =>
                        open({
                          category: category!.slug,
                          subcategory: subcategory!.slug,
                          type: type.slug,
                        })
                      }
                      style={({pressed}) => [
                        s.flowCard,
                        {
                          backgroundColor: isDark ? '#1d172b' : '#ffffff',
                          borderColor: isDark ? '#33264c' : '#e5dbee',
                          opacity: pressed ? 0.88 : 1,
                        },
                      ]}
                    >
                      <View style={s.flowPhoto}>
                        <Image
                          source={nativeMarketplacePhoto(itemId)}
                          resizeMode="cover"
                          accessibilityLabel={nativeMarketplaceAlt(itemId) ?? type.title}
                          style={StyleSheet.absoluteFill}
                        />
                      </View>
                      <View style={{flex: 1, minWidth: 0, gap: 4}}>
                        <Text numberOfLines={2} style={[s.flowCardTitle, {color: colors.text}]}>
                          {label(itemId, type.title)}
                        </Text>
                        <View style={s.verifiedRow}>
                          <Feather name="check" size={12} color="#34d399" />
                          <Text style={{fontSize: 11, color: colors.muted}}>
                            <UiText value="Direct local listings" />
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          s.actionPill,
                          {backgroundColor: isDark ? '#2b1e42' : '#f5effa'},
                        ]}
                      >
                        <Feather name="chevron-right" size={16} color={colors.accent} />
                      </View>
                    </Pressable>
                  </TypeAction>
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
                <Text style={[s.sectionEyebrow, {color: colors.accent}]}>STEP 2 OF 3</Text>
                <Text accessibilityRole="header" style={[s.sectionTitle, {color: colors.text}]}>
                  {t('discovery.exploreSubcategories')}
                </Text>
              </View>
              <Text style={{fontSize: 12, fontWeight: '600', color: colors.muted}}>
                {category!.subcategories.length} <UiText value="available" />
              </Text>
            </View>

            <View style={{gap: 10}}>
              {category!.subcategories.map((sub) => {
                const itemId = marketplaceItemId(category!.slug, sub.slug);
                return (
                  <Pressable
                    key={sub.slug}
                    testID={`marketplace-subcategory-${sub.slug}`}
                    accessibilityRole="button"
                    onPress={() => open({category: category!.slug, subcategory: sub.slug})}
                    style={({pressed}) => [
                      s.flowCard,
                      {
                        backgroundColor: isDark ? '#1d172b' : '#ffffff',
                        borderColor: isDark ? '#33264c' : '#e5dbee',
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    <View style={s.flowPhoto}>
                      <Image
                        source={nativeMarketplacePhoto(itemId)}
                        resizeMode="cover"
                        accessibilityLabel={nativeMarketplaceAlt(itemId) ?? sub.title}
                        style={StyleSheet.absoluteFill}
                      />
                    </View>
                    <View style={{flex: 1, minWidth: 0, gap: 4}}>
                      <Text numberOfLines={2} style={[s.flowCardTitle, {color: colors.text}]}>
                        {label(itemId, sub.title)}
                      </Text>
                      <Text style={{fontSize: 11, color: colors.muted}}>
                        {sub.listing_types.length} <UiText value="specialized service types" />
                      </Text>
                    </View>
                    <View
                      style={[
                        s.actionPill,
                        {backgroundColor: isDark ? '#2b1e42' : '#f5effa'},
                      ]}
                    >
                      <Feather name="chevron-right" size={16} color={colors.accent} />
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
        {(seller || !isListingTypeLevel) && (
          <View style={[s.bottomSellerBox, {borderTopColor: colors.border}]}>
            {Boolean(logoutError) && <ErrorPanel error={logoutError} />}
            {seller ? (
              <UiElement
                as={Action}
                secondary
                label={loggingOut ? 'Logging out...' : 'Logout as seller'}
                disabled={loggingOut}
                onPress={() => void logoutSeller()}
              />
            ) : !isListingTypeLevel ? (
              <SellerSignInAction
                label={sellerLabel}
                disabled={!session.ready}
                onPress={openSeller}
              />
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TypeAction({
  seller,
  selection,
  title,
  children,
}: {
  seller: boolean;
  selection: MarketplaceSelection;
  title: string;
  children: ReactNode;
}) {
  const {colors} = useTheme();
  const selected = serviceSelection(selection);
  return (
    <View style={{position: 'relative'}}>
      {children}
      {seller && selected && (
        <UiElement
          as={Pressable}
          accessibilityRole="button"
          accessibilityLabel={'Add service: ' + title}
          onPress={() => router.push({pathname: '/seller/add-service', params: selected})}
          style={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            backgroundColor: colors.surface,
            minWidth: 40,
            minHeight: 40,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 2,
          }}
        >
          <Text style={{fontSize: 22, color: colors.accent}}>+</Text>
        </UiElement>
      )}
    </View>
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
    fontWeight: '700',
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
    fontWeight: '800',
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
    backgroundColor: '#7741c4',
    opacity: 0.25,
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
    fontWeight: '800',
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
    color: '#e4d8f5',
  },
  heroTitle: {
    fontSize: Platform.OS === 'android' ? 22 : 20,
    lineHeight: Platform.OS === 'android' ? 27 : 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: '#ffffff',
  },
  heroSubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#d6c8ed',
  },

  searchWrap: {
    marginTop: 2,
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'android' ? 18 : 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // Flow Cards (Subcategories & Listing Types)
  flowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#503fbd',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  flowPhoto: {
    width: 68,
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#eee',
    flexShrink: 0,
  },
  flowCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Level 4 Journey Card
  journeyCard: {
    padding: 14,
    borderRadius: 18,
    gap: 8,
    borderWidth: 1,
  },
  journeyEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  journeyTitle: {
    fontSize: 15,
    fontWeight: '800',
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
    backgroundColor: '#7741c4',
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
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
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  sellerOfferTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  addServiceBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addServiceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  addServiceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  // Sister Listing Chips
  sectionSubtitleLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sisterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sisterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
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
