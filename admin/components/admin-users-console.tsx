'use client';
import {useRouter,useSearchParams} from 'next/navigation';
import {Suspense,useCallback,useEffect,useState} from 'react';
import {CheckCircle2,RefreshCw,Search} from 'lucide-react';
import {api,date} from '@/lib/api';
import {Notice,Status} from './ui';
import {LeadAssignmentControl} from './admin-provider-onboarding';
import {BusinessAuditExplorer} from './business-audit-explorer';
import {
  AdminInspectionDrawer,
  type InspectionTarget,
  type UserItem,
} from './admin-inspection-drawer';

type UsersAuditTab = 'accounts' | 'recommendations' | 'audits';

type RecommendationRequest = {
  id: number;
  customer: string;
  service_id: number;
  service_title: string;
  requirements: string;
  status: string;
  created_at: string;
};

const REQUEST_TRANSITIONS: Record<string, {status: string; label: string}[]> = {
  NEW: [
    {status: 'UNDER_REVIEW', label: 'Review'},
    {status: 'CANCELLED', label: 'Close'},
  ],
  UNDER_REVIEW: [
    {status: 'ASSIGNED', label: 'Mark Assigned'},
    {status: 'CANCELLED', label: 'Close'},
  ],
  ASSIGNED: [
    {status: 'IN_PROGRESS', label: 'In Progress'},
    {status: 'COMPLETED', label: 'Complete'},
  ],
  IN_PROGRESS: [{status: 'COMPLETED', label: 'Complete'}],
  COMPLETED: [],
  CANCELLED: [],
};

function UsersAuditsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = (searchParams.get('tab') || '').toLowerCase();
  const activeTab: UsersAuditTab =
    rawTab === 'recommendations' || rawTab === 'requests'
      ? 'recommendations'
      : rawTab === 'audits' || rawTab === 'business-audit'
      ? 'audits'
      : 'accounts';

  const [queryInput, setQueryInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [segment, setSegment] = useState<'all' | 'sellers' | 'consented' | 'anonymized'>('all');
  const [requestStatus, setRequestStatus] = useState('');
  const [page, setPage] = useState(1);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [requests, setRequests] = useState<RecommendationRequest[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<InspectionTarget>(null);

  const loadData = useCallback(async () => {
    if (activeTab === 'audits') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'accounts') {
        const res = await api<{
          items: UserItem[];
          total: number;
          page: number;
          has_more: boolean;
        }>(
          `/admin/moderation/users?segment=${encodeURIComponent(
            segment,
          )}&q=${encodeURIComponent(appliedQuery)}&page=${page}`,
        );
        setUsers(res.items ?? []);
        setTotalUsers(res.total ?? 0);
        setHasMoreUsers(Boolean(res.has_more));
      } else {
        const res = await api<RecommendationRequest[]>('/admin/requests');
        setRequests(Array.isArray(res) ? res : []);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, segment, appliedQuery, page]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function switchTab(next: UsersAuditTab) {
    setSelected(null);
    setPage(1);
    setError('');
    setNotice('');
    router.replace(next === 'accounts' ? '/users' : `/users?tab=${next}`, {scroll: false});
  }

  async function updateRequestStatus(id: number, status: string) {
    setBusyId(id);
    setError('');
    setNotice('');
    try {
      await api(`/admin/requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({status}),
      });
      setNotice(`Recommendation #${id} updated to ${status.replaceAll('_', ' ')}.`);
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const filteredRequests = requests.filter(req => {
    if (requestStatus && req.status !== requestStatus) return false;
    if (!appliedQuery) return true;
    return `${req.customer} ${req.service_title} ${req.requirements}`
      .toLowerCase()
      .includes(appliedQuery.toLowerCase());
  });

  return (
    <div className="editorial-hub">
      <div className="editorial-hub-bar">
        <div className="editorial-segmented" role="tablist" aria-label="Users and audits views">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'accounts'}
            className={activeTab === 'accounts' ? 'active' : ''}
            onClick={() => switchTab('accounts')}
          >
            Consumer Accounts
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'recommendations'}
            className={activeTab === 'recommendations' ? 'active' : ''}
            onClick={() => switchTab('recommendations')}
          >
            Neighbourhood Recommendations
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'audits'}
            className={activeTab === 'audits' ? 'active' : ''}
            onClick={() => switchTab('audits')}
          >
            Business Growth & Audit Leads
          </button>
        </div>
      </div>

      {error && <Notice error message={error} />}
      {notice && <Notice message={notice} />}

      {activeTab === 'audits' ? (
        <BusinessAuditExplorer />
      ) : (
        <>
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
                  activeTab === 'accounts'
                    ? 'Search name, email, phone…'
                    : 'Search customer, service, neighbourhood request…'
                }
                aria-label="Search accounts and recommendations"
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
              {activeTab === 'accounts' ? (
                (
                  [
                    {id: 'all', label: 'All Accounts'},
                    {id: 'sellers', label: 'Business Owners'},
                    {id: 'consented', label: 'Consented'},
                    {id: 'anonymized', label: 'Anonymized'},
                  ] as const
                ).map(seg => (
                  <button
                    key={seg.id}
                    type="button"
                    className={segment === seg.id ? 'editorial-chip active' : 'editorial-chip'}
                    onClick={() => {
                      setSegment(seg.id);
                      setPage(1);
                    }}
                  >
                    {seg.label}
                  </button>
                ))
              ) : (
                <select
                  aria-label="Filter recommendation status"
                  className="editorial-select"
                  value={requestStatus}
                  onChange={e => setRequestStatus(e.target.value)}
                >
                  <option value="">All statuses</option>
                  {Object.keys(REQUEST_TRANSITIONS).map(st => (
                    <option key={st} value={st}>
                      {st.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                className="editorial-icon-btn"
                onClick={() => void loadData()}
                disabled={loading}
                aria-label="Refresh records"
                title="Refresh records"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {loading ? (
            <p className="editorial-loading-note" role="status">
              Loading records…
            </p>
          ) : activeTab === 'accounts' ? (
            users.length === 0 ? (
              <div className="editorial-inbox-zero" role="status">
                <CheckCircle2 size={18} aria-hidden="true" />
                <span>No consumer accounts match this filter.</span>
              </div>
            ) : (
              <>
                <div className="editorial-hairline-table" role="list">
                  <div className="editorial-table-head editorial-cols-review">
                    <span>Account</span>
                    <span>Role</span>
                    <span>Linked Activity</span>
                    <span>Status</span>
                    <span>Action</span>
                  </div>
                  {users.map(account => (
                    <button
                      key={account.id}
                      type="button"
                      className={`editorial-grid-row editorial-cols-review ${
                        selected?.kind === 'user' && selected.item.id === account.id
                          ? 'selected'
                          : ''
                      }`}
                      onClick={() => setSelected({kind: 'user', item: account})}
                    >
                      <div className="editorial-cell-title">
                        <strong>{account.name}</strong>
                        <span className="tabular-nums">
                          {account.email}
                          {account.phone ? ` · ${account.phone}` : ''}
                        </span>
                      </div>
                      <div>
                        <span className="editorial-chip">
                          {account.seller_enabled ? `${account.role} · Seller` : account.role}
                        </span>
                      </div>
                      <div className="editorial-cell-meta tabular-nums">
                        {account.businesses_count} businesses · {account.v_ads_channels_count} V Ads
                      </div>
                      <div>
                        <Status value={account.deleted_at ? 'INACTIVE' : 'ACTIVE'} />
                      </div>
                      <div className="editorial-action-text">Inspect →</div>
                    </button>
                  ))}
                </div>

                <div className="editorial-pagination tabular-nums">
                  <span>
                    Page {page} · {totalUsers} accounts
                  </span>
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
                      disabled={!hasMoreUsers || loading}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )
          ) : filteredRequests.length === 0 ? (
            <div className="editorial-inbox-zero" role="status">
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>All caught up — zero pending items to review</span>
            </div>
          ) : (
            <div className="editorial-hairline-table" role="list">
              <div className="editorial-table-head editorial-cols-review">
                <span>Customer & Service</span>
                <span>Requirement Note</span>
                <span>Submitted</span>
                <span>Status</span>
                <span>Match & Update</span>
              </div>
              {filteredRequests.map(req => (
                <div
                  key={req.id}
                  role="listitem"
                  className="editorial-grid-row editorial-cols-review static"
                >
                  <div className="editorial-cell-title">
                    <strong>{req.service_title || `Recommendation #${req.id}`}</strong>
                    <span>{req.customer}</span>
                  </div>
                  <div className="editorial-cell-title">
                    <span>{req.requirements || 'Local provider recommendation requested'}</span>
                  </div>
                  <div className="editorial-cell-meta tabular-nums">{date(req.created_at)}</div>
                  <div>
                    <Status value={req.status} />
                  </div>
                  <div className="editorial-inline-actions">
                    <LeadAssignmentControl requestId={req.id} serviceId={req.service_id} />
                    {(REQUEST_TRANSITIONS[req.status] ?? []).map(next => (
                      <button
                        key={next.status}
                        type="button"
                        className={
                          next.status === 'CANCELLED'
                            ? 'button secondary compact'
                            : 'button compact'
                        }
                        disabled={busyId === req.id}
                        onClick={() => void updateRequestStatus(req.id, next.status)}
                      >
                        {next.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <AdminInspectionDrawer
        target={selected}
        onClose={() => setSelected(null)}
        onUpdated={async message => {
          setNotice(message);
          setSelected(null);
          await loadData();
        }}
      />
    </div>
  );
}

export function AdminUsersAuditsConsole() {
  return (
    <Suspense fallback={<p role="status">Loading accounts and audits…</p>}>
      <UsersAuditsInner />
    </Suspense>
  );
}
