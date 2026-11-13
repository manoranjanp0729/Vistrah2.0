'use client';
import {useState, useEffect, useRef} from 'react';
import {api} from '@/lib/api';
import {adminVAdsClient, type AdminAccount, type AdminTargeting, type AdminVideo, type Queue, type Performance} from '../../shared/v-ads-management';
import {Notice} from './ui';
import {UiText,UiElement,UiTextarea} from './localized-ui';

const client = adminVAdsClient(api);

export function AdminVAds({actorId}: {actorId?: number}) {
  const [tab, setTab] = useState<'videos' | 'advertisers' | 'targeting' | 'analytics'>('videos');
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState('');
  const [data, setData] = useState<Queue<AdminAccount> | Queue<AdminVideo> | Queue<AdminTargeting> | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<Performance | null>(null);

  useEffect(() => {
    let active = true;
    if (tab === 'analytics') {
      setLoading(true);
      client.analytics(page)
        .then(res => { if (active) { setAnalyticsData(res); setLoading(false); } })
        .catch(e => { if (active) { setError((e as Error).message); setLoading(false); } });
      return () => { active = false; };
    }

    setLoading(true);
    const req = tab === 'advertisers' ? client.accounts(status, page) : tab === 'targeting' ? client.targeting(status, page) : client.videos(status, page);
    req.then(res => {
      if (active) {
        setData(res);
        setLoading(false);
      }
    }).catch(e => {
      if (active) {
        setError((e as Error).message);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [tab, status, page, version]);

  async function perform(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice('Decision saved and recorded.');
      setVersion(v => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const reason = (id: string) => reasons[id] ?? '';

  return (
    <section className="nested-section" style={{display: 'grid', gap: 16}}>
      <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
        {(['videos', 'advertisers', 'targeting', 'analytics'] as const).map(value => (
          <button
            type="button"
            className={`button ${tab === value ? '' : 'secondary'}`}
            key={value}
            disabled={busy}
            onClick={() => {
              setTab(value);
              setStatus('PENDING');
              setPage(1);
              setPreview('');
              setError('');
              setNotice('');
            }}
          >
            <UiText value={value === 'videos' ? 'Video Moderation' : value === 'advertisers' ? 'Advertiser Accounts' : value === 'targeting' ? 'Geo Targeting' : 'Performance Insights'}/>
          </button>
        ))}
      </div>

      {tab !== 'analytics' && (
        <div style={{display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap'}}>
          <label style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <UiText value={"Status: "}/><select
              disabled={busy}
              value={status}
              onChange={e => {
                setStatus(e.target.value);
                setPage(1);
                setPreview('');
              }}
            >
              {(tab === 'advertisers'
                ? ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']
                : tab === 'targeting'
                  ? ['PENDING', 'APPROVED', 'REJECTED', 'SUPERSEDED']
                  : ['PENDING', 'APPROVED', 'REJECTED', 'REMOVED']
              ).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <button type="button" className="button secondary" disabled={busy || loading} onClick={() => setVersion(v => v + 1)}>
            <UiText value={"Refresh queue "}/></button>
        </div>
      )}

      {error && <Notice error message={error} />}
      {notice && <Notice message={notice} />}

      {loading ? (
        <p role="status"><UiText value={"Loading V Ads records…"}/></p>
      ) : tab === 'analytics' ? (
        analyticsData && (
          <div style={{display: 'grid', gap: 12}}>
            <p className="muted">{analyticsData.view_policy}</p>
            <div className="stat-grid">
              <div className="stat-card"><span><UiText value={"Total Videos"}/></span><strong>{analyticsData.totals.videos}</strong></div>
              <div className="stat-card"><span><UiText value={"Signed-in Views"}/></span><strong>{analyticsData.totals.views}</strong></div>
              <div className="stat-card"><span><UiText value={"Likes"}/></span><strong>{analyticsData.totals.likes}</strong></div>
              <div className="stat-card"><span><UiText value={"Comments"}/></span><strong>{analyticsData.totals.comments}</strong></div>
            </div>
            {analyticsData.items.map(item => (
              <article key={item.id} className="help-card">
                <h3>{item.title}</h3>
                <p><UiText value={"Status: "}/>{item.status} · {item.views} <UiText value={"views · "}/>{item.likes} <UiText value={"likes · "}/>{item.comments} <UiText value={"comments"}/></p>
              </article>
            ))}
          </div>
        )
      ) : data?.items.length ? (
        tab === 'videos' ? (
          (data as Queue<AdminVideo>).items.map(row => {
            const isSelf = actorId && row.owner_id === actorId;
            return (
              <article key={row.id} className="help-card" style={{display: 'grid', gap: 10}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap'}}>
                  <h3>{row.title}</h3>
                  <span className="small-label">{row.status}</span>
                </div>
                <p><strong><UiText value={"Channel:"}/></strong> {row.advertiser?.name} (@{row.advertiser?.handle}<UiText value={") · Advertiser status: "}/>{row.advertiser?.status}</p>
                <p>{row.description || 'No description provided.'}</p>
                <p className="muted">{row.views} <UiText value={"views · "}/>{row.likes} <UiText value={"likes · "}/>{row.comments} <UiText value={"comments"}/></p>

                {(() => {
                  const videoSrc = (row.preview_available || row.video_url)
                    ? (row.video_url && !row.video_url.startsWith('/v-ads/media/')
                        ? row.video_url
                        : `/api/admin/v-ads/videos/${encodeURIComponent(row.id)}/preview`)
                    : '';
                  return videoSrc ? (
                    <div style={{
                      width: '100%',
                      maxWidth: 480,
                      borderRadius: 14,
                      overflow: 'hidden',
                      backgroundColor: '#120d20',
                      border: '1px solid #ded3f3',
                      boxShadow: '0 4px 16px rgba(40,20,70,0.15)',
                      margin: '6px 0',
                    }}>
                      <video
                        controls
                        preload="metadata"
                        playsInline
                        src={videoSrc}
                        style={{display: 'block', width: '100%', maxHeight: 270, backgroundColor: '#000'}}
                      />
                    </div>
                  ) : (
                    <div style={{
                      padding: '16px 20px',
                      borderRadius: 12,
                      backgroundColor: '#f8f5fc',
                      border: '1px dashed #cfc0e8',
                      color: '#655780',
                      fontSize: 13,
                      margin: '6px 0',
                    }}>
                      <UiText value={"No streamable video media available "}/></div>
                  );
                })()}

                {isSelf ? (
                  <p className="notice"><UiText value={"Another administrator must review your uploaded video."}/></p>
                ) : (
                  <>
                    <label>
                      <UiText value={"Decision reason (minimum 10 characters): "}/><UiTextarea
                        rows={2}
                        value={reason(row.id)}
                        onChange={e => setReasons(old => ({...old, [row.id]: e.target.value}))}
                        placeholder="e.g. Video verified and meets V Ads quality guidelines."
                        style={{display: 'block', width: '100%', marginTop: 4}}
                      />
                    </label>
                    <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
                      {row.status === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            className="button"
                            disabled={busy || reason(row.id).trim().length < 10}
                            onClick={() => void perform(() => client.reviewVideo(row, 'APPROVED', reason(row.id)))}
                          >
                            <UiText value={"Approve video "}/></button>
                          <button
                            type="button"
                            className="button secondary"
                            disabled={busy || reason(row.id).trim().length < 10}
                            onClick={() => void perform(() => client.reviewVideo(row, 'REJECTED', reason(row.id)))}
                          >
                            <UiText value={"Reject video "}/></button>
                        </>
                      )}
                      {row.status !== 'REMOVED' && (
                        <button
                          type="button"
                          className="button secondary"
                          disabled={busy || reason(row.id).trim().length < 10}
                          onClick={() => void perform(() => client.removeVideo(row, reason(row.id)))}
                        >
                          <UiText value={"Remove ad "}/></button>
                      )}
                    </div>
                  </>
                )}
              </article>
            );
          })
        ) : tab === 'targeting' ? (
          (data as Queue<AdminTargeting>).items.map(row => {
            const isSelf = actorId && row.owner_id === actorId;
            return (
              <article key={row.id} className="help-card" style={{display: 'grid', gap: 10}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap'}}>
                  <h3>{row.video_title} · Rev #{row.revision}</h3>
                  <span className="small-label">{row.status}</span>
                </div>
                <p><strong><UiText value={"Channel:"}/></strong> {row.advertiser?.name} (@{row.advertiser?.handle}<UiText value={") · Video status: "}/>{row.video_status}</p>
                <p><strong><UiText value={"Boundary:"}/></strong> {row.latitude}, {row.longitude} · {row.radius_km} km{row.target_regions.length ? ` · ${row.target_regions.join(', ')}` : ''}</p>
                {row.active_revision && row.active_revision.revision !== row.revision && (
                  <p className="muted"><UiText value={"Active Rev #"}/>{row.active_revision.revision} ({row.active_revision.latitude}, {row.active_revision.longitude} · {row.active_revision.radius_km} km) <UiText value={"will be superseded on approval."}/></p>
                )}

                {isSelf ? (
                  <p className="notice"><UiText value={"Another administrator must review this targeting request."}/></p>
                ) : (row.status === 'PENDING' || row.status === 'APPROVED') && (
                  <>
                    <label>
                      <UiText value={"Decision reason (required for rejection): "}/><UiTextarea
                        rows={2}
                        value={reason(row.id)}
                        onChange={e => setReasons(old => ({...old, [row.id]: e.target.value}))}
                        placeholder="e.g. Verified service coverage radius."
                        style={{display: 'block', width: '100%', marginTop: 4}}
                      />
                    </label>
                    <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
                      {row.status === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            className="button"
                            disabled={busy}
                            onClick={() => void perform(() => client.reviewTargeting(row, 'APPROVED', reason(row.id)))}
                          >
                            <UiText value={"Approve targeting "}/></button>
                          <button
                            type="button"
                            className="button secondary"
                            disabled={busy || !reason(row.id).trim()}
                            onClick={() => void perform(() => client.reviewTargeting(row, 'REJECTED', reason(row.id)))}
                          >
                            <UiText value={"Reject targeting "}/></button>
                        </>
                      )}
                      {row.status === 'APPROVED' && (
                        <button
                          type="button"
                          className="button secondary"
                          disabled={busy}
                          onClick={() => void perform(() => client.reviewTargeting(row, 'SUPERSEDED', reason(row.id)))}
                        >
                          <UiText value={"Supersede targeting "}/></button>
                      )}
                    </div>
                  </>
                )}
              </article>
            );
          })
        ) : (
          (data as Queue<AdminAccount>).items.map(row => {
            const isSelf = actorId && row.owner_id === actorId;
            return (
              <article key={row.id} className="help-card" style={{display: 'grid', gap: 10}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap'}}>
                  <h3>{row.name}</h3>
                  <span className="small-label">{row.status}</span>
                </div>
                <p><strong><UiText value={"Handle:"}/></strong> @{row.handle} <UiText value={"· Owner #"}/>{row.owner_id ?? 'unassigned'}</p>
                <p>{row.description || 'No description provided.'}</p>

                {isSelf ? (
                  <p className="notice"><UiText value={"Another administrator must review this advertiser request."}/></p>
                ) : (
                  <>
                    <label>
                      <UiText value={"Decision reason (minimum 10 characters): "}/><UiTextarea
                        rows={2}
                        value={reason(row.id)}
                        onChange={e => setReasons(old => ({...old, [row.id]: e.target.value}))}
                        placeholder="e.g. Verified legitimate business seller profile."
                        style={{display: 'block', width: '100%', marginTop: 4}}
                      />
                    </label>
                    <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
                      {row.status === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            className="button"
                            disabled={busy || !row.review_token || reason(row.id).trim().length < 10}
                            onClick={() => void perform(() => client.reviewAccount(row, 'APPROVED', reason(row.id)))}
                          >
                            <UiText value={"Approve account "}/></button>
                          <button
                            type="button"
                            className="button secondary"
                            disabled={busy || !row.review_token || reason(row.id).trim().length < 10}
                            onClick={() => void perform(() => client.reviewAccount(row, 'REJECTED', reason(row.id)))}
                          >
                            <UiText value={"Reject account "}/></button>
                        </>
                      )}
                      {row.status === 'APPROVED' && (
                        <button
                          type="button"
                          className="button secondary"
                          disabled={busy || reason(row.id).trim().length < 10}
                          onClick={() => void perform(() => client.moderateAccount(row, 'SUSPENDED', reason(row.id)))}
                        >
                          <UiText value={"Suspend account "}/></button>
                      )}
                      {row.status === 'SUSPENDED' && (
                        <button
                          type="button"
                          className="button secondary"
                          disabled={busy || reason(row.id).trim().length < 10}
                          onClick={() => void perform(() => client.moderateAccount(row, 'PENDING', reason(row.id)))}
                        >
                          <UiText value={"Return to review "}/></button>
                      )}
                    </div>
                  </>
                )}
              </article>
            );
          })
        )
      ) : (
        <p><UiText value={"No "}/>{status.toLowerCase()} <UiText value={"records in this queue."}/></p>
      )}

      {data && (
        <div style={{display: 'flex', gap: 10, alignItems: 'center'}}>
          <button type="button" className="button secondary" disabled={page === 1 || busy} onClick={() => setPage(p => p - 1)}>
            <UiText value={"Previous "}/></button>
          <span><UiText value={"Page "}/>{page}</span>
          <button type="button" className="button secondary" disabled={!data.has_more || busy} onClick={() => setPage(p => p + 1)}>
            <UiText value={"Next "}/></button>
        </div>
      )}
    </section>
  );
}

