import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router, type Href} from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import {Text} from './typography';
import {useTheme} from '../lib/theme';
import {
  ADS_STUDIO_PILLARS,
  AGRI_CARDS,
  BUSINESS_TIMELINE,
  getHeroBannerByKey,
  HEALTH_PATHWAYS,
  HERO_BANNER_ASPECT_RATIO,
  HERO_BANNERS,
  USER_COMPARISON,
  USER_VERTICALS,
  VADS_RATE_SNAPSHOT,
  type HeroBannerKey,
} from '../../../shared/hero-banners';

const BANNER_IMAGES: Record<HeroBannerKey, ImageSourcePropType> = {
  users: require('../../assets/hero-journey/for-users-widescreen.jpg'),
  businesses: require('../../assets/hero-journey/for-businesses-widescreen.jpg'),
  ads: require('../../assets/hero-journey/v-ads-widescreen.jpg'),
  agri: require('../../assets/hero-journey/agriconnect-widescreen.jpg'),
  health: require('../../assets/hero-journey/healthconnect-family-banner.jpg'),
};

function openMobileDestination(dest: string) {
  if (dest.startsWith('/services?')) {
    const queryStr = dest.split('?')[1] ?? '';
    const params = new URLSearchParams(queryStr);
    const category = params.get('category') ?? undefined;
    const subcategory = params.get('subcategory') ?? undefined;
    router.push({pathname: '/services', params: {category, subcategory}});
    return;
  }
  router.push(dest as Href);
}

export function HeroStoryPage({storyKey}: {storyKey: HeroBannerKey}) {
  const {mode, colors} = useTheme();
  const {width} = useWindowDimensions();
  const wide = width >= 820;
  const medium = width >= 560;
  const isDark = mode === 'dark';

  const banner = getHeroBannerByKey(storyKey);

  const pageBg = isDark ? '#0b0b0e' : '#f8fafc';
  const surface = isDark ? '#18181b' : '#ffffff';
  const surfaceSoft = isDark ? '#111114' : '#f1f5f9';
  const hairline = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.10)';
  const textPrimary = isDark ? '#fafafa' : '#0f172a';
  const textSecondary = isDark ? '#a1a1aa' : '#475569';
  const accentColor = isDark ? colors.accent || '#f9aa45' : '#173f35';
  const primaryBtnInk = '#ffffff';

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{flex: 1, backgroundColor: pageBg}}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.page, {paddingHorizontal: wide ? 24 : 16}]}
      >
        {/* Top 5-Story Magazine Switcher */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.switcherScroll}
        >
          {HERO_BANNERS.map(item => {
            const active = item.key === storyKey;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="link"
                onPress={() => {
                  if (!active) router.replace(item.storyPath as Href);
                }}
                style={[
                  s.storyTab,
                  {
                    backgroundColor: active ? accentColor : surface,
                    borderColor: active ? accentColor : hairline,
                  },
                ]}
              >
                <Text style={[s.storyTabText, {color: active ? '#ffffff' : textSecondary}]}>
                  {item.stepNumber} {item.navTitle}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Full-Width Widescreen Banner Artwork + Stat Callout Bar */}
        <View style={[s.heroFrame, {backgroundColor: surface, borderColor: hairline}]}>
          <View style={{width: '100%', aspectRatio: HERO_BANNER_ASPECT_RATIO, backgroundColor: '#0f172a'}}>
            <Image
              source={BANNER_IMAGES[storyKey]}
              resizeMode="cover"
              accessibilityLabel={`${banner.badge} — ${banner.title}`}
              style={{width: '100%', height: '100%'}}
            />
          </View>

          <View style={[s.heroIntro, {borderTopColor: hairline}]}>
            <View style={{flex: 1, minWidth: 240, gap: 6}}>
              <Text style={[s.eyebrow, {color: isDark ? '#f9aa45' : '#173f35'}]}>
                {banner.stepNumber} · {banner.badge}
              </Text>
              <Text accessibilityRole="header" style={[s.displayTitle, {color: textPrimary}]}>
                {banner.title}
              </Text>
              <Text style={[s.leadText, {color: textSecondary}]}>{banner.subtitle}</Text>
            </View>

            <View style={[s.ctaRow, !medium && {width: '100%'}]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => openMobileDestination(banner.primaryCta.mobileRoute)}
                style={({pressed}) => [
                  s.primaryBtn,
                  {
                    backgroundColor: accentColor,
                    borderColor: accentColor,
                    opacity: pressed ? 0.86 : 1,
                    flex: medium ? 0 : 1,
                  },
                ]}
              >
                <Text style={[s.primaryBtnText, {color: primaryBtnInk}]}>
                  {banner.primaryCta.label}
                </Text>
                <Feather name="arrow-right" size={15} color={primaryBtnInk} />
              </Pressable>

              {banner.secondaryCta && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openMobileDestination(banner.secondaryCta!.mobileRoute)}
                  style={({pressed}) => [
                    s.secondaryBtn,
                    {
                      backgroundColor: surfaceSoft,
                      borderColor: hairline,
                      opacity: pressed ? 0.86 : 1,
                      flex: medium ? 0 : 1,
                    },
                  ]}
                >
                  <Text style={[s.secondaryBtnText, {color: textPrimary}]}>
                    {banner.secondaryCta.label}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={[s.statGrid, {backgroundColor: surfaceSoft, borderTopColor: hairline}]}>
            {banner.stats.map((stat, idx) => (
              <View
                key={stat.label}
                style={[
                  s.statCell,
                  {width: wide ? '25%' : '50%'},
                  wide
                    ? idx < 3 && {borderRightWidth: 1, borderRightColor: hairline}
                    : {
                        ...(idx % 2 === 0 ? {borderRightWidth: 1, borderRightColor: hairline} : {}),
                        ...(idx < 2 ? {borderBottomWidth: 1, borderBottomColor: hairline} : {}),
                      },
                ]}
              >
                <Text style={[s.statVal, {color: textPrimary}]}>{stat.value}</Text>
                <Text style={[s.statLbl, {color: textSecondary}]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* STORY 1: FOR USERS */}
        {storyKey === 'users' && (
          <>
            <View style={s.sectionBlock}>
              <View style={s.sectionHeader}>
                <View>
                  <Text style={[s.eyebrow, {color: textSecondary}]}>VISUAL COMPARISON</Text>
                  <Text accessibilityRole="header" style={[s.sectionTitle, {color: textPrimary}]}>
                    Static Directories vs. VISTRAH Direct
                  </Text>
                </View>
              </View>

              <View style={[s.gridWrap, wide && {flexDirection: 'row'}]}>
                {/* Legacy Card */}
                <View style={[s.card, wide && {flex: 1}, {backgroundColor: surface, borderColor: hairline}]}>
                  <View style={[s.mockupHeader, {backgroundColor: surfaceSoft, borderBottomColor: hairline}]}>
                    <View style={[s.spamMockRow, {backgroundColor: surface, borderColor: hairline}]}>
                      <Text style={{fontSize: 12, color: textSecondary}}>Unknown Lead Broker #1</Text>
                      <Text style={{fontSize: 11, fontWeight: '700', color: '#ef4444'}}>SPAM ×5</Text>
                    </View>
                    <View style={[s.spamMockRow, {backgroundColor: surface, borderColor: hairline}]}>
                      <Text style={{fontSize: 12, color: textSecondary}}>Pin: Last updated 2021</Text>
                      <Text style={{fontSize: 11, fontWeight: '700', color: '#ef4444'}}>STALE</Text>
                    </View>
                  </View>
                  <View style={s.cardBody}>
                    <Text style={[s.eyebrow, {color: textSecondary}]}>{USER_COMPARISON.legacyTag}</Text>
                    <Text style={[s.cardTitle, {color: textPrimary}]}>{USER_COMPARISON.legacyTitle}</Text>
                    {USER_COMPARISON.legacyRows.map(row => (
                      <View key={row} style={s.checkRow}>
                        <Feather name="x-circle" size={15} color="#ef4444" />
                        <Text style={[s.checkText, {color: textSecondary}]}>{row}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* VISTRAH Direct Card */}
                <View style={[s.card, wide && {flex: 1}, {backgroundColor: surface, borderColor: accentColor}]}>
                  <View style={[s.mockupHeader, {backgroundColor: surfaceSoft, borderBottomColor: hairline}]}>
                    <View style={[s.verifiedMockBox, {backgroundColor: surface, borderColor: hairline}]}>
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                        <Text style={{fontSize: 12, fontWeight: '700', color: '#10b981'}}>
                          ✓ Verified Owner · 2.4 km
                        </Text>
                        <Text style={{fontSize: 11, fontWeight: '700', color: textSecondary}}>9:16 Live</Text>
                      </View>
                      <View style={{flexDirection: 'row', gap: 6, flexWrap: 'wrap'}}>
                        <View style={s.greenPill}>
                          <Feather name="phone" size={11} color="#052e16" />
                          <Text style={{fontSize: 11, fontWeight: '700', color: '#052e16'}}>Call Direct</Text>
                        </View>
                        <View style={[s.outlinePill, {borderColor: hairline}]}>
                          <Text style={{fontSize: 11, fontWeight: '600', color: textPrimary}}>WhatsApp</Text>
                        </View>
                        <View style={[s.outlinePill, {borderColor: hairline}]}>
                          <Text style={{fontSize: 11, fontWeight: '600', color: textPrimary}}>▶ 60s Reel</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={s.cardBody}>
                    <Text style={[s.eyebrow, {color: '#10b981'}]}>{USER_COMPARISON.vistrahTag}</Text>
                    <Text style={[s.cardTitle, {color: textPrimary}]}>{USER_COMPARISON.vistrahTitle}</Text>
                    {USER_COMPARISON.vistrahRows.map(row => (
                      <View key={row} style={s.checkRow}>
                        <Feather name="check-circle" size={15} color="#10b981" />
                        <Text style={[s.checkText, {color: textPrimary}]}>{row}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            <View style={s.sectionBlock}>
              <Text style={[s.eyebrow, {color: textSecondary}]}>13 ESSENTIAL SECTORS</Text>
              <Text accessibilityRole="header" style={[s.sectionTitle, {color: textPrimary}]}>
                One Unified Local Discovery Grid
              </Text>

              <View style={s.tileGrid}>
                {USER_VERTICALS.map(v => (
                  <Pressable
                    key={v.num}
                    accessibilityRole="link"
                    onPress={() => openMobileDestination(`/services?category=${v.slug}`)}
                    style={({pressed}) => [
                      s.verticalTile,
                      {
                        width: wide ? '23.8%' : medium ? '48.5%' : '100%',
                        backgroundColor: surface,
                        borderColor: hairline,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                      <View style={[s.iconBox, {backgroundColor: surfaceSoft, borderColor: hairline}]}>
                        <Feather name={v.icon as keyof typeof Feather.glyphMap} size={16} color={accentColor} />
                      </View>
                      <Text style={[s.numTag, {color: textSecondary}]}>{v.num}</Text>
                    </View>
                    <Text style={[s.cardTitle, {color: textPrimary, fontSize: 15}]}>{v.title}</Text>
                    <Text style={[s.captionText, {color: textSecondary}]}>{v.caption}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}

        {/* STORY 2: FOR BUSINESSES */}
        {storyKey === 'businesses' && (
          <View style={s.sectionBlock}>
            <Text style={[s.eyebrow, {color: textSecondary}]}>3-STEP MERCHANT GROWTH</Text>
            <Text accessibilityRole="header" style={[s.sectionTitle, {color: textPrimary}]}>
              Start at ₹0. Scale at Your Own Pace.
            </Text>

            <View style={[s.gridWrap, wide && {flexDirection: 'row'}]}>
              {BUSINESS_TIMELINE.map(item => (
                <View
                  key={item.step}
                  style={[s.card, wide && {flex: 1}, {backgroundColor: surface, borderColor: hairline}]}
                >
                  <View style={[s.mockupHeader, {backgroundColor: surfaceSoft, borderBottomColor: hairline}]}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                      <Text style={[s.eyebrow, {color: textSecondary}]}>
                        STEP {item.step} · {item.badge}
                      </Text>
                      <View style={[s.outlinePill, {backgroundColor: surface, borderColor: hairline}]}>
                        <Text style={{fontSize: 11.5, fontWeight: '700', color: textPrimary, fontVariant: ['tabular-nums']}}>
                          {item.price}
                        </Text>
                      </View>
                    </View>
                    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
                      {item.mockupPills.map(pill => (
                        <View
                          key={pill}
                          style={[s.outlinePill, {backgroundColor: surface, borderColor: hairline}]}
                        >
                          <Text style={{fontSize: 11, fontWeight: '600', color: textPrimary}}>
                            {pill}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={s.cardBody}>
                    <Text style={[s.cardTitle, {color: textPrimary}]}>
                      {item.step} / {item.title}
                    </Text>
                    <Text style={[s.captionText, {color: textSecondary}]}>{item.caption}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* STORY 3: VISTRAH ADS & MARKETING */}
        {storyKey === 'ads' && (
          <>
            <View style={s.sectionBlock}>
              <Text style={[s.eyebrow, {color: textSecondary}]}>3 CORE STUDIO PILLARS</Text>
              <Text accessibilityRole="header" style={[s.sectionTitle, {color: textPrimary}]}>
                Done-For-You Creative, Web &amp; Growth Studio
              </Text>

              <View style={[s.gridWrap, wide && {flexDirection: 'row'}]}>
                {ADS_STUDIO_PILLARS.map((pillar, idx) => (
                  <View
                    key={pillar.num}
                    style={[s.card, wide && {flex: 1}, {backgroundColor: surface, borderColor: hairline}]}
                  >
                    <View style={[s.mockupHeader, {backgroundColor: surfaceSoft, borderBottomColor: hairline}]}>
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                        <Text style={[s.eyebrow, {color: textSecondary}]}>{pillar.tag}</Text>
                        <View style={[s.outlinePill, {backgroundColor: surface, borderColor: hairline}]}>
                          <Text style={{fontSize: 11, fontWeight: '700', color: textPrimary, fontVariant: ['tabular-nums']}}>
                            {pillar.price}
                          </Text>
                        </View>
                      </View>

                      {idx === 0 ? (
                        <View style={{flexDirection: 'row', gap: 8, alignItems: 'center'}}>
                          <View
                            style={{
                              width: 52,
                              height: 72,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: hairline,
                              backgroundColor: surface,
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 3,
                            }}
                          >
                            <Feather name="play" size={14} color={textPrimary} />
                            <Text style={{fontSize: 9, fontWeight: '700', color: textPrimary}}>9:16</Text>
                          </View>
                          <View
                            style={{
                              flex: 1,
                              height: 72,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: hairline,
                              backgroundColor: surface,
                              padding: 10,
                              justifyContent: 'space-between',
                            }}
                          >
                            <Text style={{fontSize: 20, fontWeight: '700', color: textPrimary}}>Aa.</Text>
                            <View style={{flexDirection: 'row', gap: 5}}>
                              {['#173f35', '#f9aa45', '#2563eb', '#ec4899'].map(sw => (
                                <View key={sw} style={{width: 16, height: 7, borderRadius: 3, backgroundColor: sw}} />
                              ))}
                            </View>
                          </View>
                        </View>
                      ) : idx === 1 ? (
                        <View
                          style={{
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: hairline,
                            backgroundColor: surface,
                            overflow: 'hidden',
                          }}
                        >
                          <View
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderBottomWidth: 1,
                              borderBottomColor: hairline,
                            }}
                          >
                            <Text style={{fontSize: 10.5, color: textSecondary}}>https://yourbusiness.in</Text>
                          </View>
                          <View
                            style={{
                              padding: 10,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Text style={{fontSize: 11.5, fontWeight: '600', color: textPrimary}}>
                              Mobile-First UI
                            </Text>
                            <View style={s.greenPill}>
                              <Text style={{fontSize: 10.5, fontWeight: '700', color: '#052e16'}}>
                                WhatsApp Lead →
                              </Text>
                            </View>
                          </View>
                        </View>
                      ) : (
                        <View style={{flexDirection: 'row', gap: 8}}>
                          <View
                            style={{
                              flex: 1,
                              padding: 10,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: hairline,
                              backgroundColor: surface,
                              gap: 2,
                            }}
                          >
                            <Text style={{fontSize: 9.5, fontWeight: '700', color: textSecondary}}>STUDIO FEE</Text>
                            <Text style={{fontSize: 12.5, fontWeight: '700', color: textPrimary, fontVariant: ['tabular-nums']}}>
                              ₹4,999+/mo
                            </Text>
                          </View>
                          <View
                            style={{
                              flex: 1,
                              padding: 10,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: hairline,
                              backgroundColor: surface,
                              gap: 2,
                            }}
                          >
                            <Text style={{fontSize: 9.5, fontWeight: '700', color: textSecondary}}>AD SPEND</Text>
                            <Text style={{fontSize: 12.5, fontWeight: '700', color: '#10b981', fontVariant: ['tabular-nums']}}>
                              0% Markup
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>

                    <View style={s.cardBody}>
                      <Text style={[s.cardTitle, {color: textPrimary}]}>
                        {pillar.num} / {pillar.title}
                      </Text>
                      <Text style={[s.captionText, {color: textSecondary}]}>{pillar.caption}</Text>

                      <View style={{borderTopWidth: 1, borderTopColor: hairline, paddingTop: 10, gap: 6, marginTop: 4}}>
                        {pillar.tiers.map(t => (
                          <View key={t.label} style={{flexDirection: 'row', justifyContent: 'space-between', gap: 8}}>
                            <Text style={{fontSize: 12, color: textSecondary, flex: 1}}>{t.label}</Text>
                            <Text style={{fontSize: 12, fontWeight: '700', color: textPrimary, fontVariant: ['tabular-nums']}}>
                              {t.rate}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={[s.heroFrame, {backgroundColor: surface, borderColor: hairline}]}>
              <View style={[s.heroIntro, {borderTopWidth: 0}]}>
                <View style={{flex: 1, gap: 4}}>
                  <Text style={[s.eyebrow, {color: '#10b981'}]}>SELF-SERVE HYPERLOCAL V ADS</Text>
                  <Text accessibilityRole="header" style={[s.sectionTitle, {color: textPrimary}]}>
                    First 30 Days at ₹0 — Every Radius Tier
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openMobileDestination('/marketing-pricing')}
                  style={({pressed}) => [
                    s.primaryBtn,
                    {backgroundColor: accentColor, borderColor: accentColor, opacity: pressed ? 0.85 : 1},
                  ]}
                >
                  <Text style={[s.primaryBtnText, {color: '#ffffff'}]}>Interactive Estimator</Text>
                  <Feather name="arrow-right" size={14} color="#ffffff" />
                </Pressable>
              </View>

              <View style={[s.statGrid, {backgroundColor: surfaceSoft, borderTopColor: hairline}]}>
                {VADS_RATE_SNAPSHOT.map((row, idx) => (
                  <View
                    key={row.zone}
                    style={[
                      s.statCell,
                      {width: wide ? '25%' : '50%'},
                      wide
                        ? idx < 3 && {borderRightWidth: 1, borderRightColor: hairline}
                        : {
                            ...(idx % 2 === 0 ? {borderRightWidth: 1, borderRightColor: hairline} : {}),
                            ...(idx < 2 ? {borderBottomWidth: 1, borderBottomColor: hairline} : {}),
                          },
                    ]}
                  >
                    <Text style={{fontSize: 11.5, fontWeight: '600', color: textSecondary}}>{row.zone}</Text>
                    <Text style={{fontSize: 14, fontWeight: '700', color: '#10b981', fontVariant: ['tabular-nums']}}>
                      {row.month1}
                    </Text>
                    <Text style={{fontSize: 11, color: textSecondary, fontVariant: ['tabular-nums']}}>
                      Day 31+: {row.day31}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* STORY 4: AGRICONNECT */}
        {storyKey === 'agri' && (
          <View style={s.sectionBlock}>
            <Text style={[s.eyebrow, {color: textSecondary}]}>4 AGRICULTURAL PILLARS</Text>
            <Text accessibilityRole="header" style={[s.sectionTitle, {color: textPrimary}]}>
              Seed-to-Market Farming Network
            </Text>

            <View style={s.tileGrid}>
              {AGRI_CARDS.map(card => (
                <Pressable
                  key={card.num}
                  accessibilityRole="link"
                  onPress={() =>
                    openMobileDestination(
                      `/services?category=agriculture-and-farming&subcategory=${card.subcategory}`,
                    )
                  }
                  style={({pressed}) => [
                    s.verticalTile,
                    {
                      width: wide || medium ? '48.6%' : '100%',
                      backgroundColor: surface,
                      borderColor: hairline,
                      opacity: pressed ? 0.85 : 1,
                      gap: 10,
                    },
                  ]}
                >
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <View style={[s.iconBox, {backgroundColor: surfaceSoft, borderColor: hairline}]}>
                      <Feather name={card.icon as keyof typeof Feather.glyphMap} size={16} color={accentColor} />
                    </View>
                    <View style={[s.outlinePill, {backgroundColor: surfaceSoft, borderColor: hairline}]}>
                      <Text style={{fontSize: 10.5, fontWeight: '700', color: textPrimary}}>
                        {card.num} · {card.badge}
                      </Text>
                    </View>
                  </View>
                  <Text style={[s.cardTitle, {color: textPrimary}]}>{card.title}</Text>
                  <Text style={[s.captionText, {color: textSecondary}]}>{card.caption}</Text>
                  <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
                    {card.chips.map(c => (
                      <View key={c} style={[s.outlinePill, {borderColor: hairline}]}>
                        <Text style={{fontSize: 10.5, color: textSecondary}}>{c}</Text>
                      </View>
                    ))}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* STORY 5: HEALTHCONNECT */}
        {storyKey === 'health' && (
          <View style={s.sectionBlock}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6}}>
              <View>
                <Text style={[s.eyebrow, {color: textSecondary}]}>5 CARE PATHWAYS</Text>
                <Text accessibilityRole="header" style={[s.sectionTitle, {color: textPrimary}]}>
                  Neighborhood Clinics, Labs &amp; Wellness
                </Text>
              </View>
              <Text style={{fontSize: 12, color: textSecondary}}>Emergency: Dial 108 immediately</Text>
            </View>

            <View style={s.tileGrid}>
              {HEALTH_PATHWAYS.map(path => (
                <Pressable
                  key={path.num}
                  accessibilityRole="link"
                  onPress={() =>
                    openMobileDestination(
                      `/services?category=health-and-fitness&subcategory=${path.subcategory}`,
                    )
                  }
                  style={({pressed}) => [
                    s.verticalTile,
                    {
                      width: wide ? '32%' : medium ? '48.6%' : '100%',
                      backgroundColor: surface,
                      borderColor: hairline,
                      opacity: pressed ? 0.85 : 1,
                      gap: 8,
                    },
                  ]}
                >
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <View style={[s.iconBox, {backgroundColor: surfaceSoft, borderColor: hairline}]}>
                      <Feather name={path.icon as keyof typeof Feather.glyphMap} size={16} color={accentColor} />
                    </View>
                    <View style={[s.outlinePill, {backgroundColor: surfaceSoft, borderColor: hairline}]}>
                      <Text style={{fontSize: 10.5, fontWeight: '700', color: textPrimary}}>{path.tag}</Text>
                    </View>
                  </View>
                  <Text style={[s.eyebrow, {color: textSecondary}]}>
                    {path.num} · {path.badge}
                  </Text>
                  <Text style={[s.cardTitle, {color: textPrimary}]}>{path.title}</Text>
                  <Text style={[s.captionText, {color: textSecondary}]}>{path.caption}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Bottom Conversion Bar */}
        <View style={[s.bottomBar, {backgroundColor: surface, borderColor: hairline}]}>
          <View style={{flex: 1, minWidth: 220, gap: 3}}>
            <Text style={[s.eyebrow, {color: textSecondary}]}>READY TO BEGIN?</Text>
            <Text style={[s.sectionTitle, {color: textPrimary, fontSize: 18}]}>{banner.title}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => openMobileDestination(banner.primaryCta.mobileRoute)}
            style={({pressed}) => [
              s.primaryBtn,
              {
                backgroundColor: accentColor,
                borderColor: accentColor,
                opacity: pressed ? 0.86 : 1,
              },
            ]}
          >
            <Text style={[s.primaryBtnText, {color: '#ffffff'}]}>{banner.primaryCta.label}</Text>
            <Feather name="arrow-right" size={15} color="#ffffff" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: {
    width: '100%',
    maxWidth: 1140,
    alignSelf: 'center',
    paddingTop: 14,
    paddingBottom: 48,
    gap: 24,
  },
  switcherScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  storyTab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  storyTabText: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  heroFrame: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  heroIntro: {
    borderTopWidth: 1,
    padding: 18,
    gap: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
  displayTitle: {
    fontSize: 23,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  leadText: {
    fontSize: 14,
    lineHeight: 20,
  },
  ctaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  primaryBtn: {
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  primaryBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  secondaryBtn: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statGrid: {
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statCell: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 2,
  },
  statVal: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  statLbl: {
    fontSize: 11.5,
  },
  sectionBlock: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 25,
    letterSpacing: -0.4,
  },
  gridWrap: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mockupHeader: {
    padding: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  spamMockRow: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verifiedMockBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  greenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#10b981',
  },
  outlinePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  cardBody: {
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 21,
    letterSpacing: -0.3,
  },
  captionText: {
    fontSize: 13,
    lineHeight: 18,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  verticalTile: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numTag: {
    fontSize: 11.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  bottomBar: {
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
});
