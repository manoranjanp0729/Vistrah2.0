import Link from 'next/link';
import {ArrowRight,CheckCircle2} from 'lucide-react';
import {adminTaskGroups,type AdminOverview as Overview} from '../../shared/admin-dashboard';

export function AdminOverview({data}:{data:Overview}) {
  const pendingVAds = data.pending_v_ads ?? 0;
  const activeSellers = data.active_sellers ?? data.providers ?? 0;
  const verifiedUsers = data.verified_users ?? data.customers ?? 0;
  const paymentMode = data.payment_mode ?? 'SANDBOX';
  const queue = data.needs_review ?? [
    {
      id: 'new-requests',
      label: 'New Customer Enquiries',
      detail: 'Review customer requirements and assign the next step.',
      count: data.new_requests ?? 0,
      href: '/admin/requests',
    },
  ];

  const activeQueue = queue.filter(item => item.count > 0);
  const clearQueue = queue.filter(item => item.count === 0);

  return (
    <div className="editorial-overview">
      {/* 1. Live Tabular-Nums KPI Strip */}
      <section className="editorial-kpi-strip" aria-label="Platform key metrics">
        <Link href="/admin/moderation?tab=pending" className="editorial-kpi-cell">
          <span className="editorial-kpi-label">Pending V Ads</span>
          <strong className="tabular-nums">{pendingVAds}</strong>
          <span className="editorial-kpi-sub tabular-nums">
            {data.pending_videos ?? 0} reels · {data.pending_targeting ?? 0} spatial ·{' '}
            {data.pending_advertisers ?? 0} channels
          </span>
        </Link>

        <Link href="/admin/moderation?tab=sellers" className="editorial-kpi-cell">
          <span className="editorial-kpi-label">Active Sellers</span>
          <strong className="tabular-nums">{activeSellers}</strong>
          <span className="editorial-kpi-sub tabular-nums">
            {data.providers} total businesses · {data.pending_sellers ?? 0} pending
          </span>
        </Link>

        <Link href="/admin/moderation?tab=users" className="editorial-kpi-cell">
          <span className="editorial-kpi-label">Verified Users</span>
          <strong className="tabular-nums">{verifiedUsers}</strong>
          <span className="editorial-kpi-sub tabular-nums">
            {data.dpdp_consented_users ?? 0} DPDP consented · {data.anonymized_users ?? 0} erased
          </span>
        </Link>

        <Link href="/admin/audit" className="editorial-kpi-cell">
          <span className="editorial-kpi-label">System / Payment Mode</span>
          <strong className="tabular-nums">{paymentMode}</strong>
          <span className="editorial-kpi-sub tabular-nums">
            API {data.system_status === 'ok' ? 'Healthy' : 'Online'} · {data.payments} ledger entries
          </span>
        </Link>
      </section>

      {/* 2. Actionable "Needs Review Now" Queue */}
      <section className="editorial-section" aria-labelledby="needs-review-heading">
        <div className="editorial-section-head">
          <div>
            <p className="eyebrow">ACTIONABLE QUEUE</p>
            <h2 id="needs-review-heading">Needs Review Now</h2>
          </div>
          <span className="editorial-badge tabular-nums">
            {activeQueue.reduce((sum, item) => sum + item.count, 0)} open items
          </span>
        </div>

        {activeQueue.length > 0 ? (
          <div className="editorial-hairline-list">
            {activeQueue.map(item => (
              <Link href={item.href} key={item.id} className="editorial-queue-row">
                <div className="editorial-queue-main">
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
                <div className="editorial-queue-right">
                  <span className="editorial-count-pill tabular-nums">{item.count}</span>
                  <span className="editorial-action-text">
                    Review <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="editorial-inbox-zero">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>
              All moderation and onboarding queues are clear. Select any control below to inspect records.
            </span>
          </div>
        )}

        {clearQueue.length > 0 && (
          <div className="editorial-clear-strip" aria-label="Clear queues">
            {clearQueue.slice(0, 6).map(item => (
              <Link href={item.href} key={item.id} className="editorial-clear-chip">
                <span>{item.label}</span>
                <strong className="tabular-nums">0</strong>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 3. Complete Platform Controls Directory (1-Click Access, Zero Hidden Menus) */}
      <section className="editorial-section" aria-labelledby="all-controls-heading">
        <div className="editorial-section-head">
          <div>
            <p className="eyebrow">COMPLETE WORKSPACE DIRECTORY</p>
            <h2 id="all-controls-heading">All Platform Controls</h2>
          </div>
          <span className="editorial-subnote tabular-nums">
            {data.services} catalogue services · {data.requests} enquiries
          </span>
        </div>

        <div className="editorial-directory-grid">
          {adminTaskGroups.map(group => (
            <div key={group.title} className="editorial-directory-col">
              <h3>{group.title}</h3>
              <div className="editorial-directory-links">
                {group.items.map(item => (
                  <Link href={'/admin/' + item.slug} key={item.slug}>
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
