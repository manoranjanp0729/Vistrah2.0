import { Text, TextInput } from './typography';
import { UiText, UiElement } from './localized-ui';
import { useState } from 'react';
import { AddToCart } from './commerce-orders';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { Action, Heading, Loading, ErrorPanel, MemberGate } from './ui';
import { useResource } from '../lib/resource';
import { useSession } from '../lib/session';
import { useTheme } from '../lib/theme';
import { ApiError } from '../lib/api';
import { listingPrice, type CommerceListing, type ListingPage } from '../../../shared/commerce';

export function CommerceBrowser() {
  const [packages, setPackages] = useState(false);
  const [query, setQuery] = useState('');
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <View style={{ gap: 16 }} testID="products-marketplace-screen">
      <LinearGradient
        colors={['#091B33', '#0F294A', '#163A66']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <Text style={s.heroEyebrow}>
          <UiText value="Discover. Connect. Grow." />
        </Text>
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
            <Feather name="shopping-cart" size={14} color="#ffffff" />
            <Text style={s.heroPrimaryText}>
              <UiText value="Cart" />
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/commerce/orders')}
            style={({ pressed }) => [s.heroSecondaryBtn, { opacity: pressed ? 0.88 : 1 }]}
          >
            <Feather name="package" size={14} color="#ffffff" />
            <Text style={s.heroSecondaryText}>
              <UiText value="Purchase orders" />
            </Text>
          </Pressable>
        </View>
      </LinearGradient>

      <View
        style={[
          s.controlsCard,
          {
            backgroundColor: isDark ? '#0f233d' : '#ffffff',
            borderColor: isDark ? '#1e3a5f' : '#e2e8f0',
          },
        ]}
      >
        <View
          style={[
            s.searchBox,
            {
              backgroundColor: isDark ? '#09192e' : '#f8fafc',
              borderColor: isDark ? '#1e3a5f' : '#cbd5e1',
            },
          ]}
        >
          <Feather name="search" size={16} color="#F97316" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search products, sellers, or packages..."
            placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
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
                    backgroundColor: isDark ? '#09192e' : '#f8fafc',
                    borderColor: isDark ? '#1e3a5f' : '#cbd5e1',
                  },
            ]}
          >
            <Text style={[s.pillText, { color: !packages ? '#ffffff' : colors.text }]}>
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
                    backgroundColor: isDark ? '#09192e' : '#f8fafc',
                    borderColor: isDark ? '#1e3a5f' : '#cbd5e1',
                  },
            ]}
          >
            <Text style={[s.pillText, { color: packages ? '#ffffff' : colors.text }]}>
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
  const { styles, colors, mode } = useTheme();
  const isDark = mode === 'dark';
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
          <UiElement as={Heading} title={packages ? 'Service packages' : 'Products'} />
          {items.length ? (
            items.map(row => (
              <View
                key={row.id}
                style={[
                  s.productCard,
                  {
                    backgroundColor: isDark ? '#0f233d' : '#ffffff',
                    borderColor: isDark ? '#1e3a5f' : '#e2e8f0',
                  },
                ]}
              >
                <View style={s.kindBadge}>
                  <Text style={s.kindBadgeText}>
                    {packages ? 'Fixed-Price Package' : 'Verified Product'}
                  </Text>
                </View>
                <Text style={[s.cardTitle, { color: colors.text }]}>{row.title}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted }}>
                  {row.business}
                </Text>
                <Text style={styles.text} numberOfLines={3}>
                  {row.description}
                </Text>
                <View
                  style={[
                    s.cardFooter,
                    { borderTopColor: isDark ? '#1e3a5f' : '#e2e8f0' },
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
                  backgroundColor: isDark ? '#0f233d' : '#f8fafc',
                  borderColor: isDark ? '#1e3a5f' : '#e2e8f0',
                },
              ]}
            >
              <Feather name="shopping-bag" size={24} color="#F97316" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
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

const s = StyleSheet.create({
  hero: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    gap: 8,
  },
  heroEyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FB923C',
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: '#ffffff',
  },
  heroCopy: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#CBD5E1',
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
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F97316',
  },
  heroPrimaryText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
  heroSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroSecondaryText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '600',
  },
  controlsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: '#0F294A',
    borderColor: '#0F294A',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  productCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  kindBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
    backgroundColor: '#FFF7ED',
  },
  kindBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#EA580C',
  },
  cardTitle: {
    fontSize: 16.5,
    fontWeight: '700',
  },
  cardFooter: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceText: {
    fontSize: 16.5,
    fontWeight: '800',
  },
  viewBtn: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
});
