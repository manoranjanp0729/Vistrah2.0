import {Image, Pressable, StyleSheet, View} from 'react-native';
import {router, type Href} from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import {Text} from './typography';
import {useTheme} from '../lib/theme';
import {
  FOR_BUSINESSES_HERO_BANNER,
  HERO_BANNER_ASPECT_RATIO,
} from '../../../shared/hero-banners';

const FOR_BUSINESSES_IMAGE = require('../../assets/hero-journey/for-businesses-widescreen.jpg');

export function ServiceCarousel() {
  const {mode} = useTheme();
  const isDark = mode === 'dark';
  const banner = FOR_BUSINESSES_HERO_BANNER;

  const surface = isDark ? '#18181b' : '#ffffff';
  const surfaceSoft = isDark ? '#111113' : '#f8fafc';
  const hairline = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.10)';
  const textPrimary = isDark ? '#fafafa' : '#0f172a';
  const textSecondary = isDark ? '#a1a1aa' : '#475569';

  return (
    <View
      testID="homepage-for-businesses-hero"
      style={[
        s.cardWrap,
        {
          backgroundColor: surface,
          borderColor: hairline,
        },
      ]}
    >
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${banner.badge}: ${banner.title}`}
        onPress={() => router.push(banner.storyPath as Href)}
        style={{width: '100%', aspectRatio: HERO_BANNER_ASPECT_RATIO, overflow: 'hidden'}}
      >
        <Image
          source={FOR_BUSINESSES_IMAGE}
          resizeMode="cover"
          accessible={false}
          style={{width: '100%', height: '100%'}}
          accessibilityIgnoresInvertColors
        />
      </Pressable>

      <View style={[s.controlBar, {borderTopColor: hairline}]}>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(banner.storyPath as Href)}
          style={({pressed}) => [s.cueBtn, {opacity: pressed ? 0.75 : 1}]}
        >
          <Text style={[s.cueText, {color: textSecondary}]}>
            {banner.navTitle} · Open guide →
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(banner.primaryCta.mobileRoute as Href)}
          style={({pressed}) => [
            s.directPill,
            {
              backgroundColor: surfaceSoft,
              borderColor: hairline,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={[s.directPillText, {color: textPrimary}]}>
            {banner.primaryCta.shortLabel}
          </Text>
          <Feather name="arrow-right" size={12} color={textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  cardWrap: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  controlBar: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  cueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  cueText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  directPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  directPillText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
});
