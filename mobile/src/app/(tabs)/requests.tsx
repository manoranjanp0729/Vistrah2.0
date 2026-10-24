import {BannerGeometry} from '../../components/banner-geometry';
import {useBannerTheme} from '../../lib/banner-theme';
import {Text} from '../../components/typography';
import {UiText, UiElement} from '../../components/localized-ui';
import {useLanguage} from '../../lib/language';
import {useTheme} from '../../lib/theme';
import {useEffect, useState} from 'react';
import {AccessibilityInfo,Animated,Easing,Image,Platform,Pressable,StyleSheet,View,} from 'react-native';
import {router} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import brandTheme from '../../../../shared/brand-theme.json';
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
    accent: '#2d6a4f',
    bg: '#edf7f1',
  },
  {
    key: 'soil',
    title: 'Soil & Crop Health',
    meta: 'Testing & fertilization',
    category: 'agriculture-and-farming',
    subcategory: 'soil-testing-and-crop-care',
    icon: 'layers' as const,
    accent: '#315f33',
    bg: '#f1f8ed',
  },
  {
    key: 'doctor',
    title: 'Specialist Doctors',
    meta: 'Clinics & consultations',
    category: 'health-fitness-and-wellness',
    subcategory: 'doctors-and-specialists',
    icon: 'user' as const,
    accent: '#1f6f8b',
    bg: '#ecf6fa',
  },
  {
    key: 'diagnostics',
    title: 'Diagnostic Labs',
    meta: 'Blood tests & screening',
    category: 'health-fitness-and-wellness',
    subcategory: 'diagnostic-services',
    icon: 'activity' as const,
    accent: '#19537a',
    bg: '#eaf2f8',
  },
] as const;

export default function VistrahEssentials() {
  const banner=useBannerTheme();
  const {mode, colors} = useTheme();
  const {t} = useLanguage();
  const isDark = mode === 'dark';

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
        colors={banner.gradient}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={s.hero}
      >
        <BannerGeometry/>
        <View pointerEvents="none" style={[s.heroGlowOrb,{backgroundColor:banner.glow}]} />
        <View style={s.heroTopRow}>
          <LinearGradient
            colors={banner.gradient}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={s.heroTag}
          >
            <Ionicons name="sparkles" size={11} color="#fff" />
            <Text style={s.heroTagText}>VISTRAH ESSENTIALS</Text>
          </LinearGradient>
          <View style={s.heroVerifiedTag}>
            <Feather name="check-circle" size={12} color="#34d399" />
            <Text style={[s.heroVerifiedText,{color:banner.muted}]}>
              <UiText value="Community Lifelines" />
            </Text>
          </View>
        </View>

        <Text accessibilityRole="header" style={s.heroTitle}>
          <UiText value="Essential Agriculture & Healthcare" />
        </Text>
        <Text style={[s.heroSubtitle,{color:banner.muted}]}>
          <UiText value="Dedicated community ecosystems connecting farmers, healthcare seekers, and verified neighborhood experts across India." />
        </Text>

        <View style={s.heroPillsRow}>
          <View style={s.heroPill}>
            <Ionicons name="leaf" size={12} color="#95d5b2" />
            <Text style={[s.heroPillText,{color:banner.muted}]}>
              <UiText value="Direct Farm Access" />
            </Text>
          </View>
          <View style={s.heroPill}>
            <Ionicons name="heart" size={12} color="#90e0ef" />
            <Text style={[s.heroPillText,{color:banner.muted}]}>
              <UiText value="Verified Health" />
            </Text>
          </View>
          <View style={s.heroPill}>
            <Feather name="shield" size={12} color="#f0b27a" />
            <Text style={[s.heroPillText,{color:banner.muted}]}>
              <UiText value="Zero Middlemen" />
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* 2. FLAGSHIP AGRICONNECT SHOWCASE CARD */}
      <LinearGradient
        colors={['#173c26', '#225235', '#32724c']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={s.connectCard}
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
          <View style={[s.cardIconCircle, {backgroundColor: '#276340'}]}>
            <Ionicons name="leaf" size={20} color="#a3e635" />
          </View>
          <View style={{flex: 1, minWidth: 0}}>
            <Text style={[s.cardEyebrow, {color: '#d4e6a8'}]}>FARM &amp; HARVEST ECOSYSTEM</Text>
            <Text accessibilityRole="header" style={s.cardTitle}>
              VISTRAH AgriConnect
            </Text>
          </View>
        </View>

        <Text style={s.cardHeadline}>{t('agri.headline')}</Text>

        {/* Feature Hero Photo */}
        <View style={s.photoFrame}>
          <Image
            source={agriPhoto}
            resizeMode="cover"
            accessibilityLabel={t('agri.photoAlt')}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <Text style={s.cardDescription}>{t('agri.description')}</Text>

        {/* Free Membership Badge */}
        <View style={s.agriOfferPill}>
          <Ionicons name="ribbon-outline" size={14} color="#d4e6a8" />
          <Text style={s.agriOfferText}>{t('agri.membership')}</Text>
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
              style={({pressed}) => [s.agriTag, {opacity: pressed ? 0.8 : 1}]}
            >
              <Feather name={tag.icon as any} size={11} color="#d4e6a8" />
              <Text style={s.agriTagText}>{tag.title}</Text>
            </Pressable>
          ))}
        </View>

        {/* Primary Action Button */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/agri-connect')}
          style={({pressed}) => [s.agriCtaButton, {opacity: pressed ? 0.9 : 1}]}
        >
          <Text style={s.agriCtaText}>{t('agri.cta')}</Text>
          <Feather name="arrow-right" size={16} color="#1b4332" />
        </Pressable>
      </LinearGradient>

      {/* 3. FLAGSHIP HEALTHCONNECT SHOWCASE CARD */}
      <LinearGradient
        colors={['#0f3554', '#154d7b', '#1e6f9f']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={s.connectCard}
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
                      backgroundColor: '#e9fbff',
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
                      backgroundColor: '#ffffff',
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
          <View style={[s.cardIconCircle, {backgroundColor: '#1b5f8c'}]}>
            <Ionicons name="heart" size={20} color="#38bdf8" />
          </View>
          <View style={{flex: 1, minWidth: 0}}>
            <Text style={[s.cardEyebrow, {color: '#a5f3fc'}]}>CARE &amp; WELLNESS NETWORK</Text>
            <Text accessibilityRole="header" style={s.cardTitle}>
              VISTRAH HealthConnect
            </Text>
          </View>
        </View>

        <Text style={s.cardHeadline}>{t('health.headline')}</Text>

        {/* Feature Hero Photo */}
        <View style={s.photoFrame}>
          <Image
            source={healthPhoto}
            resizeMode="cover"
            accessibilityLabel={t('health.photoAlt')}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <Text style={s.cardDescription}>{t('health.description')}</Text>

        {/* Highlight Note */}
        <View style={s.healthOfferPill}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#a5f3fc" />
          <Text style={s.healthOfferText}>{t('health.highlight')}</Text>
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
              style={({pressed}) => [s.healthTag, {opacity: pressed ? 0.8 : 1}]}
            >
              <Feather name={tag.icon as any} size={11} color="#bae6fd" />
              <Text style={s.healthTagText}>{tag.title}</Text>
            </Pressable>
          ))}
        </View>

        {/* Primary Action Button */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/health-connect')}
          style={({pressed}) => [s.healthCtaButton, {opacity: pressed ? 0.9 : 1}]}
        >
          <Text style={s.healthCtaText}>{t('health.cta')}</Text>
          <Feather name="arrow-right" size={16} color="#0c4a6e" />
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
                  backgroundColor: isDark ? '#1e182d' : '#ffffff',
                  borderColor: isDark ? '#362a4d' : '#e4dcee',
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <View style={[s.gridIconWrap, {backgroundColor: isDark ? '#2a223f' : item.bg}]}>
                <Feather name={item.icon} size={18} color={item.accent} />
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
            backgroundColor: isDark ? '#191329' : '#f7f4fc',
            borderColor: isDark ? '#312547' : '#e7def0',
          },
        ]}
      >
        <Text style={[s.sectionEyebrow, {color: colors.accent}]}>THE VISTRAH PROMISE</Text>
        <Text accessibilityRole="header" style={[s.trustTitle, {color: colors.text}]}>
          <UiText value="Why Vistrah Essentials?" />
        </Text>

        <View style={s.trustItem}>
          <View style={[s.trustIconBox, {backgroundColor: isDark ? '#29213e' : '#edf7f1'}]}>
            <Feather name="users" size={16} color="#2d6a4f" />
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
          <View style={[s.trustIconBox, {backgroundColor: isDark ? '#29213e' : '#ebf8ff'}]}>
            <Feather name="check-circle" size={16} color="#1f6f8b" />
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
          <View style={[s.trustIconBox, {backgroundColor: isDark ? '#29213e' : '#faf5ff'}]}>
            <Feather name="globe" size={16} color="#7741c4" />
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
        colors={isDark ? ['#130e22', '#1f1636', '#2f1847'] : ['#181126', '#261746', '#3f1a63']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={s.partnerBanner}
      >
        <View pointerEvents="none" style={s.partnerGlow} />
        <View style={s.partnerTopRow}>
          <LinearGradient
            colors={[brandTheme.gradient[0], brandTheme.gradient[1], brandTheme.gradient[2]]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={s.partnerTag}
          >
            <Text style={s.partnerTagText}>⭐ PROVIDER PARTNERSHIP</Text>
          </LinearGradient>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
            <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399'}} />
            <Text style={{color: '#c2b2df', fontSize: 11, fontWeight: '600'}}>
              <UiText value="Open Registration" />
            </Text>
          </View>
        </View>

        <Text accessibilityRole="header" style={s.partnerTitle}>
          <UiText value="Are you an Agricultural Specialist, Doctor, or Clinic?" />
        </Text>
        <Text style={s.partnerBody}>
          <UiText value="List your essential services on Vistrah to connect with thousands of local households and farmers across your region." />
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/membership')}
          style={({pressed}) => [s.partnerButton, {opacity: pressed ? 0.9 : 1}]}
        >
          <LinearGradient
            colors={[brandTheme.gradient[0], brandTheme.gradient[1], brandTheme.gradient[2]]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={s.partnerButtonGradient}
          >
            <Text style={s.partnerButtonText}>
              <UiText value="Join Verified Provider Network" />
            </Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </LinearGradient>
        </Pressable>
      </LinearGradient>
    </Page>
  );
}

const s = StyleSheet.create({
  // Hero
  hero: {
    borderRadius: 22,
    padding: 18,
    gap: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#ffffff1a',
  },
  heroGlowOrb: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#7741c4',
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
    borderRadius: 9,
  },
  heroTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#fff',
  },
  heroVerifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#ffffff12',
  },
  heroVerifiedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e2d9f3',
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
    color: '#d4c7ea',
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
    borderRadius: 12,
    backgroundColor: '#ffffff15',
    borderWidth: 0.5,
    borderColor: '#ffffff28',
  },
  heroPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f0eaff',
  },

  // Connect Card (Shared Agri & Health)
  connectCard: {
    borderRadius: 22,
    padding: 16,
    gap: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#ffffff22',
    elevation: 3,
    shadowColor: '#000',
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff35',
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
    color: '#ffffff',
  },
  cardHeadline: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    color: '#ffffff',
  },
  photoFrame: {
    width: '100%',
    aspectRatio: 2.1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#00000020',
    borderWidth: 1,
    borderColor: '#ffffff26',
  },
  cardDescription: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#eaf4ee',
  },
  agriOfferPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#ffffff18',
    borderWidth: 0.5,
    borderColor: '#d4e6a840',
  },
  agriOfferText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d4e6a8',
  },
  healthOfferPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#ffffff18',
    borderWidth: 0.5,
    borderColor: '#bae6fd40',
  },
  healthOfferText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e0f2fe',
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
    borderRadius: 10,
    backgroundColor: '#12301f',
    borderWidth: 0.5,
    borderColor: '#d4e6a835',
  },
  agriTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#edf7ee',
  },
  healthTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#0c2e47',
    borderWidth: 0.5,
    borderColor: '#7dd3fc35',
  },
  healthTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f0f9ff',
  },
  agriCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#d4e6a8',
    marginTop: 2,
  },
  agriCtaText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#143825',
  },
  healthCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#bae6fd',
    marginTop: 2,
  },
  healthCtaText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#073b5c',
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
    borderRadius: 14,
    borderWidth: 1,
  },
  gridIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
    borderRadius: 20,
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
    borderRadius: 10,
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
    borderRadius: 22,
    padding: 18,
    gap: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#ffffff1a',
    marginTop: 4,
  },
  partnerGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#7741c4',
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
    borderRadius: 8,
  },
  partnerTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: '#fff',
  },
  partnerTitle: {
    fontSize: Platform.OS === 'android' ? 18 : 16,
    lineHeight: Platform.OS === 'android' ? 23 : 21,
    fontWeight: '800',
    color: '#ffffff',
  },
  partnerBody: {
    fontSize: 12,
    lineHeight: 17,
    color: '#d6c8ed',
  },
  partnerButton: {
    borderRadius: 14,
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
    color: '#ffffff',
  },
});
