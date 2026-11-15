'use client';
import Link from 'next/link';
import {useCallback,useEffect,useState} from 'react';
import {Activity,Download,RefreshCw,Search,ShieldCheck} from 'lucide-react';
import {api,date} from '@/lib/api';
import {Notice,Status} from './ui';

type AuditTab = 'audit_log' | 'v_ads_revisions' | 'dpdp';

type HealthResponse = {
  status: string;
  payment_mode: string;
};

type ComplianceSummaryResponse = {
  dpdp: {
    fiduciary: {
      legal_name: string;
      brand_name: string;
      registered_address: string;
      grievance_officer: {
        name_or_title: string;
        email: string;
        acknowledgement_sla_hours: number;
        resolution_sla_days: number;
      };
    };
    active_users: number;
    privacy_consented: number;
    seller_consented: number;
    marketing_opted_in: number;
    anonymized_erased: number;
    export_events_count: number;
    erasure_events_count: number;
    recent_events: {
      id: number;
      actor_id: number | null;
      action: string;
      entity: string;
      entity_id: string;
      created_at: string | null;
      details: Record<string, unknown>;
    }[];
  };
  v_ads_revisions: {
    id: string;
    video_id: string;
    video_title: string;
    advertiser_id: string;
    advertiser_name: string;
    advertiser_handle: string;
    revision: number;
    latitude: number;
    longitude: number;
    radius_km: number;
    status: string;
    created_at: string | null;
    reviewed_at: string | null;
    reviewed_by: number | null;
  }[];
};

type AuditListResponse = {
  total: number;
  page: number;
  items: {
    id: number;
    actor_id: number | null;
    action: string;
    entity: string;
    entity_id: string;
    created_at: string | null;
    details: Record<string, unknown>;
  }[];
};

const AUDIT_ACTIONS = [
  'V_ADS_VIDEO_REVIEW',
  'V_ADS_TARGETING_REVIEW',
  'V_ADS_ADVERTISER_REVIEW',
  'PRICING_ITEM_UPDATED',
  'PRICING_SECTION_UPDATED',
  'ACCOUNT_DATA_EXPORTED',
  'ACCOUNT_DELETED_ANONYMIZED',
  'PROVIDER_VERIFY',
  'PROVIDER_ACTIVE',
  'PROVIDER_CREATE',
  'PROVIDER_EDIT',
  'REQUEST_STATUS',
  'CATALOGUE_EDIT',
  'SANDBOX_REFUND',
  'RECONCILE',
];

export function AdminAuditHealth() {
  const [tab, setTab] = useState<AuditTab>('audit_log');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [checkedAt, setCheckedAt] = useState<string>('');
  const [compliance, setCompliance] = useState<ComplianceSummaryResponse | null>(null);
  const [auditList, setAuditList] = useState<AuditListResponse | null>(null);

  const [queryInput, setQueryInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHealthAndCompliance = useCallback(async () => {
    setError('');
    const t0 = performance.now();
    try {
      const [h, comp] = await Promise.all([
        api<HealthResponse>('/health'),
        api<ComplianceSummaryResponse>('/admin/compliance-summary'),
      ]);
      setLatencyMs(Math.max(1, Math.round(performance.now() - t0)));
      setCheckedAt(new Date().toLocaleTimeString());
      setHealth(h);
      setCompliance(comp);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const loadAuditLog = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api<AuditListResponse>(
        `/admin/audit?page=${page}&q=${encodeURIComponent(
          appliedQuery,
        )}&action=${encodeURIComponent(actionFilter)}`,
      );
      setAuditList(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, appliedQuery, actionFilter]);

  useEffect(() => {
    void loadHealthAndCompliance();
  }, [loadHealthAndCompliance]);

  useEffect(() => {
    void loadAuditLog();
  }, [loadAuditLog]);

  const dpdp = compliance?.dpdp;
  const revisions = compliance?.v_ads_revisions ?? [];

  return (
    <div className="editorial-hub">
      {/* Live System & /api/health Telemetry Strip */}
      <section className="editorial-kpi-strip" aria-label="Live platform health and compliance">
        <div className="editorial-kpi-cell">
          <span className="editorial-kpi-label">
            <Activity size={13} style={{verticalAlign: '-2px', marginRight: 5}} />
            Live /api/health
          </span>
          <strong className="tabular-nums">
            {health?.status === 'ok' ? 'HTTP 200 · OK' : health ? health.status.toUpperCase() : 'Checking…'}
          </strong>
          <span className="editorial-kpi-sub tabular-nums">
            {latencyMs !== null ? `${latencyMs} ms response` : 'Probing API'}
            {checkedAt ? ` · Checked ${checkedAt}` : ''}
          </span>
        </div>

        <div className="editorial-kpi-cell">
          <span className="editorial-kpi-label">Billing & Ledger Mode</span>
          <strong className="tabular-nums">{health?.payment_mode ?? 'SANDBOX'}</strong>
          <span className="editorial-kpi-sub">Fail-closed live gateway isolation</span>
        </div>

        <div className="editorial-kpi-cell">
          <span className="editorial-kpi-label">DPDP Act 2023 Principals</span>
          <strong className="tabular-nums">{dpdp?.privacy_consented ?? 0}</strong>
          <span className="editorial-kpi-sub tabular-nums">
            of {dpdp?.active_users ?? 0} active · {dpdp?.anonymized_erased ?? 0} anonymized
          </span>
        </div>

        <div className="editorial-kpi-cell">
          <span className="editorial-kpi-label">Spatial Revisions (024)</span>
          <strong className="tabular-nums">{revisions.length}</strong>
          <span className="editorial-kpi-sub tabular-nums">
            Immutable geo-radius log · {auditList?.total ?? 0} total audits
          </span>
        </div>
      </section>

      {/* Segmented View Switcher */}
      <div className="editorial-hub-bar">
        <div className="editorial-segmented" role="tablist" aria-label="Audit & compliance views">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'audit_log'}
            className={tab === 'audit_log' ? 'active' : ''}
            onClick={() => setTab('audit_log')}
          >
            Administrative Audit Trail
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'v_ads_revisions'}
            className={tab === 'v_ads_revisions' ? 'active' : ''}
            onClick={() => setTab('v_ads_revisions')}
          >
            Immutable V Ads Revisions (024)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'dpdp'}
            className={tab === 'dpdp' ? 'active' : ''}
            onClick={() => setTab('dpdp')}
          >
            DPDP Compliance & Erasure
          </button>
        </div>

        <div className="button-row">
          <a
            href={`/api/admin/audit/export?q=${encodeURIComponent(
              appliedQuery,
            )}&action=${encodeURIComponent(actionFilter)}`}
            className="button secondary"
          >
            <Download size={15} />
            Export Audit CSV
          </a>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              void loadHealthAndCompliance();
              void loadAuditLog();
            }}
          >
            <RefreshCw size={15} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {error && <Notice error message={error} />}

      {/* TAB 1: ADMINISTRATIVE AUDIT LOG */}
      {tab === 'audit_log' && (
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
                placeholder="Search entity ID, action, or reason…"
                aria-label="Search audit log"
              />
              <button type="submit" className="button secondary">
                Search
              </button>
            </form>

            <div className="editorial-filter-pills">
              <select
                aria-label="Filter by audit action"
                value={actionFilter}
                onChange={e => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="editorial-select"
              >
                <option value="">All audit actions</option>
                {AUDIT_ACTIONS.map(act => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="editorial-loading-note" role="status">
              Loading administrative audit trail…
            </p>
          ) : !auditList?.items.length ? (
            <div className="editorial-inbox-zero">
              <span>No audit entries match your current filter.</span>
            </div>
          ) : (
            <div className="editorial-hairline-table">
              <div className="editorial-table-head">
                <span>ID & Action</span>
                <span>Entity</span>
                <span>Actor</span>
                <span>Timestamp</span>
                <span style={{gridColumn: 'span 2'}}>Recorded Details</span>
              </div>
              {auditList.items.map(row => (
                <div key={row.id} className="editorial-grid-row static">
                  <div className="editorial-cell-title">
                    <strong className="tabular-nums">#{row.id} · {row.action}</strong>
                  </div>
                  <div className="tabular-nums editorial-cell-meta">
                    {row.entity} ({row.entity_id})
                  </div>
                  <div className="tabular-nums editorial-cell-meta">
                    {row.actor_id ? `Admin #${row.actor_id}` : 'Principal / System'}
                  </div>
                  <div className="tabular-nums editorial-cell-meta">
                    {row.created_at ? date(row.created_at) : '—'}
                  </div>
                  <div className="editorial-cell-json" style={{gridColumn: 'span 2'}}>
                    <code>{JSON.stringify(row.details || {})}</code>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="editorial-pagination tabular-nums">
            <span>
              {auditList?.total ?? 0} audit entries · Page {page}
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
                disabled={!auditList || page * 30 >= auditList.total || loading}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: IMMUTABLE V ADS SPATIAL REVISIONS (024) */}
      {tab === 'v_ads_revisions' && (
        <section className="editorial-section">
          <div className="editorial-section-head">
            <div>
              <p className="eyebrow">MIGRATION 024 SPATIAL LEDGER</p>
              <h2>Immutable V Ads Geo-Targeting Revisions</h2>
            </div>
            <Link href="/admin/moderation?tab=pending" className="button secondary">
              Review Pending Queue →
            </Link>
          </div>

          {revisions.length === 0 ? (
            <div className="editorial-inbox-zero">
              <span>No spatial targeting revisions recorded yet.</span>
            </div>
          ) : (
            <div className="editorial-hairline-table tabular-nums">
              <div className="editorial-table-head">
                <span>Reel & Channel</span>
                <span>Revision</span>
                <span>Coordinates</span>
                <span>Radius</span>
                <span>Status</span>
                <span>Reviewed</span>
              </div>
              {revisions.map(rev => (
                <div key={rev.id} className="editorial-grid-row static">
                  <div className="editorial-cell-title">
                    <strong>{rev.video_title}</strong>
                    <span>
                      {rev.advertiser_name} (@{rev.advertiser_handle})
                    </span>
                  </div>
                  <div className="editorial-cell-meta">
                    <strong>Rev #{rev.revision}</strong>
                  </div>
                  <div className="editorial-cell-meta">
                    {rev.latitude.toFixed(5)}, {rev.longitude.toFixed(5)}
                  </div>
                  <div className="editorial-cell-meta">
                    <strong>{rev.radius_km} km</strong>
                  </div>
                  <div>
                    <Status value={rev.status} />
                  </div>
                  <div className="editorial-cell-meta">
                    {rev.reviewed_at
                      ? `${date(rev.reviewed_at)} (#${rev.reviewed_by ?? '—'})`
                      : rev.created_at
                      ? `Submitted ${date(rev.created_at)}`
                      : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: DPDP ACT 2023 & ERASURE STATUS */}
      {tab === 'dpdp' && dpdp && (
        <div className="editorial-overview">
          <section className="editorial-section">
            <div className="editorial-section-head">
              <div>
                <p className="eyebrow">
                  <ShieldCheck size={13} style={{verticalAlign: '-2px', marginRight: 5}} />
                  STATUTORY DATA FIDUCIARY POSTURE
                </p>
                <h2>{dpdp.fiduciary.legal_name}</h2>
              </div>
              <Link href="/admin/moderation?tab=users" className="button secondary">
                Inspect User Consents →
              </Link>
            </div>

            <dl className="editorial-kv-grid">
              <div>
                <dt>Registered Address</dt>
                <dd>{dpdp.fiduciary.registered_address}</dd>
              </div>
              <div>
                <dt>Grievance Officer</dt>
                <dd>
                  {dpdp.fiduciary.grievance_officer.name_or_title} (
                  {dpdp.fiduciary.grievance_officer.email})
                </dd>
              </div>
              <div>
                <dt>Statutory Grievance SLA</dt>
                <dd className="tabular-nums">
                  {dpdp.fiduciary.grievance_officer.acknowledgement_sla_hours}h Acknowledgement ·{' '}
                  {dpdp.fiduciary.grievance_officer.resolution_sla_days}d Resolution
                </dd>
              </div>
              <div>
                <dt>Consent & Rights Breakdown</dt>
                <dd className="tabular-nums">
                  {dpdp.privacy_consented} Privacy · {dpdp.seller_consented} Seller ·{' '}
                  {dpdp.marketing_opted_in} Marketing · {dpdp.export_events_count} Exports ·{' '}
                  {dpdp.erasure_events_count} Erasures
                </dd>
              </div>
            </dl>
          </section>

          <section className="editorial-section">
            <div className="editorial-section-head">
              <div>
                <p className="eyebrow">IMMUTABLE DATA PRINCIPAL RIGHTS LOG</p>
                <h2>Portability Exports & Account Anonymizations</h2>
              </div>
            </div>

            {dpdp.recent_events.length === 0 ? (
              <div className="editorial-inbox-zero">
                <span>No portability exports or account erasures have been triggered yet.</span>
              </div>
            ) : (
              <div className="editorial-hairline-table tabular-nums">
                <div className="editorial-table-head">
                  <span>Event</span>
                  <span>Entity</span>
                  <span>Timestamp</span>
                  <span style={{gridColumn: 'span 3'}}>Cryptographic / Audit Proof</span>
                </div>
                {dpdp.recent_events.map(ev => (
                  <div key={ev.id} className="editorial-grid-row static">
                    <div className="editorial-cell-title">
                      <strong>{ev.action}</strong>
                    </div>
                    <div className="editorial-cell-meta">
                      {ev.entity} #{ev.entity_id}
                    </div>
                    <div className="editorial-cell-meta">
                      {ev.created_at ? date(ev.created_at) : '—'}
                    </div>
                    <div className="editorial-cell-json" style={{gridColumn: 'span 3'}}>
                      <code>{JSON.stringify(ev.details || {})}</code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
