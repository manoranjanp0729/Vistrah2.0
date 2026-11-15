'use client';
import Link from 'next/link';
import {useRouter,useSearchParams} from 'next/navigation';
import {Suspense,useCallback,useEffect,useState} from 'react';
import {
  CheckCircle2,
  ExternalLink,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import {api,date} from '@/lib/api';
import {useUser} from './customer';
import {Notice,Status} from './ui';
import {adminVAdsClient} from '../../shared/v-ads-management';

const vAdsClient = adminVAdsClient(api);

type HubTab = 'pending' | 'all' | 'sellers' | 'users';

type ConsentSummary = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  seller_enabled: boolean;
  privacy_policy_version: string | null;
  privacy_consented_at: string | null;
  marketing_consent: boolean;
  marketing_consented_at: string | null;
  seller_terms_version: string | null;
  seller_consented_at: string | null;
  deleted_at: string | null;
  created_at: string | null;
};

type SpatialRevision = {
  id: string;
  rule_id: string;
  video_id: string;
  revision: number;
  latitude: number;
  longitude: number;
  radius_km: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED';
  created_at: string | null;
  reviewed_at: string | null;
  reviewed_by: number | null;
};

type VAdsItem = {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED';
  created_at: string | null;
  published_at: string | null;
  preview_available: boolean;
  media_upload_id: string | null;
  video_url: string;
  views: number;
  likes: number;
  comments: number;
  advertiser: {
    id: string;
    name: string;
    handle: string;
    description: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
    owner_id: number | null;
    review_token?: string;
    created_at?: string;
  };
  owner_id: number | null;
  owner: ConsentSummary | null;
  active_targeting: SpatialRevision | null;
  pending_targeting: SpatialRevision | null;
  targeting_revisions: SpatialRevision[];
  audit_history: {
    id: number;
    actor_id: number | null;
    action: string;
    entity: string;
    created_at: string | null;
    details: Record<string, unknown>;
  }[];
};

type StandaloneAdvertiser = {
  id: string;
  name: string;
  handle: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  owner_id: number | null;
  review_token?: string;
  created_at?: string;
  owner: ConsentSummary | null;
};

type SellerItem = {
  id: number;
  name: string;
  company: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  location: string;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'INACTIVE';
  active: boolean;
  owner_user_id: number | null;
  service_ids: number[];
  owner: ConsentSummary | null;
  v_ads_channels: {id: string; name: string; handle: string; status: string}[];
  created_at?: string;
};

type UserItem = ConsentSummary & {
  businesses_count: number;
  v_ads_channels_count: number;
};

type DrawerSelection =
  | {kind: 'v_ad'; id: string}
  | {kind: 'advertiser'; id: string}
  | {kind: 'seller'; id: number}
  | {kind: 'user'; id: number}
  | null;

const REASON_PRESETS = [
  'Verified compliant local business V Ad and targeting.',
  'Approved verified seller profile and spatial radius.',
  'Rejected: content or business verification incomplete.',
];

const SELLER_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['VERIFIED', 'REJECTED', 'INACTIVE'],
  VERIFIED: ['PENDING', 'INACTIVE', 'REJECTED'],
  REJECTED: ['PENDING', 'INACTIVE'],
  INACTIVE: ['PENDING'],
};

function DpdpConsentCard({consent, label = 'Data Principal Consent (DPDP Act 2023)'}: {consent: ConsentSummary | null; label?: string}) {
  if (!consent) {
    return (
      <div className="editorial-drawer-block">
        <p className="eyebrow">{label}</p>
        <p className="editorial-muted">No linked user principal on this record.</p>
      </div>
    );
  }
  return (
    <div className="editorial-drawer-block">
      <div className="editorial-drawer-block-head">
        <p className="eyebrow">{label}</p>
        <span className="editorial-chip tabular-nums">User #{consent.id} · {consent.role}</span>
      </div>
      <dl className="editorial-kv-grid">
        <div>
          <dt>Principal</dt>
          <dd>{consent.name} ({consent.email})</dd>
        </div>
        <div>
          <dt>Account Status</dt>
          <dd>
            {consent.deleted_at ? (
              <span className="editorial-pill-warn tabular-nums">Anonymized ({date(consent.deleted_at)})</span>
            ) : (
              <span className="editorial-pill-ok">Active Principal</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Privacy Policy Version</dt>
          <dd className="tabular-nums">{consent.privacy_policy_version || 'Legacy (Pre-025)'}</dd>
        </div>
        <div>
          <dt>Privacy Consented At</dt>
          <dd className="tabular-nums">{consent.privacy_consented_at ? date(consent.privacy_consented_at) : 'Not recorded'}</dd>
        </div>
        <div>
          <dt>Seller Terms</dt>
          <dd className="tabular-nums">
            {consent.seller_terms_version
              ? `${consent.seller_terms_version} (${consent.seller_consented_at ? date(consent.seller_consented_at) : 'recorded'})`
              : consent.seller_enabled
              ? 'Enabled'
              : 'Customer only'}
          </dd>
        </div>
        <div>
          <dt>Marketing / V Ads Opt-In</dt>
          <dd className="tabular-nums">
            {consent.marketing_consent
              ? `Opted in${consent.marketing_consented_at ? ` · ${date(consent.marketing_consented_at)}` : ''}`
              : 'Opted out'}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function ModerationHubInner() {
  const {user} = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: HubTab =
    rawTab === 'all' || rawTab === 'sellers' || rawTab === 'users' ? rawTab : 'pending';

  const [queryInput, setQueryInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [vAdsStatusFilter, setVAdsStatusFilter] = useState<'all' | 'approved' | 'rejected' | 'removed'>('all');
  const [sellerStatusFilter, setSellerStatusFilter] = useState<string>('');
  const [userSegment, setUserSegment] = useState<'all' | 'sellers' | 'consented' | 'anonymized'>('all');
  const [page, setPage] = useState(1);

  const [vAdsItems, setVAdsItems] = useState<VAdsItem[]>([]);
  const [standaloneAdvs, setStandaloneAdvs] = useState<StandaloneAdvertiser[]>([]);
  const [sellers, setSellers] = useState<SellerItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [selected, setSelected] = useState<DrawerSelection>(null);
  const [reasonText, setReasonText] = useState(REASON_PRESETS[0]);
  const [sellerEvidence, setSellerEvidence] = useState(
    'Verified business profile, category fit, and contact details by admin.',
  );

  const switchTab = (next: HubTab) => {
    setSelected(null);
    setPage(1);
    setError('');
    setNotice('');
    router.replace(`/admin/moderation?tab=${next}`, {scroll: false});
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'pending' || activeTab === 'all') {
        const scope = activeTab === 'pending' ? 'pending' : vAdsStatusFilter;
        const res = await api<{
          items: VAdsItem[];
          standalone_pending_advertisers: StandaloneAdvertiser[];
          page: number;
          has_more: boolean;
        }>(
          `/admin/moderation/v-ads?scope=${encodeURIComponent(scope)}&q=${encodeURIComponent(
            appliedQuery,
          )}&page=${page}`,
        );
        setVAdsItems(res.items);
        setStandaloneAdvs(res.standalone_pending_advertisers || []);
        setHasMore(res.has_more);
        setTotalCount(res.items.length + (res.standalone_pending_advertisers?.length || 0));
      } else if (activeTab === 'sellers') {
        const res = await api<{
          items: SellerItem[];
          total: number;
          page: number;
          has_more: boolean;
        }>(
          `/admin/moderation/sellers?status=${encodeURIComponent(
            sellerStatusFilter,
          )}&q=${encodeURIComponent(appliedQuery)}&page=${page}`,
        );
        setSellers(res.items);
        setTotalCount(res.total);
        setHasMore(res.has_more);
      } else {
        const res = await api<{
          items: UserItem[];
          total: number;
          page: number;
          has_more: boolean;
        }>(
          `/admin/moderation/users?segment=${encodeURIComponent(
            userSegment,
          )}&q=${encodeURIComponent(appliedQuery)}&page=${page}`,
        );
        setUsers(res.items);
        setTotalCount(res.total);
        setHasMore(res.has_more);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, vAdsStatusFilter, sellerStatusFilter, userSegment, appliedQuery, page]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelected(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const selectedVAd =
    selected?.kind === 'v_ad' ? vAdsItems.find(v => v.id === selected.id) ?? null : null;
  const selectedAdv =
    selected?.kind === 'advertiser'
      ? standaloneAdvs.find(a => a.id === selected.id) ?? null
      : null;
  const selectedSeller =
    selected?.kind === 'seller' ? sellers.find(s => s.id === selected.id) ?? null : null;
  const selectedUser =
    selected?.kind === 'user' ? users.find(u => u.id === selected.id) ?? null : null;

  async function runAction(fn: () => Promise<unknown>, successMessage: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(successMessage);
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="editorial-hub">
      {/* Segmented Tabs + Quick Sub-Workflow Links */}
      <div className="editorial-hub-bar">
        <div className="editorial-segmented" role="tablist" aria-label="Moderation views">
          {(
            [
              {id: 'pending', label: 'Pending V Ads'},
              {id: 'all', label: 'All V Ads'},
              {id: 'sellers', label: 'Sellers'},
              {id: 'users', label: 'Users'},
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => switchTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="editorial-sublinks">
          <Link href="/admin/v-ads">V Ads Analytics</Link>
          <Link href="/admin/publication-drafts">Publication Drafts</Link>
          <Link href="/admin/provider-applications">Applications</Link>
          <Link href="/admin/providers">Add / Edit Seller</Link>
        </div>
      </div>

      {/* Filter & Search Hairline Strip */}
      <div className="editorial-filter-row">
        <form
          className="editorial-search-form"
          onSubmit={e => {
            e.preventDefault();
            setAppliedQuery(queryInput.trim());
            setPage(1);
          }}
        >
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            value={queryInput}
            onChange={e => setQueryInput(e.target.value)}
            placeholder={
              activeTab === 'sellers'
                ? 'Search company, city, email, slug…'
                : activeTab === 'users'
                ? 'Search name, email, phone…'
                : 'Search reel title, @handle, advertiser…'
            }
            aria-label="Search moderation records"
          />
          <button type="submit" className="button secondary">
            Search
          </button>
          {appliedQuery && (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setQueryInput('');
                setAppliedQuery('');
                setPage(1);
              }}
            >
              Clear
            </button>
          )}
        </form>

        <div className="editorial-filter-pills">
          {activeTab === 'all' &&
            (['all', 'approved', 'rejected', 'removed'] as const).map(st => (
              <button
                key={st}
                type="button"
                className={vAdsStatusFilter === st ? 'editorial-chip active' : 'editorial-chip'}
                onClick={() => {
                  setVAdsStatusFilter(st);
                  setPage(1);
                }}
              >
                {st === 'all' ? 'All statuses' : st.toUpperCase()}
              </button>
            ))}

          {activeTab === 'sellers' &&
            (['', 'PENDING', 'VERIFIED', 'REJECTED', 'INACTIVE'] as const).map(st => (
              <button
                key={st || 'ALL'}
                type="button"
                className={sellerStatusFilter === st ? 'editorial-chip active' : 'editorial-chip'}
                onClick={() => {
                  setSellerStatusFilter(st);
                  setPage(1);
                }}
              >
                {st || 'All sellers'}
              </button>
            ))}

          {activeTab === 'users' &&
            (
              [
                {id: 'all', label: 'All principals'},
                {id: 'sellers', label: 'Sellers'},
                {id: 'consented', label: 'DPDP Consented'},
                {id: 'anonymized', label: 'Erased'},
              ] as const
            ).map(seg => (
              <button
                key={seg.id}
                type="button"
                className={userSegment === seg.id ? 'editorial-chip active' : 'editorial-chip'}
                onClick={() => {
                  setUserSegment(seg.id);
                  setPage(1);
                }}
              >
                {seg.label}
              </button>
            ))}

          <button
            type="button"
            className="editorial-icon-btn"
            onClick={() => void loadData()}
            disabled={loading || busy}
            title="Refresh records"
            aria-label="Refresh records"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {error && <Notice error message={error} />}
      {notice && <Notice message={notice} />}

      {/* Main Hairline Data List */}
      {loading ? (
        <p className="editorial-loading-note" role="status">
          Loading directory records…
        </p>
      ) : activeTab === 'pending' || activeTab === 'all' ? (
        <>
          {standaloneAdvs.length > 0 && (
            <section className="editorial-section">
              <div className="editorial-section-head">
                <div>
                  <p className="eyebrow">NEW ADVERTISER CHANNELS</p>
                  <h2>Pending Advertiser Accounts ({standaloneAdvs.length})</h2>
                </div>
              </div>
              <div className="editorial-hairline-table">
                {standaloneAdvs.map(adv => (
                  <button
                    key={adv.id}
                    type="button"
                    className={`editorial-row-button ${
                      selected?.kind === 'advertiser' && selected.id === adv.id ? 'selected' : ''
                    }`}
                    onClick={() => setSelected({kind: 'advertiser', id: adv.id})}
                  >
                    <div className="editorial-row-primary">
                      <strong>{adv.name}</strong>
                      <span>@{adv.handle} · {adv.description || 'Advertiser channel awaiting verification'}</span>
                    </div>
                    <div className="editorial-row-metrics tabular-nums">
                      <Status value={adv.status} />
                      <span>Inspect →</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {vAdsItems.length === 0 && standaloneAdvs.length === 0 ? (
            <div className="editorial-inbox-zero">
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>
                {activeTab === 'pending'
                  ? 'Zero pending V Ads reels, spatial revisions, or advertiser channels.'
                  : 'No V Ads records match your current filter.'}
              </span>
            </div>
          ) : (
            vAdsItems.length > 0 && (
              <div className="editorial-hairline-table" role="list">
                <div className="editorial-table-head">
                  <span>Reel & Advertiser</span>
                  <span>Video</span>
                  <span>Channel</span>
                  <span>Spatial Radius (024)</span>
                  <span>Engagement</span>
                  <span>Action</span>
                </div>
                {vAdsItems.map(item => {
                  const spatial = item.pending_targeting || item.active_targeting;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`editorial-grid-row ${
                        selected?.kind === 'v_ad' && selected.id === item.id ? 'selected' : ''
                      }`}
                      onClick={() => setSelected({kind: 'v_ad', id: item.id})}
                    >
                      <div className="editorial-cell-title">
                        <strong>{item.title}</strong>
                        <span>
                          {item.advertiser.name} (@{item.advertiser.handle})
                        </span>
                      </div>
                      <div>
                        <Status value={item.status} />
                      </div>
                      <div>
                        <Status value={item.advertiser.status} />
                      </div>
                      <div className="tabular-nums editorial-cell-meta">
                        {item.pending_targeting ? (
                          <span className="editorial-pill-warn">
                            Rev #{item.pending_targeting.revision} · {item.pending_targeting.radius_km} km (PENDING)
                          </span>
                        ) : spatial ? (
                          <span>
                            Rev #{spatial.revision} · {spatial.radius_km} km
                          </span>
                        ) : (
                          <span className="editorial-muted">Untargeted</span>
                        )}
                      </div>
                      <div className="tabular-nums editorial-cell-meta">
                        {item.views} views · {item.likes} likes
                      </div>
                      <div className="editorial-action-text">Inspect →</div>
                    </button>
                  );
                })}
              </div>
            )
          )}
        </>
      ) : activeTab === 'sellers' ? (
        sellers.length === 0 ? (
          <div className="editorial-inbox-zero">
            <span>No seller businesses match this filter.</span>
          </div>
        ) : (
          <div className="editorial-hairline-table" role="list">
            <div className="editorial-table-head">
              <span>Business & Contact</span>
              <span>Verification</span>
              <span>Marketplace</span>
              <span>Services</span>
              <span>DPDP Consent</span>
              <span>Action</span>
            </div>
            {sellers.map(seller => (
              <button
                key={seller.id}
                type="button"
                className={`editorial-grid-row ${
                  selected?.kind === 'seller' && selected.id === seller.id ? 'selected' : ''
                }`}
                onClick={() => setSelected({kind: 'seller', id: seller.id})}
              >
                <div className="editorial-cell-title">
                  <strong>{seller.company}</strong>
                  <span>
                    {seller.location} · {seller.email}
                  </span>
                </div>
                <div>
                  <Status context="provider" value={seller.verification_status} />
                </div>
                <div>
                  <Status value={seller.active ? 'ACTIVE' : 'INACTIVE'} />
                </div>
                <div className="tabular-nums editorial-cell-meta">
                  {seller.service_ids.length} linked
                </div>
                <div className="tabular-nums editorial-cell-meta">
                  {seller.owner?.privacy_policy_version || (seller.owner ? 'Recorded' : 'Unclaimed')}
                </div>
                <div className="editorial-action-text">Inspect →</div>
              </button>
            ))}
          </div>
        )
      ) : users.length === 0 ? (
        <div className="editorial-inbox-zero">
          <span>No user principals match this filter.</span>
        </div>
      ) : (
        <div className="editorial-hairline-table" role="list">
          <div className="editorial-table-head">
            <span>Principal</span>
            <span>Role</span>
            <span>Privacy Policy</span>
            <span>Consented At</span>
            <span>Marketing</span>
            <span>Action</span>
          </div>
          {users.map(u => (
            <button
              key={u.id}
              type="button"
              className={`editorial-grid-row ${
                selected?.kind === 'user' && selected.id === u.id ? 'selected' : ''
              }`}
              onClick={() => setSelected({kind: 'user', id: u.id})}
            >
              <div className="editorial-cell-title">
                <strong>{u.name}</strong>
                <span className="tabular-nums">
                  #{u.id} · {u.email}
                </span>
              </div>
              <div>
                <span className="editorial-chip">
                  {u.deleted_at ? 'ERASED' : u.seller_enabled ? `${u.role} · SELLER` : u.role}
                </span>
              </div>
              <div className="tabular-nums editorial-cell-meta">
                {u.privacy_policy_version || 'Pre-025'}
              </div>
              <div className="tabular-nums editorial-cell-meta">
                {u.privacy_consented_at ? date(u.privacy_consented_at) : '—'}
              </div>
              <div className="editorial-cell-meta">
                {u.marketing_consent ? 'Opted In' : 'Standard'}
              </div>
              <div className="editorial-action-text">Inspect →</div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      <div className="editorial-pagination tabular-nums">
        <span>
          Page {page}
          {activeTab === 'sellers' || activeTab === 'users' ? ` · ${totalCount} total records` : ''}
        </span>
        <div className="button-row">
          <button
            type="button"
            className="button secondary"
            disabled={page <= 1 || loading}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={!hasMore || loading}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {/* Fast Slide-Over Inspection Drawer */}
      {selected && (selectedVAd || selectedAdv || selectedSeller || selectedUser) && (
        <div
          className="editorial-drawer-backdrop"
          onClick={e => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <aside className="editorial-drawer" role="dialog" aria-label="Record inspection drawer">
            <header className="editorial-drawer-header">
              <div>
                <p className="eyebrow">
                  {selectedVAd
                    ? 'V ADS CAMPAIGN INSPECTION'
                    : selectedAdv
                    ? 'ADVERTISER CHANNEL REVIEW'
                    : selectedSeller
                    ? `SELLER BUSINESS #${selectedSeller.id}`
                    : `DATA PRINCIPAL #${selectedUser?.id}`}
                </p>
                <h2>
                  {selectedVAd?.title ||
                    selectedAdv?.name ||
                    selectedSeller?.company ||
                    selectedUser?.name}
                </h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelected(null)}
                aria-label="Close inspection drawer"
              >
                <X size={18} />
              </button>
            </header>

            <div className="editorial-drawer-body">
              {/* 1. V AD INSPECTION */}
              {selectedVAd && (
                <>
                  <div className="editorial-drawer-badges">
                    <Status value={selectedVAd.status} />
                    <span className="editorial-chip">
                      Channel: {selectedVAd.advertiser.status}
                    </span>
                    <span className="editorial-chip tabular-nums">
                      {selectedVAd.views} views · {selectedVAd.likes} likes · {selectedVAd.comments} comments
                    </span>
                  </div>

                  {selectedVAd.description && (
                    <p className="editorial-drawer-desc">{selectedVAd.description}</p>
                  )}

                  {/* Private Video Preview */}
                  <div className="editorial-drawer-block">
                    <div className="editorial-drawer-block-head">
                      <p className="eyebrow">
                        <Video size={13} style={{verticalAlign: '-2px', marginRight: 5}} />
                        PRIVATE REEL PREVIEW
                      </p>
                      <span className="tabular-nums editorial-muted">{selectedVAd.id}</span>
                    </div>
                    {selectedVAd.preview_available ? (
                      <video
                        key={selectedVAd.id}
                        controls
                        muted
                        playsInline
                        preload="metadata"
                        className="editorial-video-player"
                        src={`/api/admin/v-ads/videos/${encodeURIComponent(selectedVAd.id)}/preview`}
                      />
                    ) : (
                      <p className="editorial-muted">
                        No uploaded private media stream attached ({selectedVAd.video_url || 'none'}).
                      </p>
                    )}
                  </div>

                  {/* Moderation Actions */}
                  <div className="editorial-drawer-block">
                    <div className="editorial-drawer-block-head">
                      <p className="eyebrow">ONE-CLICK MODERATION CONTROLS</p>
                      <span className="editorial-muted">@{selectedVAd.advertiser.handle}</span>
                    </div>

                    {selectedVAd.owner_id !== null && selectedVAd.owner_id === user?.id ? (
                      <p className="notice">
                        Independent review required: another administrator must approve or reject your own V Ad or channel.
                      </p>
                    ) : (
                      <>
                        <label className="editorial-field-label">
                          Audit Reason (min 10 chars)
                          <textarea
                            rows={2}
                            value={reasonText}
                            onChange={e => setReasonText(e.target.value)}
                            disabled={busy}
                          />
                        </label>
                        <div className="editorial-preset-row">
                          {REASON_PRESETS.map(preset => (
                            <button
                              key={preset}
                              type="button"
                              className="editorial-chip"
                              onClick={() => setReasonText(preset)}
                            >
                              {preset.slice(0, 38)}…
                            </button>
                          ))}
                        </div>

                        {/* Advertiser Channel Action if Pending/Approved/Suspended */}
                        {selectedVAd.advertiser.status === 'PENDING' && (
                          <div className="editorial-action-group">
                            <span className="editorial-group-label">1. Advertiser Channel (@{selectedVAd.advertiser.handle})</span>
                            <div className="button-row">
                              <button
                                type="button"
                                className="button"
                                disabled={busy || reasonText.trim().length < 10}
                                onClick={() =>
                                  void runAction(
                                    () =>
                                      vAdsClient.reviewAccount(
                                        selectedVAd.advertiser,
                                        'APPROVED',
                                        reasonText.trim(),
                                      ),
                                    'Advertiser channel approved.',
                                  )
                                }
                              >
                                <CheckCircle2 size={15} /> Approve Channel
                              </button>
                              <button
                                type="button"
                                className="button secondary"
                                disabled={busy || reasonText.trim().length < 10}
                                onClick={() =>
                                  void runAction(
                                    () =>
                                      vAdsClient.reviewAccount(
                                        selectedVAd.advertiser,
                                        'REJECTED',
                                        reasonText.trim(),
                                      ),
                                    'Advertiser channel rejected.',
                                  )
                                }
                              >
                                Reject Channel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Video Decision */}
                        <div className="editorial-action-group">
                          <span className="editorial-group-label">Reel Video Status ({selectedVAd.status})</span>
                          <div className="button-row">
                            {selectedVAd.status === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  className="button"
                                  disabled={busy || reasonText.trim().length < 10}
                                  onClick={() =>
                                    void runAction(
                                      () =>
                                        api(`/admin/v-ads/videos/${encodeURIComponent(selectedVAd.id)}/review`, {
                                          method: 'POST',
                                          body: JSON.stringify({
                                            status: 'APPROVED',
                                            reason: reasonText.trim(),
                                          }),
                                        }),
                                      'V Ad video approved.',
                                    )
                                  }
                                >
                                  <CheckCircle2 size={15} /> Approve Video
                                </button>
                                <button
                                  type="button"
                                  className="button secondary"
                                  disabled={busy || reasonText.trim().length < 10}
                                  onClick={() =>
                                    void runAction(
                                      () =>
                                        api(`/admin/v-ads/videos/${encodeURIComponent(selectedVAd.id)}/review`, {
                                          method: 'POST',
                                          body: JSON.stringify({
                                            status: 'REJECTED',
                                            reason: reasonText.trim(),
                                          }),
                                        }),
                                      'V Ad video rejected.',
                                    )
                                  }
                                >
                                  <XCircle size={15} /> Reject Video
                                </button>
                              </>
                            )}
                            {selectedVAd.status !== 'REMOVED' && (
                              <button
                                type="button"
                                className="button secondary"
                                disabled={busy || reasonText.trim().length < 10}
                                onClick={() =>
                                  void runAction(
                                    () =>
                                      vAdsClient.removeVideo(selectedVAd, reasonText.trim()),
                                    'V Ad video removed from public feed.',
                                  )
                                }
                              >
                                Remove Video
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Spatial Targeting Decision */}
                        {selectedVAd.pending_targeting && (
                          <div className="editorial-action-group">
                            <span className="editorial-group-label tabular-nums">
                              Pending Spatial Revision #{selectedVAd.pending_targeting.revision} (
                              {selectedVAd.pending_targeting.latitude.toFixed(4)},{' '}
                              {selectedVAd.pending_targeting.longitude.toFixed(4)} ·{' '}
                              {selectedVAd.pending_targeting.radius_km} km)
                            </span>
                            <div className="button-row">
                              <button
                                type="button"
                                className="button"
                                disabled={busy}
                                onClick={() =>
                                  void runAction(
                                    () =>
                                      api(
                                        `/admin/v-ads/targeting/${encodeURIComponent(
                                          selectedVAd.id,
                                        )}/review`,
                                        {
                                          method: 'POST',
                                          body: JSON.stringify({
                                            status: 'APPROVED',
                                            reason: reasonText.trim(),
                                            expected_revision:
                                              selectedVAd.pending_targeting?.revision,
                                          }),
                                        },
                                      ),
                                    'Spatial targeting revision approved.',
                                  )
                                }
                              >
                                <MapPin size={15} /> Approve Spatial Radius
                              </button>
                              <button
                                type="button"
                                className="button secondary"
                                disabled={busy || !reasonText.trim()}
                                onClick={() =>
                                  void runAction(
                                    () =>
                                      api(
                                        `/admin/v-ads/targeting/${encodeURIComponent(
                                          selectedVAd.id,
                                        )}/review`,
                                        {
                                          method: 'POST',
                                          body: JSON.stringify({
                                            status: 'REJECTED',
                                            reason: reasonText.trim(),
                                            expected_revision:
                                              selectedVAd.pending_targeting?.revision,
                                          }),
                                        },
                                      ),
                                    'Spatial targeting revision rejected.',
                                  )
                                }
                              >
                                Reject Spatial Radius
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Immutable Migration 024 Spatial Revision History */}
                  <div className="editorial-drawer-block">
                    <div className="editorial-drawer-block-head">
                      <p className="eyebrow">IMMUTABLE SPATIAL REVISIONS (MIGRATION 024)</p>
                      <span className="tabular-nums editorial-muted">
                        {selectedVAd.targeting_revisions.length} revisions
                      </span>
                    </div>
                    {selectedVAd.targeting_revisions.length === 0 ? (
                      <p className="editorial-muted">No spatial targeting revisions submitted yet.</p>
                    ) : (
                      <div className="editorial-mini-table tabular-nums">
                        {selectedVAd.targeting_revisions.map(rev => (
                          <div key={rev.id} className="editorial-mini-row">
                            <div>
                              <strong>Rev #{rev.revision}</strong>
                              <span>
                                {rev.latitude.toFixed(5)}, {rev.longitude.toFixed(5)} ·{' '}
                                <strong>{rev.radius_km} km</strong>
                              </span>
                            </div>
                            <div className="editorial-mini-right">
                              <Status value={rev.status} />
                              <small>
                                {rev.reviewed_at
                                  ? `Reviewed ${date(rev.reviewed_at)}`
                                  : rev.created_at
                                  ? `Submitted ${date(rev.created_at)}`
                                  : ''}
                              </small>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <DpdpConsentCard consent={selectedVAd.owner} />

                  {/* Audit Trail */}
                  {selectedVAd.audit_history.length > 0 && (
                    <div className="editorial-drawer-block">
                      <p className="eyebrow">RECENT AUDIT TRAIL</p>
                      <div className="editorial-mini-table tabular-nums">
                        {selectedVAd.audit_history.map(entry => (
                          <div key={entry.id} className="editorial-mini-row">
                            <div>
                              <strong>{entry.action}</strong>
                              <span>
                                {String(
                                  (entry.details as {reason?: string})?.reason || entry.entity,
                                )}
                              </span>
                            </div>
                            <div className="editorial-mini-right">
                              <small>Actor #{entry.actor_id ?? 'sys'}</small>
                              <small>{entry.created_at ? date(entry.created_at) : ''}</small>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* 2. STANDALONE PENDING ADVERTISER */}
              {selectedAdv && (
                <>
                  <div className="editorial-drawer-badges">
                    <Status value={selectedAdv.status} />
                    <span className="editorial-chip">@{selectedAdv.handle}</span>
                  </div>
                  <p className="editorial-drawer-desc">
                    {selectedAdv.description || 'No channel bio provided.'}
                  </p>
                  <div className="editorial-drawer-block">
                    <p className="eyebrow">CHANNEL APPROVAL</p>
                    {selectedAdv.owner_id !== null && selectedAdv.owner_id === user?.id ? (
                      <p className="notice">
                        Another administrator must review your own advertiser channel.
                      </p>
                    ) : (
                      <>
                        <label className="editorial-field-label">
                          Audit Reason (min 10 chars)
                          <textarea
                            rows={2}
                            value={reasonText}
                            onChange={e => setReasonText(e.target.value)}
                            disabled={busy}
                          />
                        </label>
                        <div className="button-row">
                          <button
                            type="button"
                            className="button"
                            disabled={busy || reasonText.trim().length < 10}
                            onClick={() =>
                              void runAction(
                                () =>
                                  vAdsClient.reviewAccount(
                                    selectedAdv,
                                    'APPROVED',
                                    reasonText.trim(),
                                  ),
                                'Advertiser channel approved.',
                              )
                            }
                          >
                            <CheckCircle2 size={15} /> Approve Channel
                          </button>
                          <button
                            type="button"
                            className="button secondary"
                            disabled={busy || reasonText.trim().length < 10}
                            onClick={() =>
                              void runAction(
                                () =>
                                  vAdsClient.reviewAccount(
                                    selectedAdv,
                                    'REJECTED',
                                    reasonText.trim(),
                                  ),
                                'Advertiser channel rejected.',
                              )
                            }
                          >
                            Reject Channel
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <DpdpConsentCard consent={selectedAdv.owner} />
                </>
              )}

              {/* 3. SELLER BUSINESS INSPECTION */}
              {selectedSeller && (
                <>
                  <div className="editorial-drawer-badges">
                    <Status context="provider" value={selectedSeller.verification_status} />
                    <Status value={selectedSeller.active ? 'ACTIVE' : 'INACTIVE'} />
                    <span className="editorial-chip tabular-nums">
                      {selectedSeller.service_ids.length} approved services
                    </span>
                  </div>

                  <div className="editorial-drawer-block">
                    <p className="eyebrow">BUSINESS DIRECTORY PROFILE</p>
                    <dl className="editorial-kv-grid">
                      <div>
                        <dt>Contact Person</dt>
                        <dd>{selectedSeller.name}</dd>
                      </div>
                      <div>
                        <dt>Slug</dt>
                        <dd className="tabular-nums">/{selectedSeller.slug}</dd>
                      </div>
                      <div>
                        <dt>Email & Phone</dt>
                        <dd className="tabular-nums">
                          {selectedSeller.email} · {selectedSeller.phone}
                        </dd>
                      </div>
                      <div>
                        <dt>Location</dt>
                        <dd>{selectedSeller.location}</dd>
                      </div>
                      <div style={{gridColumn: '1 / -1'}}>
                        <dt>Address</dt>
                        <dd>{selectedSeller.address}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="editorial-drawer-block">
                    <div className="editorial-drawer-block-head">
                      <p className="eyebrow">
                        <ShieldCheck size={13} style={{verticalAlign: '-2px', marginRight: 5}} />
                        SELLER VERIFICATION & VISIBILITY
                      </p>
                    </div>
                    <label className="editorial-field-label">
                      Verification Evidence / Note (min 10 chars)
                      <textarea
                        rows={2}
                        value={sellerEvidence}
                        onChange={e => setSellerEvidence(e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <div className="button-row">
                      {(SELLER_TRANSITIONS[selectedSeller.verification_status] || []).map(nextSt => (
                        <button
                          key={nextSt}
                          type="button"
                          className={nextSt === 'VERIFIED' ? 'button' : 'button secondary'}
                          disabled={busy || sellerEvidence.trim().length < 10}
                          onClick={() =>
                            void runAction(
                              () =>
                                api(`/admin/providers/${selectedSeller.id}/verification`, {
                                  method: 'POST',
                                  body: JSON.stringify({
                                    status: nextSt,
                                    evidence: sellerEvidence.trim(),
                                  }),
                                }),
                              `Seller verification updated to ${nextSt}.`,
                            )
                          }
                        >
                          {nextSt === 'VERIFIED' ? 'Verify Seller' : `Mark ${nextSt}`}
                        </button>
                      ))}

                      <button
                        type="button"
                        className="button secondary"
                        disabled={
                          busy ||
                          (!selectedSeller.active &&
                            selectedSeller.verification_status !== 'VERIFIED')
                        }
                        onClick={() =>
                          void runAction(
                            () =>
                              api(`/admin/providers/${selectedSeller.id}/active`, {
                                method: 'PATCH',
                                body: JSON.stringify({active: !selectedSeller.active}),
                              }),
                            selectedSeller.active
                              ? 'Seller deactivated on marketplace.'
                              : 'Seller activated on marketplace.',
                          )
                        }
                      >
                        {selectedSeller.active
                          ? 'Deactivate Marketplace Listing'
                          : 'Activate Marketplace Listing'}
                      </button>
                    </div>

                    <div className="editorial-sublinks" style={{marginTop: 8}}>
                      <Link href="/admin/provider-services">
                        Manage Service Associations <ExternalLink size={12} />
                      </Link>
                      <Link href="/admin/providers">
                        Edit Business Details <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>

                  {selectedSeller.v_ads_channels.length > 0 && (
                    <div className="editorial-drawer-block">
                      <p className="eyebrow">LINKED V ADS CHANNELS</p>
                      <div className="editorial-mini-table">
                        {selectedSeller.v_ads_channels.map(ch => (
                          <div key={ch.id} className="editorial-mini-row">
                            <div>
                              <strong>{ch.name}</strong>
                              <span>@{ch.handle}</span>
                            </div>
                            <Status value={ch.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <DpdpConsentCard consent={selectedSeller.owner} />
                </>
              )}

              {/* 4. USER PRINCIPAL INSPECTION */}
              {selectedUser && (
                <>
                  <div className="editorial-drawer-badges tabular-nums">
                    <span className="editorial-chip">{selectedUser.role}</span>
                    <span className="editorial-chip">
                      {selectedUser.businesses_count} businesses
                    </span>
                    <span className="editorial-chip">
                      {selectedUser.v_ads_channels_count} V Ads channels
                    </span>
                  </div>
                  <DpdpConsentCard consent={selectedUser} label="Complete Principal & DPDP Record" />
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export function AdminModerationHub() {
  return (
    <Suspense fallback={<p role="status">Loading V Ads & Sellers workspace…</p>}>
      <ModerationHubInner />
    </Suspense>
  );
}
