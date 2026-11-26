import {Text} from './typography';
import {Action} from './ui';
import {UiText} from './localized-ui';
import {View} from 'react-native';
import {router} from 'expo-router';
import {useLanguage} from '../lib/language';
import {useTheme,spacing,radii,typography} from '../lib/theme';

export function HomepagePartnerBanner() {
  const {colors} = useTheme();
  const {copy} = useLanguage();

  return (
    <View
      style={{
        borderRadius: radii.surface,
        padding: spacing.cardPadding,
        gap: spacing.regular,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        marginTop: 4,
        marginBottom: 8,
      }}
    >
      <View style={{gap: 4}}>
        <Text
          accessibilityRole="header"
          style={{
            color: colors.text,
            ...typography.heading,
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
      </View>

      <Text style={{color: colors.muted, fontSize: 11.5, lineHeight: 16}}>
        <UiText value={copy.home.review} />
      </Text>
    </View>
  );
}
