import {Text} from './typography';
import {useState,useEffect,useCallback} from 'react';
import {Pressable,View,Alert} from 'react-native';
import {UiText} from './localized-ui';
import {Loading} from './ui';
import {api} from '../lib/api';
import {useTheme} from '../lib/theme';
export {AdminPageEditor as AdminEditVistrahTab} from './admin-page-editor';

export type AdminTheme = {
  heroGradient: readonly [string, string, ...string[]];
  tabActiveGradient: readonly [string, string, ...string[]];
  badgeGradient: readonly [string, string, ...string[]];
  brandChipGradient: readonly [string, string, ...string[]];
  approveGradient: readonly [string, string, ...string[]];
  rejectGradient: readonly [string, string, ...string[]];
  accent: string;
  accentDark: string;
  accentLight: string;
  accentRose: string;
  accentEmerald: string;
  borderLight: string;
  borderDark: string;
  cardLight: string;
  cardDark: string;
  subtleLight: string;
  subtleDark: string;
  textLight: string;
  textDark: string;
  mutedLight: string;
  mutedDark: string;
};

// ============================================================================
// 2. HOMEPAGE EDITOR TAB (Native Layout, Reordering & Publishing)
// ============================================================================
export function AdminHomepageTab({ adminTheme }: { adminTheme: AdminTheme }) {
  const { styles, colors, mode } = useTheme();
  const [draft, setDraft] = useState<any>(null);
  const [templates, setTemplates] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadHomepage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [d, t] = await Promise.all([
        api<any>('/admin/homepage/draft'),
        api<{ templates: Record<string, any> }>('/admin/homepage/templates'),
      ]);
      setDraft(d);
      setTemplates(t.templates || {});
      setDirty(false);
    } catch (e: any) {
      setError(e.message || 'Failed to load homepage draft');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHomepage();
  }, [loadHomepage]);

  function moveSection(index: number, direction: -1 | 1) {
    if (!draft?.layout?.sections) return;
    const to = index + direction;
    if (to < 0 || to >= draft.layout.sections.length) return;
    const next = [...draft.layout.sections];
    const temp = next[index];
    next[index] = next[to];
    next[to] = temp;
    setDraft({ ...draft, layout: { ...draft.layout, sections: next } });
    setDirty(true);
  }

  async function handleSaveDraft() {
    if (!draft || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const saved = await api<any>('/admin/homepage/draft', {
        method: 'PUT',
        body: JSON.stringify({ revision: draft.revision, layout: draft.layout }),
      });
      setDraft(saved);
      setDirty(false);
      setNotice('Homepage draft saved.');
    } catch (e: any) {
      setError(e.message || 'Failed to save draft');
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish() {
    if (!draft || busy) return;
    Alert.alert('Publish Homepage', 'Publish this saved homepage to all website and mobile users?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Publish',
        onPress: async () => {
          setBusy(true);
          setError('');
          try {
            if (dirty) {
              await api('/admin/homepage/draft', {
                method: 'PUT',
                body: JSON.stringify({ revision: draft.revision, layout: draft.layout }),
              });
            }
            const pub = await api<any>('/admin/homepage/publish', {
              method: 'POST',
              body: JSON.stringify({ revision: draft.revision }),
            });
            setDraft(pub);
            setDirty(false);
            setNotice('🎉 Homepage published successfully!');
          } catch (e: any) {
            setError(e.message || 'Failed to publish homepage');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  if (loading) return <Loading />;

  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heading, { fontSize: 18, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight }]}>
            <UiText value={'Homepage Editor'} />
          </Text>
          <Text style={[styles.muted, { fontSize: 12, color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight }]}>
            Revision {draft?.revision || 1} · Published v{draft?.published_version || 'None'}
          </Text>
        </View>
        <Pressable onPress={() => void loadHomepage()} style={{ padding: 6 }}>
          <Text style={{ color: adminTheme.accentLight, fontWeight: '700' }}>Refresh ↺</Text>
        </Pressable>
      </View>

      {Boolean(error) && (
        <View style={{ backgroundColor: '#be123c20', borderColor: '#be123c', borderWidth: 1, padding: 10, borderRadius: 10 }}>
          <Text style={{ color: '#f43f5e', fontSize: 12 }}>{error}</Text>
        </View>
      )}
      {Boolean(notice) && (
        <View style={{ backgroundColor: '#05966920', borderColor: '#059669', borderWidth: 1, padding: 10, borderRadius: 10 }}>
          <Text style={{ color: '#10b981', fontSize: 12 }}>{notice}</Text>
        </View>
      )}

      {/* Action Row */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={() => void handleSaveDraft()}
          disabled={busy || !dirty}
          style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: dirty ? '#3b82f6' : '#64748b', alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Save Draft</Text>
        </Pressable>
        <Pressable
          onPress={() => void handlePublish()}
          disabled={busy}
          style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#16a34a', alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>⚡ Publish Live</Text>
        </Pressable>
      </View>

      {/* Sections List */}
      <View style={{ gap: 10 }}>
        {draft?.layout?.sections?.map((sec: any, idx: number) => (
          <View
            key={sec.id || idx}
            style={[
              styles.card,
              {
                borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight,
                backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight,
                padding: 14,
                gap: 8,
              },
            ]}
          >
            <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.heading, { fontSize: 15, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight }]}>
                  {idx + 1}. {sec.title || 'Untitled Section'}
                </Text>
                <Text style={[styles.muted, { fontSize: 11 }]}>
                  Type: {sec.template} · Size: {sec.size} · {sec.service_ids?.length || 0} services
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pressable onPress={() => moveSection(idx, -1)} disabled={idx === 0} style={{ padding: 6, opacity: idx === 0 ? 0.3 : 1 }}>
                  <Text style={{ color: adminTheme.accentLight, fontWeight: '700' }}>▲</Text>
                </Pressable>
                <Pressable onPress={() => moveSection(idx, 1)} disabled={idx === draft.layout.sections.length - 1} style={{ padding: 6, opacity: idx === draft.layout.sections.length - 1 ? 0.3 : 1 }}>
                  <Text style={{ color: adminTheme.accentLight, fontWeight: '700' }}>▼</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// 3. MEMBERSHIPS & BENEFITS TAB (Native Business Subscribers & Quotas)
// ============================================================================
export function AdminMembershipsTab({ adminTheme }: { adminTheme: AdminTheme }) {
  const { styles, colors, mode } = useTheme();
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMemberships = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api<any[]>('/admin/business-memberships');
      setMemberships(data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load memberships');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMemberships();
  }, [loadMemberships]);

  if (loading) return <Loading />;

  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heading, { fontSize: 18, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight }]}>
            <UiText value={'Memberships & Benefits'} />
          </Text>
          <Text style={[styles.muted, { fontSize: 12, color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight }]}>
            {memberships.length} businesses subscribed
          </Text>
        </View>
        <Pressable onPress={() => void loadMemberships()} style={{ padding: 6 }}>
          <Text style={{ color: adminTheme.accentLight, fontWeight: '700' }}>Refresh ↺</Text>
        </Pressable>
      </View>

      {Boolean(error) && (
        <View style={{ backgroundColor: '#be123c20', borderColor: '#be123c', borderWidth: 1, padding: 10, borderRadius: 10 }}>
          <Text style={{ color: '#f43f5e', fontSize: 12 }}>{error}</Text>
        </View>
      )}

      {!memberships.length ? (
        <View style={[styles.card, { borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight, backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight }]}>
          <Text style={[styles.muted, { color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight }]}>
            No business memberships recorded.
          </Text>
        </View>
      ) : (
        memberships.map((m) => (
          <View
            key={m.id || m.user_id}
            style={[
              styles.card,
              {
                borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight,
                backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight,
                padding: 14,
                gap: 8,
              },
            ]}
          >
            <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
              <Text style={[styles.heading, { fontSize: 15, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight }]}>
                {m.business_name || `Business #${m.user_id}`}
              </Text>
              <View style={{ backgroundColor: '#e5a93c25', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                <Text style={{ color: '#e5a93c', fontWeight: '800', fontSize: 11 }}>{m.tier || 'MEMBER'}</Text>
              </View>
            </View>

            <Text style={[styles.muted, { fontSize: 12 }]}>
              Status: <Text style={{ color: '#22c55e', fontWeight: '700' }}>{m.status || 'ACTIVE'}</Text> · Quota: {m.job_posts_remaining ?? 'Unlimited'} jobs
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

// ============================================================================
// 4. VISTRAH PACKAGES TAB (Official Platform Service Packages)
// ============================================================================
export function AdminVistrahServicesTab({ adminTheme }: { adminTheme: AdminTheme }) {
  const { styles, colors, mode } = useTheme();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPackages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api<{ items: any[] }>('/admin/commerce-listings?operator=VISTRAH');
      setPackages(res.items || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load Vistrah packages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  if (loading) return <Loading />;

  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heading, { fontSize: 18, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight }]}>
            <UiText value={'VISTRAH Platform Packages'} />
          </Text>
          <Text style={[styles.muted, { fontSize: 12, color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight }]}>
            {packages.length} curated service packages
          </Text>
        </View>
        <Pressable onPress={() => void loadPackages()} style={{ padding: 6 }}>
          <Text style={{ color: adminTheme.accentLight, fontWeight: '700' }}>Refresh ↺</Text>
        </Pressable>
      </View>

      {Boolean(error) && (
        <View style={{ backgroundColor: '#be123c20', borderColor: '#be123c', borderWidth: 1, padding: 10, borderRadius: 10 }}>
          <Text style={{ color: '#f43f5e', fontSize: 12 }}>{error}</Text>
        </View>
      )}

      {!packages.length ? (
        <View style={[styles.card, { borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight, backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight }]}>
          <Text style={[styles.muted, { color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight }]}>
            No platform packages created yet.
          </Text>
        </View>
      ) : (
        packages.map((pkg) => (
          <View
            key={pkg.id}
            style={[
              styles.card,
              {
                borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight,
                backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight,
                padding: 14,
                gap: 8,
              },
            ]}
          >
            <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
              <Text style={[styles.heading, { fontSize: 15, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight }]}>
                {pkg.title}
              </Text>
              <View style={{ backgroundColor: '#15803d25', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                <Text style={{ color: '#22c55e', fontWeight: '800', fontSize: 11 }}>{pkg.status}</Text>
              </View>
            </View>

            <Text style={[styles.muted, { fontSize: 12 }]}>
              Price: <Text style={{ color: '#e5a93c', fontWeight: '700' }}>₹{(pkg.unit_price_paise / 100).toFixed(2)}</Text> · Business: {pkg.business}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

