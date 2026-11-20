import {
  AUDIT_PILLARS,
  AUDIT_PILLAR_BY_ID,
  FLAGSHIP_SECTORS,
  calculateBusinessAuditScore,
  getFlagshipSector,
  getScoreTierLabel,
  simulateTickedPlan,
  type AuditPillarDefinition,
  type AuditPillarId,
  type BusinessAuditScoreResult,
  type FlagshipSector,
  type FlagshipSectorSlug,
  type ScoreTierLabel,
  type SimulatedTickedPlanResult,
} from './flagship-sectors.ts';
import { websiteExternalHref } from './nearby-services.ts';

export type LeadStatus =
  | 'new'
  | 'audit_shared'
  | 'follow_up'
  | 'website_requested'
  | 'closed';

export const LEAD_STATUS_OPTIONS: ReadonlyArray<{ value: LeadStatus; label: string }> = [
  { value: 'new', label: 'New Business' },
  { value: 'audit_shared', label: 'Plan Shared' },
  { value: 'follow_up', label: 'Follow-Up Planned' },
  { value: 'website_requested', label: 'Website Requested' },
  { value: 'closed', label: 'Confirmed / Started' },
];

export type MissingPillarFilterOption = {
  readonly key: string;
  readonly label: string;
  readonly apiValue: string;
};

export const MISSING_PILLAR_FILTERS: readonly MissingPillarFilterOption[] = [
  { key: 'all', label: 'All Businesses', apiValue: '' },
  { key: 'missing_website', label: 'No Website Yet', apiValue: 'missing_website' },
  { key: 'unclaimed_vistrah', label: 'Not Listed on VISTRAH', apiValue: 'unclaimed_vistrah' },
  { key: 'no_v_ad', label: 'No Free V Ad Running', apiValue: 'no_v_ad' },
  { key: 'missing_social_media', label: 'Low Instagram / Facebook', apiValue: 'missing_social_media' },
  { key: 'score_below_50', label: 'Score Below 50', apiValue: 'score_below_50' },
] as const;

export type AuditExploreBusinessItem = {
  business_id: string;
  source: 'vistrah' | 'google_places';
  provider_id: number | null;
  google_place_id: string | null;
  owner_user_id: number | null;
  business_name: string;
  sector_slug: string;
  sector_title: string;
  service_type: string;
  service_title: string;
  city: string;
  address: string;
  phone: string;
  website_url: string | null;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  baseline_score: number;
  identified_gaps: BusinessAuditScoreResult['identified_gaps'];
  gap_codes: string[];
  lead_id?: number | null;
  lead_status?: LeadStatus | null;
};

export type AuditExploreResponse = {
  total: number;
  sector: string;
  items: AuditExploreBusinessItem[];
};

export type SavedAuditLead = {
  id: number;
  business_id: string;
  google_place_id: string | null;
  provider_id: number | null;
  business_name: string;
  sector_slug: string;
  service_type: string;
  city: string;
  phone: string;
  baseline_score: number;
  projected_score: number;
  ticked_pillar_ids: AuditPillarId[];
  one_time_total_inr: number;
  monthly_total_inr: number;
  gst_included: boolean;
  gst_amount_inr: number;
  grand_total_with_gst_inr: number;
  lead_status: LeadStatus;
  notes: string;
  created_by_user_id: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AuditLeadsListResponse = {
  total: number;
  items: SavedAuditLead[];
};

export type BusinessAuditProfileEntity = {
  business_id: string;
  source: 'vistrah' | 'google_places';
  provider_id: number | null;
  google_place_id: string | null;
  owner_user_id: number | null;
  is_claimed: boolean;
  verification_status: string;
  name: string;
  company: string;
  contact_name: string;
  sector_slug: string;
  sector_title: string;
  service_type: string;
  service_title: string;
  address: string;
  city: string;
  phone: string;
  whatsapp: string;
  website_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  rating?: number | null;
};

export type CompetitorBenchmark = {
  average_score: number;
  top_performer_score: number;
  sample_size: number;
  sector_slug: string;
  locality: string;
};

export type BusinessProfileResponse = {
  business: BusinessAuditProfileEntity;
  audit: BusinessAuditScoreResult;
  default_plan: SimulatedTickedPlanResult;
  flagship_sector: FlagshipSector;
  pillars_catalog: AuditPillarDefinition[];
  competitor_benchmark: CompetitorBenchmark;
  saved_lead: SavedAuditLead | null;
};

export type QuickCheckOverrides = {
  instagramInput?: string;
  facebookInput?: string;
  websiteInput?: string;
};

export type LiveQuoteCartSummary = {
  freeItems: AuditPillarDefinition[];
  oneTimeItems: AuditPillarDefinition[];
  monthlyItems: AuditPillarDefinition[];
  freeItemsCount: number;
  oneTimeTotalInr: number;
  monthlyTotalInr: number;
  subtotalBeforeGstInr: number;
  gstIncluded: boolean;
  gstAmountInr: number;
  oneTimeGstInr: number;
  monthlyGstInr: number;
  grandTotalWithGstInr: number;
};

export type LiveRecalculatedAuditState = {
  effectiveWebsiteUrl: string | null;
  effectiveInstagramUrl: string | null;
  effectiveFacebookUrl: string | null;
  audit: BusinessAuditScoreResult;
  simulation: SimulatedTickedPlanResult;
  cart: LiveQuoteCartSummary;
};

export function normalizeQuickSocialOrWebInput(
  rawValue: string | null | undefined,
  kind: 'instagram' | 'facebook' | 'website',
): string | null {
  if (!rawValue) return null;
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  if (kind === 'instagram') {
    const cleanHandle = trimmed.replace(/^@+/, '');
    if (/^[A-Za-z0-9._]{2,60}$/.test(cleanHandle) && !cleanHandle.includes('.com')) {
      return `https://instagram.com/${cleanHandle}`;
    }
  }
  if (kind === 'facebook') {
    const cleanHandle = trimmed.replace(/^@+/, '');
    if (/^[A-Za-z0-9._-]{2,80}$/.test(cleanHandle) && !cleanHandle.includes('.')) {
      return `https://facebook.com/${cleanHandle}`;
    }
  }
  return websiteExternalHref(trimmed);
}

/**
 * Recalculates baseline score, lacking pillars, projected score, and quote cart totals
 * in real time from inline Quick-Check inputs + ticked pillar checkboxes + GST toggle.
 */
export function recalculateLiveAuditState(params: {
  business: Pick<
    BusinessAuditProfileEntity,
    | 'is_claimed'
    | 'website_url'
    | 'instagram_url'
    | 'facebook_url'
    | 'photo_url'
    | 'google_place_id'
    | 'phone'
    | 'latitude'
    | 'longitude'
  >;
  hasActiveVAd: boolean;
  hasPaidCampaigns?: boolean;
  quickCheck?: QuickCheckOverrides;
  tickedPillarIds: readonly string[];
  gstIncluded: boolean;
}): LiveRecalculatedAuditState {
  const qc = params.quickCheck ?? {};
  const effectiveWebsiteUrl =
    qc.websiteInput !== undefined
      ? normalizeQuickSocialOrWebInput(qc.websiteInput, 'website')
      : websiteExternalHref(params.business.website_url);

  const effectiveInstagramUrl =
    qc.instagramInput !== undefined
      ? normalizeQuickSocialOrWebInput(qc.instagramInput, 'instagram')
      : normalizeQuickSocialOrWebInput(params.business.instagram_url, 'instagram');

  const effectiveFacebookUrl =
    qc.facebookInput !== undefined
      ? normalizeQuickSocialOrWebInput(qc.facebookInput, 'facebook')
      : normalizeQuickSocialOrWebInput(params.business.facebook_url, 'facebook');

  const audit = calculateBusinessAuditScore({
    is_vistrah_claimed: params.business.is_claimed,
    website_url: effectiveWebsiteUrl,
    has_active_v_ad: params.hasActiveVAd,
    instagram_url: effectiveInstagramUrl,
    facebook_url: effectiveFacebookUrl,
    has_paid_campaigns: Boolean(params.hasPaidCampaigns),
    photo_url: params.business.photo_url,
    google_place_id: params.business.google_place_id,
    phone: params.business.phone,
    has_coordinates:
      params.business.latitude !== null &&
      params.business.latitude !== undefined &&
      params.business.longitude !== null &&
      params.business.longitude !== undefined,
  });

  const simulation = simulateTickedPlan(audit, params.tickedPillarIds, {
    gstIncluded: params.gstIncluded,
  });

  const freeItems: AuditPillarDefinition[] = [];
  const oneTimeItems: AuditPillarDefinition[] = [];
  const monthlyItems: AuditPillarDefinition[] = [];

  for (const pid of simulation.newly_added_pillar_ids) {
    const def = AUDIT_PILLAR_BY_ID[pid];
    if (def.billing_type === 'free_forever') freeItems.push(def);
    else if (def.billing_type === 'one_time') oneTimeItems.push(def);
    else if (def.billing_type === 'monthly') monthlyItems.push(def);
  }

  return {
    effectiveWebsiteUrl,
    effectiveInstagramUrl,
    effectiveFacebookUrl,
    audit,
    simulation,
    cart: {
      freeItems,
      oneTimeItems,
      monthlyItems,
      freeItemsCount: simulation.free_items_count,
      oneTimeTotalInr: simulation.one_time_total_inr,
      monthlyTotalInr: simulation.monthly_total_inr,
      subtotalBeforeGstInr: simulation.subtotal_before_gst_inr,
      gstIncluded: simulation.gst_included,
      gstAmountInr: simulation.gst_amount_inr,
      oneTimeGstInr: simulation.one_time_gst_inr,
      monthlyGstInr: simulation.monthly_gst_inr,
      grandTotalWithGstInr: simulation.grand_total_with_gst_inr,
    },
  };
}

export type PersonalizedWebsitePreview = {
  sector_slug: FlagshipSectorSlug;
  sector_title: string;
  pattern_id: string;
  pattern_title: string;
  layout_archetype: string;
  domain_preview: string;
  personalized_headline: string;
  personalized_subheadline: string;
  nav_links: string[];
  trust_badges: string[];
  key_sections: readonly string[];
  conversion_cta: string;
  contact_phone_display: string;
  city_display: string;
  vertical_strategy: FlagshipSector['vertical_strategy'];
};

export function renderPersonalizedWebsitePreview(input: {
  sectorSlug: string;
  businessName: string;
  city?: string | null;
  phone?: string | null;
  serviceTitle?: string | null;
}): PersonalizedWebsitePreview {
  const sector = getFlagshipSector(input.sectorSlug) ?? FLAGSHIP_SECTORS[0];
  const bizName = (input.businessName || '').trim() || 'Your Business';
  const cityName = (input.city || '').trim() || 'Your City';
  const phoneText = (input.phone || '').trim() || '+91 98XXX XXXXX';
  const svcText = (input.serviceTitle || '').trim() || sector.shortTitle;

  const domainSlug =
    bizName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 24) || 'yourbusiness';

  const headline = sector.website_pattern.hero_headline_template
    .replace('{business_name}', bizName)
    .replace('{city}', cityName);

  return {
    sector_slug: sector.slug,
    sector_title: sector.title,
    pattern_id: sector.website_pattern.pattern_id,
    pattern_title: sector.website_pattern.pattern_title,
    layout_archetype: sector.website_pattern.layout_archetype,
    domain_preview: `${domainSlug}.in`,
    personalized_headline: headline,
    personalized_subheadline: `Trusted ${svcText} in ${cityName} · Direct phone & WhatsApp inquiries with zero commission.`,
    nav_links: ['Home', 'Services & Prices', 'Photos & Work', 'Contact & Map'],
    trust_badges: ['Verified on VISTRAH', `Serving ${cityName}`, 'Direct WhatsApp & Call'],
    key_sections: sector.website_pattern.key_sections,
    conversion_cta: sector.website_pattern.conversion_cta,
    contact_phone_display: phoneText,
    city_display: cityName,
    vertical_strategy: sector.vertical_strategy,
  };
}

export type AuditAccessDecision =
  | { allowed: true; mode: 'admin' | 'owner' }
  | { allowed: false; reason: 'sign_in_required' | 'access_restricted' };

export function evaluateBusinessAuditAccess(input: {
  viewer: { id: number; role?: string | null } | null | undefined;
  targetBusinessId: string;
  ownedBusinesses?: ReadonlyArray<{ id: number; google_place_id?: string | null }> | null;
  loadedOwnerUserId?: number | null;
  httpStatus?: number | null;
}): AuditAccessDecision {
  if (!input.viewer) {
    return { allowed: false, reason: 'sign_in_required' };
  }
  if (String(input.viewer.role || '').toUpperCase() === 'ADMIN') {
    return { allowed: true, mode: 'admin' };
  }
  if (input.httpStatus === 403 || input.httpStatus === 404) {
    return { allowed: false, reason: 'access_restricted' };
  }
  if (
    input.loadedOwnerUserId !== undefined &&
    input.loadedOwnerUserId !== null &&
    Number(input.loadedOwnerUserId) === Number(input.viewer.id)
  ) {
    return { allowed: true, mode: 'owner' };
  }

  const raw = input.targetBusinessId.trim();
  const cleanPlace = raw.startsWith('gp_') && raw.length > 3 ? raw.slice(3) : raw;
  const numericId = /^[1-9]\d*$/.test(raw) ? Number(raw) : null;

  if (Array.isArray(input.ownedBusinesses)) {
    const matched = input.ownedBusinesses.some(
      b =>
        (numericId !== null && b.id === numericId) ||
        (Boolean(b.google_place_id) && b.google_place_id === cleanPlace),
    );
    if (matched) {
      return { allowed: true, mode: 'owner' };
    }
    return { allowed: false, reason: 'access_restricted' };
  }

  return { allowed: false, reason: 'access_restricted' };
}

export function formatInr(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '₹0';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function buildQrStandeeListingUrl(params: {
  businessName: string;
  sectorSlug: string;
  serviceType?: string | null;
  city?: string | null;
  baseOrigin?: string;
}): string {
  const origin = (params.baseOrigin || 'https://vistrah.in').replace(/\/+$/, '');
  const qs = new URLSearchParams();
  const biz = (params.businessName || '').trim().slice(0, 140);
  if (biz) qs.set('business', biz);
  const sector = (params.sectorSlug || '').trim();
  if (sector) qs.set('category', sector);
  const svc = (params.serviceType || '').trim();
  if (svc) qs.set('type', svc);
  const loc = (params.city || '').trim().slice(0, 100);
  if (loc) qs.set('locality', loc);
  return `${origin}/services/nearby?${qs.toString()}`;
}

export function buildPrefilledFreeVAdHref(params: {
  businessName: string;
  sectorSlug: string;
  serviceType?: string | null;
  city?: string | null;
  storefrontBaseUrl?: string;
}): string {
  const prefix = (params.storefrontBaseUrl || '').replace(/\/+$/, '');
  const qs = new URLSearchParams();
  qs.set('tab', 'upload');
  const biz = (params.businessName || '').trim().slice(0, 140);
  if (biz) qs.set('business', biz);
  const sector = (params.sectorSlug || '').trim();
  if (sector) qs.set('category', sector);
  const svc = (params.serviceType || '').trim();
  if (svc) qs.set('type', svc);
  const loc = (params.city || '').trim().slice(0, 120);
  if (loc) qs.set('locality', loc);
  return `${prefix}/seller/v-ads?${qs.toString()}`;
}

export type FreeVAdPrefillFields = {
  hasPrefill: boolean;
  adType: 'BRAND' | 'PRODUCT';
  title: string;
  productsAvailable: string;
  videoDescription: string;
  bannerText: string;
};

function humanizeSlugLabel(slug: string): string {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase())
    .trim();
}

export function deriveFreeVAdPrefillFromParams(params: {
  business?: string | null;
  category?: string | null;
  type?: string | null;
  locality?: string | null;
}): FreeVAdPrefillFields {
  const biz = (params.business || '').trim();
  const catSlug = (params.category || '').trim();
  const typeSlug = (params.type || '').trim();
  const loc = (params.locality || '').trim();

  if (!biz && !catSlug && !typeSlug && !loc) {
    return {
      hasPrefill: false,
      adType: 'PRODUCT',
      title: '',
      productsAvailable: '',
      videoDescription: '',
      bannerText: '',
    };
  }

  const sectorObj = catSlug ? getFlagshipSector(catSlug) : undefined;
  const sectorLabel = sectorObj?.title || (catSlug ? humanizeSlugLabel(catSlug) : 'Local Services');
  const serviceLabel = typeSlug ? humanizeSlugLabel(typeSlug) : sectorObj?.shortTitle || sectorLabel;

  const titleParts = [biz || serviceLabel, serviceLabel !== biz ? serviceLabel : null]
    .filter(Boolean)
    .join(' — ');
  const fullTitle = (loc ? `${titleParts} in ${loc}` : titleParts).slice(0, 160);

  const productsAvailable = `${sectorLabel} · ${serviceLabel}${loc ? ` (${loc})` : ''}`.slice(
    0,
    200,
  );
  const videoDescription = [
    biz ? `${biz}${loc ? ` (${loc})` : ''}` : null,
    `Verified ${sectorLabel} — ${serviceLabel}.`,
    loc ? `Serving ${loc} and nearby areas with direct zero-commission inquiries on VISTRAH.` : null,
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 2000);

  const bannerText = `Pre-filled for ${biz || 'your business'} · ${sectorLabel}${
    typeSlug ? ` (${serviceLabel})` : ''
  }${loc ? ` · ${loc}` : ''}`;

  return {
    hasPrefill: true,
    adType: 'BRAND',
    title: fullTitle,
    productsAvailable,
    videoDescription,
    bannerText,
  };
}

export function splitPlanPillars<
  T extends { pillar_id: AuditPillarId; billing_type: string; group?: string },
>(
  breakdown: readonly T[],
): {
  mainServices: T[];
  otherPerks: T[];
} {
  const mainServices: T[] = [];
  const otherPerks: T[] = [];
  for (const item of breakdown) {
    const isPerk =
      item.group === 'other_perk' ||
      item.billing_type === 'free_forever' ||
      item.pillar_id === 'vistrah_presence' ||
      item.pillar_id === 'hyperlocal_v_ads';
    if (isPerk) {
      otherPerks.push(item);
    } else {
      mainServices.push(item);
    }
  }
  return { mainServices, otherPerks };
}

export function isFreeVAdPillarActiveOrTicked(
  audit: BusinessAuditScoreResult,
  tickedPillarIds: readonly string[],
): boolean {
  const activeInBaseline = Boolean(
    audit.pillar_breakdown.find(p => p.pillar_id === 'hyperlocal_v_ads')?.active_in_baseline,
  );
  return activeInBaseline || tickedPillarIds.includes('hyperlocal_v_ads');
}

export function buildWhatsAppProposalMessage(input: {
  businessName: string;
  sectorTitle: string;
  city?: string | null;
  audit: BusinessAuditScoreResult;
  simulation: SimulatedTickedPlanResult;
  cart: LiveQuoteCartSummary;
  websitePatternTitle: string;
}): string {
  const biz = (input.businessName || '').trim() || 'Your Business';
  const loc = (input.city || '').trim();
  const baselineTier = getScoreTierLabel(input.audit.baseline_score);
  const projectedTier = getScoreTierLabel(input.simulation.projected_score);

  const topGaps = input.audit.identified_gaps
    .slice(0, 4)
    .map(g => `• ${g.summary} (-${g.missing_points} pts)`);

  const mainServiceLines: string[] = [];
  for (const item of input.cart.oneTimeItems) {
    mainServiceLines.push(`✓ ${item.product_title}: ${formatInr(item.unit_price_inr)} One-Time`);
  }
  for (const item of input.cart.monthlyItems) {
    mainServiceLines.push(`✓ ${item.product_title}: ${formatInr(item.unit_price_inr)} / month`);
  }

  const otherPerkLines: string[] = [];
  for (const item of input.cart.freeItems) {
    otherPerkLines.push(`✓ ${item.product_title}: ₹0 — Free Forever`);
  }

  const lines: string[] = [
    `*VISTRAH — Your Online Presence & Customer Growth Plan*`,
    `Business: *${biz}*${loc ? ` (${loc})` : ''}`,
    `Category: ${input.sectorTitle}`,
    ``,
    `*How Easy Customers Can Find You (0–100):*`,
    `Current: *${input.audit.baseline_score}/100* (${baselineTier}) → With Selected Plan: *${input.simulation.projected_score}/100* (${projectedTier}, +${input.simulation.score_gain} pts)`,
  ];

  if (topGaps.length > 0) {
    lines.push(``, `*What You Are Missing Right Now:*`, ...topGaps);
  }

  if (mainServiceLines.length > 0) {
    lines.push(``, `*Your Selected Plan:*`, ...mainServiceLines);
  }

  if (otherPerkLines.length > 0) {
    lines.push(``, `*Other Perks (Free on VISTRAH):*`, ...otherPerkLines);
  }

  lines.push(
    ``,
    `*Sample Website for Your Business:* ${input.websitePatternTitle}`,
    `*Your Total Cost:*`,
    `• One-Time Setup Total: ${formatInr(input.cart.oneTimeTotalInr)}`,
    `• Monthly Services Total: ${formatInr(input.cart.monthlyTotalInr)} / month`,
    `• Other Perks (${input.cart.freeItemsCount} included): ₹0 — Free Forever`,
    input.cart.gstIncluded
      ? `• 18% GST: ${formatInr(input.cart.gstAmountInr)} | Total to Start: *${formatInr(input.cart.grandTotalWithGstInr)}*`
      : `• Total to Start (Before GST): *${formatInr(input.cart.subtotalBeforeGstInr)}*`,
    ``,
    `Get listed free & post free local V Ads at https://vistrah.in`,
  );

  return lines.join('\n');
}

export function buildWhatsAppProposalHref(
  rawPhone: string | null | undefined,
  proposalMessage: string,
): string {
  const encoded = encodeURIComponent(proposalMessage);
  if (!rawPhone) return `https://wa.me/?text=${encoded}`;
  let digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  if (digits.length < 10 || digits.length > 15) {
    return `https://wa.me/?text=${encoded}`;
  }
  return `https://wa.me/${digits}?text=${encoded}`;
}

export { AUDIT_PILLARS, FLAGSHIP_SECTORS, getScoreTierLabel };
export type { AuditPillarId, ScoreTierLabel };
