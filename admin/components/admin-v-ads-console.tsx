'use client';
import {useRouter,useSearchParams} from 'next/navigation';
import {Suspense,useCallback,useEffect,useMemo,useState} from 'react';
import {CheckCircle2,RefreshCw,Search,Video,XCircle} from 'lucide-react';
import {api} from '@/lib/api';
import {useUser} from './customer';
import {Notice,Status} from './ui';
import {
  ALL_SELF_ONBOARDING_TYPES,
  SELF_ONBOARDING_CATEGORIES,
} from '../../shared/self-onboarding';
import {
  AdminInspectionDrawer,
  approveVAdItem,
  describeVAdTaxonomy,
  rejectVAdItem,
  reviewStandaloneChannel,
  type InspectionTarget,
  type StandaloneAdvertiser,
  type VAdsItem,
} from './admin-inspection-drawer';

type VAdsScope = 'pending' | 'approved' | 'rejected' | 'all';

function VAdsConsoleInner() {
  const {user} = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawStatus = (searchParams.get('status') || searchParams.get('scope') || '').toLowerCase();
  const activeScope: VAdsScope =
    rawStatus === 'approved' || rawStatus === 'rejected' || rawStatus === 'all'
      ? rawStatus
      : 'pending';

  const [queryInput, setQueryInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [page, setPage] = useState(1);

  const availableServiceTypes = useMemo(() => {
    if (categoryFilter === 'all') return ALL_SELF_ONBOARDING_TYPES;
    return SELF_ONBOARDING_CATEGORIES.find(c => c.slug === categoryFilter)?.types ?? [];
  }, [categoryFilter]);

  const [items, setItems] = useState<VAdsItem[]>([]);
  const [channels, setChannels] = useState<StandaloneAdvertiser[]>([]);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<InspectionTarget>(null);

  const loadVAds = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api<{
        items: VAdsItem[];
        standalone_pending_advertisers: StandaloneAdvertiser[];
        page: number;
        has_more: boolean;
      }>(
        `/admin/moderation/v-ads?scope=${encodeURIComponent(
          activeScope,
        )}&q=${encodeURIComponent(appliedQuery)}&page=${page}`,
      );
      setItems(res.items ?? []);
      setChannels(res.standalone_pending_advertisers ?? []);
      setHasMore(Boolean(res.has_more));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [activeScope, appliedQuery, page]);

  useEffect(() => {
    void loadVAds();
  }, [loadVAds]);

  const filteredItems = useMemo(() => {
    if (categoryFilter === 'all' && serviceTypeFilter === 'all') return items;
    return items.filter(item => {
      const tax = describeVAdTaxonomy(item);
      if (categoryFilter !== 'all' && tax.categorySlug !== categoryFilter) return false;
      if (serviceTypeFilter !== 'all' && tax.serviceTypeSlug !== serviceTypeFilter) return false;
      return true;
    });
  }, [items, categoryFilter, serviceTypeFilter]);

  function switchScope(next: VAdsScope) {
    setSelected(null);
    setPage(1);
    setError('');
    setNotice('');
    router.replace(next === 'pending' ? '/v-ads' : `/v-ads?status=${next.toUpperCase()}`, {
      scroll: false,
    });
  }

  async function handleQuickAction(key: string, fn: () => Promise<void>, successMessage: string) {
    setBusyId(key);
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(successMessage);
      await loadVAds();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="editorial-hub">
      <div className="editorial-hub-bar">
        <div className="editorial-segmented" role="tablist" aria-label="V Ads moderation queue">
          {(
            [
              {id: 'pending', label: 'Pending Review'},
              {id: 'approved', label: 'Live V Ads'},
              {id: 'rejected', label: 'Rejected'},
              {id: 'all', label: 'All V Ads'},
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeScope === tab.id}
              className={activeScope === tab.id ? 'active' : ''}
              onClick={() => switchScope(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

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
            placeholder="Search V Ad title, @handle, advertiser…"
            aria-label="Search V Ads"
          />
          <button type="submit" className="button secondary compact">
            Search
          </button>
          {appliedQuery && (
            <button
              type="button"
              className="button secondary compact"
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
          <select
            aria-label="Filter V Ads by category"
            className="editorial-select"
            value={categoryFilter}
            onChange={e => {
              setCategoryFilter(e.target.value);
              setServiceTypeFilter('all');
            }}
          >
            <option value="all">All categories</option>
            {SELF_ONBOARDING_CATEGORIES.map(cat => (
              <option key={cat.slug} value={cat.slug}>
                {cat.title}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter V Ads by service type"
            className="editorial-select"
            value={serviceTypeFilter}
            onChange={e => setServiceTypeFilter(e.target.value)}
          >
            <option value="all">All service types ({availableServiceTypes.length})</option>
            {availableServiceTypes.map(st => (
              <option key={st.slug} value={st.slug}>
                {st.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="editorial-icon-btn"
            onClick={() => void loadVAds()}
            disabled={loading || busyId !== null}
            aria-label="Refresh V Ads"
            title="Refresh V Ads"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {error && <Notice error message={error} />}
      {notice && <Notice message={notice} />}

      {loading ? (
        <p className="editorial-loading-note" role="status">
          Loading V Ads queue…
        </p>
      ) : (
        <>
          {channels.length > 0 && (
            <section className="editorial-section">
              <div className="editorial-section-head">
                <div>
                  <p className="eyebrow">New Channels</p>
                  <h2>Pending Advertiser Channels ({channels.length})</h2>
                </div>
              </div>
              <div className="editorial-hairline-table" role="list">
                {channels.map(channel => {
                  const rowBusy = busyId === `channel-${channel.id}`;
                  const selfOwned = channel.owner_id !== null && channel.owner_id === user?.id;
                  return (
                    <div
                      key={channel.id}
                      role="listitem"
                      tabIndex={0}
                      className="editorial-row-button"
                      onClick={() => setSelected({kind: 'advertiser', item: channel})}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelected({kind: 'advertiser', item: channel});
                        }
                      }}
                    >
                      <div className="editorial-row-primary">
                        <strong>{channel.name}</strong>
                        <span>
                          @{channel.handle} ·{' '}
                          {channel.description || 'Advertiser channel awaiting verification'}
                        </span>
                      </div>
                      <div
                        className="editorial-inline-actions"
                        onClick={e => e.stopPropagation()}
                      >
                        <Status value={channel.status} />
                        <button
                          type="button"
                          className="button compact"
                          disabled={rowBusy || selfOwned}
                          onClick={() =>
                            void handleQuickAction(
                              `channel-${channel.id}`,
                              () => reviewStandaloneChannel(channel, 'APPROVED'),
                              `Approved channel @${channel.handle}.`,
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
                              `channel-${channel.id}`,
                              () => reviewStandaloneChannel(channel, 'REJECTED'),
                              `Rejected channel @${channel.handle}.`,
                            )
                          }
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {filteredItems.length === 0 && channels.length === 0 ? (
            <div className="editorial-inbox-zero" role="status">
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>
                {activeScope === 'pending'
                  ? 'All caught up — zero pending items to review'
                  : 'No V Ads match the current filter.'}
              </span>
            </div>
          ) : (
            filteredItems.length > 0 && (
              <div className="editorial-hairline-table" role="list">
                <div className="editorial-table-head editorial-cols-review">
                  <span>V Ad & Channel</span>
                  <span>Media & Category</span>
                  <span>Spatial Radius</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {filteredItems.map(item => {
                  const tax = describeVAdTaxonomy(item);
                  const spatial = item.pending_targeting || item.active_targeting;
                  const rowBusy = busyId === `vad-${item.id}`;
                  const selfOwned = item.owner_id !== null && item.owner_id === user?.id;
                  const needsDecision =
                    item.status === 'PENDING' ||
                    item.advertiser.status === 'PENDING' ||
                    Boolean(item.pending_targeting);
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
                        <span className="editorial-icon-inline">
                          <Video size={12} aria-hidden="true" />
                          {item.preview_available ? 'Private preview ready' : 'Metadata check'}
                        </span>
                      </div>
                      <div className="editorial-cell-meta tabular-nums">
                        {item.pending_targeting ? (
                          <span className="editorial-pill-warn">
                            {item.pending_targeting.radius_km} km (Pending)
                          </span>
                        ) : spatial ? (
                          <span>{spatial.radius_km} km</span>
                        ) : (
                          <span className="editorial-muted">City-wide</span>
                        )}
                      </div>
                      <div>
                        <Status value={item.status === 'APPROVED' ? 'LIVE' : item.status} />
                      </div>
                      <div
                        className="editorial-inline-actions"
                        onClick={e => e.stopPropagation()}
                      >
                        {needsDecision ? (
                          <>
                            <button
                              type="button"
                              className="button compact"
                              disabled={rowBusy || selfOwned}
                              onClick={() =>
                                void handleQuickAction(
                                  `vad-${item.id}`,
                                  () => approveVAdItem(item),
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
                                  () => rejectVAdItem(item),
                                  `Rejected V Ad "${item.title}".`,
                                )
                              }
                            >
                              <XCircle size={14} />
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="editorial-action-text">Inspect →</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          <div className="editorial-pagination tabular-nums">
            <span>Page {page}</span>
            <div className="button-row">
              <button
                type="button"
                className="button secondary compact"
                disabled={page <= 1 || loading}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="button secondary compact"
                disabled={!hasMore || loading}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      <AdminInspectionDrawer
        target={selected}
        currentUserId={user?.id}
        onClose={() => setSelected(null)}
        onUpdated={async message => {
          setNotice(message);
          setSelected(null);
          await loadVAds();
        }}
      />
    </div>
  );
}

export function AdminVAdsConsole() {
  return (
    <Suspense fallback={<p role="status">Loading V Ads moderation queue…</p>}>
      <VAdsConsoleInner />
    </Suspense>
  );
}
