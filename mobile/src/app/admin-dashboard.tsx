import {Text} from '../components/typography';
import {UiText} from "../components/localized-ui";
import {useState, useEffect, useCallback, useMemo} from 'react';
import {Pressable,View,ScrollView,ActivityIndicator} from 'react-native';
import {router} from 'expo-router';
import {LinearGradient} from 'expo-linear-gradient';
import {useVideoPlayer, VideoView} from 'expo-video';
import {Page, Loading, ErrorPanel} from '../components/ui';
import {useSession} from '../lib/session';
import {useResource} from '../lib/resource';
import {useTheme} from '../lib/theme';
import {api} from '../lib/api';
import {toPlayableUrl} from '../lib/v-ads';
import {AdminEditVistrahTab, AdminHomepageTab, AdminMembershipsTab, AdminVistrahServicesTab} from '../components/admin-manage-tabs';
import {AdminPricingTab} from '../components/admin-pricing-tab';
import {adminTaskGroups, adminSummary, type AdminOverview} from '../../../shared/admin-dashboard';
import brandTheme from '../../../shared/brand-theme.json';

const adminTheme = {
  heroGradient: ['#0f172a', '#1e293b', '#173f35', '#173f35'] as const,
  tabActiveGradient: ['#173f35', '#173f35', '#1e4d40'] as const,
  badgeGradient: ['#173f35', '#173f35', '#1e4d40'] as const,
  brandChipGradient: ['#173f35', '#173f35', '#1e4d40'] as const,
  approveGradient: ['#059669', '#10b981'] as const,
  rejectGradient: ['#be123c', '#f43f5e'] as const,
  accent: '#173f35',
  accentDark: '#0f2d25',
  accentLight: '#10b981',
  accentRose: '#b91c1c',
  accentEmerald: '#10b981',
  borderLight: '#e2e8f0',
  borderDark: '#334155',
  cardLight: '#ffffff',
  cardDark: '#1e293b',
  subtleLight: '#f8fafc',
  subtleDark: '#0f172a',
  textLight: '#0f172a',
  textDark: '#f8fafc',
  mutedLight: '#475569',
  mutedDark: '#94a3b8',
};

type AdminTab = 'overview' | 'requests' | 'v-ads' | 'commerce' | 'providers' | 'pricing' | 'edit-vistrah' | 'homepage' | 'memberships' | 'vistrah-services' | 'catalogue' | 'audit';

type RequestItem = {
  id: number;
  service_title: string;
  requirements: string;
  location?: string;
  phone?: string;
  status: string;
  created_at: string;
  customer?: string;
  service_id?: number;
};

type VideoItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  views: number;
  likes: number;
  comments: number;
  preview_available: boolean;
  video_url?: string;
  media_upload_id?: string | null;
  advertiser: {
    id: string;
    name: string;
    handle: string;
    status: string;
  };
};

function AdminVideoPlayer({video}: {video: VideoItem}) {
  const {mode} = useTheme();
  const videoUrl = video.video_url || (video.preview_available ? `/admin/v-ads/videos/${encodeURIComponent(video.id)}/preview` : '');
  const url = useMemo(() => toPlayableUrl(videoUrl), [videoUrl]);
  const player = useVideoPlayer(url || null, p => {
    if (!p) return;
    p.loop = false;
    p.muted = false;
  });

  if (!url) {
    return (
      <View
        style={{
          width: '100%',
          height: 160,
          borderRadius: 14,
          backgroundColor: mode === 'dark' ? '#181228' : '#f6f3fc',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          borderWidth: 1,
          borderColor: mode === 'dark' ? '#392f4e' : '#e4dbf0',
        }}
      >
        <Text style={{color: mode === 'dark' ? '#caa5f5' : '#7741c4', fontSize: 13, fontWeight: '600'}}>
          <UiText value={video.preview_available ? 'Preview stream loading…' : 'Video media not uploaded'}/>
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        width: '100%',
        height: 220,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#000',
        borderWidth: 1,
        borderColor: mode === 'dark' ? '#392f4e' : '#e4dbf0',
      }}
    >
      <VideoView
        player={player}
        style={{width: '100%', height: '100%'}}
        contentFit="contain"
        nativeControls={true}
        fullscreenOptions={{enable: true}}
      />
    </View>
  );
}

type AdvertiserItem = {
  id: string;
  name: string;
  handle: string;
  description: string;
  status: string;
  review_token?: string;
  owner_id?: number;
};

type CommerceItem = {
  id: string;
  title: string;
  business: string;
  kind: string;
  unit_price_paise: number;
  description: string;
  status: string;
  revision: number;
};

type ProviderItem = {
  id: number;
  company: string;
  name: string;
  location: string;
  phone?: string;
  email?: string;
  verification_status: string;
  active: boolean;
};

type AuditItem = {
  id: number;
  action: string;
  entity: string;
  entity_id: string;
  actor_id: number;
  created_at: string;
  details?: Record<string, unknown>;
};

type CategoryItem = {
  id: number;
  title: string;
  services: Array<{id: number; title: string; active: boolean}>;
};

export default function AdminDashboard() {
  const {user, ready} = useSession();
  const {styles, colors, mode, accentGradient} = useTheme();
  const allowed = ready && user?.role==='ADMIN';
  const overviewResult = useResource<AdminOverview>(allowed ? '/admin/overview' : null, allowed ? user.id : null);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState('');
  const [actionError, setActionError] = useState('');

  // Tab Data States
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [requestFilter, setRequestFilter] = useState('ALL');
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [vAdsSubTab, setVAdsSubTab] = useState<'videos' | 'advertisers'>('videos');
  const [vAdsStatus, setVAdsStatus] = useState('PENDING');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [advertisers, setAdvertisers] = useState<AdvertiserItem[]>([]);
  const [loadingVAds, setLoadingVAds] = useState(false);

  const [commerceStatus, setCommerceStatus] = useState('SUBMITTED');
  const [commerceListings, setCommerceListings] = useState<CommerceItem[]>([]);
  const [loadingCommerce, setLoadingCommerce] = useState(false);

  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [loadingProviders, setLoadingProviders] = useState(false);

  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Loaders
  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    setActionError('');
    try {
      const data = await api<RequestItem[]>('/admin/requests');
      setRequests(data);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  const loadVAds = useCallback(async () => {
    setLoadingVAds(true);
    setActionError('');
    try {
      if (vAdsSubTab === 'videos') {
        const res = await api<{items: VideoItem[]}>('/admin/v-ads/videos?status=' + encodeURIComponent(vAdsStatus));
        setVideos(res.items || []);
      } else {
        const res = await api<{items: AdvertiserItem[]}>('/admin/v-ads/advertisers?status=' + encodeURIComponent(vAdsStatus));
        setAdvertisers(res.items || []);
      }
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setLoadingVAds(false);
    }
  }, [vAdsSubTab, vAdsStatus]);

  const loadCommerce = useCallback(async () => {
    setLoadingCommerce(true);
    setActionError('');
    try {
      const res = await api<{items: CommerceItem[]}>('/admin/commerce-listings?status=' + encodeURIComponent(commerceStatus));
      setCommerceListings(res.items || []);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setLoadingCommerce(false);
    }
  }, [commerceStatus]);

  const loadProviders = useCallback(async () => {
    setLoadingProviders(true);
    setActionError('');
    try {
      const data = await api<ProviderItem[]>('/admin/providers');
      setProviders(data);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setLoadingProviders(false);
    }
  }, []);

  const loadAudits = useCallback(async () => {
    setLoadingAudits(true);
    setActionError('');
    try {
      const res = await api<{items: AuditItem[]}>('/admin/audit?page=1');
      setAudits(res.items || []);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setLoadingAudits(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    setActionError('');
    try {
      const data = await api<CategoryItem[]>('/admin/catalogue');
      setCategories(data);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // Trigger loads when tab changes
  useEffect(() => {
    if(!allowed)return;
    if (activeTab === 'requests') void loadRequests();
    else if (activeTab === 'v-ads') void loadVAds();
    else if (activeTab === 'commerce') void loadCommerce();
    else if (activeTab === 'providers') void loadProviders();
    else if (activeTab === 'audit') void loadAudits();
    else if (activeTab === 'catalogue') void loadCategories();
  }, [activeTab, allowed, loadRequests, loadVAds, loadCommerce, loadProviders, loadAudits, loadCategories]);

  // Request status mutation
  async function updateRequestStatus(id: number, status: string) {
    setBusyAction(`request-${id}`);
    setActionError('');
    setActionNotice('');
    try {
      await api(`/admin/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({status}),
      });
      setActionNotice(`Request #${id} marked ${status.replace('_', ' ')}.`);
      await loadRequests();
      overviewResult.retry();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  // V Ads Video review
  async function reviewVideo(id: string, status: 'APPROVED' | 'REJECTED') {
    setBusyAction(`video-${id}`);
    setActionError('');
    setActionNotice('');
    try {
      await api(`/admin/v-ads/videos/${encodeURIComponent(id)}/review`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          reason: status === 'APPROVED' ? 'Video approved by administrator.' : 'Content guidelines not met.',
        }),
      });
      setActionNotice(`Video ad #${id.slice(0, 8)} ${status.toLowerCase()}.`);
      await loadVAds();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  // V Ads Video remove
  async function removeVideo(id: string, currentStatus: string) {
    setBusyAction(`video-${id}`);
    setActionError('');
    setActionNotice('');
    try {
      await api(`/admin/v-ads/videos/${encodeURIComponent(id)}/remove`, {
        method: 'POST',
        body: JSON.stringify({
          expected_status: currentStatus,
          reason: 'Removed by administrator.',
        }),
      });
      setActionNotice(`Video ad #${id.slice(0, 8)} removed.`);
      await loadVAds();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  // V Ads Advertiser review
  async function reviewAdvertiser(row: AdvertiserItem, status: 'APPROVED' | 'REJECTED') {
    setBusyAction(`advertiser-${row.id}`);
    setActionError('');
    setActionNotice('');
    try {
      await api(`/admin/v-ads/advertisers/${encodeURIComponent(row.id)}/review`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          reason: status === 'APPROVED' ? 'Verified legitimate business seller profile.' : 'Account details require verification.',
          expected_revision: row.review_token,
        }),
      });
      setActionNotice(`Advertiser @${row.handle} ${status.toLowerCase()}.`);
      await loadVAds();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  // Commerce review
  async function reviewCommerce(row: CommerceItem, status: 'APPROVED' | 'REJECTED') {
    setBusyAction(`commerce-${row.id}`);
    setActionError('');
    setActionNotice('');
    try {
      await api(`/admin/commerce-listings/${encodeURIComponent(row.id)}/review`, {
        method: 'POST',
        body: JSON.stringify({
          revision: row.revision,
          status,
          reason: status === 'APPROVED' ? 'Listing approved by administrator.' : 'Listing requires revisions.',
          order_terms_acknowledged: true,
        }),
      });
      setActionNotice(`Listing "${row.title}" ${status.toLowerCase()}.`);
      await loadCommerce();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  // Provider verification
  async function verifyProvider(id: number, status: 'VERIFIED' | 'REJECTED') {
    setBusyAction(`provider-${id}`);
    setActionError('');
    setActionNotice('');
    try {
      await api(`/admin/providers/${id}/verification`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          evidence: status === 'VERIFIED' ? 'Verified official business credentials and contact.' : 'Business credentials rejected.',
        }),
      });
      setActionNotice(`Provider #${id} verification status: ${status}.`);
      await loadProviders();
      overviewResult.retry();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  // Provider active toggle
  async function toggleProviderActive(id: number, active: boolean) {
    setBusyAction(`provider-${id}`);
    setActionError('');
    setActionNotice('');
    try {
      await api(`/admin/providers/${id}/active`, {
        method: 'PATCH',
        body: JSON.stringify({active}),
      });
      setActionNotice(`Provider #${id} ${active ? 'activated' : 'deactivated'}.`);
      await loadProviders();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  // Map task group slug to Tab
  function handleTaskGroupClick(slug: string) {
    if(!allowed)return;
    if (slug === 'requests') setActiveTab('requests');
    else if (slug === 'moderation' || slug === 'v-ads') setActiveTab('v-ads');
    else if (slug === 'pricing') setActiveTab('pricing');
    else if (slug === 'commerce-listings' || slug === 'commerce-orders') setActiveTab('commerce');
    else if (slug === 'providers' || slug === 'provider-services') setActiveTab('providers');
    else if (slug === 'provider-applications') router.push('/provider-applications');
    else if (slug === 'ownership-claims') router.push('/seller/ownership');
    else if (slug === 'employer-jobs') router.push('/employer-jobs');
    else if (slug === 'publication-drafts') setActiveTab('commerce');
    else if (slug === 'audit') setActiveTab('audit');
    else if (slug === 'catalogue' || slug === 'offers') setActiveTab('catalogue');
    else if (slug === 'edit-vistrah') setActiveTab('edit-vistrah');
    else if (slug === 'homepage') setActiveTab('homepage');
    else if (slug === 'memberships') setActiveTab('memberships');
    else if (slug === 'vistrah-services') setActiveTab('vistrah-services');
    else if (slug === 'payments') router.push('/payments');
    else {
      setActiveTab('overview');
    }
  }

  if (!ready) return <Page><Loading /></Page>;
  if (!user) {
    return (
      <Page>
        <View
          style={{
            padding: 20,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight,
            backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight,
            gap: 8,
          }}
        >
          <Text style={{color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight, fontSize: 11, fontWeight: '700', letterSpacing: 1.4}}><UiText value={"EDITORIAL ADMIN"}/></Text>
          <Text style={{color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight, fontSize: 22, fontWeight: '700'}}><UiText value={"Administrator sign-in"}/></Text>
          <Text style={{color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight, fontSize: 13, lineHeight: 19}}><UiText value={"Sign in with your authorized administrator account to access platform controls."}/></Text>
        </View>
        <Pressable
          onPress={() => router.push('/auth')}
          style={{
            marginTop: 12,
            backgroundColor: adminTheme.accent,
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: 'center',
          }}
        >
          <Text style={{color: '#fff', fontWeight: '600', fontSize: 14}}><UiText value={"Sign in →"}/></Text>
        </Pressable>
      </Page>
    );
  }
  if (!allowed) {
    return (
      <Page>
        <View
          style={{
            padding: 20,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight,
            backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight,
            gap: 8,
          }}
        >
          <Text style={{color: '#dc2626', fontSize: 11, fontWeight: '700', letterSpacing: 1.4}}><UiText value={"ACCESS DENIED"}/></Text>
          <Text style={{color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight, fontSize: 20, fontWeight: '700'}}><UiText value={"Administrator access required"}/></Text>
          <Text style={{color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight, fontSize: 13, lineHeight: 19}}><UiText value={"This customer account cannot access the Vistrah Administration control center."}/></Text>
        </View>
      </Page>
    );
  }

  const primaryDestinations: Array<{
    key: 'overview' | 'moderation' | 'pricing' | 'homepage' | 'audit';
    label: string;
    defaultTab: AdminTab;
    matches: AdminTab[];
    badge?: number;
  }> = [
    {key: 'overview', label: 'Overview', defaultTab: 'overview', matches: ['overview']},
    {
      key: 'moderation',
      label: 'V Ads & Sellers',
      defaultTab: 'v-ads',
      matches: ['v-ads', 'providers', 'requests', 'commerce'],
      badge: (overviewResult.data?.pending_v_ads ?? 0) + (overviewResult.data?.new_requests ?? 0),
    },
    {
      key: 'pricing',
      label: 'Pricing',
      defaultTab: 'pricing',
      matches: ['pricing', 'memberships', 'vistrah-services'],
    },
    {
      key: 'homepage',
      label: 'Homepage',
      defaultTab: 'homepage',
      matches: ['homepage', 'edit-vistrah', 'catalogue'],
    },
    {key: 'audit', label: 'Audit & Health', defaultTab: 'audit', matches: ['audit']},
  ];

  const activePrimary =
    primaryDestinations.find(d => d.matches.includes(activeTab)) ?? primaryDestinations[0];

  const subTabsByGroup: Record<string, Array<{key: AdminTab; label: string; badge?: number}>> = {
    moderation: [
      {key: 'v-ads', label: 'V Ads', badge: overviewResult.data?.pending_v_ads},
      {key: 'providers', label: 'Sellers', badge: overviewResult.data?.pending_sellers},
      {key: 'requests', label: 'Enquiries', badge: overviewResult.data?.new_requests},
      {key: 'commerce', label: 'Commerce'},
    ],
    pricing: [
      {key: 'pricing', label: 'Pricing Editor'},
      {key: 'memberships', label: 'Memberships'},
      {key: 'vistrah-services', label: 'Packages'},
    ],
    homepage: [
      {key: 'homepage', label: 'Homepage Layout'},
      {key: 'edit-vistrah', label: 'Edit Vistrah (CMS)'},
      {key: 'catalogue', label: 'Catalogue'},
    ],
  };

  const currentSubTabs = subTabsByGroup[activePrimary.key] ?? [];
  const activeAccent = mode === 'dark' ? '#10b981' : '#173f35';
  const surfaceBg = mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight;
  const borderCol = mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight;
  const textPri = mode === 'dark' ? adminTheme.textDark : adminTheme.textLight;
  const textSec = mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight;

  return (
    <Page>
      {/* 1. CLEAN EDITORIAL ADMIN HEADER */}
      <View
        style={{
          borderRadius: 12,
          padding: 18,
          gap: 6,
          backgroundColor: surfaceBg,
          borderWidth: 1,
          borderColor: borderCol,
        }}
      >
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <Text style={{color: textSec, fontSize: 11, fontWeight: '700', letterSpacing: 1.3}}>
            <UiText value={"EDITORIAL ADMIN · CONTROL CENTER"}/>
          </Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <View style={{width: 7, height: 7, borderRadius: 4, backgroundColor: adminTheme.accentEmerald}} />
            <Text style={{color: textSec, fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums']}}>
              {overviewResult.data?.payment_mode ?? 'SANDBOX'}
            </Text>
          </View>
        </View>

        <Text accessibilityRole="header" style={{color: textPri, fontSize: 22, fontWeight: '700', letterSpacing: -0.4}}>
          <UiText value={activePrimary.label}/>
        </Text>
        <Text style={{color: textSec, fontSize: 13, lineHeight: 19}}>
          <UiText value={"Live platform KPIs, V Ads & seller moderation, live Pricing Editor, homepage publishing, and DPDP audit logs."}/>
        </Text>
      </View>

      {/* 2. 5-DESTINATION PRIMARY RAIL */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8, paddingVertical: 2}}>
        {primaryDestinations.map(dest => {
          const isSelected = activePrimary.key === dest.key;
          return (
            <Pressable
              key={dest.key}
              onPress={() => {
                setActiveTab(dest.defaultTab);
                setActionNotice('');
                setActionError('');
              }}
              style={({pressed}) => [
                {
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: isSelected ? activeAccent : borderCol,
                  backgroundColor: isSelected ? activeAccent : surfaceBg,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={{fontWeight: '600', color: isSelected ? '#ffffff' : textPri, fontSize: 13}}>
                <UiText value={dest.label}/>
              </Text>
              {Boolean(dest.badge && dest.badge > 0) && (
                <View
                  style={{
                    backgroundColor: isSelected ? '#ffffff' : '#ecf5f1',
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 999,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: '#173f35',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {dest.badge}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Optional Sub-Segment Bar for V Ads & Sellers / Pricing / Homepage */}
      {currentSubTabs.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 6}}>
          {currentSubTabs.map(sub => {
            const active = activeTab === sub.key;
            return (
              <Pressable
                key={sub.key}
                onPress={() => {
                  setActiveTab(sub.key);
                  setActionNotice('');
                  setActionError('');
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: active ? textPri : borderCol,
                  backgroundColor: active ? (mode === 'dark' ? '#334155' : '#f1f5f9') : 'transparent',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text style={{fontSize: 12, fontWeight: active ? '700' : '500', color: textPri}}>
                  {sub.label}
                </Text>
                {Boolean(sub.badge && sub.badge > 0) && (
                  <Text style={{fontSize: 11, fontWeight: '700', color: activeAccent, fontVariant: ['tabular-nums']}}>
                    {sub.badge}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Global Notices */}
      {Boolean(actionNotice) && (
        <View style={[styles.card, {borderColor: '#34d399', backgroundColor: '#064e3b15', borderRadius: 8}]}>
          <Text style={{color: '#10b981', fontWeight: '600', fontSize: 13}}>✓ {actionNotice}</Text>
        </View>
      )}
      {Boolean(actionError) && <ErrorPanel error={actionError} />}

      {/* 3. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <View style={{gap: 16}}>
          {overviewResult.loading ? (
            <Loading />
          ) : overviewResult.error ? (
            <ErrorPanel error={overviewResult.error} retry={overviewResult.retry} />
          ) : overviewResult.data ? (
            <>
              {/* Live Tabular-Nums 4-KPI Strip */}
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10}}>
                {[
                  {
                    label: 'Pending V Ads',
                    value: String(overviewResult.data.pending_v_ads ?? 0),
                    sub: `${overviewResult.data.pending_videos ?? 0} reels · ${overviewResult.data.pending_targeting ?? 0} spatial`,
                    target: 'v-ads' as AdminTab,
                  },
                  {
                    label: 'Active Sellers',
                    value: String(overviewResult.data.active_sellers ?? overviewResult.data.providers),
                    sub: `${overviewResult.data.providers} total · ${overviewResult.data.pending_sellers ?? 0} pending`,
                    target: 'providers' as AdminTab,
                  },
                  {
                    label: 'Verified Users',
                    value: String(overviewResult.data.verified_users ?? overviewResult.data.customers),
                    sub: `${overviewResult.data.dpdp_consented_users ?? 0} DPDP consented`,
                    target: 'audit' as AdminTab,
                  },
                  {
                    label: 'Payment Mode',
                    value: String(overviewResult.data.payment_mode ?? 'SANDBOX'),
                    sub: `${overviewResult.data.payments} ledger entries`,
                    target: 'pricing' as AdminTab,
                  },
                ].map(kpi => (
                  <Pressable
                    key={kpi.label}
                    onPress={() => setActiveTab(kpi.target)}
                    style={{
                      flexGrow: 1,
                      minWidth: 150,
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: borderCol,
                      backgroundColor: surfaceBg,
                      gap: 4,
                    }}
                  >
                    <Text style={{fontSize: 11, fontWeight: '600', color: textSec}}>{kpi.label}</Text>
                    <Text style={{fontSize: 22, fontWeight: '700', color: textPri, fontVariant: ['tabular-nums']}}>
                      {kpi.value}
                    </Text>
                    <Text style={{fontSize: 11, color: textSec, fontVariant: ['tabular-nums']}}>
                      {kpi.sub}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Needs Review Now Actionable Queue */}
              <View
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: borderCol,
                  backgroundColor: surfaceBg,
                  padding: 16,
                  gap: 10,
                }}
              >
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <View>
                    <Text style={{fontSize: 10, fontWeight: '700', letterSpacing: 1, color: textSec}}>
                      ACTIONABLE QUEUE
                    </Text>
                    <Text style={{fontSize: 16, fontWeight: '700', color: textPri}}>Needs Review Now</Text>
                  </View>
                  <Pressable onPress={overviewResult.retry} style={{padding: 4}}>
                    <Text style={{color: activeAccent, fontSize: 12, fontWeight: '600'}}>Refresh ↺</Text>
                  </Pressable>
                </View>

                {(overviewResult.data.needs_review ?? []).filter(q => q.count > 0).length > 0 ? (
                  (overviewResult.data.needs_review ?? [])
                    .filter(q => q.count > 0)
                    .map(q => (
                      <Pressable
                        key={q.id}
                        onPress={() => {
                          if (q.id.includes('v-ads')) setActiveTab('v-ads');
                          else if (q.id.includes('seller')) setActiveTab('providers');
                          else setActiveTab('requests');
                        }}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingVertical: 10,
                          borderTopWidth: 1,
                          borderTopColor: borderCol,
                          gap: 10,
                        }}
                      >
                        <View style={{flex: 1, gap: 2}}>
                          <Text style={{fontSize: 13, fontWeight: '600', color: textPri}}>{q.label}</Text>
                          <Text style={{fontSize: 12, color: textSec}}>{q.detail}</Text>
                        </View>
                        <Text style={{fontSize: 13, fontWeight: '700', color: activeAccent, fontVariant: ['tabular-nums']}}>
                          {q.count} →
                        </Text>
                      </Pressable>
                    ))
                ) : (
                  <Text style={{fontSize: 13, color: textSec}}>
                    All moderation and onboarding queues are currently clear.
                  </Text>
                )}
              </View>

              {/* Quick Editorial Destinations */}
              <View style={{gap: 8}}>
                {[
                  {tab: 'pricing' as AdminTab, title: 'Pricing Editor (Live DB)', desc: 'Edit V Ads First-Month-Free promo, km rates, Studio pillars & FAQs.'},
                  {tab: 'v-ads' as AdminTab, title: 'V Ads & Sellers Moderation', desc: 'Approve reels, spatial revisions, advertiser channels & sellers.'},
                  {tab: 'homepage' as AdminTab, title: 'Homepage & Edit Vistrah', desc: 'Publish editorial sections across desktop and mobile web.'},
                  {tab: 'audit' as AdminTab, title: 'Audit & Health', desc: 'Inspect immutable admin decisions and DPDP compliance records.'},
                ].map(card => (
                  <Pressable
                    key={card.tab}
                    onPress={() => setActiveTab(card.tab)}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: borderCol,
                      backgroundColor: surfaceBg,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <View style={{flex: 1, gap: 2}}>
                      <Text style={{fontSize: 14, fontWeight: '600', color: textPri}}>{card.title}</Text>
                      <Text style={{fontSize: 12, color: textSec}}>{card.desc}</Text>
                    </View>
                    <Text style={{fontSize: 14, fontWeight: '700', color: activeAccent}}>→</Text>
                  </Pressable>
                ))}
              </View>

              {/* All Platform Tools Directory */}
              <Text style={[styles.heading, {fontSize: 16, marginTop: 6}]}><UiText value={"All Platform Controls"}/></Text>
              {adminTaskGroups.map(group => {
                const visible = !group.collapsed || expandedGroups.includes(group.title);
                return (
                  <View key={group.title} style={{gap: 8}}>
                    <Pressable
                      onPress={() =>
                        setExpandedGroups(prev =>
                          visible ? prev.filter(t => t !== group.title) : [...prev, group.title]
                        )
                      }
                      style={[styles.row, {justifyContent: 'space-between', paddingVertical: 6}]}
                    >
                      <Text style={[styles.heading, {fontSize: 14}]}><UiText value={group.title}/></Text>
                      <Text style={[styles.text, {fontWeight: '700', color: activeAccent}]}>{visible ? '−' : '+'}</Text>
                    </Pressable>
                    {visible &&
                      group.items.map(item => (
                        <Pressable
                          key={item.slug}
                          onPress={() => handleTaskGroupClick(item.slug)}
                          style={({pressed}) => [
                            styles.card,
                            {
                              padding: 14,
                              borderRadius: 12,
                              opacity: pressed ? 0.75 : 1,
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderColor: borderCol,
                              backgroundColor: surfaceBg,
                            },
                          ]}
                        >
                          <View style={{flex: 1}}>
                            <Text style={[styles.heading, {fontSize: 14}]}><UiText value={item.label}/></Text>
                            <Text style={[styles.muted, {fontSize: 12}]}><UiText value={item.description}/></Text>
                          </View>
                          <Text style={[styles.text, {color: activeAccent, fontWeight: '600'}]}><UiText value={"Open →"}/></Text>
                        </Pressable>
                      ))}
                  </View>
                );
              })}
            </>
          ) : null}
        </View>
      )}

      {/* 4. ENQUIRIES / REQUESTS TAB */}
      {activeTab === 'requests' && (
        <View style={{gap: 12}}>
          <View style={[styles.row, {justifyContent: 'space-between', alignItems: 'center'}]}>
            <Text style={[styles.heading, {fontSize: 18}]}><UiText value={"Customer Enquiries"}/></Text>
            <Pressable onPress={loadRequests} style={{padding: 6}}>
              <Text style={{color: colors.accent, fontWeight: '700'}}><UiText value={"Refresh ↺"}/></Text>
            </Pressable>
          </View>

          {/* Status Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 6}}>
            {['ALL', 'NEW', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(status => {
              const active = requestFilter === status;
              return (
                <Pressable
                  key={status}
                  onPress={() => setRequestFilter(status)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: active ? adminTheme.accent : (mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight),
                    backgroundColor: active ? adminTheme.accent : (mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight),
                  }}
                >
                  <Text style={{color: active ? '#fff' : (mode === 'dark' ? adminTheme.textDark : adminTheme.textLight), fontSize: 12, fontWeight: '700'}}>
                    {status.replace('_', ' ')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loadingRequests ? (
            <Loading />
          ) : (
            (() => {
              const filtered = requestFilter === 'ALL' ? requests : requests.filter(r => r.status === requestFilter);
              if (!filtered.length) {
                return (
                  <View style={styles.card}>
                    <Text style={styles.muted}><UiText value={"No enquiries found matching \""}/>{requestFilter}".</Text>
                  </View>
                );
              }
              return filtered.map(req => {
                const isBusy = busyAction === `request-${req.id}`;
                const statusColor =
                  req.status === 'NEW'
                    ? '#f59e0b'
                    : req.status === 'UNDER_REVIEW'
                    ? '#3b82f6'
                    : req.status === 'ASSIGNED'
                    ? '#8b5cf6'
                    : req.status === 'IN_PROGRESS'
                    ? '#06b6d4'
                    : req.status === 'COMPLETED'
                    ? '#10b981'
                    : '#9ca3af';

                return (
                  <View key={req.id} style={[styles.card, {gap: 10, borderColor: colors.border}]}>
                    <View style={[styles.row, {justifyContent: 'space-between', alignItems: 'center'}]}>
                      <Text style={[styles.heading, {fontSize: 15, flex: 1}]}>
                        #{req.id} · {req.service_title}
                      </Text>
                      <View style={{backgroundColor: statusColor + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: statusColor + '40'}}>
                        <Text style={{color: statusColor, fontSize: 11, fontWeight: '800'}}>
                          {req.status.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>

                    {Boolean(req.customer) && (
                      <Text style={{color: colors.text, fontSize: 13, fontWeight: '600'}}><UiText value={"Customer: "}/>{req.customer}</Text>
                    )}
                    <Text style={[styles.text, {fontSize: 13, lineHeight: 18}]}>{req.requirements || 'No extra requirements specified.'}</Text>
                    <Text style={[styles.muted, {fontSize: 11}]}><UiText value={"Submitted: "}/>{new Date(req.created_at).toLocaleString()}</Text>

                    {/* Action Transitions */}
                    <View style={[styles.row, {gap: 8, marginTop: 4}]}>
                      {isBusy ? (
                        <ActivityIndicator color={colors.accent} size="small" />
                      ) : (
                        <>
                          {req.status === 'NEW' && (
                            <>
                              <Pressable
                                onPress={() => updateRequestStatus(req.id, 'UNDER_REVIEW')}
                                style={{borderRadius: 12, overflow: 'hidden'}}
                              >
                                <LinearGradient
                                  colors={accentGradient}
                                  style={{paddingVertical: 9, paddingHorizontal: 16}}
                                >
                                  <Text style={{color: '#fff', fontWeight: '700', fontSize: 12}}><UiText value={"Start review"}/></Text>
                                </LinearGradient>
                              </Pressable>
                              <Pressable
                                onPress={() => updateRequestStatus(req.id, 'CANCELLED')}
                                style={[styles.card, {paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12}]}
                              >
                                <Text style={{color: colors.muted, fontWeight: '600', fontSize: 12}}><UiText value={"Cancel"}/></Text>
                              </Pressable>
                            </>
                          )}
                          {req.status === 'UNDER_REVIEW' && (
                            <>
                              <Pressable
                                onPress={() => updateRequestStatus(req.id, 'ASSIGNED')}
                                style={{borderRadius: 12, overflow: 'hidden'}}
                              >
                                <LinearGradient
                                  colors={accentGradient}
                                  style={{paddingVertical: 9, paddingHorizontal: 16}}
                                >
                                  <Text style={{color: '#fff', fontWeight: '700', fontSize: 12}}><UiText value={"Mark assigned"}/></Text>
                                </LinearGradient>
                              </Pressable>
                              <Pressable
                                onPress={() => updateRequestStatus(req.id, 'CANCELLED')}
                                style={[styles.card, {paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12}]}
                              >
                                <Text style={{color: colors.muted, fontWeight: '600', fontSize: 12}}><UiText value={"Cancel"}/></Text>
                              </Pressable>
                            </>
                          )}
                          {req.status === 'ASSIGNED' && (
                            <>
                              <Pressable
                                onPress={() => updateRequestStatus(req.id, 'IN_PROGRESS')}
                                style={{borderRadius: 12, overflow: 'hidden'}}
                              >
                                <LinearGradient
                                  colors={accentGradient}
                                  style={{paddingVertical: 9, paddingHorizontal: 16}}
                                >
                                  <Text style={{color: '#fff', fontWeight: '700', fontSize: 12}}><UiText value={"Start work"}/></Text>
                                </LinearGradient>
                              </Pressable>
                              <Pressable
                                onPress={() => updateRequestStatus(req.id, 'UNDER_REVIEW')}
                                style={[styles.card, {paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12}]}
                              >
                                <Text style={{color: colors.text, fontWeight: '600', fontSize: 12}}><UiText value={"Back to review"}/></Text>
                              </Pressable>
                            </>
                          )}
                          {req.status === 'IN_PROGRESS' && (
                            <>
                              <Pressable
                                onPress={() => updateRequestStatus(req.id, 'COMPLETED')}
                                style={{borderRadius: 12, overflow: 'hidden'}}
                              >
                                <LinearGradient
                                  colors={adminTheme.approveGradient}
                                  style={{paddingVertical: 9, paddingHorizontal: 16}}
                                >
                                  <Text style={{color: '#fff', fontWeight: '700', fontSize: 12}}><UiText value={"✓ Complete"}/></Text>
                                </LinearGradient>
                              </Pressable>
                              <Pressable
                                onPress={() => updateRequestStatus(req.id, 'CANCELLED')}
                                style={[styles.card, {paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12}]}
                              >
                                <Text style={{color: colors.muted, fontWeight: '600', fontSize: 12}}><UiText value={"Cancel"}/></Text>
                              </Pressable>
                            </>
                          )}
                        </>
                      )}
                    </View>
                  </View>
                );
              });
            })()
          )}
        </View>
      )}

      {/* 5. V ADS MODERATION TAB */}
      {activeTab === 'v-ads' && (
        <View style={{gap: 12}}>
          <View style={[styles.row, {justifyContent: 'space-between', alignItems: 'center'}]}>
            <Text style={[styles.heading, {fontSize: 18}]}><UiText value={"V Ads Moderation"}/></Text>
            <Pressable onPress={loadVAds} style={{padding: 6}}>
              <Text style={{color: colors.accent, fontWeight: '700'}}><UiText value={"Refresh ↺"}/></Text>
            </Pressable>
          </View>

          {/* Sub-tab toggle */}
          <View style={[styles.row, {backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight, padding: 4, borderRadius: 16, borderWidth: 1, borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight}]}>
            <Pressable
              onPress={() => setVAdsSubTab('videos')}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: 12,
                alignItems: 'center',
                backgroundColor: vAdsSubTab === 'videos' ? adminTheme.accent : 'transparent',
              }}
            >
              <Text style={{color: vAdsSubTab === 'videos' ? '#fff' : (mode === 'dark' ? adminTheme.textDark : adminTheme.textLight), fontWeight: '700', fontSize: 13}}>
                <UiText value={"Video Ads "}/></Text>
            </Pressable>
            <Pressable
              onPress={() => setVAdsSubTab('advertisers')}
              style={{
                flex: 1,
                paddingVertical: 9,
                borderRadius: 12,
                alignItems: 'center',
                backgroundColor: vAdsSubTab === 'advertisers' ? adminTheme.accent : 'transparent',
              }}
            >
              <Text style={{color: vAdsSubTab === 'advertisers' ? '#fff' : (mode === 'dark' ? adminTheme.textDark : adminTheme.textLight), fontWeight: '700', fontSize: 13}}>
                <UiText value={"Advertiser Channels "}/></Text>
            </Pressable>
          </View>

          {/* Status filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 6}}>
            {(vAdsSubTab === 'videos'
              ? ['PENDING', 'APPROVED', 'REJECTED', 'REMOVED']
              : ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']
            ).map(st => {
              const active = vAdsStatus === st;
              return (
                <Pressable
                  key={st}
                  onPress={() => setVAdsStatus(st)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: active ? adminTheme.accent : (mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight),
                    backgroundColor: active ? adminTheme.accent : (mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight),
                  }}
                >
                  <Text style={{color: active ? '#fff' : (mode === 'dark' ? adminTheme.textDark : adminTheme.textLight), fontSize: 12, fontWeight: '700'}}>
                    {st}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loadingVAds ? (
            <Loading />
          ) : vAdsSubTab === 'videos' ? (
            !videos.length ? (
              <View style={[styles.card, {borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight, backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight}]}>
                <Text style={[styles.muted, {color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight}]}><UiText value={"No video ads in "}/>{vAdsStatus.toLowerCase()} <UiText value={"queue."}/></Text>
              </View>
            ) : (
              videos.map(vid => {
                const isBusy = busyAction === `video-${vid.id}`;
                return (
                  <View key={vid.id} style={[styles.card, {gap: 12, borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight, backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight, borderWidth: 1, borderRadius: 18}]}>
                    <View style={[styles.row, {justifyContent: 'space-between', alignItems: 'center'}]}>
                      <Text style={[styles.heading, {fontSize: 16, flex: 1, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight}]}>{vid.title}</Text>
                      <View style={{
                        backgroundColor: vid.status === 'APPROVED' ? '#e6f7f0' : vid.status === 'PENDING' ? '#fef3c7' : '#fee2e2',
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: vid.status === 'APPROVED' ? '#bbf0db' : vid.status === 'PENDING' ? '#fde68a' : '#fecaca',
                      }}>
                        <Text style={{
                          color: vid.status === 'APPROVED' ? '#065f46' : vid.status === 'PENDING' ? '#92400e' : '#991b1b',
                          fontSize: 11,
                          fontWeight: '700',
                        }}>
                          {vid.status}
                        </Text>
                      </View>
                    </View>

                    {/* Spotlight Channel Badge */}
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                      <LinearGradient
                        colors={accentGradient}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                        style={{paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8}}
                      >
                        <Text style={{color: '#fff', fontSize: 10, fontWeight: '800'}}>
                          ▷ {vid.advertiser?.name || 'VISTRAH'}
                        </Text>
                      </LinearGradient>
                      <Text style={[styles.muted, {fontSize: 12, color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight}]}>@{vid.advertiser?.handle}</Text>
                    </View>

                    {/* Real Video Player Component */}
                    <AdminVideoPlayer video={vid} />

                    <Text style={[styles.text, {fontSize: 13, lineHeight: 18, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight}]}>{vid.description || 'No caption provided.'}</Text>
                    <Text style={[styles.muted, {fontSize: 11, color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight}]}>
                      {vid.views} <UiText value={"views · "}/>{vid.likes} <UiText value={"likes · "}/>{vid.comments} <UiText value={"comments "}/></Text>

                    {/* Action buttons */}
                    <View style={[styles.row, {gap: 8, marginTop: 4}]}>
                      {isBusy ? (
                        <ActivityIndicator color={adminTheme.accentEmerald} size="small" />
                      ) : (
                        <>
                          {vid.status === 'PENDING' && (
                            <>
                              <Pressable
                                onPress={() => reviewVideo(vid.id, 'APPROVED')}
                                style={{borderRadius: 12, overflow: 'hidden'}}
                              >
                                <LinearGradient
                                  colors={[adminTheme.approveGradient[0], adminTheme.approveGradient[1]]}
                                  style={{paddingVertical: 9, paddingHorizontal: 16}}
                                >
                                  <Text style={{color: '#fff', fontWeight: '700', fontSize: 12}}><UiText value={"✓ Approve ad"}/></Text>
                                </LinearGradient>
                              </Pressable>
                              <Pressable
                                onPress={() => reviewVideo(vid.id, 'REJECTED')}
                                style={{borderRadius: 12, overflow: 'hidden'}}
                              >
                                <LinearGradient
                                  colors={[adminTheme.rejectGradient[0], adminTheme.rejectGradient[1]]}
                                  style={{paddingVertical: 9, paddingHorizontal: 16}}
                                >
                                  <Text style={{color: '#fff', fontWeight: '700', fontSize: 12}}><UiText value={"✕ Reject"}/></Text>
                                </LinearGradient>
                              </Pressable>
                            </>
                          )}
                          {vid.status !== 'REMOVED' && vid.status !== 'PENDING' && (
                            <Pressable
                              onPress={() => removeVideo(vid.id, vid.status)}
                              style={[styles.card, {paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12, borderColor: '#fca5a5'}]}
                            >
                              <Text style={{color: '#ef4444', fontWeight: '700', fontSize: 12}}><UiText value={"Remove ad"}/></Text>
                            </Pressable>
                          )}
                        </>
                      )}
                    </View>
                  </View>
                );
              })
            )
          ) : !advertisers.length ? (
            <View style={styles.card}>
              <Text style={styles.muted}><UiText value={"No advertiser accounts in "}/>{vAdsStatus.toLowerCase()} <UiText value={"queue."}/></Text>
            </View>
          ) : (
            advertisers.map(acc => {
              const isBusy = busyAction === `advertiser-${acc.id}`;
              return (
                <View key={acc.id} style={[styles.card, {gap: 10, borderColor: colors.border}]}>
                  <View style={[styles.row, {justifyContent: 'space-between', alignItems: 'center'}]}>
                    <Text style={[styles.heading, {fontSize: 16}]}>{acc.name}</Text>
                    <Text style={{color: colors.accent, fontWeight: '700', fontSize: 12}}>@{acc.handle}</Text>
                  </View>
                  <Text style={[styles.text, {fontSize: 13, lineHeight: 18}]}>{acc.description || 'No business description provided.'}</Text>

                  {/* Actions */}
                  <View style={[styles.row, {gap: 8, marginTop: 4}]}>
                    {isBusy ? (
                      <ActivityIndicator color={colors.accent} size="small" />
                    ) : (
                      acc.status === 'PENDING' && (
                        <>
                          <Pressable
                            onPress={() => reviewAdvertiser(acc, 'APPROVED')}
                            style={{borderRadius: 12, overflow: 'hidden'}}
                          >
                            <LinearGradient
                              colors={[adminTheme.approveGradient[0], adminTheme.approveGradient[1]]}
                              style={{paddingVertical: 9, paddingHorizontal: 16}}
                            >
                              <Text style={{color: '#fff', fontWeight: '700', fontSize: 12}}><UiText value={"✓ Approve channel"}/></Text>
                            </LinearGradient>
                          </Pressable>
                          <Pressable
                            onPress={() => reviewAdvertiser(acc, 'REJECTED')}
                            style={{borderRadius: 12, overflow: 'hidden'}}
                          >
                            <LinearGradient
                              colors={[adminTheme.rejectGradient[0], adminTheme.rejectGradient[1]]}
                              style={{paddingVertical: 9, paddingHorizontal: 16}}
                            >
                              <Text style={{color: '#fff', fontWeight: '700', fontSize: 12}}><UiText value={"✕ Reject"}/></Text>
                            </LinearGradient>
                          </Pressable>
                        </>
                      )
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* 6. COMMERCE TAB */}
      {activeTab === 'commerce' && (
        <View style={{gap: 12}}>
          <View style={[styles.row, {justifyContent: 'space-between', alignItems: 'center'}]}>
            <Text style={[styles.heading, {fontSize: 18}]}><UiText value={"Commerce Listings"}/></Text>
            <Pressable onPress={loadCommerce} style={{padding: 6}}>
              <Text style={{color: colors.accent, fontWeight: '700'}}><UiText value={"Refresh ↺"}/></Text>
            </Pressable>
          </View>

          {/* Status filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 6}}>
            {['SUBMITTED', 'APPROVED', 'REJECTED'].map(st => {
              const active = commerceStatus === st;
              return (
                <Pressable
                  key={st}
                  onPress={() => setCommerceStatus(st)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: active ? adminTheme.accent : (mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight),
                    backgroundColor: active ? adminTheme.accent : (mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight),
                  }}
                >
                  <Text style={{color: active ? '#fff' : (mode === 'dark' ? adminTheme.textDark : adminTheme.textLight), fontSize: 12, fontWeight: '700'}}>
                    {st}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loadingCommerce ? (
            <Loading />
          ) : !commerceListings.length ? (
            <View style={[styles.card, {borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight, backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight}]}>
              <Text style={[styles.muted, {color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight}]}><UiText value={"No listings awaiting review in "}/>{commerceStatus.toLowerCase()}.</Text>
            </View>
          ) : (
            commerceListings.map(item => {
              const isBusy = busyAction === `commerce-${item.id}`;
              return (
                <View key={item.id} style={[styles.card, {gap: 10, borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight, backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight, borderWidth: 1, borderRadius: 18}]}>
                  <View style={[styles.row, {justifyContent: 'space-between', alignItems: 'center'}]}>
                    <Text style={[styles.heading, {fontSize: 16, flex: 1, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight}]}><UiText value={item.title}/></Text>
                    <Text style={{fontSize: 17, fontWeight: '800', color: adminTheme.accentEmerald}}>
                      ₹{(item.unit_price_paise / 100).toFixed(2)}
                    </Text>
                  </View>
                  <Text style={[styles.muted, {fontSize: 12, color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight}]}>{item.business} · {item.kind}</Text>
                  <Text style={[styles.text, {fontSize: 13, lineHeight: 18, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight}]}><UiText value={item.description}/></Text>

                  {/* Actions */}
                  <View style={[styles.row, {gap: 8, marginTop: 4}]}>
                    {isBusy ? (
                      <ActivityIndicator color={adminTheme.accentEmerald} size="small" />
                    ) : (
                      item.status === 'SUBMITTED' && (
                        <>
                          <Pressable
                            onPress={() => reviewCommerce(item, 'APPROVED')}
                            style={{borderRadius: 12, overflow: 'hidden'}}
                          >
                            <LinearGradient
                              colors={adminTheme.approveGradient}
                              style={{paddingVertical: 9, paddingHorizontal: 16}}
                            >
                              <Text style={{color: '#fff', fontWeight: '700', fontSize: 12}}><UiText value={"✓ Approve listing"}/></Text>
                            </LinearGradient>
                          </Pressable>
                          <Pressable
                            onPress={() => reviewCommerce(item, 'REJECTED')}
                            style={{borderRadius: 12, overflow: 'hidden'}}
                          >
                            <LinearGradient
                              colors={adminTheme.rejectGradient}
                              style={{paddingVertical: 9, paddingHorizontal: 16}}
                            >
                              <Text style={{color: '#fff', fontWeight: '700', fontSize: 12}}><UiText value={"✕ Reject"}/></Text>
                            </LinearGradient>
                          </Pressable>
                        </>
                      )
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* 7. PROVIDERS TAB */}
      {activeTab === 'providers' && (
        <View style={{gap: 12}}>
          <View style={[styles.row, {justifyContent: 'space-between', alignItems: 'center'}]}>
            <Text style={[styles.heading, {fontSize: 18}]}><UiText value={"Providers & Businesses"}/></Text>
            <Pressable onPress={loadProviders} style={{padding: 6}}>
              <Text style={{color: colors.accent, fontWeight: '700'}}><UiText value={"Refresh ↺"}/></Text>
            </Pressable>
          </View>

          {/* Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 6}}>
            {['ALL', 'PENDING', 'VERIFIED'].map(st => {
              const active = providerFilter === st;
              return (
                <Pressable
                  key={st}
                  onPress={() => setProviderFilter(st)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: active ? adminTheme.accent : (mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight),
                    backgroundColor: active ? adminTheme.accent : (mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight),
                  }}
                >
                  <Text style={{color: active ? '#fff' : (mode === 'dark' ? adminTheme.textDark : adminTheme.textLight), fontSize: 12, fontWeight: '700'}}>
                    <UiText value={st === 'ALL' ? 'All Businesses' : st}/>
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {loadingProviders ? (
            <Loading />
          ) : (
            (() => {
              const filtered =
                providerFilter === 'ALL'
                  ? providers
                  : providers.filter(p => p.verification_status === providerFilter);

              if (!filtered.length) {
                return (
                  <View style={[styles.card, {borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight, backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight}]}>
                    <Text style={[styles.muted, {color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight}]}><UiText value={"No providers found matching this filter."}/></Text>
                  </View>
                );
              }

              return filtered.map(prov => {
                const isBusy = busyAction === `provider-${prov.id}`;
                return (
                  <View key={prov.id} style={[styles.card, {gap: 10, borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight, backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight, borderWidth: 1, borderRadius: 18}]}>
                    <View style={[styles.row, {justifyContent: 'space-between', alignItems: 'center'}]}>
                      <Text style={[styles.heading, {fontSize: 16, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight}]}>{prov.company}</Text>
                      <View
                        style={{
                          backgroundColor: prov.verification_status === 'VERIFIED' ? '#e6f7f0' : '#fef3c7',
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: prov.verification_status === 'VERIFIED' ? '#bbf0db' : '#fde68a',
                        }}
                      >
                        <Text
                          style={{
                            color: prov.verification_status === 'VERIFIED' ? '#065f46' : '#92400e',
                            fontSize: 11,
                            fontWeight: '800',
                          }}
                        >
                          {prov.verification_status}
                        </Text>
                      </View>
                    </View>

                    <Text style={{color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight, fontSize: 13}}>
                      <UiText value={"Contact: "}/>{prov.name} <UiText value={"· Location: "}/>{prov.location}
                    </Text>
                    {Boolean(prov.phone || prov.email) && (
                      <Text style={[styles.muted, {fontSize: 12, color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight}]}>
                        {[prov.phone, prov.email].filter(Boolean).join(' · ')}
                      </Text>
                    )}

                    {/* Actions */}
                    <View style={[styles.row, {gap: 8, marginTop: 4}]}>
                      {isBusy ? (
                        <ActivityIndicator color={adminTheme.accentEmerald} size="small" />
                      ) : (
                        <>
                          {prov.verification_status === 'PENDING' && (
                            <>
                              <Pressable
                                onPress={() => verifyProvider(prov.id, 'VERIFIED')}
                                style={{borderRadius: 12, overflow: 'hidden'}}
                              >
                                <LinearGradient
                                  colors={adminTheme.approveGradient}
                                  style={{paddingVertical: 9, paddingHorizontal: 16}}
                                >
                                  <Text style={{color: '#fff', fontWeight: '700', fontSize: 12}}><UiText value={"✓ Verify provider"}/></Text>
                                </LinearGradient>
                              </Pressable>
                              <Pressable
                                onPress={() => verifyProvider(prov.id, 'REJECTED')}
                                style={{borderRadius: 12, overflow: 'hidden'}}
                              >
                                <LinearGradient
                                  colors={adminTheme.rejectGradient}
                                  style={{paddingVertical: 9, paddingHorizontal: 16}}
                                >
                                  <Text style={{color: '#fff', fontWeight: '700', fontSize: 12}}><UiText value={"✕ Reject"}/></Text>
                                </LinearGradient>
                              </Pressable>
                            </>
                          )}
                          <Pressable
                            onPress={() => toggleProviderActive(prov.id, !prov.active)}
                            style={[styles.card, {paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12}]}
                          >
                            <Text style={{color: colors.text, fontWeight: '700', fontSize: 12}}>
                              <UiText value={prov.active ? 'Deactivate' : 'Activate'}/>
                            </Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>
                );
              });
            })()
          )}
        </View>
      )}

      {/* 8. ACTIVITY / AUDIT TAB */}
      {activeTab === 'audit' && (
        <View style={{gap: 12}}>
          <View style={[styles.row, {justifyContent: 'space-between', alignItems: 'center'}]}>
            <Text style={[styles.heading, {fontSize: 18}]}><UiText value={"Activity & Audit Trail"}/></Text>
            <Pressable onPress={loadAudits} style={{padding: 6}}>
              <Text style={{color: colors.accent, fontWeight: '700'}}><UiText value={"Refresh ↺"}/></Text>
            </Pressable>
          </View>

          {loadingAudits ? (
            <Loading />
          ) : !audits.length ? (
            <View style={[styles.card, {borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight, backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight}]}>
              <Text style={[styles.muted, {color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight}]}><UiText value={"No activity recorded yet."}/></Text>
            </View>
          ) : (
            audits.map(item => (
              <View key={item.id} style={[styles.card, {gap: 8, borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight, backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight, borderWidth: 1, borderRadius: 18}]}>
                <View style={[styles.row, {justifyContent: 'space-between', alignItems: 'center'}]}>
                  <View style={{backgroundColor: adminTheme.accent + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8}}>
                    <Text style={{color: adminTheme.accentLight, fontSize: 11, fontWeight: '800'}}>
                      {item.action.replace(/_/g, ' ')}
                    </Text>
                  </View>
                  <Text style={[styles.muted, {fontSize: 11, color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight}]}><UiText value={"Actor #"}/>{item.actor_id}</Text>
                </View>
                <Text style={{color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight, fontSize: 13, fontWeight: '600'}}>
                  <UiText value={"Entity: "}/>{item.entity} #{item.entity_id}
                </Text>
                {Boolean(item.details) && (
                  <Text style={[styles.muted, {fontSize: 12, fontFamily: 'monospace', color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight}]}>
                    {JSON.stringify(item.details)}
                  </Text>
                )}
                <Text style={[styles.muted, {fontSize: 10, color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight}]}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </View>
      )}

      {/* 9. CATALOGUE TAB */}
      {activeTab === 'catalogue' && (
        <View style={{gap: 12}}>
          <View style={[styles.row, {justifyContent: 'space-between', alignItems: 'center'}]}>
            <Text style={[styles.heading, {fontSize: 18}]}><UiText value={"Service Catalogue"}/></Text>
            <Pressable onPress={loadCategories} style={{padding: 6}}>
              <Text style={{color: adminTheme.accentLight, fontWeight: '700'}}><UiText value={"Refresh ↺"}/></Text>
            </Pressable>
          </View>

          {loadingCategories ? (
            <Loading />
          ) : !categories.length ? (
            <View style={[styles.card, {borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight, backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight}]}>
              <Text style={[styles.muted, {color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight}]}><UiText value={"No catalogue services recorded."}/></Text>
            </View>
          ) : (
            categories.map(cat => (
              <View key={cat.id} style={[styles.card, {gap: 10, borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight, backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight, borderWidth: 1, borderRadius: 18}]}>
                <Text style={[styles.heading, {fontSize: 16, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight}]}>{cat.title}</Text>
                <Text style={[styles.muted, {fontSize: 12, color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight}]}>
                  {cat.services?.length || 0} <UiText value={"services registered under this category. "}/></Text>
                <View style={{gap: 4}}>
                  {cat.services?.map(srv => (
                    <Text key={srv.id} style={[styles.text, {fontSize: 13, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight}]}>
                      • {srv.title} <UiText value={srv.active ? '' : '(Inactive)'}/>
                    </Text>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      )}
      {/* 10. EDIT VISTRAH TAB */}
      {activeTab === 'edit-vistrah' && (
        <AdminEditVistrahTab />
      )}

      {/* 11. HOMEPAGE TAB */}
      {activeTab === 'homepage' && (
        <AdminHomepageTab adminTheme={adminTheme} />
      )}

      {/* 12. MEMBERSHIPS TAB */}
      {activeTab === 'memberships' && (
        <AdminMembershipsTab adminTheme={adminTheme} />
      )}

      {/* 13. VISTRAH SERVICES TAB */}
      {activeTab === 'vistrah-services' && (
        <AdminVistrahServicesTab adminTheme={adminTheme} />
      )}

      {/* 14. LIVE PRICING EDITOR TAB */}
      {activeTab === 'pricing' && (
        <AdminPricingTab />
      )}
    </Page>
  );
}
