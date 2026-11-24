import {Text} from './typography';
import {Action} from './ui';
import {UiText} from './localized-ui';
import {Platform,View} from 'react-native';
import {router} from 'expo-router';
import {useLanguage} from '../lib/language';
import {useTheme} from '../lib/theme';

export function HomepagePartnerBanner() {
  const {colors, mode} = useTheme();
  const {copy} = useLanguage();
  const isDark = mode === 'dark';

  return (
    <View
      style={{
        borderRadius: 12,
        padding: 20,
        gap: 12,
        backgroundColor: isDark ? '#0f233d' : '#f8fafc',
        borderWidth: 1,
        borderColor: isDark ? '#1e3a5f' : '#e2e8f0',
        marginTop: 4,
        marginBottom: 8,
      }}
    >
      <View style={{gap: 4}}>
        <Text style={{color: '#EA580C', fontSize: 13, fontWeight: '600'}}>
          Discover. Connect. Grow.
        </Text>
        <Text
          accessibilityRole="header"
          style={{
            color: colors.text,
            fontSize: Platform.OS === 'android' ? 20 : 18,
            lineHeight: Platform.OS === 'android' ? 26 : 23,
            fontWeight: '700',
            letterSpacing: -0.2,
          }}
        >
          <UiText value={copy.home.business} />
        </Text>
        <Text style={{color: colors.muted, fontSize: 13, lineHeight: 19}}>
          <UiText value={copy.home.businessDescription} />
        </Text>
      </View>

      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 2}}>
        <View style={{flex: 1, minWidth: 160}}>
          <Action label="List Your Business Free" onPress={() => router.push('/seller/onboard')} />
        </View>
        <View style={{flex: 1, minWidth: 160}}>
          <Action secondary label="Explore Nearby Services" onPress={() => router.push('/services/nearby')} />
        </View>
      </View>

      <Text style={{color: colors.muted, fontSize: 11.5, lineHeight: 16}}>
        <UiText value={copy.home.review} />
      </Text>
    </View>
  );
}
