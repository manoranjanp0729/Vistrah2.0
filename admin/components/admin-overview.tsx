'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {CheckCircle2,MapPin,RefreshCw,Search,XCircle} from 'lucide-react';
import {api} from '@/lib/api';
import type {Category} from '@/lib/types';
import {useUser} from './customer';
import {Notice,Status} from './ui';
import {type AdminOverview as Overview} from '../../shared/admin-dashboard';
import {SELF_ONBOARDING_CATEGORIES} from '../../shared/self-onboarding';
import {
  AdminInspectionDrawer,
  approveSellerListing,
  approveVAdItem,
  buildServiceLookup,
  describeSellerTaxonomy,
  describeVAdTaxonomy,
  rejectSellerListing,
  rejectVAdItem,
  type InspectionTarget,
  type SellerItem,
  type VAdsItem,
} from './admin-inspection-drawer';

type InboxTab = 'listings' | 'v-ads';

export function AdminOverview({
  data,
  initialPendingListings,
  initialPendingVAds,
  initialAuditLeadsCount,
  disableAutoFetch = false,
}: {
  data: Overview;
  initialPendingListings?: SellerItem[];
  initialPendingVAds?: VAdsItem[];
  initialAuditLeadsCount?: number;
  disableAutoFetch?: boolean;
}) {
  const {user} = useUser();
  const [activeTab, setActiveTab] = useState<InboxTab>('listings');
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [overviewStats, setOverviewStats] = useState<Overview>(data);
  const [pendingListings, setPendingListings] = useState<SellerItem[]>(
    initialPendingListings ?? [],
  );
  const [pendingVAds, setPendingVAds] = useState<VAdsItem[]>(initialPendingVAds ?? []);
  const [auditLeadsCount, setAuditLeadsCount] = useState<number>(
    initialAuditLeadsCount ?? data.audit_leads ?? 0,
  );
  const [catalogue, setCatalogue] = useState<Category[]>([]);

  const [loadingQueue, setLoadingQueue] = useState(!disableAutoFetch && !initialPendingListings);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<InspectionTarget>(null);

  useEffect(() => {
    setOverviewStats(data);
  }, [data]);

  const serviceLookup = useMemo(() => buildServiceLookup(catalogue), [catalogue]);

  const loadQueue = useCallback(async () => {
    if (disableAutoFetch) return;
    setLoadingQueue(true);
    setError('');
    try {
      const [sellersRes, vAdsRes, leadsRes, catRes, freshOverview] = await Promise.all([
        api<{items: SellerItem[]; total: number}>('/admin/moderation/sellers?status=PENDING&page=1'),
        api<{items: VAdsItem[]}>('/admin/moderation/v-ads?scope=pending&page=1'),
        api<{items: unknown[]; total?: number}>('/marketing-audit/leads').catch(() => ({
          items: [],
          total: 0,
        })),
        api<Category[]>('/admin/catalogue').catch(() => [] as Category[]),
        api<Overview>('/admin/overview').catch(() => null),
      ]);
      setPendingListings(sellersRes.items ?? []);
      setPendingVAds(vAdsRes.items ?? []);
      setAuditLeadsCount(
        typeof leadsRes.total === 'number' ? leadsRes.total : (leadsRes.items?.length ?? 0),
      );
      setCatalogue(catRes ?? []);
      if (freshOverview) setOverviewStats(freshOverview);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingQueue(false);
    }
  }, [disableAutoFetch]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const filteredListings = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    return pendingListings.filter(seller => {
      const tax = describeSellerTaxonomy(seller, serviceLookup);
      if (categoryFilter !== 'all' && !tax.categorySlugs.includes(categoryFilter)) {
        return false;
      }
      if (!q) return true;
      return `${seller.company} ${seller.name} ${seller.location} ${seller.email} ${seller.phone} ${tax.categoryLabel} ${tax.serviceTypeLabel}`
        .toLowerCase()
        .includes(q);
    });
  }, [pendingListings, searchInput, categoryFilter, serviceLookup]);

  const filteredVAds = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    return pendingVAds.filter(item => {
      const tax = describeVAdTaxonomy(item);
      if (categoryFilter !== 'all' && tax.categorySlug !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return `${item.title} ${item.description} ${item.advertiser.name} ${item.advertiser.handle} ${tax.categoryLabel}`
        .toLowerCase()
        .includes(q);
    });
  }, [pendingVAds, searchInput, categoryFilter]);

  async function handleQuickAction(key: string, fn: () => Promise<void>, successMessage: string) {
    setBusyId(key);
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(successMessage);
      await loadQueue();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const pendingListingsTotal =
    initialPendingListings !== undefined
      ? pendingListings.length
      : (overviewStats.pending_sellers ?? pendingListings.length);
  const pendingVAdsTotal =
    initialPendingVAds !== undefined
      ? pendingVAds.length
      : (overviewStats.pending_v_ads ?? pendingVAds.length);
  const verifiedBusinessesTotal = overviewStats.active_sellers ?? overviewStats.providers ?? 0;

  return (
    <div className="editorial-overview">
      {/* 1. Top KPI Row — Exactly 4 Actionable Cards */}
      <section className="editorial-kpi-grid" aria-label="Actionable marketplace metrics">
        <Link href="/businesses?status=PENDING" className="editorial-kpi-card">
          <span className="editorial-kpi-label">Pending Listings</span>
          <strong className="tabular-nums">{pendingListingsTotal}</strong>
          <span className="editorial-kpi-sub">Awaiting business verification</span>
        </Link>

        <Link href="/v-ads?status=PENDING" className="editorial-kpi-card">
          <span className="editorial-kpi-label">Pending V Ads</span>
          <strong className="tabular-nums">{pendingVAdsTotal}</strong>
          <span className="editorial-kpi-sub">Reels & radius revisions</span>
        </Link>

        <Link href="/businesses?status=VERIFIED" className="editorial-kpi-card">
          <span className="editorial-kpi-label">Verified Businesses</span>
          <strong className="tabular-nums">{verifiedBusinessesTotal}</strong>
          <span className="editorial-kpi-sub">Live on VISTRAH directory</span>
        </Link>

        <Link href="/users?tab=audits" className="editorial-kpi-card">
          <span className="editorial-kpi-label">Audit Leads</span>
          <strong className="tabular-nums">{auditLeadsCount}</strong>
          <span className="editorial-kpi-sub">Business Growth & Audit pipeline</span>
        </Link>
      </section>

      {/* 2. Unified "Needs Review" Inbox */}
      <section className="editorial-section" aria-labelledby="needs-review-heading">
        <div className="editorial-section-head">
          <div>
            <p className="eyebrow">Action Queue</p>
            <h2 id="needs-review-heading">Needs Review</h2>
          </div>

          <div className="editorial-segmented" role="tablist" aria-label="Needs Review tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'listings'}
              className={activeTab === 'listings' ? 'active' : ''}
              onClick={() => setActiveTab('listings')}
            >
              Pending Listings ({pendingListings.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'v-ads'}
              className={activeTab === 'v-ads' ? 'active' : ''}
              onClick={() => setActiveTab('v-ads')}
            >
              Pending V Ads ({pendingVAds.length})
            </button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="editorial-filter-row">
          <div className="editorial-search-form">
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={
                activeTab === 'listings'
                  ? 'Search business name, locality, owner, phone…'
                  : 'Search V Ad title, @handle, advertiser…'
              }
              aria-label="Search pending items"
            />
          </div>

          <div className="editorial-filter-pills">
            <select
              aria-label="Filter by category"
              className="editorial-select"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              <option value="all">All categories</option>
              {SELF_ONBOARDING_CATEGORIES.map(cat => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.title}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="editorial-icon-btn"
              onClick={() => void loadQueue()}
              disabled={loadingQueue || busyId !== null}
              aria-label="Refresh Needs Review queue"
              title="Refresh queue"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {error && <Notice error message={error} />}
        {notice && <Notice message={notice} />}

        {loadingQueue ? (
          <p className="editorial-loading-note" role="status">
            Loading review queue…
          </p>
        ) : activeTab === 'listings' ? (
          filteredListings.length === 0 ? (
            <div className="editorial-inbox-zero" role="status">
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>All caught up — zero pending items to review</span>
            </div>
          ) : (
            <div className="editorial-hairline-table" role="list">
              <div className="editorial-table-head editorial-cols-review">
                <span>Business & Owner</span>
                <span>Category & Service</span>
                <span>Location</span>
                <span>Status</span>
                <span>Quick Actions</span>
              </div>
              {filteredListings.map(seller => {
                const tax = describeSellerTaxonomy(seller, serviceLookup);
                const rowBusy = busyId === `seller-${seller.id}`;
                return (
                  <div
                    key={seller.id}
                    role="listitem"
                    tabIndex={0}
                    className={`editorial-grid-row editorial-cols-review ${
                      selected?.kind === 'seller' && selected.item.id === seller.id
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() => setSelected({kind: 'seller', item: seller})}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelected({kind: 'seller', item: seller});
                      }
                    }}
                  >
                    <div className="editorial-cell-title">
                      <strong>{seller.company}</strong>
                      <span>
                        {seller.name} · {seller.phone || seller.email}
                      </span>
                    </div>
                    <div className="editorial-cell-title">
                      <strong>{tax.categoryLabel}</strong>
                      <span>{tax.serviceTypeLabel}</span>
                    </div>
                    <div className="editorial-cell-meta">
                      <MapPin size={13} aria-hidden="true" />
                      <span>{seller.location || 'Local'}</span>
                    </div>
                    <div>
                      <Status value={seller.verification_status} />
                    </div>
                    <div
                      className="editorial-inline-actions"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="button compact"
                        disabled={rowBusy}
                        onClick={() =>
                          void handleQuickAction(
                            `seller-${seller.id}`,
                            async () => {
                              await approveSellerListing(seller.id);
                              setPendingListings(prev => prev.filter(s => s.id !== seller.id));
                            },
                            `Approved ${seller.company}.`,
                          )
                        }
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="button secondary compact"
                        disabled={rowBusy}
                        onClick={() =>
                          void handleQuickAction(
                            `seller-${seller.id}`,
                            async () => {
                              await rejectSellerListing(seller.id);
                              setPendingListings(prev => prev.filter(s => s.id !== seller.id));
                            },
                            `Rejected ${seller.company}.`,
                          )
                        }
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : filteredVAds.length === 0 ? (
          <div className="editorial-inbox-zero" role="status">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>All caught up — zero pending items to review</span>
          </div>
        ) : (
          <div className="editorial-hairline-table" role="list">
            <div className="editorial-table-head editorial-cols-review">
              <span>V Ad & Channel</span>
              <span>Category</span>
              <span>Spatial Radius</span>
              <span>Status</span>
              <span>Quick Actions</span>
            </div>
            {filteredVAds.map(item => {
              const tax = describeVAdTaxonomy(item);
              const spatial = item.pending_targeting || item.active_targeting;
              const rowBusy = busyId === `vad-${item.id}`;
              const selfOwned = item.owner_id !== null && item.owner_id === user?.id;
              return (
                <div
                  key={item.id}
                  role="listitem"
                  tabIndex={0}
                  className={`editorial-grid-row editorial-cols-review ${
                    selected?.kind === 'v_ad' && selected.item.id === item.id ? 'selected' : ''
                  }`}
                  onClick={() => setSelected({kind: 'v_ad', item})}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected({kind: 'v_ad', item});
                    }
                  }}
                >
                  <div className="editorial-cell-title">
                    <strong>{item.title}</strong>
                    <span>
                      {item.advertiser.name} (@{item.advertiser.handle})
                    </span>
                  </div>
                  <div className="editorial-cell-title">
                    <strong>{tax.categoryLabel}</strong>
                    <span>{item.preview_available ? 'Video ready' : 'Metadata check'}</span>
                  </div>
                  <div className="editorial-cell-meta tabular-nums">
                    {spatial ? `${spatial.radius_km} km` : 'City-wide'}
                  </div>
                  <div>
                    <Status value={item.status} />
                  </div>
                  <div
                    className="editorial-inline-actions"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="button compact"
                      disabled={rowBusy || selfOwned}
                      onClick={() =>
                        void handleQuickAction(
                          `vad-${item.id}`,
                          async () => {
                            await approveVAdItem(item);
                            setPendingVAds(prev => prev.filter(v => v.id !== item.id));
                          },
                          `Approved V Ad "${item.title}".`,
                        )
                      }
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="button secondary compact"
                      disabled={rowBusy || selfOwned}
                      onClick={() =>
                        void handleQuickAction(
                          `vad-${item.id}`,
                          async () => {
                            await rejectVAdItem(item);
                            setPendingVAds(prev => prev.filter(v => v.id !== item.id));
                          },
                          `Rejected V Ad "${item.title}".`,
                        )
                      }
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <AdminInspectionDrawer
        target={selected}
        currentUserId={user?.id}
        serviceLookup={serviceLookup}
        onClose={() => setSelected(null)}
        onUpdated={async message => {
          setNotice(message);
          setSelected(null);
          await loadQueue();
        }}
      />
    </div>
  );
}

export function AdminOverviewConsole() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Overview>('/admin/overview')
      .then(setData)
      .catch(err => setError((err as Error).message));
  }, []);

  if (error) return <Notice error message={error} />;
  if (!data) {
    return (
      <p className="editorial-loading-note" role="status">
        Loading overview…
      </p>
    );
  }
  return <AdminOverview data={data} />;
}
