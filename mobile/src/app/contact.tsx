import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { Text } from '../components/typography';
import { UiElement, UiText } from '../components/localized-ui';
import { Action, ErrorPanel, Heading, Page } from '../components/ui';
import { useTheme } from '../lib/theme';
import { officialContact } from '../../../shared/public-contact';
import { buildContactPrefillMailto } from '../../../shared/nearby-services';

export default function MobileContactScreen() {
  const { colors, mode, styles } = useTheme();
  const isDark = mode === 'dark';
  const [error, setError] = useState('');
  const raw = useLocalSearchParams<{
    intent?: string;
    business?: string;
    category?: string;
    type?: string;
    locality?: string;
  }>();

  const str = (v: unknown, max = 140) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const intent = str(raw.intent, 40);
  const business = str(raw.business, 140);
  const category = str(raw.category, 100);
  const type = str(raw.type, 100);
  const locality = str(raw.locality, 120);
  const isWebsiteRequest = intent === 'request-website';
  const mailHref = buildContactPrefillMailto(officialContact.email, {
    intent,
    business,
    category,
    type,
    locality,
  });

  async function openEmail() {
    setError('');
    try {
      await Linking.openURL(mailHref);
    } catch {
      setError(`Could not open your email app. Please email ${officialContact.email} directly.`);
    }
  }

  return (
    <UiElement
      as={Page}
      title={isWebsiteRequest ? 'Request Business Website' : 'Contact VISTRAH'}
    >
      <View
        style={[
          styles.card,
          {
            borderColor: 'rgba(212,175,55,0.55)',
            backgroundColor: isDark ? 'rgba(212,175,55,0.08)' : '#fffbeb',
            gap: 10,
          },
        ]}
      >
        <View style={s.headerRow}>
          <Feather
            name={isWebsiteRequest ? 'globe' : 'mail'}
            size={18}
            color="#d4af37"
          />
          <Text style={[styles.heading, { flex: 1 }]}>
            {isWebsiteRequest
              ? `Request Website${business ? ` — ${business}` : ''}`
              : `Contact VISTRAH${business ? ` — ${business}` : ''}`}
          </Text>
        </View>

        <Text style={styles.muted}>
          {isWebsiteRequest
            ? 'Vistrah Digital builds fast, mobile-ready websites and SEO pages for local businesses across India. Tap below to send your pre-filled website enquiry.'
            : 'Contact Vistrah India Pvt Limited about service discovery, business onboarding, V Ads campaigns, or support.'}
        </Text>

        {Boolean(business || type || category || locality) && (
          <View style={s.pillsRow}>
            {Boolean(business) && (
              <View style={[s.pill, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                  Business: {business}
                </Text>
              </View>
            )}
            {Boolean(type || category) && (
              <View style={[s.pill, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                  Service: {(type || category).replace(/-/g, ' ')}
                </Text>
              </View>
            )}
            {Boolean(locality) && (
              <View style={[s.pill, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                  Area: {locality}
                </Text>
              </View>
            )}
          </View>
        )}

        <UiElement
          as={Action}
          label={isWebsiteRequest ? 'Send Website Request Email' : `Email ${officialContact.email}`}
          onPress={() => void openEmail()}
        />

        {isWebsiteRequest && (
          <UiElement
            as={Action}
            secondary
            label="View Website & Marketing Plans"
            onPress={() => router.push('/marketing-pricing')}
          />
        )}

        {Boolean(error) && <ErrorPanel error={error} />}
      </View>

      <View style={[styles.card, { gap: 10 }]}>
        <Heading title="Vistrah India Pvt Limited" />
        <Text style={styles.muted}>
          <UiText value="Bengaluru, Karnataka, India · Support: " />
          {officialContact.email}
          <UiText value=" · Grievance Officer: grievance@vistrah.in" />
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/seller/onboard',
              params: {
                ...(category ? { category } : {}),
                ...(type ? { type } : {}),
                ...(business ? { business } : {}),
                ...(locality ? { locality } : {}),
              },
            })
          }
          style={({ pressed }) => [
            s.secondaryRow,
            { borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={{ fontSize: 13.5, fontWeight: '500', color: colors.accent }}>
            Join Vistrah — Free 3-Step Onboarding
          </Text>
          <Feather name="arrow-right" size={15} color={colors.accent} />
        </Pressable>
      </View>
    </UiElement>
  );
}

const s = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
});
