import {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, Switch, TextInput, View} from 'react-native';
import {Text} from './typography';
import {ErrorPanel, Loading} from './ui';
import {api} from '../lib/api';
import {useTheme} from '../lib/theme';
import {
  formatPricingMoney,
  type AdminPricingResponse,
  type LivePricingItem,
  type LivePricingSection,
} from '../../../shared/marketing-pricing';

type PricingGroup = 'v_ads' | 'digital' | 'creative' | 'outdoor_mobility' | 'faqs';

const GROUPS: {id: PricingGroup; label: string}[] = [
  {id: 'v_ads', label: 'V Ads & Promo'},
  {id: 'digital', label: 'Digital'},
  {id: 'creative', label: 'Creative & Video'},
  {id: 'outdoor_mobility', label: 'Outdoor & Transit'},
  {id: 'faqs', label: 'FAQs'},
];

function paiseToInr(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return '';
  return String(paise / 100);
}

function inrToPaise(raw: string): number | null {
  const clean = raw.trim();
  if (!clean) return null;
  const num = Number(clean);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error('Enter a valid non-negative INR amount.');
  }
  return Math.round(num * 100);
}

export function AdminPricingTab() {
  const {mode} = useTheme();
  const isDark = mode === 'dark';
  const surface = isDark ? '#1e293b' : '#ffffff';
  const subtle = isDark ? '#0f172a' : '#f8fafc';
  const border = isDark ? '#334155' : '#e2e8f0';
  const textPrimary = isDark ? '#f8fafc' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#475569';
  const accent = isDark ? '#10b981' : '#173f35';

  const [group, setGroup] = useState<PricingGroup>('v_ads');
  const [sections, setSections] = useState<LivePricingSection[]>([]);
  const [items, setItems] = useState<LivePricingItem[]>([]);
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [monthlyInputs, setMonthlyInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadPricing = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api<AdminPricingResponse>('/admin/pricing');
      setSections(res.sections);
      setItems(res.items);
      const pMap: Record<string, string> = {};
      const mMap: Record<string, string> = {};
      for (const it of res.items) {
        pMap[it.id] = paiseToInr(it.price_paise);
        mMap[it.id] = paiseToInr(it.monthly_price_paise);
      }
      setPriceInputs(pMap);
      setMonthlyInputs(mMap);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPricing();
  }, [loadPricing]);

  async function saveSection(sec: LivePricingSection) {
    setSavingId(`sec:${sec.id}`);
    setError('');
    setNotice('');
    try {
      const updated = await api<LivePricingSection>(
        `/admin/pricing/sections/${encodeURIComponent(sec.id)}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            title: sec.title,
            subtitle: sec.subtitle,
            fee_note: sec.fee_note,
            promo_enabled: sec.promo_enabled,
            free_trial_days: Number(sec.free_trial_days) || 0,
            promo_badge: sec.promo_badge,
            cta_label: sec.cta_label,
            cta_href: sec.cta_href,
            meta: sec.meta,
            sort_order: sec.sort_order,
            active: sec.active,
            expected_revision: sec.revision,
          }),
        },
      );
      setSections(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      setNotice(`Published "${updated.title}" (rev #${updated.revision}).`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function saveItem(item: LivePricingItem) {
    setSavingId(`item:${item.id}`);
    setError('');
    setNotice('');
    try {
      const isNonPriced =
        item.billing_interval === 'quote' ||
        item.billing_interval === 'none' ||
        item.item_type === 'faq';
      const parsedPrice = isNonPriced ? null : inrToPaise(priceInputs[item.id] ?? '');
      const parsedMonthly = isNonPriced ? null : inrToPaise(monthlyInputs[item.id] ?? '');
      const updated = await api<LivePricingItem>(
        `/admin/pricing/${encodeURIComponent(item.id)}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            title: item.title,
            subtitle: item.subtitle,
            description: item.description,
            price_paise: parsedPrice,
            monthly_price_paise: parsedMonthly,
            billing_interval: item.billing_interval,
            gst_label: item.gst_label,
            free_trial_enabled: item.free_trial_enabled,
            free_trial_days: Number(item.free_trial_days) || 0,
            promo_badge: item.promo_badge,
            deliverables: item.deliverables ?? [],
            meta: item.meta,
            sort_order: item.sort_order,
            active: item.active,
            expected_revision: item.revision,
          }),
        },
      );
      setItems(prev => prev.map(r => (r.id === updated.id ? updated : r)));
      setPriceInputs(prev => ({...prev, [updated.id]: paiseToInr(updated.price_paise)}));
      setMonthlyInputs(prev => ({
        ...prev,
        [updated.id]: paiseToInr(updated.monthly_price_paise),
      }));
      setNotice(`Published "${updated.title}" (rev #${updated.revision}).`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  const groupSections = useMemo(
    () => sections.filter(s => s.tab_group === group),
    [sections, group],
  );
  const promoSec = sections.find(s => s.id === 'v_ads_promo');

  if (loading) return <Loading />;

  const inputStyle = {
    borderWidth: 1,
    borderColor: border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: subtle,
    color: textPrimary,
    fontSize: 13,
  } as const;

  return (
    <View style={{gap: 14}}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: border,
        }}
      >
        <View>
          <Text style={{fontSize: 11, fontWeight: '700', letterSpacing: 1, color: textSecondary}}>
            LIVE STOREFRONT PRICING DB
          </Text>
          <Text style={{fontSize: 16, fontWeight: '700', color: textPrimary, fontVariant: ['tabular-nums']}}>
            {sections.length} sections · {items.length} rate cards
          </Text>
        </View>
        <Pressable
          onPress={() => void loadPricing()}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: border,
            backgroundColor: surface,
          }}
        >
          <Text style={{fontSize: 12, fontWeight: '600', color: textPrimary}}>Reload</Text>
        </Pressable>
      </View>

      {Boolean(notice) && (
        <View
          style={{
            padding: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#10b981',
            backgroundColor: isDark ? '#064e3b40' : '#ecfdf5',
          }}
        >
          <Text style={{fontSize: 12, fontWeight: '600', color: isDark ? '#6ee7b7' : '#065f46'}}>
            {notice}
          </Text>
        </View>
      )}
      {Boolean(error) && <ErrorPanel error={error} retry={loadPricing} />}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
        {GROUPS.map(g => {
          const active = group === g.id;
          return (
            <Pressable
              key={g.id}
              onPress={() => {
                setGroup(g.id);
                setNotice('');
                setError('');
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: active ? accent : border,
                backgroundColor: active ? accent : surface,
              }}
            >
              <Text style={{fontSize: 12, fontWeight: '600', color: active ? '#ffffff' : textPrimary}}>
                {g.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {group === 'v_ads' && promoSec && (
        <View
          style={{
            backgroundColor: surface,
            borderWidth: 1,
            borderColor: border,
            borderRadius: 12,
            padding: 16,
            gap: 10,
          }}
        >
          <Text style={{fontSize: 11, fontWeight: '700', letterSpacing: 1, color: textSecondary}}>
            HERO & FREE FIRST MONTH PROMO
          </Text>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={{fontSize: 13, fontWeight: '600', color: textPrimary}}>
              Enable ₹0 First Month Promo
            </Text>
            <Switch
              value={promoSec.promo_enabled}
              onValueChange={val =>
                setSections(prev =>
                  prev.map(s => (s.id === promoSec.id ? {...s, promo_enabled: val} : s)),
                )
              }
            />
          </View>
          <TextInput
            value={promoSec.title}
            onChangeText={val =>
              setSections(prev => prev.map(s => (s.id === promoSec.id ? {...s, title: val} : s)))
            }
            placeholder="Hero Headline"
            placeholderTextColor={textSecondary}
            style={inputStyle}
          />
          <View style={{flexDirection: 'row', gap: 8}}>
            <TextInput
              value={String(promoSec.free_trial_days)}
              keyboardType="numeric"
              onChangeText={val =>
                setSections(prev =>
                  prev.map(s =>
                    s.id === promoSec.id ? {...s, free_trial_days: Number(val) || 0} : s,
                  ),
                )
              }
              placeholder="Free days"
              placeholderTextColor={textSecondary}
              style={[inputStyle, {flex: 1, fontVariant: ['tabular-nums']}]}
            />
            <TextInput
              value={promoSec.promo_badge}
              onChangeText={val =>
                setSections(prev =>
                  prev.map(s => (s.id === promoSec.id ? {...s, promo_badge: val} : s)),
                )
              }
              placeholder="Promo badge"
              placeholderTextColor={textSecondary}
              style={[inputStyle, {flex: 2}]}
            />
          </View>
          <Pressable
            disabled={Boolean(savingId)}
            onPress={() => void saveSection(promoSec)}
            style={{
              backgroundColor: accent,
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{color: '#fff', fontSize: 13, fontWeight: '600'}}>
              {savingId === `sec:${promoSec.id}` ? 'Publishing…' : 'Save & Publish Promo Banner'}
            </Text>
          </Pressable>
        </View>
      )}

      {groupSections.map(sec => {
        const secItems = items.filter(i => i.section_id === sec.id);
        return (
          <View key={sec.id} style={{gap: 10}}>
            <Text style={{fontSize: 14, fontWeight: '700', color: textPrimary, marginTop: 4}}>
              {sec.title}
            </Text>
            {secItems.map(item => {
              const isFaq = item.item_type === 'faq';
              const isQuote = item.billing_interval === 'quote';
              return (
                <View
                  key={item.id}
                  style={{
                    backgroundColor: surface,
                    borderWidth: 1,
                    borderColor: border,
                    borderRadius: 12,
                    padding: 14,
                    gap: 10,
                  }}
                >
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: 8}}>
                    <Text style={{fontSize: 14, fontWeight: '600', color: textPrimary, flex: 1}}>
                      {item.title}
                    </Text>
                    {!isFaq && (
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: accent,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {isQuote || item.price_paise === null
                          ? 'Quote'
                          : `${formatPricingMoney(item.price_paise)}/${item.billing_interval}`}
                      </Text>
                    )}
                  </View>

                  <TextInput
                    value={item.title}
                    onChangeText={val =>
                      setItems(prev => prev.map(r => (r.id === item.id ? {...r, title: val} : r)))
                    }
                    placeholder="Title"
                    placeholderTextColor={textSecondary}
                    style={inputStyle}
                  />

                  {isFaq ? (
                    <TextInput
                      value={item.description}
                      multiline
                      onChangeText={val =>
                        setItems(prev =>
                          prev.map(r => (r.id === item.id ? {...r, description: val} : r)),
                        )
                      }
                      placeholder="FAQ Answer"
                      placeholderTextColor={textSecondary}
                      style={[inputStyle, {minHeight: 76}]}
                    />
                  ) : (
                    !isQuote && (
                      <View style={{flexDirection: 'row', gap: 8}}>
                        <View style={{flex: 1, gap: 4}}>
                          <Text style={{fontSize: 11, color: textSecondary}}>Price (INR)</Text>
                          <TextInput
                            value={priceInputs[item.id] ?? ''}
                            keyboardType="numeric"
                            onChangeText={val =>
                              setPriceInputs(prev => ({...prev, [item.id]: val}))
                            }
                            placeholder="INR"
                            placeholderTextColor={textSecondary}
                            style={[inputStyle, {fontVariant: ['tabular-nums']}]}
                          />
                        </View>
                        {item.item_type === 'v_ads_tier' && (
                          <View style={{flex: 1, gap: 4}}>
                            <Text style={{fontSize: 11, color: textSecondary}}>Month 2+ (INR)</Text>
                            <TextInput
                              value={monthlyInputs[item.id] ?? ''}
                              keyboardType="numeric"
                              onChangeText={val =>
                                setMonthlyInputs(prev => ({...prev, [item.id]: val}))
                              }
                              placeholder="30d INR"
                              placeholderTextColor={textSecondary}
                              style={[inputStyle, {fontVariant: ['tabular-nums']}]}
                            />
                          </View>
                        )}
                      </View>
                    )
                  )}

                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                      <Switch
                        value={item.active}
                        onValueChange={val =>
                          setItems(prev =>
                            prev.map(r => (r.id === item.id ? {...r, active: val} : r)),
                          )
                        }
                      />
                      <Text style={{fontSize: 12, color: textSecondary}}>
                        {item.active ? 'Visible' : 'Hidden'}
                      </Text>
                    </View>
                    <Pressable
                      disabled={Boolean(savingId)}
                      onPress={() => void saveItem(item)}
                      style={{
                        backgroundColor: accent,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{color: '#fff', fontSize: 12, fontWeight: '600'}}>
                        {savingId === `item:${item.id}` ? 'Saving…' : 'Save & Publish'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
