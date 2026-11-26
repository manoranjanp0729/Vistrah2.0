'use client';
import {useRouter,useSearchParams} from 'next/navigation';
import {Suspense,useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import {CheckCircle2,MapPin,Plus,RefreshCw,Search,X,XCircle} from 'lucide-react';
import {api} from '@/lib/api';
import type {Category} from '@/lib/types';
import {useUser} from './customer';
import {Notice,Status} from './ui';
import {AdminProviderApplications} from './admin-provider-onboarding';
import {AddServiceType} from './add-service-type';
import {
  ALL_SELF_ONBOARDING_TYPES,
  SELF_ONBOARDING_CATEGORIES,
} from '../../shared/self-onboarding';
import {
  AdminInspectionDrawer,
  approveSellerListing,
  buildServiceLookup,
  describeSellerTaxonomy,
  rejectSellerListing,
  type InspectionTarget,
  type SellerItem,
} from './admin-inspection-drawer';

type BusinessTab = 'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'ONBOARDING';

function BusinessesInner() {
  const {user} = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawStatus = (searchParams.get('status') || '').toUpperCase();
  const activeTab: BusinessTab =
    rawStatus === 'PENDING' ||
    rawStatus === 'VERIFIED' ||
    rawStatus === 'REJECTED' ||
    rawStatus === 'ONBOARDING'
      ? rawStatus
      : 'ALL';

  const initialQuery = searchParams.get('q') || '';
  const [queryInput, setQueryInput] = useState(initialQuery);
  const [appliedQuery, setAppliedQuery] = useState(initialQuery);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [page, setPage] = useState(1);

  const availableServiceTypes = useMemo(() => {
    if (categoryFilter === 'all') return ALL_SELF_ONBOARDING_TYPES;
    return SELF_ONBOARDING_CATEGORIES.find(c => c.slug === categoryFilter)?.types ?? [];
  }, [categoryFilter]);

  const [sellers, setSellers] = useState<SellerItem[]>([]);
  const [catalogue, setCatalogue] = useState<Category[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<InspectionTarget>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const serviceLookup = useMemo(() => buildServiceLookup(catalogue), [catalogue]);

  useEffect(() => {
    api<Category[]>('/admin/catalogue')
      .then(setCatalogue)
      .catch(() => {});
  }, []);

  const loadSellers = useCallback(async () => {
    if (activeTab === 'ONBOARDING') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const statusParam = activeTab === 'ALL' ? '' : activeTab;
      const res = await api<{
        items: SellerItem[];
        total: number;
        page: number;
        has_more: boolean;
      }>(
        `/admin/moderation/sellers?status=${encodeURIComponent(
          statusParam,
        )}&q=${encodeURIComponent(appliedQuery)}&page=${page}`,
      );
      setSellers(res.items ?? []);
      setTotalCount(res.total ?? 0);
      setHasMore(Boolean(res.has_more));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, appliedQuery, page]);

  useEffect(() => {
    void loadSellers();
  }, [loadSellers]);

  const filteredSellers = useMemo(() => {
    if (categoryFilter === 'all' && serviceTypeFilter === 'all') return sellers;
    return sellers.filter(seller => {
      const tax = describeSellerTaxonomy(seller, serviceLookup);
      if (categoryFilter !== 'all' && !tax.categorySlugs.includes(categoryFilter)) {
        return false;
      }
      if (serviceTypeFilter !== 'all' && !tax.serviceTypeSlugs.includes(serviceTypeFilter)) {
        return false;
      }
      return true;
    });
  }, [sellers, categoryFilter, serviceTypeFilter, serviceLookup]);

  function switchTab(next: BusinessTab) {
    setSelected(null);
    setPage(1);
    setError('');
    setNotice('');
    const nextUrl = next === 'ALL' ? '/businesses' : `/businesses?status=${next}`;
    router.replace(nextUrl, {scroll: false});
  }

  async function handleQuickAction(key: string, fn: () => Promise<void>, successMessage: string) {
    setBusyId(key);
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(successMessage);
      await loadSellers();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function submitNewBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setCreating(true);
    setError('');
    try {
      await api('/admin/providers', {
        method: 'POST',
        body: JSON.stringify({
          name: String(form.get('name') ?? ''),
          company: String(form.get('company') ?? ''),
          slug: String(form.get('slug') ?? ''),
          email: String(form.get('email') ?? ''),
          phone: String(form.get('phone') ?? ''),
          address: String(form.get('address') ?? ''),
          location: String(form.get('location') ?? ''),
          source_url: String(form.get('source_url') ?? ''),
          provenance: String(form.get('provenance') ?? 'Added via VISTRAH Operations Console'),
        }),
      });
      setShowCreateModal(false);
      setNotice('New business listing created in Pending review.');
      await loadSellers();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="editorial-hub">
      <div className="editorial-hub-bar">
        <div className="editorial-segmented" role="tablist" aria-label="Business directory views">
          {(
            [
              {id: 'ALL', label: 'All Listings'},
              {id: 'PENDING', label: 'Pending'},
              {id: 'VERIFIED', label: 'Verified'},
              {id: 'REJECTED', label: 'Rejected'},
              {id: 'ONBOARDING', label: 'Onboarding'},
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

        <div className="button-row">
          <AddServiceType />
          <button
            type="button"
            className="button"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={15} />
            Add Business
          </button>
        </div>
      </div>

      {error && <Notice error message={error} />}
      {notice && <Notice message={notice} />}

      {activeTab === 'ONBOARDING' ? (
        <section className="editorial-section">
          <div className="editorial-section-head">
            <div>
              <p className="eyebrow">Provider Onboarding</p>
              <h2>Onboarding Applications</h2>
            </div>
          </div>
          <AdminProviderApplications />
        </section>
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
                placeholder="Search business name, locality, owner email, slug…"
                aria-label="Search businesses"
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
                aria-label="Filter businesses by category"
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
                aria-label="Filter businesses by service type"
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
                onClick={() => void loadSellers()}
                disabled={loading || busyId !== null}
                aria-label="Refresh businesses"
                title="Refresh businesses"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {loading ? (
            <p className="editorial-loading-note" role="status">
              Loading businesses…
            </p>
          ) : filteredSellers.length === 0 ? (
            <div className="editorial-inbox-zero" role="status">
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>
                {activeTab === 'PENDING'
                  ? 'All caught up — zero pending items to review'
                  : 'No businesses match the current filter.'}
              </span>
            </div>
          ) : (
            <div className="editorial-hairline-table" role="list">
              <div className="editorial-table-head editorial-cols-review">
                <span>Business & Owner</span>
                <span>Category & Services</span>
                <span>Locality</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {filteredSellers.map(seller => {
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
                    <div className="editorial-inline-actions">
                      <Status value={seller.verification_status} />
                      {seller.verification_status === 'VERIFIED' && (
                        <Status value={seller.active ? 'LIVE' : 'INACTIVE'} />
                      )}
                    </div>
                    <div
                      className="editorial-inline-actions"
                      onClick={e => e.stopPropagation()}
                    >
                      {seller.verification_status === 'PENDING' ? (
                        <>
                          <button
                            type="button"
                            className="button compact"
                            disabled={rowBusy}
                            onClick={() =>
                              void handleQuickAction(
                                `seller-${seller.id}`,
                                () => approveSellerListing(seller.id),
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
                                () => rejectSellerListing(seller.id),
                                `Rejected ${seller.company}.`,
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
          )}

          <div className="editorial-pagination tabular-nums">
            <span>
              Page {page} · {totalCount} businesses
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
                disabled={!hasMore || loading}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {showCreateModal && (
        <div
          className="editorial-drawer-backdrop"
          onClick={e => {
            if (e.target === e.currentTarget && !creating) setShowCreateModal(false);
          }}
        >
          <aside className="editorial-drawer" role="dialog" aria-modal="true" aria-label="Add business">
            <header className="editorial-drawer-header">
              <div>
                <p className="eyebrow">Directory Onboarding</p>
                <h2>Add Business Listing</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                disabled={creating}
                onClick={() => setShowCreateModal(false)}
                aria-label="Close form"
              >
                <X size={18} />
              </button>
            </header>
            <div className="editorial-drawer-body">
              <form className="form" onSubmit={submitNewBusiness}>
                <label>
                  Business / Storefront Name
                  <input name="company" required maxLength={160} />
                </label>
                <label>
                  URL Slug
                  <input name="slug" required placeholder="e.g. aarav-dental-indiranagar" maxLength={160} />
                </label>
                <label>
                  Owner / Contact Name
                  <input name="name" required maxLength={120} />
                </label>
                <label>
                  Phone
                  <input name="phone" type="tel" required maxLength={32} />
                </label>
                <label>
                  Email
                  <input name="email" type="email" required maxLength={254} />
                </label>
                <label>
                  City / Locality
                  <input name="location" required defaultValue="Bengaluru" maxLength={120} />
                </label>
                <label>
                  Full Address
                  <textarea name="address" rows={2} required maxLength={500} />
                </label>
                <label>
                  Onboarding Source / Provenance
                  <textarea
                    name="provenance"
                    rows={2}
                    required
                    defaultValue="Verified direct onboarding via VISTRAH Operations Console."
                  />
                </label>
                <div className="button-row">
                  <button type="submit" className="button" disabled={creating}>
                    {creating ? 'Saving…' : 'Create Business Listing'}
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={creating}
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </aside>
        </div>
      )}

      <AdminInspectionDrawer
        target={selected}
        currentUserId={user?.id}
        serviceLookup={serviceLookup}
        onClose={() => setSelected(null)}
        onUpdated={async message => {
          setNotice(message);
          setSelected(null);
          await loadSellers();
        }}
      />
    </div>
  );
}

export function AdminBusinessesConsole() {
  return (
    <Suspense fallback={<p role="status">Loading businesses…</p>}>
      <BusinessesInner />
    </Suspense>
  );
}
