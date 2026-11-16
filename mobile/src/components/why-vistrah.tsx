import {useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions} from 'react-native';
import {router} from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import {Text} from './typography';
import {useTheme} from '../lib/theme';
import {WHY_VISTRAH_HEADER, WHY_VISTRAH_PILLARS} from '../../../shared/why-vistrah';

export function WhyVistrah({variant = 'full'}: {variant?: 'full' | 'strip'}) {
  const [open, setOpen] = useState(false);
  const {mode, colors} = useTheme();
  const {width, height} = useWindowDimensions();
  const isWide = width >= 680;
  const isDark = mode === 'dark';
  const isStrip = variant === 'strip';

  const surface = isDark ? '#18181b' : '#ffffff';
  const surfaceSoft = isDark ? '#111113' : '#f8fafc';
  const hairline = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.10)';
  const textPrimary = isDark ? '#fafafa' : '#0f172a';
  const textSecondary = isDark ? '#a1a1aa' : '#475569';
  const primaryBtnBg = isDark ? colors.accent || '#f9aa45' : '#173f35';
  const primaryBtnInk = '#ffffff';

  return (
    <>
      <Pressable
        testID={isStrip ? 'why-vistrah-strip' : 'why-vistrah-section'}
        accessibilityRole="button"
        accessibilityState={{expanded: open}}
        accessibilityLabel={`${WHY_VISTRAH_HEADER.badge}: ${WHY_VISTRAH_HEADER.collapsedSummary}`}
        onPress={() => setOpen(true)}
        style={({pressed}) => [
          s.banner,
          isStrip && s.bannerStrip,
          {
            backgroundColor: surface,
            borderColor: hairline,
            opacity: pressed ? 0.88 : 1,
          },
        ]}
      >
        <View style={[s.bannerMain, isWide && s.bannerMainWide]}>
          <View
            style={[
              s.badge,
              {
                backgroundColor: surfaceSoft,
                borderColor: hairline,
              },
            ]}
          >
            <View style={s.badgeDot} />
            <Text style={[s.badgeText, {color: textPrimary}]}>{WHY_VISTRAH_HEADER.badge}</Text>
          </View>

          <Text
            numberOfLines={isStrip ? 1 : 2}
            style={[s.summaryText, isStrip && s.summaryStrip, {color: textSecondary}]}
          >
            {isStrip ? (
              WHY_VISTRAH_HEADER.stripLine
            ) : (
              <>
                <Text style={{fontWeight: '600', color: textPrimary}}>
                  Discover. Connect. Grow.
                </Text>{' '}
                — Direct verified businesses, zero broker spam &amp; 30 days V Ads at ₹0.
              </>
            )}
          </Text>
        </View>

        <View
          style={[
            s.triggerPill,
            {
              backgroundColor: surfaceSoft,
              borderColor: hairline,
            },
          ]}
        >
          <Text style={[s.triggerText, {color: textPrimary}]}>
            {WHY_VISTRAH_HEADER.triggerCollapsed}
          </Text>
        </View>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={s.backdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close Why VISTRAH sheet"
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />

          <View
            style={[
              s.sheet,
              {
                backgroundColor: surface,
                borderColor: hairline,
                maxHeight: Math.min(height * 0.88, 680),
              },
            ]}
          >
            <View style={[s.sheetHeader, {borderBottomColor: hairline}]}>
              <View style={{flex: 1, gap: 4}}>
                <Text style={[s.eyebrow, {color: isDark ? '#f9aa45' : '#173f35'}]}>
                  {WHY_VISTRAH_HEADER.eyebrow}
                </Text>
                <Text accessibilityRole="header" style={[s.headline, {color: textPrimary}]}>
                  {WHY_VISTRAH_HEADER.headline}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close Why VISTRAH details"
                onPress={() => setOpen(false)}
                hitSlop={8}
                style={[
                  s.closeBtn,
                  {
                    backgroundColor: surfaceSoft,
                    borderColor: hairline,
                  },
                ]}
              >
                <Feather name="x" size={16} color={textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.sheetScroll}
            >
              <Text style={[s.subheadline, {color: textSecondary, paddingHorizontal: 18, paddingTop: 14}]}>
                {WHY_VISTRAH_HEADER.subheadline}
              </Text>

              {WHY_VISTRAH_PILLARS.map((pillar, index) => (
                <View
                  key={pillar.num}
                  style={[
                    s.pillar,
                    index > 0 && {borderTopWidth: 1, borderTopColor: hairline},
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
              ))}
            </ScrollView>

            <View style={[s.sheetFooter, {backgroundColor: surfaceSoft, borderTopColor: hairline}]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setOpen(false);
                  router.push('/services');
                }}
                style={({pressed}) => [
                  s.primaryCta,
                  {
                    backgroundColor: primaryBtnBg,
                    borderColor: primaryBtnBg,
                    opacity: pressed ? 0.86 : 1,
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
                onPress={() => {
                  setOpen(false);
                  router.push('/marketing-pricing');
                }}
                style={({pressed}) => [
                  s.secondaryCta,
                  {
                    backgroundColor: surface,
                    borderColor: hairline,
                    opacity: pressed ? 0.86 : 1,
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
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  bannerStrip: {
    minHeight: 44,
    paddingVertical: 8,
  },
  bannerMain: {
    flex: 1,
    minWidth: 0,
    gap: 5,
    alignItems: 'flex-start',
  },
  bannerMainWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#10b981',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  summaryText: {
    fontSize: 12.5,
    lineHeight: 17,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  summaryStrip: {
    fontSize: 12,
  },
  triggerPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  triggerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.56)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 12,
  },
  sheet: {
    width: '100%',
    maxWidth: 620,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headline: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 23,
    letterSpacing: -0.4,
  },
  subheadline: {
    fontSize: 13,
    lineHeight: 19,
    paddingBottom: 6,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    paddingBottom: 8,
  },
  pillar: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 4,
  },
  pillarKicker: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
  pillarTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  pillarBody: {
    fontSize: 13,
    lineHeight: 19,
    fontVariant: ['tabular-nums'],
  },
  sheetFooter: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 8,
  },
  primaryCta: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaText: {
    fontSize: 12.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
