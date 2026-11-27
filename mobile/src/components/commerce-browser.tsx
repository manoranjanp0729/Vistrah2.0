import { Text, TextInput } from './typography';
import { UiText, UiElement } from './localized-ui';
import { useMemo, useState } from 'react';
import { AddToCart } from './commerce-orders';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { Action, Heading, Loading, ErrorPanel, MemberGate } from './ui';
import { useResource } from '../lib/resource';
import { useSession } from '../lib/session';
import { useTheme, typography, spacing, radii, controlHeights, type ThemeColors } from '../lib/theme';
import { ApiError } from '../lib/api';
import { listingPrice, type CommerceListing, type ListingPage } from '../../../shared/commerce';

export function CommerceBrowser() {
  const [packages, setPackages] = useState(false);
  const [query, setQuery] = useState('');
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={{ gap: 16 }} testID="products-marketplace-screen">
      <View style={s.hero}>
        <Text accessibilityRole="header" style={s.heroTitle}>
          <UiText value="Products" />
        </Text>
        <Text style={s.heroCopy}>
          <UiText value="Browse verified products and fixed-price packages directly from reviewed local businesses across India." />
        </Text>

        <View style={s.heroActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/commerce/cart')}
            style={({ pressed }) => [s.heroPrimaryBtn, { opacity: pressed ? 0.88 : 1 }]}
          >
            <Feather name="shopping-cart" size={14} color={colors.ink} />
            <Text style={s.heroPrimaryText}>
              <UiText value="Cart" />
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/commerce/orders')}
            style={({ pressed }) => [s.heroSecondaryBtn, { opacity: pressed ? 0.88 : 1 }]}
          >
            <Feather name="package" size={14} color={colors.text} />
            <Text style={s.heroSecondaryText}>
              <UiText value="Purchase orders" />
            </Text>
          </Pressable>
        </View>
      </View>

      <View
        style={[
          s.controlsCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            s.searchBox,
            {
              backgroundColor: colors.soft,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather name="search" size={16} color={colors.accent} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search products, sellers, or packages..."
            placeholderTextColor={colors.muted}
            accessibilityLabel="Search products"
            style={[s.searchInput, { color: colors.text }]}
          />
          {Boolean(query.trim()) && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Feather name="x-circle" size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>

        <View style={s.pillRow}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: !packages }}
            onPress={() => setPackages(false)}
            style={[
              s.pill,
              !packages
                ? s.pillActive
                : {
                    backgroundColor: colors.soft,
                    borderColor: colors.border,
                  },
            ]}
          >
            <Text style={[s.pillText, { color: !packages ? colors.ink : colors.text }]}>
              <UiText value="Products" />
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: packages }}
            onPress={() => setPackages(true)}
            style={[
              s.pill,
              packages
                ? s.pillActive
                : {
                    backgroundColor: colors.soft,
                    borderColor: colors.border,
                  },
            ]}
          >
            <Text style={[s.pillText, { color: packages ? colors.ink : colors.text }]}>
              <UiText value="Service packages" />
            </Text>
          </Pressable>
        </View>
      </View>

      {packages ? (
        <MemberGate>
          <PublishedList key="packages" packages query={query} />
        </MemberGate>
      ) : (
        <PublishedList key="products" packages={false} query={query} />
      )}
    </View>
  );
}

function PublishedList({ packages, query = '' }: { packages: boolean; query?: string }) {
  const { styles, colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useSession();
  const [page, setPage] = useState(1);
  const result = useResource<ListingPage<CommerceListing>>(
    '/commerce/' + (packages ? 'service-packages' : 'products') + '?page=' + page,
    user?.id ?? null,
  );
  const needle = query.trim().toLowerCase();
  const items = (result.data?.items ?? []).filter(
    row =>
      !needle || [row.title, row.business, row.description].join(' ').toLowerCase().includes(needle),
  );

  return (
    <View style={{ gap: 14 }}>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorPanel error={result.error} retry={result.retry} />
      ) : result.data ? (
        <>
          {items.length ? (
            items.map(row => (
              <View
                key={row.id}
                style={[
                  s.productCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={s.kindBadge}>
                  <Text style={s.kindBadgeText}>
                    {packages ? 'Fixed-Price Package' : 'Verified Product'}
                  </Text>
                </View>
                <Text style={[s.cardTitle, { color: colors.text }]}>{row.title}</Text>
                <Text style={{ fontSize: typography.body.fontSize, fontWeight: '600', color: colors.muted }}>
                  {row.business}
                </Text>
                <Text style={styles.text} numberOfLines={3}>
                  {row.description}
                </Text>
                <View
                  style={[
                    s.cardFooter,
                    { borderTopColor: colors.border },
                  ]}
                >
                  <Text style={[styles.tabular, s.priceText, { color: colors.text }]}>
                    {listingPrice(row.unit_price_paise)} / unit
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({ pathname: '/commerce/[id]', params: { id: row.id } })
                    }
                    style={s.viewBtn}
                  >
                    <Text style={s.viewBtnText}>
                      <UiText value="View details" />
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <View
              style={[
                s.emptyCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Feather name="shopping-bag" size={24} color={colors.accent} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
                No matching {packages ? 'service packages' : 'products'} yet
              </Text>
              <Text style={[styles.muted, { textAlign: 'center' }]}>
                Check back soon as verified local sellers publish new offers on VISTRAH.
              </Text>
            </View>
          )}
          <Text style={[styles.muted, styles.tabular]}>
            <UiText value="Page " />
            {page} · {result.data.total} <UiText value="listings" />
          </Text>
        </>
      ) : null}
      <View style={styles.row}>
        <UiElement
          as={Action}
          label="Previous page"
          secondary
          disabled={page === 1 || result.loading}
          onPress={() => setPage(p => p - 1)}
        />
        <UiElement
          as={Action}
          label="Next page"
          secondary
          disabled={!result.data || page * result.data.page_size >= result.data.total}
          onPress={() => setPage(p => p + 1)}
        />
      </View>
    </View>
  );
}

export function CommerceDetail({ id }: { id: string }) {
  const { styles } = useTheme();
  const { user } = useSession();
  const result = useResource<CommerceListing>(
    '/commerce/listings/' + encodeURIComponent(id),
    user?.id ?? null,
  );
  if (result.loading) return <Loading />;
  if (result.error) {
    return (
      <>
        <ErrorPanel error={result.error} retry={result.retry} />
        {result.error instanceof ApiError && [401, 403].includes(result.error.status) && (
          <UiElement
            as={Action}
            auth={!user}
            label={user ? 'View membership' : 'Sign in'}
            onPress={() => router.push(user ? '/membership' : '/auth')}
          />
        )}
      </>
    );
  }
  const row = result.data;
  if (!row) return null;
  return (
    <View style={styles.card}>
      <Heading title={row.title} />
      <Text style={styles.muted}>
        {row.business} · <UiText value={row.kind === 'PRODUCT' ? 'Product' : 'Service package'} />
      </Text>
      <Text style={[styles.heading, styles.tabular]}>
        {listingPrice(row.unit_price_paise)} / unit
      </Text>
      <Text style={styles.text}>{row.description}</Text>
      <AddToCart row={row} />
      {row.service_id !== null && (
        <UiElement
          as={Action}
          label="Explore this service"
          secondary
          onPress={() =>
            router.push({ pathname: '/service/[id]', params: { id: row.service_id! } })
          }
        />
      )}
    </View>
  );
}

export { ClassifiedServices } from './customer-listing-results';

const makeStyles = (colors:ThemeColors) => StyleSheet.create({
  hero: {paddingVertical:spacing.regular,borderBottomWidth:1,borderColor:colors.border,gap:spacing.fieldGap},
  heroEyebrow: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.accent,
  },
  heroTitle: {...typography.title,color:colors.text},
  heroCopy: {
    fontSize: typography.body.fontSize,
    lineHeight: 20,
    color: colors.muted,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  heroPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: controlHeights.standard,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.input,
    backgroundColor: colors.accent,
  },
  heroPrimaryText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  heroSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: controlHeights.standard,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.soft,
  },
  heroSecondaryText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  controlsCard: {
    borderRadius: radii.surface,
    borderWidth: 1,
    padding: 14,
    gap: spacing.regular,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.fieldGap,
    borderWidth: 1,
    borderRadius: radii.input,
    paddingHorizontal: 12,
    minHeight: controlHeights.standard,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
    paddingVertical: 8,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.fieldGap,
  },
  pill: {
    minHeight: controlHeights.standard,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.action,
    borderWidth: 1,
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pillText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  productCard: {
    borderRadius: radii.surface,
    borderWidth: 1,
    padding: spacing.cardPaddingCompact,
    gap: spacing.fieldGap,
  },
  kindBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.action,
    backgroundColor: colors.soft,
  },
  kindBadgeText: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.accent,
  },
  cardTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  cardFooter: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.regular,
  },
  priceText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  viewBtn: {
    minHeight: controlHeights.standard,
    paddingHorizontal: 14,
    borderRadius: radii.input,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  emptyCard: {
    borderRadius: radii.surface,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: spacing.fieldGap,
  },
});
