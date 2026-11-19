'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Download,
  ExternalLink,
  Globe,
  Laptop,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Printer,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  TrendingUp,
  Video,
} from 'lucide-react';
import {
  LEAD_STATUS_OPTIONS,
  buildPrefilledFreeVAdHref,
  buildQrStandeeListingUrl,
  buildWhatsAppProposalHref,
  buildWhatsAppProposalMessage,
  formatInr,
  isFreeVAdPillarActiveOrTicked,
  recalculateLiveAuditState,
  renderPersonalizedWebsitePreview,
  type BusinessProfileResponse,
  type LeadStatus,
  type SavedAuditLead,
} from '../../shared/business-audit';
import {
  buildQrStandeeSvgMarkup,
  encodeQrMatrix,
  qrMatrixToSvgPath,
} from '../../shared/qr-matrix';
import {
  googleMapsDirectionsHrefForPin,
  phoneCallHref,
  resolveListingPhotoUri,
  whatsappChatHref,
} from '../../shared/nearby-services';
import s from './business-growth-audit-view.module.css';

export type SaveAuditLeadPayload = {
  business_id: string;
  google_place_id?: string | null;
  provider_id?: number | null;
  business_name: string;
  sector_slug: string;
  service_type: string;
  city: string;
  phone: string;
  website_url?: string | null;
  photo_url?: string | null;
  is_vistrah_claimed: boolean;
  has_active_v_ad: boolean;
  baseline_score: number;
  ticked_pillar_ids: string[];
  gst_included: boolean;
  lead_status: LeadStatus;
  notes: string;
};

export type RequestWebsitePayload = {
  business_id: string;
  business_name: string;
  sector_slug: string;
  pattern_id: string;
  phone: string;
  city: string;
  notes: string;
};

export function BusinessGrowthAuditView({
  profile,
  viewerMode,
  storefrontBaseUrl = '',
  backHref,
  backLabel = 'Back',
  onSaveLead,
  onRequestWebsite,
}: {
  profile: BusinessProfileResponse;
  viewerMode: 'admin' | 'owner';
  storefrontBaseUrl?: string;
  backHref?: string;
  backLabel?: string;
  onSaveLead?: (payload: SaveAuditLeadPayload) => Promise<SavedAuditLead>;
  onRequestWebsite: (payload: RequestWebsitePayload) => Promise<void>;
}) {
  const { business, flagship_sector, competitor_benchmark } = profile;

  const initialActiveVAd = useMemo(
    () =>
      Boolean(
        profile.audit.pillar_breakdown.find(p => p.pillar_id === 'hyperlocal_v_ads')
          ?.active_in_baseline,
      ),
    [profile.audit.pillar_breakdown],
  );

  // Live Quick-Check inline inputs (Module 2)
  const [websiteInput, setWebsiteInput] = useState(business.website_url ?? '');
  const [instagramInput, setInstagramInput] = useState(business.instagram_url ?? '');
  const [facebookInput, setFacebookInput] = useState(business.facebook_url ?? '');

  // Interactive 7-Pillar Tick / Untick state & GST toggle (Module 3)
  const [tickedIds, setTickedIds] = useState<string[]>(() =>
    profile.saved_lead?.ticked_pillar_ids?.length
      ? [...profile.saved_lead.ticked_pillar_ids]
      : [...flagship_sector.vertical_strategy.recommended_pillar_ids],
  );
  const [gstIncluded, setGstIncluded] = useState<boolean>(
    profile.saved_lead?.gst_included ?? true,
  );

  // CRM Lead Save state (Admin) / Proposal state
  const [leadStatus, setLeadStatus] = useState<LeadStatus>(
    profile.saved_lead?.lead_status ?? 'audit_shared',
  );
  const [leadNotes, setLeadNotes] = useState(profile.saved_lead?.notes ?? '');
  const [savingLead, setSavingLead] = useState(false);
  const [leadFeedback, setLeadFeedback] = useState('');

  // Live Website Pattern Preview state (Module 4)
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [requestingWebsite, setRequestingWebsite] = useState(false);
  const [websiteFeedback, setWebsiteFeedback] = useState('');
  const [photoFailed, setPhotoFailed] = useState(false);

  const live = useMemo(
    () =>
      recalculateLiveAuditState({
        business,
        hasActiveVAd: initialActiveVAd,
        quickCheck: {
          websiteInput,
          instagramInput,
          facebookInput,
        },
        tickedPillarIds: tickedIds,
        gstIncluded,
      }),
    [business, initialActiveVAd, websiteInput, instagramInput, facebookInput, tickedIds, gstIncluded],
  );

  const websitePreview = useMemo(
    () =>
      renderPersonalizedWebsitePreview({
        sectorSlug: flagship_sector.slug,
        businessName: business.company || business.name,
        city: business.city,
        phone: business.phone,
        serviceTitle: business.service_title,
      }),
    [flagship_sector.slug, business.company, business.name, business.city, business.phone, business.service_title],
  );

  function togglePillar(pillarId: string) {
    setLeadFeedback('');
    setTickedIds(prev =>
      prev.includes(pillarId) ? prev.filter(id => id !== pillarId) : [...prev, pillarId],
    );
  }

  const callHref = phoneCallHref(business.phone);
  const waHref = whatsappChatHref(
    business.whatsapp || business.phone,
    business.service_title,
    business.company || business.name,
  );
  const directionsHref =
    business.latitude != null && business.longitude != null
      ? googleMapsDirectionsHrefForPin(business.latitude, business.longitude)
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${business.company || business.name} ${business.address || business.city}`,
        )}`;
  const freeVAdHref = buildPrefilledFreeVAdHref({
    businessName: business.company || business.name,
    sectorSlug: flagship_sector.slug,
    serviceType: business.service_type,
    city: business.city,
    storefrontBaseUrl,
  });

  const showFreeVAdUploadShortcut = isFreeVAdPillarActiveOrTicked(live.audit, tickedIds);

  const proposalWhatsAppHref = useMemo(() => {
    const msg = buildWhatsAppProposalMessage({
      businessName: business.company || business.name,
      sectorTitle: flagship_sector.title,
      city: business.city,
      audit: live.audit,
      simulation: live.simulation,
      cart: live.cart,
      websitePatternTitle: websitePreview.pattern_title,
    });
    return buildWhatsAppProposalHref(business.whatsapp || business.phone, msg);
  }, [
    business.company,
    business.name,
    business.city,
    business.whatsapp,
    business.phone,
    flagship_sector.title,
    live.audit,
    live.simulation,
    live.cart,
    websitePreview.pattern_title,
  ]);

  const qrStandeeUrl = useMemo(
    () =>
      buildQrStandeeListingUrl({
        businessName: business.company || business.name,
        sectorSlug: flagship_sector.slug,
        serviceType: business.service_type,
        city: business.city,
        baseOrigin: storefrontBaseUrl || 'https://vistrah.in',
      }),
    [business.company, business.name, flagship_sector.slug, business.service_type, business.city, storefrontBaseUrl],
  );

  const qrSvgGraphic = useMemo(() => {
    const matrix = encodeQrMatrix(qrStandeeUrl);
    return qrMatrixToSvgPath(matrix, 2);
  }, [qrStandeeUrl]);

  function handlePrintProposal() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  function handleDownloadQrStandee() {
    if (typeof window === 'undefined') return;
    const svgText = buildQrStandeeSvgMarkup({
      businessName: business.company || business.name,
      sectorTitle: `${flagship_sector.title} · ${business.service_title}`,
      targetUrl: qrStandeeUrl,
    });
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const slug = (business.company || business.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    link.href = url;
    link.download = `vistrah-verified-qr-${slug || 'business'}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const photoSrc = !photoFailed ? resolveListingPhotoUri(business.photo_url) : null;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const projectedDashOffset =
    circumference - (live.simulation.projected_score / 100) * circumference;

  async function handleSaveProposal() {
    if (!onSaveLead) {
      if (waHref) {
        window.open(waHref, '_blank', 'noopener,noreferrer');
      }
      setLeadFeedback('Growth plan ready! Connect with VISTRAH Studio to activate paid items.');
      return;
    }
    setSavingLead(true);
    setLeadFeedback('');
    try {
      const saved = await onSaveLead({
        business_id: business.business_id,
        google_place_id: business.google_place_id,
        provider_id: business.provider_id,
        business_name: business.company || business.name,
        sector_slug: flagship_sector.slug,
        service_type: business.service_type,
        city: business.city,
        phone: business.phone,
        website_url: live.effectiveWebsiteUrl,
        photo_url: business.photo_url,
        is_vistrah_claimed: business.is_claimed,
        has_active_v_ad: initialActiveVAd,
        baseline_score: live.audit.baseline_score,
        ticked_pillar_ids: live.simulation.ticked_pillar_ids,
        gst_included: gstIncluded,
        lead_status: leadStatus,
        notes: leadNotes,
      });
      setLeadFeedback(`Saved Proposal & Lead #${saved.id} (${saved.lead_status}).`);
    } catch (err) {
      setLeadFeedback((err as Error).message || 'Could not save proposal.');
    } finally {
      setSavingLead(false);
    }
  }

  async function handleRequestWebsite() {
    setRequestingWebsite(true);
    setWebsiteFeedback('');
    try {
      await onRequestWebsite({
        business_id: business.business_id,
        business_name: business.company || business.name,
        sector_slug: flagship_sector.slug,
        pattern_id: websitePreview.pattern_id,
        phone: business.phone,
        city: business.city,
        notes: `Requested ${websitePreview.pattern_title} website blueprint (${formatInr(4999)} One-Time).`,
      });
      setWebsiteFeedback(
        `Website request logged for "${websitePreview.pattern_title}"! Our VISTRAH Tech team will reach out shortly.`,
      );
    } catch (err) {
      setWebsiteFeedback((err as Error).message || 'Could not submit website request.');
    } finally {
      setRequestingWebsite(false);
    }
  }

  return (
    <div className={s.auditPage} data-audit-business={business.business_id}>
      {/* Print-only Branded Proposal Masthead */}
      <div className={s.printMasthead}>
        <div>
          <strong style={{ fontSize: '1.15rem', letterSpacing: '0.04em' }}>
            VISTRAH INDIA PVT LIMITED · ADS, MARKETING & DIGITAL TECH
          </strong>
          <div style={{ fontSize: '0.8rem' }}>
            7-Pillar Digital Presence Audit & Custom Growth Proposal · https://vistrah.in
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
          <strong>{business.company || business.name}</strong>
          <div>{flagship_sector.title}</div>
        </div>
      </div>

      {backHref && (
        <div className={`${s.topBackRow} ${s.noPrint}`}>
          <Link href={backHref} className="button secondary">
            ← {backLabel}
          </Link>
          <span style={{ fontSize: '0.8rem', opacity: 0.78 }}>
            {viewerMode === 'admin'
              ? 'Admin Business Audit & Strategy Mode'
              : 'Verified Owner Growth Workspace'}
          </span>
        </div>
      )}

      {/* MODULE 1: Business Hero & Instant Actions */}
      <section className={s.heroCard} aria-label="Business overview and actions">
        <div className={s.heroTop}>
          <div className={s.heroPhotoWrap}>
            {photoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoSrc}
                alt={`${business.company || business.name} storefront`}
                className={s.heroPhoto}
                onError={() => setPhotoFailed(true)}
              />
            ) : (
              <div className={s.heroPhotoFallback}>
                <Award size={28} aria-hidden="true" />
                <span>{business.is_claimed ? 'VISTRAH' : 'LOCAL'}</span>
              </div>
            )}
          </div>

          <div className={s.heroMeta}>
            <div className={s.badgeRow}>
              <span className={s.sectorBadge}>
                {flagship_sector.title} · {business.service_title}
              </span>
              {business.is_claimed ? (
                <span className={s.statusVerified}>
                  <CheckCircle2 size={13} aria-hidden="true" />
                  {business.verification_status === 'VERIFIED'
                    ? 'VISTRAH Verified'
                    : 'VISTRAH Claimed'}
                </span>
              ) : (
                <span className={s.statusGoogle}>
                  <MapPin size={13} aria-hidden="true" />
                  Google Listed
                </span>
              )}
              <span className={s.ratingPill}>
                <Star size={12} aria-hidden="true" />
                {business.rating ? business.rating.toFixed(1) : '4.7'} ★
              </span>
            </div>

            <h1 className={s.heroTitle}>{business.company || business.name}</h1>
            <p className={s.heroAddress}>
              {business.address || business.city}
              {business.city && !business.address?.includes(business.city)
                ? ` · ${business.city}`
                : ''}
            </p>
          </div>
        </div>

        <div className={s.heroActions}>
          {callHref && (
            <a href={callHref} className={s.actionBtn}>
              <Phone size={15} aria-hidden="true" />
              Call
            </a>
          )}
          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`${s.actionBtn} ${s.actionWhatsApp}`}
            >
              <MessageCircle size={15} aria-hidden="true" />
              WhatsApp
            </a>
          )}
          <a
            href={directionsHref}
            target="_blank"
            rel="noopener noreferrer"
            className={s.actionBtn}
          >
            <Navigation size={15} aria-hidden="true" />
            Directions
          </a>
          {live.effectiveWebsiteUrl && (
            <a
              href={live.effectiveWebsiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={s.actionBtn}
            >
              <Globe size={15} aria-hidden="true" />
              Website
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          )}
          {storefrontBaseUrl ? (
            <a
              href={freeVAdHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`${s.actionBtn} ${s.actionPrimaryGold}`}
            >
              <Video size={15} aria-hidden="true" />
              Create & Upload Free V Ad
            </a>
          ) : (
            <Link href={freeVAdHref} className={`${s.actionBtn} ${s.actionPrimaryGold}`}>
              <Video size={15} aria-hidden="true" />
              Create & Upload Free V Ad
            </Link>
          )}
        </div>
      </section>

      {/* MODULE 2: 7-Pillar Digital Presence Score Dashboard & Local Competitor Benchmark */}
      <section className={s.sectionCard} aria-label="7-Pillar Digital Presence Score Dashboard">
        <div>
          <p className={s.sectionEyebrow}>7-PILLAR DIGITAL PRESENCE DIAGNOSTIC</p>
          <h2 className={s.sectionHeading}>
            Baseline Score → Projected Growth Score & Local Competitor Benchmark
          </h2>
        </div>

        <div className={s.scoreGrid}>
          <div className={s.gaugeCard}>
            <div className={s.gaugeRingWrap}>
              <svg width="146" height="146" viewBox="0 0 146 146" aria-hidden="true">
                <circle
                  cx="73"
                  cy="73"
                  r={radius}
                  fill="none"
                  stroke="rgba(148,163,184,0.2)"
                  strokeWidth="12"
                />
                <circle
                  cx="73"
                  cy="73"
                  r={radius}
                  fill="none"
                  stroke="#d4af37"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={projectedDashOffset}
                  transform="rotate(-90 73 73)"
                  style={{ transition: 'stroke-dashoffset 280ms ease' }}
                />
              </svg>
              <div className={s.gaugeCenterText}>
                <span className={s.gaugeBigNumber}>{live.simulation.projected_score}</span>
                <span className={s.gaugeSubLabel}>/ 100 PTS</span>
              </div>
            </div>

            <div className={s.scoreDeltaRow}>
              <span>Baseline: {live.audit.baseline_score}/100</span>
              <span>→</span>
              <span>Projected: {live.simulation.projected_score}/100</span>
            </div>
            {live.simulation.score_gain > 0 && (
              <span className={s.gainPill}>+{live.simulation.score_gain} pts unlocked</span>
            )}
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            <div className={s.benchmarkBanner}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <TrendingUp size={20} color="#2563eb" aria-hidden="true" />
                <div>
                  <strong>
                    Local Competitor Benchmark ({competitor_benchmark.locality})
                  </strong>
                  <div style={{ fontSize: '0.84rem', opacity: 0.85 }}>
                    Same-sector average: <strong>{competitor_benchmark.average_score}/100</strong> ·
                    Top local performer: <strong>{competitor_benchmark.top_performer_score}/100</strong>
                  </div>
                </div>
              </div>
              <span className={s.pointsTag}>
                {live.audit.baseline_score >= competitor_benchmark.average_score
                  ? 'Above Local Average'
                  : `${competitor_benchmark.average_score - live.audit.baseline_score} pts behind peers`}
              </span>
            </div>

            <div className={s.lackingBlock}>
              <strong style={{ fontSize: '0.88rem' }}>
                What This Business Is Lacking ({live.audit.identified_gaps.length} gaps):
              </strong>
              {live.audit.identified_gaps.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#10b981', fontWeight: 700 }}>
                  All 7 Digital Presence Pillars are active (100/100)!
                </p>
              ) : (
                <div className={s.lackingPills}>
                  {live.audit.identified_gaps.map(gap => (
                    <span key={gap.pillar_id} className={s.lackingAlertBadge}>
                      <AlertTriangle size={13} aria-hidden="true" />
                      {gap.product_title} (-{gap.missing_points} pts)
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className={`${s.quickCheckGrid} ${s.noPrint}`}>
              <label className={s.quickField}>
                <span>Live Quick-Check: Website URL</span>
                <input
                  type="text"
                  value={websiteInput}
                  onChange={e => setWebsiteInput(e.target.value)}
                  placeholder="e.g. www.yourshop.in"
                  className={s.quickInput}
                />
              </label>
              <label className={s.quickField}>
                <span>Live Quick-Check: Instagram Handle / URL</span>
                <input
                  type="text"
                  value={instagramInput}
                  onChange={e => setInstagramInput(e.target.value)}
                  placeholder="e.g. @yourshop or instagram.com/..."
                  className={s.quickInput}
                />
              </label>
              <label className={s.quickField}>
                <span>Live Quick-Check: Facebook Page URL</span>
                <input
                  type="text"
                  value={facebookInput}
                  onChange={e => setFacebookInput(e.target.value)}
                  placeholder="e.g. facebook.com/yourshop"
                  className={s.quickInput}
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* MODULE 3: 7-Pillar = 7-Product Interactive Tick / Untick Configurator & Live Quote Cart */}
      <section className={s.sectionCard} aria-label="7-Pillar Product Configurator and Quote Cart">
        <div>
          <p className={s.sectionEyebrow}>7-PILLAR = 7-PRODUCT GROWTH CONFIGURATOR</p>
          <h2 className={s.sectionHeading}>
            Tick Pillars to Simulate Score Impact & Build Instant Growth Quote
          </h2>
        </div>

        {/* Pre-Filled "Upload Your Free V Ad Now" Shortcut when hyperlocal_v_ads is ticked or active */}
        {showFreeVAdUploadShortcut && (
          <div className={`${s.freeVAdShortcutCard} ${s.noPrint}`}>
            <div style={{ display: 'grid', gap: 3 }}>
              <strong style={{ fontSize: '0.94rem' }}>
                Any-Radius Hyperlocal V Ad (₹0 Free Forever) Unlocked
              </strong>
              <span style={{ fontSize: '0.82rem', opacity: 0.85 }}>
                Launch a 9:16 video Reel for {business.company || business.name} across 2 km, 10 km,
                25 km, or 50 km+ on VISTRAH at ₹0 forever.
              </span>
            </div>
            {storefrontBaseUrl ? (
              <a
                href={freeVAdHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`${s.actionBtn} ${s.actionPrimaryGold}`}
              >
                <Video size={15} aria-hidden="true" />
                Upload Your Free V Ad Now
              </a>
            ) : (
              <Link href={freeVAdHref} className={`${s.actionBtn} ${s.actionPrimaryGold}`}>
                <Video size={15} aria-hidden="true" />
                Upload Your Free V Ad Now
              </Link>
            )}
          </div>
        )}

        <div className={s.configuratorLayout}>
          <div className={s.pillarsList}>
            {live.audit.pillar_breakdown.map(pillar => {
              const isTicked =
                !pillar.active_in_baseline && tickedIds.includes(pillar.pillar_id);
              const isFree = pillar.billing_type === 'free_forever';
              return (
                <div
                  key={pillar.pillar_id}
                  className={`${s.pillarRow} ${
                    pillar.active_in_baseline
                      ? s.pillarRowActive
                      : isTicked
                        ? s.pillarRowTicked
                        : ''
                  }`}
                >
                  <div className={s.pillarTop}>
                    {pillar.active_in_baseline ? (
                      <div className={s.pillarCheckLabel}>
                        <ShieldCheck size={18} color="#10b981" aria-hidden="true" />
                        <span>{pillar.product_title}</span>
                      </div>
                    ) : (
                      <label className={s.pillarCheckLabel}>
                        <input
                          type="checkbox"
                          checked={isTicked}
                          onChange={() => togglePillar(pillar.pillar_id)}
                          className={s.pillarCheckbox}
                        />
                        <span>{pillar.product_title}</span>
                      </label>
                    )}

                    <div className={s.badgeRow}>
                      <span className={s.pointsTag}>+{pillar.max_points} pts</span>
                      <span className={isFree ? s.priceTagFree : s.priceTagPaid}>
                        {pillar.billing_label}
                      </span>
                      {pillar.active_in_baseline && (
                        <span className={s.activeBaselineBadge}>Active in Baseline</span>
                      )}
                    </div>
                  </div>

                  <div className={s.pillarBarTrack}>
                    {pillar.active_in_baseline ? (
                      <div className={s.pillarBarFillActive} />
                    ) : isTicked ? (
                      <div className={s.pillarBarFillTicked} />
                    ) : null}
                  </div>

                  <p className={s.pillarSummaryText}>{pillar.summary}</p>
                </div>
              );
            })}
          </div>

          <aside className={s.quoteCart} aria-label="Selected Products and Pricing Cart">
            <div>
              <p className={s.sectionEyebrow}>SELECTED PRODUCTS & PRICING CART</p>
              <h3 style={{ margin: '4px 0 0', fontSize: '1.05rem', fontWeight: 800 }}>
                Projected Score: {live.simulation.projected_score}/100
              </h3>
            </div>

            <div className={s.cartGroup}>
              <span className={s.cartGroupTitle}>
                Free on VISTRAH ({live.cart.freeItemsCount} selected)
              </span>
              {live.cart.freeItems.length === 0 ? (
                <span style={{ fontSize: '0.8rem', opacity: 0.72 }}>
                  Already active or unticked
                </span>
              ) : (
                live.cart.freeItems.map(item => (
                  <div key={item.id} className={s.cartLine}>
                    <span>{item.short_title}</span>
                    <strong style={{ color: '#10b981' }}>₹0 Free Forever</strong>
                  </div>
                ))
              )}
            </div>

            <div className={s.cartGroup}>
              <span className={s.cartGroupTitle}>One-Time Setup Products</span>
              {live.cart.oneTimeItems.length === 0 ? (
                <span style={{ fontSize: '0.8rem', opacity: 0.72 }}>None selected</span>
              ) : (
                live.cart.oneTimeItems.map(item => (
                  <div key={item.id} className={s.cartLine}>
                    <span>{item.short_title}</span>
                    <strong>{formatInr(item.unit_price_inr)}</strong>
                  </div>
                ))
              )}
              <div className={s.cartLine} style={{ paddingTop: 4 }}>
                <span>One-Time Setup Total</span>
                <strong>{formatInr(live.cart.oneTimeTotalInr)}</strong>
              </div>
            </div>

            <div className={s.cartGroup}>
              <span className={s.cartGroupTitle}>Monthly Growth Retainers</span>
              {live.cart.monthlyItems.length === 0 ? (
                <span style={{ fontSize: '0.8rem', opacity: 0.72 }}>None selected</span>
              ) : (
                live.cart.monthlyItems.map(item => (
                  <div key={item.id} className={s.cartLine}>
                    <span>{item.short_title}</span>
                    <strong>{formatInr(item.unit_price_inr)}/mo</strong>
                  </div>
                ))
              )}
              <div className={s.cartLine} style={{ paddingTop: 4 }}>
                <span>Monthly Retainer Total</span>
                <strong>{formatInr(live.cart.monthlyTotalInr)}/mo</strong>
              </div>
            </div>

            <div className={s.totalsBlock}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={gstIncluded}
                    onChange={e => setGstIncluded(e.target.checked)}
                  />
                  Include 18% GST
                </span>
                <span>{formatInr(live.cart.gstAmountInr)}</span>
              </label>

              <div className={s.grandTotalRow}>
                <span>Initial Payable Total</span>
                <span>{formatInr(live.cart.grandTotalWithGstInr)}</span>
              </div>
            </div>

            {viewerMode === 'admin' && (
              <div style={{ display: 'grid', gap: 8 }}>
                <label className={s.quickField}>
                  <span>Lead Pipeline Stage</span>
                  <select
                    value={leadStatus}
                    onChange={e => setLeadStatus(e.target.value as LeadStatus)}
                    className={s.quickInput}
                  >
                    {LEAD_STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={s.quickField}>
                  <span>Field Visit / Strategy Notes</span>
                  <textarea
                    rows={2}
                    value={leadNotes}
                    onChange={e => setLeadNotes(e.target.value)}
                    placeholder="Decision maker name, callback date, custom requirements…"
                    className={s.quickInput}
                  />
                </label>
              </div>
            )}

            <div className={s.noPrint} style={{ display: 'grid', gap: 8 }}>
              <button
                type="button"
                disabled={savingLead}
                onClick={() => void handleSaveProposal()}
                className={`${s.actionBtn} ${s.actionPrimaryGold}`}
                style={{ justifyContent: 'center', width: '100%' }}
              >
                <Sparkles size={15} aria-hidden="true" />
                {savingLead
                  ? 'Saving Proposal…'
                  : viewerMode === 'admin'
                    ? 'Save Proposal & Lead'
                    : 'Save & Discuss Growth Plan'}
              </button>

              <a
                href={proposalWhatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`${s.actionBtn} ${s.actionWhatsApp}`}
                style={{ justifyContent: 'center', width: '100%', color: '#047857' }}
              >
                <MessageCircle size={15} aria-hidden="true" />
                Send Proposal on WhatsApp
              </a>

              <button
                type="button"
                onClick={handlePrintProposal}
                className={s.actionBtn}
                style={{
                  justifyContent: 'center',
                  width: '100%',
                  color: 'inherit',
                  borderColor: 'rgba(148,163,184,0.45)',
                }}
              >
                <Printer size={15} aria-hidden="true" />
                Print / Save PDF Proposal
              </button>
            </div>

            {leadFeedback && (
              <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600 }}>{leadFeedback}</p>
            )}
          </aside>
        </div>
      </section>

      {/* MODULE 4 & 5: Live Vertical Website Pattern Preview & Strategy Playbook */}
      <section className={s.sectionCard} aria-label="Live Vertical Website Pattern Preview">
        <div className={s.previewHeaderRow}>
          <div>
            <p className={s.sectionEyebrow}>
              SECTOR WEBSITE BLUEPRINT · {flagship_sector.title.toUpperCase()}
            </p>
            <h2 className={s.sectionHeading}>
              {websitePreview.pattern_title} — Live Personalized Preview
            </h2>
          </div>

          <div className={s.viewportToggle} role="group" aria-label="Preview viewport size">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`${s.viewportBtn} ${viewport === 'desktop' ? s.viewportBtnActive : ''}`}
            >
              <Laptop size={14} style={{ verticalAlign: 'text-bottom', marginRight: 5 }} />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`${s.viewportBtn} ${viewport === 'mobile' ? s.viewportBtnActive : ''}`}
            >
              <Smartphone size={14} style={{ verticalAlign: 'text-bottom', marginRight: 5 }} />
              Mobile
            </button>
          </div>
        </div>

        <div className={s.browserFrameOuter}>
          <div
            className={
              viewport === 'mobile' ? s.browserMockupMobile : s.browserMockupDesktop
            }
          >
            <div className={s.browserChrome}>
              <span className={s.browserDots}>
                <span className={s.browserDot} />
                <span className={s.browserDot} />
                <span className={s.browserDot} />
              </span>
              <span>https://{websitePreview.domain_preview}</span>
              <span>SSL</span>
            </div>

            <div className={s.browserBody}>
              <div className={s.mockSiteNav}>
                <strong style={{ fontSize: '0.95rem' }}>
                  {business.company || business.name}
                </strong>
                {viewport === 'desktop' && (
                  <div className={s.mockSiteLinks}>
                    {websitePreview.nav_links.map(navItem => (
                      <span key={navItem}>{navItem}</span>
                    ))}
                  </div>
                )}
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: '#0f172a',
                    color: '#fde68a',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {websitePreview.contact_phone_display}
                </span>
              </div>

              <div className={s.mockHeroBanner}>
                <div className={s.badgeRow}>
                  {websitePreview.trust_badges.map(tb => (
                    <span
                      key={tb}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: 'rgba(255,255,255,0.14)',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                      }}
                    >
                      {tb}
                    </span>
                  ))}
                </div>
                <h3 style={{ margin: 0, fontSize: viewport === 'mobile' ? '1.1rem' : '1.35rem' }}>
                  {websitePreview.personalized_headline}
                </h3>
                <p style={{ margin: 0, fontSize: '0.84rem', opacity: 0.9 }}>
                  {websitePreview.personalized_subheadline}
                </p>
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '8px 14px',
                      borderRadius: 9,
                      background: '#d4af37',
                      color: '#0f172a',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                    }}
                  >
                    {websitePreview.conversion_cta} →
                  </span>
                </div>
              </div>

              <div
                className={s.mockSectionsGrid}
                style={viewport === 'mobile' ? { gridTemplateColumns: '1fr' } : undefined}
              >
                {websitePreview.key_sections.map((sec, idx) => (
                  <div key={sec} className={s.mockSectionTile}>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        color: '#b45309',
                        marginBottom: 4,
                      }}
                    >
                      MODULE 0{idx + 1}
                    </div>
                    {sec}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Vertical Conversion Strategy Breakdown + One-Click Request This Website */}
        <div style={{ display: 'grid', gap: 12, paddingTop: 6 }}>
          <div>
            <strong style={{ fontSize: '0.95rem' }}>
              Vertical Conversion Strategy ({flagship_sector.title}):
            </strong>
            <p className={s.pillarSummaryText} style={{ marginTop: 4 }}>
              {websitePreview.vertical_strategy.summary}
            </p>
          </div>

          <div className={s.strategyGrid}>
            {websitePreview.vertical_strategy.funnel_steps.map((stepText, idx) => (
              <div key={stepText} className={s.funnelStepCard}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b45309' }}>
                  STEP 0{idx + 1}
                </span>
                <strong>{stepText}</strong>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              paddingTop: 6,
            }}
          >
            <div style={{ fontSize: '0.86rem' }}>
              <strong>Launch "{websitePreview.pattern_title}" Website</strong> · ₹4,999 One-Time
              (Mobile + Desktop + WhatsApp Lead Capture)
            </div>
            <button
              type="button"
              disabled={requestingWebsite}
              onClick={() => void handleRequestWebsite()}
              className={`${s.actionBtn} ${s.actionPrimaryGold}`}
            >
              <Globe size={15} aria-hidden="true" />
              {requestingWebsite ? 'Submitting Request…' : 'Request This Website'}
            </button>
          </div>

          {websiteFeedback && (
            <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: '#10b981' }}>
              {websiteFeedback}
            </p>
          )}
        </div>
      </section>

      {/* SHOPFRONT "VISTRAH VERIFIED" QR STANDEE CARD (For Joined Businesses & Admin Preview) */}
      {(business.is_claimed || viewerMode === 'admin') && (
        <section className={s.sectionCard} aria-label="VISTRAH Verified QR Standee Card">
          <div>
            <p className={s.sectionEyebrow}>SHOPFRONT COUNTER & WINDOW STANDEE</p>
            <h2 className={s.sectionHeading}>
              VISTRAH Verified QR Card — Instant Customer Discovery & Offers
            </h2>
          </div>

          <div className={s.qrStandeeSection}>
            <div className={s.qrStandeePoster} data-qr-standee-url={qrStandeeUrl}>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  color: '#d4af37',
                }}
              >
                VISTRAH VERIFIED PARTNER
              </span>
              <strong style={{ fontSize: '1.08rem', color: '#ffffff' }}>
                {business.company || business.name}
              </strong>
              <span className={s.sectorBadge}>{flagship_sector.title}</span>

              <div className={s.qrWhiteTile}>
                <svg
                  width="176"
                  height="176"
                  viewBox={`0 0 ${qrSvgGraphic.viewBoxSize} ${qrSvgGraphic.viewBoxSize}`}
                  role="img"
                  aria-label={`VISTRAH QR code for ${business.company || business.name}`}
                >
                  <path d={qrSvgGraphic.pathD} fill="#0f172a" />
                </svg>
              </div>

              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fde68a' }}>
                Scan for Live Offers, V Ads & Direct Call
              </span>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', wordBreak: 'break-all' }}>
                {qrStandeeUrl}
              </span>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <QrCode size={20} color="#b45309" aria-hidden="true" />
                <strong>Ready for Shop Reception, Billing Desk, or Packaging</strong>
              </div>
              <p className={s.pillarSummaryText}>
                Walk-in customers scan this QR standee with any phone camera to open{' '}
                <strong>{business.company || business.name}</strong> directly on VISTRAH, watch your
                9:16 V Ads Reels, save your contact, and share your verified listing with neighbours.
              </p>

              <div className={`${s.badgeRow} ${s.noPrint}`}>
                <button
                  type="button"
                  onClick={handleDownloadQrStandee}
                  className={`${s.actionBtn} ${s.actionPrimaryGold}`}
                >
                  <Download size={15} aria-hidden="true" />
                  Download Printable QR Standee (SVG)
                </button>
                <button
                  type="button"
                  onClick={handlePrintProposal}
                  className={s.actionBtn}
                  style={{
                    color: 'inherit',
                    borderColor: 'rgba(148,163,184,0.45)',
                  }}
                >
                  <Printer size={15} aria-hidden="true" />
                  Print Standee & Proposal
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
