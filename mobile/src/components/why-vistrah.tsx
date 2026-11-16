import {Pressable, StyleSheet, View, useWindowDimensions} from 'react-native';
import {router} from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import {Text} from './typography';
import {useTheme} from '../lib/theme';
import {WHY_VISTRAH_HEADER, WHY_VISTRAH_PILLARS} from '../../../shared/why-vistrah';

export function WhyVistrah({variant = 'full'}: {variant?: 'full' | 'strip'}) {
  const {mode, colors} = useTheme();
  const {width} = useWindowDimensions();
  const isWide = width >= 860;
  const isDark = mode === 'dark';

  const surface = isDark ? '#18181b' : '#ffffff';
  const surfaceSoft = isDark ? '#111113' : '#f8fafc';
  const hairline = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)';
  const textPrimary = isDark ? '#fafafa' : '#0f172a';
  const textSecondary = isDark ? '#a1a1aa' : '#475569';
  const primaryBtnBg = isDark ? colors.accent || '#f9aa45' : '#173f35';
  const primaryBtnInk = isDark ? '#ffffff' : '#ffffff';

  if (variant === 'strip') {
    return (
      <View
        accessibilityLabel="Why VISTRAH trust guarantees"
        style={[
          s.stripFrame,
          {
            backgroundColor: surface,
            borderColor: hairline,
          },
        ]}
      >
        <View style={[s.stripTop, {backgroundColor: surfaceSoft, borderBottomColor: hairline}]}>
          <Text style={[s.eyebrow, {color: textSecondary}]}>{WHY_VISTRAH_HEADER.eyebrow}</Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/marketing-pricing')}
            style={({pressed}) => ({opacity: pressed ? 0.75 : 1})}
          >
            <Text style={[s.stripAction, {color: textPrimary}]}>30 Days V Ads ₹0 →</Text>
          </Pressable>
        </View>
        <View style={isWide ? s.rowWide : undefined}>
          {WHY_VISTRAH_PILLARS.map((pillar, index) => {
            const isLast = index === WHY_VISTRAH_PILLARS.length - 1;
            return (
              <View
                key={pillar.num}
                style={[
                  s.stripCell,
                  isWide && {flex: 1},
                  !isLast &&
                    (isWide
                      ? {borderRightWidth: 1, borderRightColor: hairline}
                      : {borderBottomWidth: 1, borderBottomColor: hairline}),
                ]}
              >
                <Text style={[s.stripNum, {color: textPrimary}]}>{pillar.num} /</Text>
                <Text style={[s.stripBody, {color: textSecondary, flex: 1}]}>
                  <Text style={{fontWeight: '600', color: textPrimary}}>{pillar.title}: </Text>
                  {pillar.stripSummary}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View
      testID="why-vistrah-section"
      style={[
        s.frame,
        {
          backgroundColor: surface,
          borderColor: hairline,
        },
      ]}
    >
      <View style={[s.header, {borderBottomColor: hairline}]}>
        <View style={{gap: 6, flex: 1, minWidth: 240}}>
          <Text style={[s.eyebrow, {color: isDark ? '#f9aa45' : '#173f35'}]}>
            {WHY_VISTRAH_HEADER.eyebrow}
          </Text>
          <Text accessibilityRole="header" style={[s.headline, {color: textPrimary}]}>
            {WHY_VISTRAH_HEADER.headline}
          </Text>
          <Text style={[s.subheadline, {color: textSecondary}]}>
            {WHY_VISTRAH_HEADER.subheadline}
          </Text>
        </View>

        <View
          style={[
            s.anchorChip,
            {
              backgroundColor: surfaceSoft,
              borderColor: hairline,
            },
          ]}
        >
          <View style={s.anchorDot} />
          <Text style={[s.anchorChipText, {color: textPrimary}]}>
            Zero Lead Resale · 2–25 km Live Feed
          </Text>
        </View>
      </View>

      <View style={isWide ? s.rowWide : undefined}>
        {WHY_VISTRAH_PILLARS.map((pillar, index) => {
          const isLast = index === WHY_VISTRAH_PILLARS.length - 1;
          return (
            <View
              key={pillar.num}
              style={[
                s.pillar,
                isWide && {flex: 1},
                !isLast &&
                  (isWide
                    ? {borderRightWidth: 1, borderRightColor: hairline}
                    : {borderBottomWidth: 1, borderBottomColor: hairline}),
              ]}
            >
              <Text style={[s.pillarKicker, {color: textSecondary}]}>
                {pillar.num} / {pillar.kicker}
              </Text>
              <Text style={[s.pillarTitle, {color: textPrimary}]}>
                {pillar.num} / {pillar.title}
              </Text>
              <Text style={[s.pillarBody, {color: textSecondary}]}>
                {pillar.body}
                {pillar.highlight ? (
                  <Text style={{fontWeight: '600', color: textPrimary}}>
                    {pillar.highlight} for businesses.
                  </Text>
                ) : null}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={[s.footerBar, {backgroundColor: surfaceSoft, borderTopColor: hairline}]}>
        <Text style={[s.footerNote, {color: textSecondary}]}>
          DPDP Act 2023 compliant · Verified business ownership · ₹0 due today
        </Text>
        <View style={[s.ctaRow, !isWide && {width: '100%'}]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/services')}
            style={({pressed}) => [
              s.primaryCta,
              {
                backgroundColor: primaryBtnBg,
                borderColor: primaryBtnBg,
                opacity: pressed ? 0.86 : 1,
                flex: isWide ? 0 : 1,
              },
            ]}
          >
            <Text style={[s.primaryCtaText, {color: primaryBtnInk}]}>
              {WHY_VISTRAH_HEADER.primaryCtaLabel}
            </Text>
            <Feather name="arrow-right" size={15} color={primaryBtnInk} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/marketing-pricing')}
            style={({pressed}) => [
              s.secondaryCta,
              {
                backgroundColor: surface,
                borderColor: hairline,
                opacity: pressed ? 0.86 : 1,
                flex: isWide ? 0 : 1,
              },
            ]}
          >
            <Text style={[s.secondaryCtaText, {color: textPrimary}]}>
              {WHY_VISTRAH_HEADER.secondaryCtaLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  frame: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderBottomWidth: 1,
    gap: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
  headline: {
    fontSize: 21,
    fontWeight: '600',
    lineHeight: 26,
    letterSpacing: -0.5,
  },
  subheadline: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  anchorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  anchorDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#10b981',
  },
  anchorChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  rowWide: {
    flexDirection: 'row',
  },
  pillar: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 6,
  },
  pillarKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
  pillarTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 21,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  pillarBody: {
    fontSize: 13.5,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
  footerBar: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerNote: {
    fontSize: 12,
    lineHeight: 17,
    fontVariant: ['tabular-nums'],
  },
  ctaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  primaryCta: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  primaryCtaText: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  secondaryCta: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaText: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  stripFrame: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  stripTop: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stripAction: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  stripCell: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
  },
  stripNum: {
    fontSize: 11.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  stripBody: {
    fontSize: 12.5,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
});
