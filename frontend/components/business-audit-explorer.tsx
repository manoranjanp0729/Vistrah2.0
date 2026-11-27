'use client';

import Link from 'next/link';
import {AddServiceType} from './add-service-type';
import {registerCustomServiceTypes} from '../../shared/self-onboarding';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Globe,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Notice } from './ui';
import {
  FLAGSHIP_SECTORS,
  LEAD_STATUS_OPTIONS,
  MISSING_PILLAR_FILTERS,
  formatInr,
  type AuditExploreBusinessItem,
  type AuditExploreResponse,
  type AuditLeadsListResponse,
  type LeadStatus,
  type SavedAuditLead,
} from '../../shared/business-audit';
import { NEARBY_DISCOVERY_RADII, type NearbyDiscoveryRadius } from '../../shared/nearby-services';
import {
  SELF_ONBOARDING_CATEGORIES,
  searchSelfOnboardingTypes,
} from '../../shared/self-onboarding';

const LIVE_STOREFRONT = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://vistrah.in';

export function BusinessAuditExplorer() {
  const [catalogueRevision,refreshCatalogue]=useState(0);
  useEffect(()=>{void api<{categories:{slug:string;types:{slug:string;title:string}[]}[]}>('/marketplace/service-types').then(data=>{registerCustomServiceTypes(data);refreshCatalogue(v=>v+1);}).catch(()=>{});},[]);
  const [activeTab, setActiveTab] = useState<'explore' | 'leads'>('explore');

  // Cascading Service & Gap Filters
  const [sectorSlug, setSectorSlug] = useState<string>('all');
  const [serviceType, setServiceType] = useState<string>('');
  const [serviceKeyword, setServiceKeyword] = useState<string>('');
  const [city, setCity] = useState<string>('Bengaluru');
  const [radiusKm, setRadiusKm] = useState<NearbyDiscoveryRadius>(25);
  const [source, setSource] = useState<'all' | 'vistrah' | 'google'>('all');
  const [missingKey, setMissingKey] = useState<string>('all');

  const [exploreItems, setExploreItems] = useState<AuditExploreBusinessItem[]>([]);
  const [loadingExplore, setLoadingExplore] = useState<boolean>(true);
  const [exploreError, setExploreError] = useState<string>('');

  // Saved Leads & Follow-Up Pipeline Tab state
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all');
  const [leads, setLeads] = useState<SavedAuditLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState<boolean>(false);
  const [leadsError, setLeadsError] = useState<string>('');
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});
  const [updatingLeadId, setUpdatingLeadId] = useState<number | null>(null);

  const matchingChildTypes = useMemo(() => {
    if (serviceKeyword.trim()) {
      return searchSelfOnboardingTypes(
        serviceKeyword,
        sectorSlug !== 'all' ? sectorSlug : undefined,
      ).slice(0, 40);
    }
    if (sectorSlug === 'all') return [];
    const cat = SELF_ONBOARDING_CATEGORIES.find(c => c.slug === sectorSlug);
    return (cat?.types ?? []).slice(0, 60);
  }, [sectorSlug, serviceKeyword, catalogueRevision]);

  const loadExplore = useCallback(async () => {
    setLoadingExplore(true);
    setExploreError('');
    try {
      const qs = new URLSearchParams();
      if (sectorSlug !== 'all') qs.set('sector', sectorSlug);
      if (serviceType) qs.set('service_type', serviceType);
      if (city.trim()) qs.set('city', city.trim());
      qs.set('radius_km', String(radiusKm));
      qs.set('source', source);
      const mf = MISSING_PILLAR_FILTERS.find(f => f.key === missingKey);
      if (mf && mf.apiValue) qs.set('missing', mf.apiValue);

      const res = await api<AuditExploreResponse>(`/marketing-audit/explore?${qs.toString()}`);
      setExploreItems(res.items ?? []);
    } catch (err) {
      setExploreError((err as Error).message || 'Could not load businesses.');
    } finally {
      setLoadingExplore(false);
    }
  }, [sectorSlug, serviceType, city, radiusKm, source, missingKey]);

  const loadLeads = useCallback(async () => {
    setLoadingLeads(true);
    setLeadsError('');
    try {
      const qs = new URLSearchParams();
      if (sectorSlug !== 'all') qs.set('sector', sectorSlug);
      if (leadStatusFilter !== 'all') qs.set('lead_status', leadStatusFilter);
      if (city.trim()) qs.set('city', city.trim());
      const res = await api<AuditLeadsListResponse>(`/marketing-audit/leads?${qs.toString()}`);
      setLeads(res.items ?? []);
      const nextNotes: Record<number, string> = {};
      for (const item of res.items ?? []) {
        nextNotes[item.id] = item.notes || '';
      }
      setNoteDrafts(nextNotes);
    } catch (err) {
      setLeadsError((err as Error).message || 'Could not load saved leads.');
    } finally {
      setLoadingLeads(false);
    }
  }, [sectorSlug, leadStatusFilter, city]);

  useEffect(() => {
    if (activeTab === 'explore') {
      void loadExplore();
    } else {
      void loadLeads();
    }
  }, [activeTab, loadExplore, loadLeads]);

  async function patchLead(leadId: number, patch: { lead_status?: LeadStatus; notes?: string }) {
    setUpdatingLeadId(leadId);
    setLeadsError('');
    try {
      const updated = await api<SavedAuditLead>(`/marketing-audit/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      setLeads(prev => prev.map(row => (row.id === leadId ? updated : row)));
    } catch (err) {
      setLeadsError((err as Error).message || 'Could not update lead.');
    } finally {
      setUpdatingLeadId(null);
    }
  }

  function buildAdminBusinessHref(item: {
    business_id: string;
    business_name: string;
    sector_slug: string;
    service_type: string;
    city: string;
    address?: string;
    phone: string;
    website_url?: string | null;
    photo_url?: string | null;
  }) {
    const qs = new URLSearchParams({
      name: item.business_name,
      sector: item.sector_slug,
      service_type: item.service_type,
      ...(item.city ? { city: item.city } : {}),
      ...(item.address ? { address: item.address } : {}),
      ...(item.phone ? { phone: item.phone } : {}),
      ...(item.website_url ? { website_url: item.website_url } : {}),
      ...(item.photo_url ? { photo_url: item.photo_url } : {}),
    });
    return `/admin/business-audit/${encodeURIComponent(item.business_id)}?${qs.toString()}`;
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <AddServiceType/>
      {/* Top Mode Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'inline-flex', gap: 8 }}>
          <button
            type="button"
            className={`button ${activeTab === 'explore' ? '' : 'secondary'}`}
            onClick={() => setActiveTab('explore')}
          >
            <Search size={15} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
            Business Data Explorer ({exploreItems.length})
          </button>
          <button
            type="button"
            className={`button ${activeTab === 'leads' ? '' : 'secondary'}`}
            onClick={() => setActiveTab('leads')}
          >
            <Users size={15} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
            Saved Leads & Follow-Up Pipeline
          </button>
        </div>

        <button
          type="button"
          className="button secondary"
          onClick={() => (activeTab === 'explore' ? void loadExplore() : void loadLeads())}
        >
          <RefreshCw size={14} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
          Refresh
        </button>
      </div>

      {/* Cascading Multi-Filter Panel */}
      <section
        aria-label="Cascading Service and Gap Filters"
        style={{
          display: 'grid',
          gap: 14,
          padding: 18,
          borderRadius: 16,
          border: '1px solid rgba(15, 23, 42, 0.14)',
          background: 'var(--surface-card, #ffffff)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
          <label style={{ display: 'grid', gap: 4, fontSize: '0.8rem', fontWeight: 500 }}>
            <span>1. Business Category (10 Sectors)</span>
            <select
              value={sectorSlug}
              onChange={e => {
                setSectorSlug(e.target.value);
                setServiceType('');
              }}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.45)' }}
            >
              <option value="all">All 10 Categories</option>
              {FLAGSHIP_SECTORS.map(sec => (
                <option key={sec.slug} value={sec.slug}>
                  {sec.order}. {sec.title}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'grid', gap: 4, fontSize: '0.8rem', fontWeight: 500 }}>
            <span>2. Search Specific Service</span>
            <input
              type="search"
              value={serviceKeyword}
              onChange={e => setServiceKeyword(e.target.value)}
              placeholder="Type dental, architect, salon, study abroad…"
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.45)' }}
            />
          </label>

          <label style={{ display: 'grid', gap: 4, fontSize: '0.8rem', fontWeight: 500 }}>
            <span>3. Service Type</span>
            <select
              value={serviceType}
              onChange={e => setServiceType(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.45)' }}
            >
              <option value="">All Services in Category</option>
              {matchingChildTypes.map(bt => (
                <option key={bt.slug} value={bt.slug}>
                  {bt.title}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'grid', gap: 4, fontSize: '0.8rem', fontWeight: 500 }}>
            <span>4. City / Area</span>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Bengaluru, Mysuru, Tarikere…"
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.45)' }}
            />
          </label>
        </div>

        {activeTab === 'explore' ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '0.78rem' }}>Radius:</strong>
              {NEARBY_DISCOVERY_RADII.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadiusKm(r)}
                  className={`button ${radiusKm === r ? '' : 'secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                >
                  {r} km
                </button>
              ))}
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '0.78rem' }}>Source:</strong>
              {(
                [
                  ['all', 'All'],
                  ['vistrah', 'VISTRAH Listed'],
                  ['google', 'Google Places Unclaimed'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSource(val)}
                  className={`button ${source === val ? '' : 'secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '0.78rem' }}>What Is Missing:</strong>
              {MISSING_PILLAR_FILTERS.map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setMissingKey(f.key)}
                  className={`button ${missingKey === f.key ? '' : 'secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '0.8rem' }}>Pipeline Stage:</strong>
            <button
              type="button"
              onClick={() => setLeadStatusFilter('all')}
              className={`button ${leadStatusFilter === 'all' ? '' : 'secondary'}`}
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
            >
              All Stages
            </button>
            {LEAD_STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLeadStatusFilter(opt.value)}
                className={`button ${leadStatusFilter === opt.value ? '' : 'secondary'}`}
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* TAB 1: Multi-Filter Explorer Results */}
      {activeTab === 'explore' && (
        <section style={{ display: 'grid', gap: 12 }}>
          {exploreError && <Notice error message={exploreError} />}
          {loadingExplore ? (
            <p role="status">Scanning VISTRAH & Google Places businesses…</p>
          ) : exploreItems.length === 0 ? (
            <p>No businesses matched the current filters. Try widening radius or clearing filters.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {exploreItems.map(item => (
                <article
                  key={item.business_id}
                  style={{
                    display: 'grid',
                    gap: 10,
                    padding: 16,
                    borderRadius: 14,
                    border: '1px solid rgba(15, 23, 42, 0.14)',
                    background: 'var(--surface-card, #ffffff)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'grid', gap: 5 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                        <Link
                          href={buildAdminBusinessHref(item)}
                          style={{ fontSize: '1.05rem', fontWeight: 500, textDecoration: 'none' }}
                        >
                          {item.business_name}
                        </Link>
                        {item.source === 'vistrah' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 8px',
                              borderRadius: 999,
                              fontSize: '0.72rem',
                              fontWeight: 500,
                              background: 'rgba(16,185,129,0.14)',
                              color: '#047857',
                            }}
                          >
                            <CheckCircle2 size={12} /> VISTRAH Listed
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '2px 8px',
                              borderRadius: 999,
                              fontSize: '0.72rem',
                              fontWeight: 500,
                              background: 'rgba(56,189,248,0.16)',
                              color: '#0369a1',
                            }}
                          >
                            <MapPin size={12} /> Google Unclaimed
                          </span>
                        )}
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 999,
                            fontSize: '0.72rem',
                            fontWeight: 500,
                            background: item.website_url
                              ? 'rgba(16,185,129,0.12)'
                              : 'rgba(239,68,68,0.12)',
                            color: item.website_url ? '#047857' : '#b91c1c',
                          }}
                        >
                          <Globe size={11} style={{ marginRight: 3, verticalAlign: 'text-bottom' }} />
                          {item.website_url ? 'Has Website' : 'Missing Website'}
                        </span>
                        {item.lead_status && (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 999,
                              fontSize: '0.72rem',
                              fontWeight: 500,
                              background: 'rgba(212,175,55,0.2)',
                              color: '#92400e',
                            }}
                          >
                            CRM: {item.lead_status}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.83rem', opacity: 0.82 }}>
                        <strong>{item.sector_title}</strong> · {item.service_title} ·{' '}
                        {item.city || item.address}
                        {item.phone && (
                          <>
                            {' '}
                            · <Phone size={12} style={{ verticalAlign: 'text-bottom' }} />{' '}
                            {item.phone}
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          padding: '6px 12px',
                          borderRadius: 10,
                          background: '#0f172a',
                          color: '#fde68a',
                          fontWeight: 500,
                          fontSize: '0.88rem',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        Score: {item.baseline_score}/100
                      </div>

                      <Link href={buildAdminBusinessHref(item)} className="button">
                        Open Audit & Quote
                        <ArrowRight size={14} style={{ marginLeft: 5, verticalAlign: 'text-bottom' }} />
                      </Link>
                    </div>
                  </div>

                  {item.identified_gaps.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {item.identified_gaps.slice(0, 4).map(gap => (
                        <span
                          key={gap.pillar_id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 9px',
                            borderRadius: 999,
                            fontSize: '0.73rem',
                            fontWeight: 600,
                            background: 'rgba(239,68,68,0.08)',
                            color: '#b91c1c',
                          }}
                        >
                          <AlertTriangle size={11} />
                          Missing: {gap.product_title} (-{gap.missing_points})
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: Saved Leads & Follow-Up Pipeline */}
      {activeTab === 'leads' && (
        <section style={{ display: 'grid', gap: 12 }}>
          {leadsError && <Notice error message={leadsError} />}
          {loadingLeads ? (
            <p role="status">Loading saved audit leads…</p>
          ) : leads.length === 0 ? (
            <p>
              No saved audit leads yet. Open any business in the Data Explorer and click{' '}
              <strong>Save Proposal & Lead</strong>.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {leads.map(lead => (
                <article
                  key={lead.id}
                  style={{
                    display: 'grid',
                    gap: 10,
                    padding: 16,
                    borderRadius: 14,
                    border: '1px solid rgba(15, 23, 42, 0.14)',
                    background: 'var(--surface-card, #ffffff)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '1.02rem' }}>{lead.business_name}</strong>
                      <div style={{ fontSize: '0.82rem', opacity: 0.8 }}>
                        {lead.sector_slug} · {lead.city || 'Local'} · {lead.phone || 'No phone'} ·
                        Score {lead.baseline_score} → <strong>{lead.projected_score}/100</strong> ·
                        One-Time {formatInr(lead.one_time_total_inr)} + Monthly{' '}
                        {formatInr(lead.monthly_total_inr)}/mo
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <select
                        aria-label={`Status for ${lead.business_name}`}
                        value={lead.lead_status}
                        disabled={updatingLeadId === lead.id}
                        onChange={e =>
                          void patchLead(lead.id, { lead_status: e.target.value as LeadStatus })
                        }
                        style={{
                          padding: '6px 10px',
                          borderRadius: 8,
                          fontWeight: 500,
                          border: '1px solid rgba(148,163,184,0.5)',
                        }}
                      >
                        {LEAD_STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      <Link
                        href={buildAdminBusinessHref({
                          business_id: lead.business_id,
                          business_name: lead.business_name,
                          sector_slug: lead.sector_slug,
                          service_type: lead.service_type,
                          city: lead.city,
                          phone: lead.phone,
                        })}
                        className="button secondary"
                      >
                        Open Audit Page
                      </Link>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={noteDrafts[lead.id] ?? ''}
                      onChange={e =>
                        setNoteDrafts(prev => ({ ...prev, [lead.id]: e.target.value }))
                      }
                      placeholder="Field visit notes, follow-up date…"
                      style={{
                        flex: 1,
                        minWidth: 220,
                        padding: '7px 10px',
                        borderRadius: 8,
                        border: '1px solid rgba(148,163,184,0.45)',
                      }}
                    />
                    <button
                      type="button"
                      className="button secondary"
                      disabled={updatingLeadId === lead.id}
                      onClick={() =>
                        void patchLead(lead.id, { notes: noteDrafts[lead.id] ?? '' })
                      }
                    >
                      Save Note
                    </button>
                    {lead.google_place_id && (
                      <a
                        href={`${LIVE_STOREFRONT}/seller/onboard?place_id=${encodeURIComponent(
                          lead.google_place_id,
                        )}&category=${encodeURIComponent(
                          lead.sector_slug,
                        )}&business=${encodeURIComponent(lead.business_name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button secondary"
                      >
                        Claim Link ↗
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
