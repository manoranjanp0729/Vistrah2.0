import { createElement } from 'react';
import { Image, Platform, View } from 'react-native';
import { Text } from './typography';
import {
  GOOGLE_WORDMARK_PATHS,
  GOOGLE_WORDMARK_VIEWBOX,
  googleWordmarkDimensions,
} from '../../../shared/google-attribution';

const GOOGLE_COLOR_PNG = require('../../assets/google/google-wordmark-color.png');
const GOOGLE_WHITE_PNG = require('../../assets/google/google-wordmark-white.png');

export function MobileGoogleWordmark({
  height = 14,
  dark = false,
}: {
  height?: number;
  dark?: boolean;
}) {
  const { width, height: h } = googleWordmarkDimensions(height);

  if (Platform.OS === 'web') {
    return createElement(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        width,
        height: h,
        viewBox: GOOGLE_WORDMARK_VIEWBOX,
        preserveAspectRatio: 'xMidYMid meet',
        role: 'img',
        'aria-label': 'Google',
        style: { display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 },
      },
      ...GOOGLE_WORDMARK_PATHS.map((p, idx) =>
        createElement('path', {
          key: idx,
          fill: dark ? '#FFFFFF' : p.color,
          d: p.d,
        }),
      ),
    );
  }

  return (
    <Image
      source={dark ? GOOGLE_WHITE_PNG : GOOGLE_COLOR_PNG}
      accessibilityLabel="Google"
      resizeMode="contain"
      style={{ width, height: h }}
    />
  );
}

export function MobilePoweredByGoogle({ dark = false }: { dark?: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel="Powered by Google"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        backgroundColor: dark ? '#18181b' : '#f8fafc',
        borderTopWidth: 1,
        borderTopColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.09)',
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '500',
          color: dark ? '#e2e8f0' : '#5f6368',
        }}
      >
        Powered by
      </Text>
      <MobileGoogleWordmark height={14} dark={dark} />
    </View>
  );
}

export function MobileGoogleLogoBadge({ dark = false }: { dark?: boolean }) {
  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityLabel="Google"
      style={{
        position: 'absolute',
        left: 10,
        bottom: 10,
        zIndex: 20,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: dark ? 'rgba(24,24,27,0.92)' : 'rgba(255,255,255,0.94)',
        borderWidth: 1,
        borderColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.12)',
      }}
    >
      <MobileGoogleWordmark height={14} dark={dark} />
    </View>
  );
}
