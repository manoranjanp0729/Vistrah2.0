import sectorPresets from './final-sector-presets.json' with {type: 'json'};
export type FlagshipSectorSlug =
  | 'restaurants-and-dining'
  | 'hotels-and-stay'
  | 'vehicle-rentals'
  | 'event-management'
  | 'hospitals-and-labs'
  | 'education-and-skills'
  | 'salons-and-beauty-parlour'
  | 'civil-and-construction'
  | 'fuel-and-charging-stations'
  | 'vibe-finder';

export type AuditPillarId =
  | 'vistrah_presence'
  | 'dedicated_website'
  | 'hyperlocal_v_ads'
  | 'social_media_reach'
  | 'paid_ad_campaigns'
  | 'visual_brand_media'
  | 'google_local_seo';

export type AuditBillingType = 'free_forever' | 'one_time' | 'monthly';
export type AuditPillarGroup = 'main_service' | 'other_perk';

export type ScoreTierLabel =
  | 'Hard to Find Online'
  | 'Seen, But Losing Customers'
  | 'Good Local Reach'
  | 'Top Choice in Your Area';

export function getScoreTierLabel(score: number): ScoreTierLabel {
  const s = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
  if (s >= 90) return 'Top Choice in Your Area';
  if (s >= 70) return 'Good Local Reach';
  if (s >= 40) return 'Seen, But Losing Customers';
  return 'Hard to Find Online';
}

export type AuditPillarDefinition = {
  readonly id: AuditPillarId;
  readonly group: AuditPillarGroup;
  readonly product_title: string;
  readonly short_title: string;
  readonly max_points: number;
  readonly unit_price_inr: number;
  readonly billing_type: AuditBillingType;
  readonly billing_label: string;
  readonly gap_code: string;
  readonly description: string;
  readonly active_summary: string;
  readonly gap_summary: string;
  readonly deliverable_highlights: readonly string[];
};

export type SectorWebsitePattern = {
  readonly pattern_id: string;
  readonly pattern_title: string;
  readonly layout_archetype: string;
  readonly hero_headline_template: string;
  readonly key_sections: readonly string[];
  readonly conversion_cta: string;
};

export type SectorVerticalStrategy = {
  readonly plan_heading: string;
  readonly summary: string;
  readonly funnel_steps: readonly string[];
  readonly recommended_pillar_ids: readonly AuditPillarId[];
};

export type FlagshipSector = {
  readonly order: number;
  readonly slug: FlagshipSectorSlug;
  readonly title: string;
  readonly shortTitle: string;
  readonly description: string;
  readonly icon:
    | 'layers'
    | 'home'
    | 'tool'
    | 'heart'
    | 'coffee'
    | 'scissors'
    | 'camera'
    | 'truck'
    | 'briefcase'
    | 'book';
  readonly heroImage: string;
  readonly defaultSubcategorySlug: string;
  readonly defaultTypeSlug: string;
  readonly serviceTypes: readonly {readonly slug: string; readonly title: string}[];
  readonly website_pattern: SectorWebsitePattern;
  readonly vertical_strategy: SectorVerticalStrategy;
};

export const GST_RATE_PERCENT = 18;
export const TOTAL_AUDIT_POINTS = 100;

/**
 * 7 Plain-Language Customer Growth Options (Total = 100 Points):
 * - First 5: Main Social, Website & Marketing Services (`group: 'main_service'`)
 * - Last 2: Other Perks — Free on VISTRAH (`group: 'other_perk'`)
 */
export const AUDIT_PILLARS: readonly AuditPillarDefinition[] = [
  {
    id: 'dedicated_website',
    group: 'main_service',
    product_title: 'Your Own Business Website',
    short_title: 'Your Own Business Website',
    max_points: 20,
    unit_price_inr: 4999,
    billing_type: 'one_time',
    billing_label: '₹4,999 One-Time',
    gap_code: 'missing_website',
    description:
      'A clean website showing your photos, services, and a direct WhatsApp inquiry button.',
    active_summary:
      'A clean website showing your photos, services, and a direct WhatsApp inquiry button.',
    gap_summary: "No website yet — customers can't check your full work, prices, or book online.",
    deliverable_highlights: [
      'Works smoothly on phones and computers, tailored to your business',
      'One-tap WhatsApp inquiry, direct call button, and Google Maps pin',
      'Fast, secure website setup ready to share on WhatsApp & visiting cards',
    ],
  },
  {
    id: 'social_media_reach',
    group: 'main_service',
    product_title: 'Instagram & Facebook Reels + Page Care',
    short_title: 'Instagram & Facebook Reels',
    max_points: 15,
    unit_price_inr: 4999,
    billing_type: 'monthly',
    billing_label: '₹4,999 / month',
    gap_code: 'missing_social_media',
    description: 'We create short videos and post regularly so local customers remember you.',
    active_summary: 'We create short videos and post regularly so local customers remember you.',
    gap_summary: 'Low Instagram & Facebook activity — customers rarely see updates from you.',
    deliverable_highlights: [
      'Regular short Reels, photo posts, and festival greetings for your business',
      'Clean video editing, simple captions, and local area tags',
      'Complete monthly care of your Instagram and Facebook pages',
    ],
  },
  {
    id: 'paid_ad_campaigns',
    group: 'main_service',
    product_title: 'Instagram & Facebook Customer Ads',
    short_title: 'Instagram & Facebook Ads',
    max_points: 10,
    unit_price_inr: 3999,
    billing_type: 'monthly',
    billing_label: '₹3,999 / month',
    gap_code: 'no_paid_campaigns',
    description: 'Run local ads that bring daily phone calls and WhatsApp messages.',
    active_summary: 'Run local ads that bring daily phone calls and WhatsApp messages.',
    gap_summary:
      'Not running local Instagram/Facebook ads — competitors are capturing nearby leads.',
    deliverable_highlights: [
      'Local ads shown to families and buyers near your shop or city',
      'Direct WhatsApp message and phone call buttons on every ad',
      'Zero extra markup on ad budget paid to Instagram & Facebook',
    ],
  },
  {
    id: 'visual_brand_media',
    group: 'main_service',
    product_title: 'Professional Shop & Work Photos/Videos',
    short_title: 'Shop & Work Photos/Videos',
    max_points: 10,
    unit_price_inr: 2999,
    billing_type: 'one_time',
    billing_label: '₹2,999 One-Time',
    gap_code: 'missing_visual_media',
    description:
      'Clear, attractive photos and videos of your shop and work that build instant trust.',
    active_summary:
      'Clear, attractive photos and videos of your shop and work that build instant trust.',
    gap_summary:
      'Missing good shop & work photos — customers hesitate without seeing your place.',
    deliverable_highlights: [
      'Bright, clear photos of your shopfront, team, and real work',
      'Ready-to-share short video for Free V Ads, WhatsApp, and Instagram',
      'Photos sized cleanly for your VISTRAH listing, Google Maps, and website',
    ],
  },
  {
    id: 'google_local_seo',
    group: 'main_service',
    product_title: 'Rank Higher on Google Search & Maps',
    short_title: 'Google Search & Maps Boost',
    max_points: 10,
    unit_price_inr: 2499,
    billing_type: 'one_time',
    billing_label: '₹2,499 One-Time',
    gap_code: 'weak_local_seo',
    description: 'Help your business appear at the top when people search on Google near you.',
    active_summary: 'Help your business appear at the top when people search on Google near you.',
    gap_summary:
      'Few Google reviews or weak Google Maps profile — harder to rank in top local searches.',
    deliverable_highlights: [
      'Proper setup of your Google Business services, timings, and search words',
      'Exact Google Map pin, phone number, and address check',
      'Simple steps to collect more genuine 5-star customer reviews',
    ],
  },
  {
    id: 'vistrah_presence',
    group: 'other_perk',
    product_title: 'Get Listed on VISTRAH',
    short_title: 'Get Listed on VISTRAH',
    max_points: 20,
    unit_price_inr: 0,
    billing_type: 'free_forever',
    billing_label: '₹0 — Free Forever',
    gap_code: 'unclaimed_vistrah',
    description: 'Let nearby customers find your shop, call you, and get directions on VISTRAH.',
    active_summary: 'Let nearby customers find your shop, call you, and get directions on VISTRAH.',
    gap_summary: "Not listed on VISTRAH yet — nearby customers can't find you here.",
    deliverable_highlights: [
      'Verified business badge for your shop in your local area',
      'Direct phone call, WhatsApp, and map directions with zero commission',
      'Full access to your Online Presence & Customer Growth Check page',
    ],
  },
  {
    id: 'hyperlocal_v_ads',
    group: 'other_perk',
    product_title: 'Free Local Area Ads (V Ads)',
    short_title: 'Free Local Area Ads (V Ads)',
    max_points: 15,
    unit_price_inr: 0,
    billing_type: 'free_forever',
    billing_label: '₹0 — Free Forever',
    gap_code: 'no_v_ad',
    description: 'Show your offer video to people living and traveling near your business.',
    active_summary: 'Show your offer video to people living and traveling near your business.',
    gap_summary: "No free local V Ad running — you're missing free visibility in your area.",
    deliverable_highlights: [
      'Short vertical video shown to local people on the VISTRAH V Ads feed',
      'Reach 2 km, 10 km, 25 km, 50 km+ or any distance at ₹0 forever',
      'Direct call and shop details shown right below your video',
    ],
  },
] as const;

export const AUDIT_PILLAR_IDS: readonly AuditPillarId[] = AUDIT_PILLARS.map(p => p.id);

export const AUDIT_PILLAR_BY_ID: Readonly<Record<AuditPillarId, AuditPillarDefinition>> =
  Object.fromEntries(AUDIT_PILLARS.map(p => [p.id, p])) as Record<
    AuditPillarId,
    AuditPillarDefinition
  >;

export const FLAGSHIP_SECTORS: readonly FlagshipSector[] = sectorPresets as readonly FlagshipSector[];

export const FLAGSHIP_SECTOR_SLUGS: readonly FlagshipSectorSlug[] = FLAGSHIP_SECTORS.map(
  s => s.slug,
);

const SECTOR_BY_SLUG = new Map<string, FlagshipSector>(
  FLAGSHIP_SECTORS.map(sector => [sector.slug, sector]),
);

export function getFlagshipSector(slug: string | null | undefined): FlagshipSector | undefined {
  if (!slug) return undefined;
  return SECTOR_BY_SLUG.get(slug.trim().toLowerCase());
}

export type BusinessAuditSignals = {
  is_vistrah_claimed?: boolean;
  has_website?: boolean;
  website_url?: string | null;
  has_active_v_ad?: boolean;
  has_social_presence?: boolean;
  instagram_url?: string | null;
  facebook_url?: string | null;
  has_paid_campaigns?: boolean;
  has_visual_media?: boolean;
  photo_url?: string | null;
  has_google_local_seo?: boolean;
  google_place_id?: string | null;
  phone?: string | null;
  has_coordinates?: boolean;
};

export type PillarBreakdownItem = {
  pillar_id: AuditPillarId;
  group: AuditPillarGroup;
  product_title: string;
  short_title: string;
  max_points: number;
  earned_points: number;
  status: 'active' | 'lacking';
  active_in_baseline: boolean;
  unit_price_inr: number;
  billing_type: AuditBillingType;
  billing_label: string;
  gap_code: string;
  description: string;
  summary: string;
  deliverable_highlights: readonly string[];
};

export type IdentifiedGapItem = {
  pillar_id: AuditPillarId;
  gap_code: string;
  product_title: string;
  missing_points: number;
  unit_price_inr: number;
  billing_type: AuditBillingType;
  billing_label: string;
  summary: string;
};

export type BusinessAuditScoreResult = {
  baseline_score: number;
  score_tier_label: ScoreTierLabel;
  max_score: 100;
  pillar_breakdown: PillarBreakdownItem[];
  identified_gaps: IdentifiedGapItem[];
  gap_codes: string[];
};

export type SimulatedTickedPlanResult = {
  baseline_score: number;
  projected_score: number;
  projected_tier_label: ScoreTierLabel;
  score_gain: number;
  ticked_pillar_ids: AuditPillarId[];
  newly_added_pillar_ids: AuditPillarId[];
  free_items_count: number;
  one_time_total_inr: number;
  monthly_total_inr: number;
  subtotal_before_gst_inr: number;
  gst_included: boolean;
  gst_rate_percent: 18;
  gst_amount_inr: number;
  one_time_gst_inr: number;
  monthly_gst_inr: number;
  grand_total_with_gst_inr: number;
};

function isNonEmptyString(val: string | null | undefined): boolean {
  return typeof val === 'string' && val.trim().length > 0;
}

export function evaluatePillarActiveMap(
  signals: BusinessAuditSignals,
): Record<AuditPillarId, boolean> {
  const hasWebsite = Boolean(signals.has_website || isNonEmptyString(signals.website_url));
  const hasSocial = Boolean(
    signals.has_social_presence ||
      isNonEmptyString(signals.instagram_url) ||
      isNonEmptyString(signals.facebook_url),
  );
  const hasMedia = Boolean(signals.has_visual_media || isNonEmptyString(signals.photo_url));
  const hasLocalSeo =
    signals.has_google_local_seo !== undefined
      ? Boolean(signals.has_google_local_seo)
      : Boolean(
          isNonEmptyString(signals.google_place_id) ||
            (isNonEmptyString(signals.phone) && signals.has_coordinates),
        );

  return {
    vistrah_presence: Boolean(signals.is_vistrah_claimed),
    dedicated_website: hasWebsite,
    hyperlocal_v_ads: Boolean(signals.has_active_v_ad),
    social_media_reach: hasSocial,
    paid_ad_campaigns: Boolean(signals.has_paid_campaigns),
    visual_brand_media: hasMedia,
    google_local_seo: hasLocalSeo,
  };
}

/**
 * Deterministically computes a business's 0-100 baseline score, plain-language tier, 7-item breakdown, and missing items.
 */
export function calculateBusinessAuditScore(
  signals: BusinessAuditSignals,
): BusinessAuditScoreResult {
  const activeMap = evaluatePillarActiveMap(signals);
  let baseline = 0;
  const breakdown: PillarBreakdownItem[] = [];
  const gaps: IdentifiedGapItem[] = [];

  for (const pillar of AUDIT_PILLARS) {
    const isActive = activeMap[pillar.id];
    const earned = isActive ? pillar.max_points : 0;
    baseline += earned;
    breakdown.push({
      pillar_id: pillar.id,
      group: pillar.group,
      product_title: pillar.product_title,
      short_title: pillar.short_title,
      max_points: pillar.max_points,
      earned_points: earned,
      status: isActive ? 'active' : 'lacking',
      active_in_baseline: isActive,
      unit_price_inr: pillar.unit_price_inr,
      billing_type: pillar.billing_type,
      billing_label: pillar.billing_label,
      gap_code: pillar.gap_code,
      description: pillar.description,
      summary: pillar.description,
      deliverable_highlights: pillar.deliverable_highlights,
    });

    if (!isActive) {
      gaps.push({
        pillar_id: pillar.id,
        gap_code: pillar.gap_code,
        product_title: pillar.product_title,
        missing_points: pillar.max_points,
        unit_price_inr: pillar.unit_price_inr,
        billing_type: pillar.billing_type,
        billing_label: pillar.billing_label,
        summary: pillar.gap_summary,
      });
    }
  }

  const clampedBaseline = Math.max(0, Math.min(TOTAL_AUDIT_POINTS, baseline));
  return {
    baseline_score: clampedBaseline,
    score_tier_label: getScoreTierLabel(clampedBaseline),
    max_score: TOTAL_AUDIT_POINTS,
    pillar_breakdown: breakdown,
    identified_gaps: gaps,
    gap_codes: gaps.map(g => g.gap_code),
  };
}

function isAuditScoreResult(
  val: BusinessAuditScoreResult | BusinessAuditSignals,
): val is BusinessAuditScoreResult {
  return 'pillar_breakdown' in val && Array.isArray((val as BusinessAuditScoreResult).pillar_breakdown);
}

export function simulateTickedPlan(
  auditOrSignals: BusinessAuditScoreResult | BusinessAuditSignals,
  tickedPillarIds: readonly string[],
  options?: { gstIncluded?: boolean },
): SimulatedTickedPlanResult {
  const audit = isAuditScoreResult(auditOrSignals)
    ? auditOrSignals
    : calculateBusinessAuditScore(auditOrSignals);

  const gstIncluded = options?.gstIncluded !== false;
  const seen = new Set<AuditPillarId>();
  const validTicked: AuditPillarId[] = [];
  for (const raw of tickedPillarIds) {
    if (raw in AUDIT_PILLAR_BY_ID) {
      const pid = raw as AuditPillarId;
      if (!seen.has(pid)) {
        seen.add(pid);
        validTicked.push(pid);
      }
    }
  }

  const activeSet = new Set<AuditPillarId>(
    audit.pillar_breakdown.filter(p => p.active_in_baseline).map(p => p.pillar_id),
  );

  let addedPoints = 0;
  let freeItemsCount = 0;
  let oneTimeTotalInr = 0;
  let monthlyTotalInr = 0;
  const newlyAdded: AuditPillarId[] = [];

  for (const pid of validTicked) {
    if (activeSet.has(pid)) {
      continue;
    }
    const def = AUDIT_PILLAR_BY_ID[pid];
    newlyAdded.push(pid);
    addedPoints += def.max_points;
    if (def.billing_type === 'free_forever') {
      freeItemsCount += 1;
    } else if (def.billing_type === 'one_time') {
      oneTimeTotalInr += def.unit_price_inr;
    } else if (def.billing_type === 'monthly') {
      monthlyTotalInr += def.unit_price_inr;
    }
  }

  const projectedScore = Math.min(TOTAL_AUDIT_POINTS, audit.baseline_score + addedPoints);
  const subtotalBeforeGstInr = oneTimeTotalInr + monthlyTotalInr;
  const oneTimeGstInr = gstIncluded ? Math.round((oneTimeTotalInr * GST_RATE_PERCENT) / 100) : 0;
  const monthlyGstInr = gstIncluded ? Math.round((monthlyTotalInr * GST_RATE_PERCENT) / 100) : 0;
  const gstAmountInr = gstIncluded
    ? Math.round((subtotalBeforeGstInr * GST_RATE_PERCENT) / 100)
    : 0;

  return {
    baseline_score: audit.baseline_score,
    projected_score: projectedScore,
    projected_tier_label: getScoreTierLabel(projectedScore),
    score_gain: projectedScore - audit.baseline_score,
    ticked_pillar_ids: validTicked,
    newly_added_pillar_ids: newlyAdded,
    free_items_count: freeItemsCount,
    one_time_total_inr: oneTimeTotalInr,
    monthly_total_inr: monthlyTotalInr,
    subtotal_before_gst_inr: subtotalBeforeGstInr,
    gst_included: gstIncluded,
    gst_rate_percent: GST_RATE_PERCENT,
    gst_amount_inr: gstAmountInr,
    one_time_gst_inr: oneTimeGstInr,
    monthly_gst_inr: monthlyGstInr,
    grand_total_with_gst_inr: subtotalBeforeGstInr + gstAmountInr,
  };
}
