import {UiText} from "../components/localized-ui";
import {useState, useEffect, useCallback, useMemo} from 'react';
import {Pressable, Text, View, ScrollView, ActivityIndicator} from 'react-native';
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
import {adminTaskGroups, adminSummary, type AdminOverview} from '../../../shared/admin-dashboard';
import brandTheme from '../../../shared/brand-theme.json';

const adminTheme = {
  heroGradient: ['#140c26', '#22133e', '#391557', '#4f1a6f'] as const,
  tabActiveGradient: ['#283db6', '#7741c4', '#b63b8d'] as const,
  badgeGradient: ['#283db6', '#7741c4', '#b63b8d'] as const,
  brandChipGradient: ['#283db6', '#7741c4', '#b63b8d'] as const,
  approveGradient: ['#059669', '#10b981'] as const,
  rejectGradient: ['#be123c', '#f43f5e'] as const,
  accent: '#503fbd',
  accentDark: '#352586',
  accentLight: '#7741c4',
  accentRose: '#b63b8d',
  accentEmerald: '#10b981',
  borderLight: '#e4dbf0',
  borderDark: '#392f4e',
  cardLight: '#ffffff',
  cardDark: '#211e2c',
  subtleLight: '#f6f3fc',
  subtleDark: '#161321',
  textLight: '#1a1033',
  textDark: '#f4edff',
  mutedLight: '#655780',
  mutedDark: '#c1b6d0',
};

type AdminTab = 'overview' | 'requests' | 'v-ads' | 'commerce' | 'providers' | 'edit-vistrah' | 'homepage' | 'memberships' | 'vistrah-services' | 'catalogue' | 'audit';

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
    else if (slug === 'v-ads') setActiveTab('v-ads');
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
        <LinearGradient
          colors={accentGradient}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={{padding: 24, borderRadius: 24, gap: 10}}
        >
          <Text style={{color: '#caa5f5', fontSize: 11, fontWeight: '700', letterSpacing: 2}}><UiText value={"VISTRAH CONTROL CENTER"}/></Text>
          <Text style={{color: '#ffffff', fontSize: 24, fontWeight: '700'}}><UiText value={"Administrator sign-in"}/></Text>
          <Text style={{color: '#d8ccf0', fontSize: 13, lineHeight: 19}}><UiText value={"Sign in with your authorized administrator account to access platform controls."}/></Text>
        </LinearGradient>
        <Pressable
          onPress={() => router.push('/auth')}
          style={{
            marginTop: 12,
            backgroundColor: adminTheme.accent,
            paddingVertical: 14,
            borderRadius: 16,
            alignItems: 'center',
          }}
        >
          <Text style={{color: '#fff', fontWeight: '700', fontSize: 15}}><UiText value={"Sign in →"}/></Text>
        </Pressable>
      </Page>
    );
  }
  if (!allowed) {
    return (
      <Page>
        <LinearGradient
          colors={accentGradient}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={{padding: 24, borderRadius: 24, gap: 10}}
        >
          <Text style={{color: '#ef4444', fontSize: 11, fontWeight: '700', letterSpacing: 2}}><UiText value={"ACCESS DENIED"}/></Text>
          <Text style={{color: '#ffffff', fontSize: 22, fontWeight: '700'}}><UiText value={"Administrator access required"}/></Text>
          <Text style={{color: '#d8ccf0', fontSize: 13, lineHeight: 19}}><UiText value={"This customer account cannot access the Vistrah Administration control center."}/></Text>
        </LinearGradient>
      </Page>
    );
  }

  const tabs: Array<{key: AdminTab; label: string; badge?: number}> = [
    {key: 'overview', label: 'Overview'},
    {key: 'requests', label: 'Enquiries', badge: overviewResult.data?.new_requests},
    {key: 'v-ads', label: 'V Ads'},
    {key: 'commerce', label: 'Commerce'},
    {key: 'providers', label: 'Providers'},
    {key: 'edit-vistrah', label: 'Edit Vistrah'},
    {key: 'homepage', label: 'Homepage'},
    {key: 'memberships', label: 'Memberships'},
    {key: 'vistrah-services', label: 'Packages'},
    {key: 'catalogue', label: 'Catalogue'},
    {key: 'audit', label: 'Activity'},
  ];

  return (
    <Page>
      {/* 1. VISTRAH SIGNATURE HERO BANNER */}
      <LinearGradient
        colors={accentGradient}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={{
          borderRadius: 24,
          padding: 24,
          gap: 10,
          position: 'relative',
          overflow: 'hidden',
          shadowColor: '#283db6',
          shadowOffset: {width: 0, height: 8},
          shadowOpacity: 0.28,
          shadowRadius: 18,
          elevation: 6,
        }}
      >
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <LinearGradient
              colors={accentGradient}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={{paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8}}
            >
              <Text style={{color: '#ffffff', fontSize: 10, fontWeight: '800', letterSpacing: 1.2}}><UiText value={"PLATFORM CONTROL"}/></Text>
            </LinearGradient>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <View style={{width: 7, height: 7, borderRadius: 4, backgroundColor: adminTheme.accentEmerald}} />
            <Text style={{color: '#c2b2df', fontSize: 11, fontWeight: '600'}}><UiText value={"Live sync"}/></Text>
          </View>
        </View>

        <Text accessibilityRole="header" style={{color: '#ffffff', fontSize: 24, fontWeight: '800', letterSpacing: -0.3}}>
          <UiText value={"Admin Workspace "}/></Text>
        <Text style={{color: '#d8ccf0', fontSize: 13, lineHeight: 19}}>
          <UiText value={"Moderate V Ads, review customer enquiries, verify providers, and manage platform commerce. "}/></Text>
      </LinearGradient>

      {/* 2. SEGMENTED TAB NAVIGATION */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8, paddingVertical: 4}}>
        {tabs.map(tab => {
          const isSelected = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                setActiveTab(tab.key);
                setActionNotice('');
                setActionError('');
              }}
              style={({pressed}) => [
                {
                  borderRadius: 20,
                  overflow: 'hidden',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {isSelected ? (
                <LinearGradient
                  colors={accentGradient}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    shadowColor: '#7741c4',
                    shadowOffset: {width: 0, height: 4},
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Text style={{fontWeight: '700', color: '#fff', fontSize: 13}}><UiText value={tab.label}/></Text>
                  {Boolean(tab.badge && tab.badge > 0) && (
                    <View style={{backgroundColor: '#fff', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10}}>
                      <Text style={{fontSize: 10, fontWeight: '800', color: adminTheme.accent}}>
                        {tab.badge}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              ) : (
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight,
                    backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Text style={{fontWeight: '600', color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight, fontSize: 13}}><UiText value={tab.label}/></Text>
                  {Boolean(tab.badge && tab.badge > 0) && (
                    <View style={{backgroundColor: adminTheme.accent, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10}}>
                      <Text style={{fontSize: 10, fontWeight: '800', color: '#fff'}}>
                        {tab.badge}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Global Notices */}
      {Boolean(actionNotice) && (
        <View style={[styles.card, {borderColor: '#34d399', backgroundColor: '#064e3b15'}]}>
          <Text style={{color: '#34d399', fontWeight: '700', fontSize: 13}}>✓ {actionNotice}</Text>
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
              {/* Highlight Card: Needs Attention */}
              <View
                style={[
                  styles.card,
                  {
                    borderColor: '#f59e0b',
                    backgroundColor: mode === 'dark' ? '#2c1e0e' : '#fff9ee',
                    position: 'relative',
                    overflow: 'hidden',
                  },
                ]}
              >
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <View style={{backgroundColor: '#f59e0b25', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8}}>
                    <Text style={{color: '#d97706', fontSize: 10, fontWeight: '800', letterSpacing: 1}}>
                      <UiText value={"NEEDS YOUR ATTENTION "}/></Text>
                  </View>
                  <Pressable onPress={overviewResult.retry} style={{padding: 4}}>
                    <Text style={{color: '#d97706', fontSize: 12, fontWeight: '600'}}><UiText value={"Refresh ↺"}/></Text>
                  </Pressable>
                </View>

                <Text accessibilityRole="header" style={[styles.heading, {fontSize: 22, color: mode === 'dark' ? '#fde68a' : '#78350f'}]}>
                  {overviewResult.data.new_requests} <UiText value={"new enquiries "}/></Text>
                <Text style={{color: mode === 'dark' ? '#fcd34d' : '#92400e', fontSize: 13, lineHeight: 18}}>
                  <UiText value={"Customer requirements awaiting review, lead routing, and quotation. "}/></Text>

                <Pressable
                  onPress={() => setActiveTab('requests')}
                  style={{borderRadius: 14, overflow: 'hidden', marginTop: 4}}
                >
                  <LinearGradient
                    colors={accentGradient}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={{paddingVertical: 12, alignItems: 'center', borderRadius: 14}}
                  >
                    <Text style={{color: '#fff', fontWeight: '700', fontSize: 14}}><UiText value={"Review customer enquiries →"}/></Text>
                  </LinearGradient>
                </Pressable>
              </View>

              {/* Stats Grid */}
              <View style={styles.row}>
                {adminSummary.map(item => (
                  <View
                    key={item.key}
                    style={[
                      styles.card,
                      {
                        flexGrow: 1,
                        minWidth: 96,
                        position: 'relative',
                        overflow: 'hidden',
                        borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight,
                        backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight,
                      },
                    ]}
                  >
                    <View style={{position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: adminTheme.accent}} />
                    <Text style={[styles.heading, {fontSize: 24, color: adminTheme.accent}]}>
                      {overviewResult.data![item.key]}
                    </Text>
                    <Text style={[styles.muted, {fontSize: 12, fontWeight: '600', color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight}]}><UiText value={item.label}/></Text>
                  </View>
                ))}
                <View
                  style={[
                    styles.card,
                    {
                      flexGrow: 1,
                      minWidth: 96,
                      position: 'relative',
                      overflow: 'hidden',
                      borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight,
                      backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight,
                    },
                  ]}
                >
                  <View style={{position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: adminTheme.accentEmerald}} />
                  <Text style={[styles.heading, {fontSize: 24, color: adminTheme.accentEmerald}]}>
                    {overviewResult.data.customers}
                  </Text>
                  <Text style={[styles.muted, {fontSize: 12, fontWeight: '600', color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight}]}><UiText value={"Customers"}/></Text>
                </View>
              </View>

              {/* Administrative Workspaces Quick Launch */}
              <Text style={[styles.heading, {fontSize: 17, marginTop: 6, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight}]}><UiText value={"Administrative Hubs"}/></Text>
              <View style={{gap: 10}}>
                {/* V Ads Card */}
                <Pressable
                  onPress={() => setActiveTab('v-ads')}
                  style={({pressed}) => [
                    styles.card,
                    {
                      opacity: pressed ? 0.8 : 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      padding: 16,
                      borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight,
                      backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={accentGradient}
                    style={{width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center'}}
                  >
                    <Text style={{fontSize: 20}}>🎬</Text>
                  </LinearGradient>
                  <View style={{flex: 1}}>
                    <Text style={[styles.heading, {fontSize: 15, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight}]}><UiText value={"V Ads Moderation"}/></Text>
                    <Text style={[styles.muted, {fontSize: 12, color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight}]}><UiText value={"Review video ads, approve advertiser channels & metrics."}/></Text>
                  </View>
                  <Text style={{color: adminTheme.accentLight, fontSize: 16, fontWeight: '700'}}>→</Text>
                </Pressable>

                {/* Edit Vistrah Card */}
                <Pressable
                  onPress={() => setActiveTab('edit-vistrah')}
                  style={({pressed}) => [
                    styles.card,
                    {
                      opacity: pressed ? 0.8 : 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      padding: 16,
                      borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight,
                      backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={accentGradient}
                    style={{width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center'}}
                  >
                    <Text style={{fontSize: 20}}>🎨</Text>
                  </LinearGradient>
                  <View style={{flex: 1}}>
                    <Text style={[styles.heading, {fontSize: 15, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight}]}><UiText value={"Edit Vistrah"}/></Text>
                    <Text style={[styles.muted, {fontSize: 12, color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight}]}><UiText value={"Define sections, variations, features and running photos."}/></Text>
                  </View>
                  <Text style={{color: adminTheme.accentLight, fontSize: 16, fontWeight: '700'}}>→</Text>
                </Pressable>

                {/* Commerce Card */}
                <Pressable
                  onPress={() => setActiveTab('commerce')}
                  style={({pressed}) => [
                    styles.card,
                    {
                      opacity: pressed ? 0.8 : 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      padding: 16,
                      borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight,
                      backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={accentGradient}
                    style={{width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center'}}
                  >
                    <Text style={{fontSize: 20}}>🛍️</Text>
                  </LinearGradient>
                  <View style={{flex: 1}}>
                    <Text style={[styles.heading, {fontSize: 15, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight}]}><UiText value={"Commerce Approvals"}/></Text>
                    <Text style={[styles.muted, {fontSize: 12, color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight}]}><UiText value={"Inspect products & service packages before publication."}/></Text>
                  </View>
                  <Text style={{color: adminTheme.accentLight, fontSize: 16, fontWeight: '700'}}>→</Text>
                </Pressable>

                {/* Providers Card */}
                <Pressable
                  onPress={() => setActiveTab('providers')}
                  style={({pressed}) => [
                    styles.card,
                    {
                      opacity: pressed ? 0.8 : 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      padding: 16,
                      borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight,
                      backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={accentGradient}
                    style={{width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center'}}
                  >
                    <Text style={{fontSize: 20}}>🏢</Text>
                  </LinearGradient>
                  <View style={{flex: 1}}>
                    <Text style={[styles.heading, {fontSize: 15, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight}]}><UiText value={"Provider Verification"}/></Text>
                    <Text style={[styles.muted, {fontSize: 12, color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight}]}><UiText value={"Verify registrations, credential evidence & availability."}/></Text>
                  </View>
                  <Text style={{color: adminTheme.accentRose, fontSize: 16, fontWeight: '700'}}>→</Text>
                </Pressable>

                {/* Audit Card */}
                <Pressable
                  onPress={() => setActiveTab('audit')}
                  style={({pressed}) => [
                    styles.card,
                    {
                      opacity: pressed ? 0.8 : 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      padding: 16,
                      borderColor: mode === 'dark' ? adminTheme.borderDark : adminTheme.borderLight,
                      backgroundColor: mode === 'dark' ? adminTheme.cardDark : adminTheme.cardLight,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={accentGradient}
                    style={{width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center'}}
                  >
                    <Text style={{fontSize: 20}}>📜</Text>
                  </LinearGradient>
                  <View style={{flex: 1}}>
                    <Text style={[styles.heading, {fontSize: 15, color: mode === 'dark' ? adminTheme.textDark : adminTheme.textLight}]}><UiText value={"Activity & Audit Trail"}/></Text>
                    <Text style={[styles.muted, {fontSize: 12, color: mode === 'dark' ? adminTheme.mutedDark : adminTheme.mutedLight}]}><UiText value={"Immutable log of all administrative decisions."}/></Text>
                  </View>
                  <Text style={{color: adminTheme.accentLight, fontSize: 16, fontWeight: '700'}}>→</Text>
                </Pressable>
              </View>

              {/* All Platform Tools Directory */}
              <Text style={[styles.heading, {fontSize: 17, marginTop: 10}]}><UiText value={"All Management Tools"}/></Text>
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
                      <Text style={[styles.heading, {fontSize: 15}]}><UiText value={group.title}/></Text>
                      <Text style={[styles.text, {fontWeight: '700', color: colors.accent}]}>{visible ? '−' : '+'}</Text>
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
                              opacity: pressed ? 0.75 : 1,
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <View style={{flex: 1}}>
                            <Text style={[styles.heading, {fontSize: 14}]}><UiText value={item.label}/></Text>
                            <Text style={[styles.muted, {fontSize: 12}]}><UiText value={item.description}/></Text>
                          </View>
                          <Text style={[styles.text, {color: colors.accent, fontWeight: '700'}]}><UiText value={"Open →"}/></Text>
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
        <AdminEditVistrahTab adminTheme={adminTheme} />
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
    </Page>
  );
}
