import {BannerGeometry} from '../../components/banner-geometry';
import {useBannerTheme} from '../../lib/banner-theme';
import {Text} from '../../components/typography';
import {UiText} from '../../components/localized-ui';
import {useLanguage} from '../../lib/language';
import {radii, useTheme} from '../../lib/theme';
import {useEffect, useState} from 'react';
import {AccessibilityInfo,Animated,Easing,Image,Platform,Pressable,StyleSheet,View,} from 'react-native';
import {router} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import {Page} from '../../components/ui';

const agriPhoto = require('../../../assets/connect/agriconnect-tractor-paddy.png');
const healthPhoto = require('../../../assets/connect/healthconnect-doctor-patient.png');
const paddyPanicles = require('../../../assets/connect/paddy-panicles.png');

const decorativeHeartbeat: [number, number][] = [
  [0, 12], [9, 12], [13, 8], [17, 16], [22, 2], [27, 22], [31, 10], [35, 12], [44, 12],
];

const agriQuickTags = [
  {title: 'Farm Equipment', slug: 'farm-equipment-and-machinery', icon: 'tool'},
  {title: 'Seeds & Crops', slug: 'seeds-plants-and-nurseries', icon: 'feather'},
  {title: 'Soil & Crop Care', slug: 'soil-testing-and-crop-care', icon: 'activity'},
  {title: 'Farm Labour', slug: 'agricultural-labour-and-farm-maintenance', icon: 'users'},
] as const;

const healthQuickTags = [
  {title: 'Doctors & Clinics', slug: 'doctors-and-specialists', icon: 'user-check'},
  {title: 'Hospitals & Care', slug: 'hospitals-and-clinics', icon: 'plus-square'},
  {title: 'Diagnostics & Labs', slug: 'diagnostic-services', icon: 'activity'},
  {title: 'Fitness & Centres', slug: 'fitness-centres', icon: 'sun'},
] as const;

const popularServices = [
  {
    key: 'tractor',
    title: 'Tractor & Harvesters',
    meta: 'Machinery on demand',
    category: 'agriculture-and-farming',
    subcategory: 'farm-equipment-and-machinery',
    icon: 'truck' as const,
  },
  {
    key: 'soil',
    title: 'Soil & Crop Health',
    meta: 'Testing & fertilization',
    category: 'agriculture-and-farming',
    subcategory: 'soil-testing-and-crop-care',
    icon: 'layers' as const,
  },
  {
    key: 'doctor',
    title: 'Specialist Doctors',
    meta: 'Clinics & consultations',
    category: 'health-fitness-and-wellness',
    subcategory: 'doctors-and-specialists',
    icon: 'user' as const,
  },
  {
    key: 'diagnostics',
    title: 'Diagnostic Labs',
    meta: 'Blood tests & screening',
    category: 'health-fitness-and-wellness',
    subcategory: 'diagnostic-services',
    icon: 'activity' as const,
  },
] as const;

export default function VistrahEssentials() {
  const banner=useBannerTheme();
  const {colors} = useTheme();
  const {t} = useLanguage();

  const [reducedMotion, setReducedMotion] = useState(true);
  const [paddySway] = useState(() => new Animated.Value(0));
  const [ecg] = useState(() => new Animated.Value(1));

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReducedMotion(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      paddySway.setValue(0);
      ecg.setValue(1);
      return;
    }
    ecg.setValue(0);
    paddySway.setValue(-1);
    const breeze = Animated.loop(
      Animated.sequence([
        Animated.timing(paddySway, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
          isInteraction: false,
        }),
        Animated.timing(paddySway, {
          toValue: -1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
          isInteraction: false,
        }),
      ])
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(ecg, {
          toValue: 1,
          duration: 1800,
          easing: Easing.linear,
          useNativeDriver: false,
          isInteraction: false,
        }),
        Animated.delay(500),
        Animated.timing(ecg, {toValue: 0, duration: 0, useNativeDriver: false, isInteraction: false}),
        Animated.delay(300),
      ])
    );
    breeze.start();
    pulse.start();
    return () => {
      breeze.stop();
      pulse.stop();
    };
  }, [reducedMotion, paddySway, ecg]);

  return (
    <Page sectioned>
      {/* 1. SIGNATURE VISTRAH ESSENTIALS HERO */}
      <LinearGradient
        colors={[colors.surface, colors.elevated, colors.elevated]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[s.hero, {borderColor: colors.borderSubtle}]}
      >
        <BannerGeometry/>
        <View pointerEvents="none" style={[s.heroGlowOrb,{backgroundColor:banner.glow}]} />
        <View style={s.heroTopRow}>
          <View style={[s.heroTag, {backgroundColor: colors.brandPrimary}]}>
            <Ionicons name="sparkles" size={11} color={colors.brandPrimaryInk} />
            <Text style={[s.heroTagText, {color: colors.brandPrimaryInk}]}>VISTRAH ESSENTIALS</Text>
          </View>
          <View style={[s.heroVerifiedTag, {backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.borderSubtle}]}>
            <Feather name="check-circle" size={12} color={colors.success} />
            <Text style={[s.heroVerifiedText,{color:colors.muted}]}>
              <UiText value="Community Lifelines" />
            </Text>
          </View>
        </View>

        <Text accessibilityRole="header" style={[s.heroTitle, {color: colors.text}]}>
          <UiText value="Essential Agriculture & Healthcare" />
        </Text>
        <Text style={[s.heroSubtitle,{color:colors.muted}]}>
          <UiText value="Dedicated community ecosystems connecting farmers, healthcare seekers, and verified neighborhood experts across India." />
        </Text>

        <View style={s.heroPillsRow}>
          <View style={[s.heroPill, {backgroundColor: colors.elevated, borderColor: colors.borderSubtle}]}>
            <Ionicons name="leaf" size={12} color={colors.success} />
            <Text style={[s.heroPillText,{color:colors.text}]}>
              <UiText value="Direct Farm Access" />
            </Text>
          </View>
          <View style={[s.heroPill, {backgroundColor: colors.elevated, borderColor: colors.borderSubtle}]}>
            <Ionicons name="heart" size={12} color={colors.accent} />
            <Text style={[s.heroPillText,{color:colors.text}]}>
              <UiText value="Verified Health" />
            </Text>
          </View>
          <View style={[s.heroPill, {backgroundColor: colors.elevated, borderColor: colors.borderSubtle}]}>
            <Feather name="shield" size={12} color={colors.brandPrimary} />
            <Text style={[s.heroPillText,{color:colors.text}]}>
              <UiText value="Zero Middlemen" />
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* 2. FLAGSHIP AGRICONNECT SHOWCASE CARD */}
      <LinearGradient
        colors={[colors.surface, colors.elevated, colors.elevated]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[s.connectCard, {borderColor: colors.borderSubtle}]}
      >
        {/* Animated Paddy Sway */}
        <View pointerEvents="none" style={s.paddyWrap}>
          <Animated.Image
            source={paddyPanicles}
            resizeMode="contain"
            style={[
              s.paddyImage,
              {
                transform: [
                  {translateX: -10},
                  {translateY: 25},
                  {
                    rotate: paddySway.interpolate({
                      inputRange: [-1, 0, 1],
                      outputRange: ['-3deg', '0deg', '3deg'],
                    }),
                  },
                  {translateY: -25},
                  {translateX: 10},
                ],
              },
            ]}
          />
        </View>

        {/* Card Header */}
        <View style={s.cardHeaderRow}>
          <View style={[s.cardIconCircle, {backgroundColor: colors.elevated, borderColor: colors.borderSubtle}]}>
            <Ionicons name="leaf" size={20} color={colors.success} />
          </View>
          <View style={{flex: 1, minWidth: 0}}>
            <Text style={[s.cardEyebrow, {color: colors.success}]}>FARM &amp; HARVEST ECOSYSTEM</Text>
            <Text accessibilityRole="header" style={[s.cardTitle, {color: colors.text}]}>
              VISTRAH AgriConnect
            </Text>
          </View>
        </View>

        <Text style={[s.cardHeadline, {color: colors.text}]}>{t('agri.headline')}</Text>

        {/* Feature Hero Photo */}
        <View style={[s.photoFrame, {backgroundColor: colors.background, borderColor: colors.borderSubtle}]}>
          <Image
            source={agriPhoto}
            resizeMode="contain"
            accessibilityLabel={t('agri.photoAlt')}
            style={s.photoImage}
          />
        </View>

        <Text style={[s.cardDescription, {color: colors.muted}]}>{t('agri.description')}</Text>

        {/* Free Membership Badge */}
        <View style={[s.agriOfferPill, {backgroundColor: colors.elevated, borderColor: colors.borderSubtle}]}>
          <Ionicons name="ribbon-outline" size={14} color={colors.success} />
          <Text style={[s.agriOfferText, {color: colors.success}]}>{t('agri.membership')}</Text>
        </View>

        {/* Direct Subcategory Shortcut Tags */}
        <View style={s.tagsRow}>
          {agriQuickTags.map((tag) => (
            <Pressable
              key={tag.slug}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/services',
                  params: {category: 'agriculture-and-farming', subcategory: tag.slug},
                })
              }
              style={({pressed}) => [s.agriTag, {backgroundColor: pressed ? colors.elevated : colors.surface, borderColor: colors.borderSubtle}]}
            >
              <Feather name={tag.icon as any} size={11} color={colors.success} />
              <Text style={[s.agriTagText, {color: colors.text}]}>{tag.title}</Text>
            </Pressable>
          ))}
        </View>

        {/* Primary Action Button */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/agri-connect')}
          style={({pressed}) => [s.agriCtaButton, {backgroundColor: pressed ? colors.brandPrimaryHover : colors.brandPrimary}]}
        >
          <Text style={[s.agriCtaText, {color: colors.brandPrimaryInk}]}>{t('agri.cta')}</Text>
          <Feather name="arrow-right" size={16} color={colors.brandPrimaryInk} />
        </Pressable>
      </LinearGradient>

      {/* 3. FLAGSHIP HEALTHCONNECT SHOWCASE CARD */}
      <LinearGradient
        colors={[colors.surface, colors.elevated, colors.elevated]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[s.connectCard, {borderColor: colors.borderSubtle}]}
      >
        {/* Animated ECG Pulse */}
        <View pointerEvents="none" style={s.ecgDecoration}>
          <View style={s.decorativeEcgClip}>
            <View style={{position: 'absolute', width: 44, height: 24, opacity: 0.25}}>
              {decorativeHeartbeat.slice(1).map(([x, y], index) => {
                const [px, py] = decorativeHeartbeat[index];
                return (
                  <View
                    key={index}
                    style={{
                      position: 'absolute',
                      left: px,
                      top: py,
                      width: Math.hypot(x - px, y - py),
                      height: 1.5,
                      borderRadius: 1,
                      backgroundColor: colors.accent,
                      transformOrigin: 'left center',
                      transform: [{rotate: `${(Math.atan2(y - py, x - px) * 180) / Math.PI}deg`}],
                    }}
                  />
                );
              })}
            </View>
            <Animated.View
              style={{
                width: ecg.interpolate({inputRange: [0, 1], outputRange: [0, 44]}),
                height: 24,
                overflow: 'hidden',
              }}
            >
              {decorativeHeartbeat.slice(1).map(([x, y], index) => {
                const [px, py] = decorativeHeartbeat[index];
                return (
                  <View
                    key={index}
                    style={{
                      position: 'absolute',
                      left: px,
                      top: py,
                      width: Math.hypot(x - px, y - py),
                      height: 1.5,
                      borderRadius: 1,
                      backgroundColor: colors.text,
                      transformOrigin: 'left center',
                      transform: [{rotate: `${(Math.atan2(y - py, x - px) * 180) / Math.PI}deg`}],
                    }}
                  />
                );
              })}
            </Animated.View>
          </View>
        </View>

        {/* Card Header */}
        <View style={s.cardHeaderRow}>
          <View style={[s.cardIconCircle, {backgroundColor: colors.elevated, borderColor: colors.borderSubtle}]}>
            <Ionicons name="heart" size={20} color={colors.accent} />
          </View>
          <View style={{flex: 1, minWidth: 0}}>
            <Text style={[s.cardEyebrow, {color: colors.accent}]}>CARE &amp; WELLNESS NETWORK</Text>
            <Text accessibilityRole="header" style={[s.cardTitle, {color: colors.text}]}>
              VISTRAH HealthConnect
            </Text>
          </View>
        </View>

        <Text style={[s.cardHeadline, {color: colors.text}]}>{t('health.headline')}</Text>

        {/* Feature Hero Photo */}
        <View style={[s.photoFrame, {backgroundColor: colors.background, borderColor: colors.borderSubtle}]}>
          <Image
            source={healthPhoto}
            resizeMode="contain"
            accessibilityLabel={t('health.photoAlt')}
            style={s.photoImage}
          />
        </View>

        <Text style={[s.cardDescription, {color: colors.muted}]}>{t('health.description')}</Text>

        {/* Highlight Note */}
        <View style={[s.healthOfferPill, {backgroundColor: colors.elevated, borderColor: colors.borderSubtle}]}>
          <Ionicons name="shield-checkmark-outline" size={14} color={colors.accent} />
          <Text style={[s.healthOfferText, {color: colors.accent}]}>{t('health.highlight')}</Text>
        </View>

        {/* Direct Subcategory Shortcut Tags */}
        <View style={s.tagsRow}>
          {healthQuickTags.map((tag) => (
            <Pressable
              key={tag.slug}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/services',
                  params: {category: 'health-fitness-and-wellness', subcategory: tag.slug},
                })
              }
              style={({pressed}) => [s.healthTag, {backgroundColor: pressed ? colors.elevated : colors.surface, borderColor: colors.borderSubtle}]}
            >
              <Feather name={tag.icon as any} size={11} color={colors.accent} />
              <Text style={[s.healthTagText, {color: colors.text}]}>{tag.title}</Text>
            </Pressable>
          ))}
        </View>

        {/* Primary Action Button */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/health-connect')}
          style={({pressed}) => [s.healthCtaButton, {backgroundColor: pressed ? colors.brandPrimaryHover : colors.brandPrimary}]}
        >
          <Text style={[s.healthCtaText, {color: colors.brandPrimaryInk}]}>{t('health.cta')}</Text>
          <Feather name="arrow-right" size={16} color={colors.brandPrimaryInk} />
        </Pressable>
      </LinearGradient>

      {/* 4. POPULAR ESSENTIAL SERVICES (1-TAP DIRECT ACCESS) */}
      <View style={s.sectionWrap}>
        <View style={s.sectionHeaderRow}>
          <View style={{flex: 1, minWidth: 0}}>
            <Text style={[s.sectionEyebrow, {color: colors.accent}]}>DIRECT COMMUNITY ACCESS</Text>
            <Text accessibilityRole="header" style={[s.sectionTitle, {color: colors.text}]}>
              <UiText value="Popular Essential Services" />
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

        <View style={s.grid}>
          {popularServices.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/services',
                  params: {category: item.category, subcategory: item.subcategory},
                })
              }
              style={({pressed}) => [
                s.gridCard,
                {
                  backgroundColor: pressed ? colors.elevated : colors.surface,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <View style={[s.gridIconWrap, {backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.borderSubtle}]}>
                <Feather name={item.icon} size={18} color={colors.brandPrimary} />
              </View>
              <View style={{flex: 1, minWidth: 0}}>
                <Text numberOfLines={1} style={[s.gridCardTitle, {color: colors.text}]}>
                  {item.title}
                </Text>
                <Text numberOfLines={1} style={[s.gridCardMeta, {color: colors.muted}]}>
                  {item.meta}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </View>

      {/* 5. WHY VISTRAH ESSENTIALS? TRUST SECTION */}
      <View
        style={[
          s.trustBox,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        <Text style={[s.sectionEyebrow, {color: colors.accent}]}>THE VISTRAH PROMISE</Text>
        <Text accessibilityRole="header" style={[s.trustTitle, {color: colors.text}]}>
          <UiText value="Why Vistrah Essentials?" />
        </Text>

        <View style={s.trustItem}>
          <View style={[s.trustIconBox, {backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.borderSubtle}]}>
            <Feather name="users" size={16} color={colors.success} />
          </View>
          <View style={{flex: 1, minWidth: 0}}>
            <Text style={[s.trustItemTitle, {color: colors.text}]}>
              <UiText value="Direct & Brokerage Free" />
            </Text>
            <Text style={[s.trustItemBody, {color: colors.muted}]}>
              <UiText value="Farmers and families connect directly with equipment owners, doctors, and diagnostic labs without middlemen commission." />
            </Text>
          </View>
        </View>

        <View style={s.trustItem}>
          <View style={[s.trustIconBox, {backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.borderSubtle}]}>
            <Feather name="check-circle" size={16} color={colors.accent} />
          </View>
          <View style={{flex: 1, minWidth: 0}}>
            <Text style={[s.trustItemTitle, {color: colors.text}]}>
              <UiText value="Verified Local Providers" />
            </Text>
            <Text style={[s.trustItemBody, {color: colors.muted}]}>
              <UiText value="All listings are validated with genuine credentials so you can book farm machinery and healthcare with full peace of mind." />
            </Text>
          </View>
        </View>

        <View style={s.trustItem}>
          <View style={[s.trustIconBox, {backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.borderSubtle}]}>
            <Feather name="globe" size={16} color={colors.brandPrimary} />
          </View>
          <View style={{flex: 1, minWidth: 0}}>
            <Text style={[s.trustItemTitle, {color: colors.text}]}>
              <UiText value="Built for Karnataka & India" />
            </Text>
            <Text style={[s.trustItemBody, {color: colors.muted}]}>
              <UiText value="Localized in Kannada, Hindi, and English to serve rural taluks and urban neighborhoods seamlessly." />
            </Text>
          </View>
        </View>
      </View>

      {/* 6. PARTNER & PROVIDER ECOSYSTEM INVITATION BANNER */}
      <LinearGradient
        colors={[colors.surface, colors.elevated, colors.elevated]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[s.partnerBanner, {borderColor: colors.borderSubtle}]}
      >
        <View pointerEvents="none" style={[s.partnerGlow, {backgroundColor: banner.glow}]} />
        <View style={s.partnerTopRow}>
          <View style={[s.partnerTag, {backgroundColor: colors.brandPrimary}]}>
            <Text style={[s.partnerTagText, {color: colors.brandPrimaryInk}]}>⭐ PROVIDER PARTNERSHIP</Text>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
            <View style={{width: 6, height: 6, borderRadius: radii.pill, backgroundColor: colors.success}} />
            <Text style={{color: colors.muted, fontSize: 11, fontWeight: '600'}}>
              <UiText value="Open Registration" />
            </Text>
          </View>
        </View>

        <Text accessibilityRole="header" style={[s.partnerTitle, {color: colors.text}]}>
          <UiText value="Are you an Agricultural Specialist, Doctor, or Clinic?" />
        </Text>
        <Text style={[s.partnerBody, {color: colors.muted}]}>
          <UiText value="List your essential services on Vistrah to connect with thousands of local households and farmers across your region." />
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/membership')}
          style={({pressed}) => [s.partnerButton, {backgroundColor: pressed ? colors.brandPrimaryHover : colors.brandPrimary}]}
        >
          <View style={s.partnerButtonGradient}>
            <Text style={[s.partnerButtonText, {color: colors.brandPrimaryInk}]}>
              <UiText value="Join Verified Provider Network" />
            </Text>
            <Feather name="arrow-right" size={16} color={colors.brandPrimaryInk} />
          </View>
        </Pressable>
      </LinearGradient>
    </Page>
  );
}

const s = StyleSheet.create({
  // Hero
  hero: {
    borderRadius: radii.surface,
    padding: 18,
    gap: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
  },
  heroGlowOrb: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: radii.pill,
    opacity: 0.28,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  heroTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroVerifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  heroVerifiedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: Platform.OS === 'android' ? 22 : 20,
    lineHeight: Platform.OS === 'android' ? 27 : 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  heroPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  heroPillText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Connect Card (Shared Agri & Health)
  connectCard: {
    borderRadius: radii.surface,
    padding: 16,
    gap: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    elevation: 3,
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
  paddyWrap: {
    position: 'absolute',
    top: 0,
    right: 4,
    width: 90,
    height: 57,
    opacity: 0.85,
  },
  paddyImage: {
    width: 90,
    height: 56.25,
  },
  ecgDecoration: {
    position: 'absolute',
    top: 16,
    right: 8,
    width: 44,
    height: 24,
    opacity: 0.85,
  },
  decorativeEcgClip: {
    width: 44,
    height: 24,
    overflow: 'hidden',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 1,
  },
  cardIconCircle: {
    width: 38,
    height: 38,
    borderRadius: radii.action,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  cardTitle: {
    fontSize: Platform.OS === 'android' ? 20 : 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cardHeadline: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  photoImage: {position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'},
  photoFrame: {
    width: '100%',
    aspectRatio: 2,
    borderRadius: radii.surface,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardDescription: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  agriOfferPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  agriOfferText: {
    fontSize: 11,
    fontWeight: '700',
  },
  healthOfferPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  healthOfferText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  agriTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  agriTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  healthTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  healthTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  agriCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.action,
    marginTop: 2,
  },
  agriCtaText: {
    fontSize: 13,
    fontWeight: '800',
  },
  healthCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.action,
    marginTop: 2,
  },
  healthCtaText: {
    fontSize: 13,
    fontWeight: '800',
  },

  // Popular Grid
  sectionWrap: {
    gap: 10,
    paddingTop: 4,
  },
  sectionHeaderRow: {
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
  grid: {
    gap: 8,
  },
  gridCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: radii.surface,
    borderWidth: 1,
  },
  gridIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.action,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  gridCardMeta: {
    fontSize: 11,
    lineHeight: 15,
  },

  // Trust Strip
  trustBox: {
    padding: 16,
    borderRadius: radii.surface,
    gap: 12,
    borderWidth: 1,
  },
  trustTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  trustIconBox: {
    width: 32,
    height: 32,
    borderRadius: radii.action,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  trustItemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  trustItemBody: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 1,
  },

  // Partner Banner
  partnerBanner: {
    borderRadius: radii.surface,
    padding: 18,
    gap: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    marginTop: 4,
  },
  partnerGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: radii.pill,
    opacity: 0.25,
  },
  partnerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  partnerTag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  partnerTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  partnerTitle: {
    fontSize: Platform.OS === 'android' ? 18 : 16,
    lineHeight: Platform.OS === 'android' ? 23 : 21,
    fontWeight: '800',
  },
  partnerBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  partnerButton: {
    borderRadius: radii.action,
    overflow: 'hidden',
  },
  partnerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  partnerButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
