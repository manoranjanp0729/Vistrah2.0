'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User as UserIcon,
  Video,
  X,
  XCircle,
} from 'lucide-react';
import {api,date} from '@/lib/api';
import {Notice,Status} from './ui';
import {adminVAdsClient} from '../../shared/v-ads-management';
import {parseAdDescription} from '../../shared/v-ads';
import {
  ALL_SELF_ONBOARDING_TYPES,
  SELF_ONBOARDING_CATEGORIES,
  findSelfOnboardingType,
} from '../../shared/self-onboarding';
import type {Category} from '@/lib/types';

const vAdsClient = adminVAdsClient(api);
const LIVE_STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://vistrah.in';

export type ConsentSummary = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  seller_enabled: boolean;
  privacy_policy_version: string | null;
  privacy_consented_at: string | null;
  marketing_consent: boolean;
  marketing_consented_at: string | null;
  seller_terms_version: string | null;
  seller_consented_at: string | null;
  deleted_at: string | null;
  created_at: string | null;
};

export type SpatialRevision = {
  id: string;
  rule_id: string;
  video_id: string;
  revision: number;
  latitude: number;
  longitude: number;
  radius_km: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED';
  created_at: string | null;
  reviewed_at: string | null;
  reviewed_by: number | null;
};

export type VAdsItem = {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED';
  created_at: string | null;
  published_at: string | null;
  preview_available: boolean;
  media_upload_id: string | null;
  video_url: string;
  views: number;
  likes: number;
  comments: number;
  category_slug?: string | null;
  service_type?: string | null;
  advertiser: {
    id: string;
    name: string;
    handle: string;
    description: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
    owner_id: number | null;
    review_token?: string;
    created_at?: string;
  };
  owner_id: number | null;
  owner: ConsentSummary | null;
  active_targeting: SpatialRevision | null;
  pending_targeting: SpatialRevision | null;
  targeting_revisions: SpatialRevision[];
  audit_history: {
    id: number;
    actor_id: number | null;
    action: string;
    entity: string;
    created_at: string | null;
    details: Record<string, unknown>;
  }[];
};

export type StandaloneAdvertiser = {
  id: string;
  name: string;
  handle: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  owner_id: number | null;
  review_token?: string;
  created_at?: string;
  owner: ConsentSummary | null;
};

export type SellerItem = {
  id: number;
  name: string;
  company: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  location: string;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'INACTIVE';
  active: boolean;
  owner_user_id: number | null;
  service_ids: number[];
  owner: ConsentSummary | null;
  v_ads_channels: {id: string; name: string; handle: string; status: string}[];
  category_slug?: string | null;
  business_type?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  coverage_radius_km?: number | null;
  photo_url?: string | null;
  created_at?: string;
};

export type UserItem = ConsentSummary & {
  businesses_count: number;
  v_ads_channels_count: number;
};

export type InspectionTarget =
  | {kind: 'seller'; item: SellerItem}
  | {kind: 'v_ad'; item: VAdsItem}
  | {kind: 'advertiser'; item: StandaloneAdvertiser}
  | {kind: 'user'; item: UserItem}
  | null;

export type ServiceLookupEntry = {
  categoryTitle: string;
  categorySlug: string;
  serviceTitle: string;
  serviceSlug: string;
};

export type ServiceLookup = Record<number, ServiceLookupEntry>;

export const DEFAULT_APPROVE_NOTE =
  'Verified business identity, category fit, and local contact details.';
export const DEFAULT_REJECT_NOTE =
  'Rejected: incomplete storefront details, category mismatch, or unverified contact.';

export const REVIEW_NOTE_PRESETS = [
  DEFAULT_APPROVE_NOTE,
  'Verified compliant local V Ad media and spatial targeting radius.',
  DEFAULT_REJECT_NOTE,
];

export function buildServiceLookup(catalogue: Category[]): ServiceLookup {
  const map: ServiceLookup = {};
  for (const cat of catalogue) {
    for (const svc of cat.services ?? []) {
      map[svc.id] = {
        categoryTitle: cat.title,
        categorySlug: cat.slug,
        serviceTitle: svc.title,
        serviceSlug: svc.slug,
      };
    }
    for (const sub of cat.subcategories ?? []) {
      for (const svc of sub.services ?? []) {
        map[svc.id] = {
          categoryTitle: cat.title,
          categorySlug: cat.slug,
          serviceTitle: svc.title,
          serviceSlug: svc.slug,
        };
      }
    }
  }
  return map;
}

export function describeSellerTaxonomy(
  seller: SellerItem,
  serviceLookup: ServiceLookup = {},
): {
  categoryLabel: string;
  serviceTypeLabel: string;
  categorySlugs: string[];
  serviceTypeSlugs: string[];
} {
  const matched = (seller.service_ids ?? [])
    .map(id => serviceLookup[id])
    .filter((entry): entry is ServiceLookupEntry => Boolean(entry));

  if (matched.length > 0) {
    const categories = Array.from(new Set(matched.map(m => m.categoryTitle)));
    const services = Array.from(new Set(matched.map(m => m.serviceTitle)));
    const slugs = Array.from(new Set(matched.map(m => m.categorySlug)));
    const serviceTypeSlugs = Array.from(new Set(matched.map(m => m.serviceSlug)));
    return {
      categoryLabel: categories.slice(0, 2).join(', '),
      serviceTypeLabel:
        services.length > 2
          ? `${services.slice(0, 2).join(', ')} +${services.length - 2}`
          : services.join(', '),
      categorySlugs: slugs,
      serviceTypeSlugs,
    };
  }

  if (seller.business_type) {
    const knownType = findSelfOnboardingType(seller.business_type);
    if (knownType) {
      return {
        categoryLabel: knownType.categoryTitle,
        serviceTypeLabel: knownType.title,
        categorySlugs: [knownType.categorySlug],
        serviceTypeSlugs: [knownType.slug],
      };
    }
  }

  if (seller.category_slug) {
    const onboardingCat = SELF_ONBOARDING_CATEGORIES.find(c => c.slug === seller.category_slug);
    return {
      categoryLabel: onboardingCat?.title ?? seller.category_slug.replaceAll('-', ' '),
      serviceTypeLabel: seller.business_type
        ? seller.business_type.replaceAll('-', ' ')
        : `${seller.service_ids?.length ?? 0} linked services`,
      categorySlugs: [seller.category_slug],
      serviceTypeSlugs: seller.business_type ? [seller.business_type] : [],
    };
  }

  const haystack = `${seller.company} ${seller.slug} ${seller.address}`.toLowerCase();
  const inferredType = ALL_SELF_ONBOARDING_TYPES.find(bt =>
    haystack.includes(bt.title.toLowerCase()),
  );
  if (inferredType) {
    return {
      categoryLabel: inferredType.categoryTitle,
      serviceTypeLabel: inferredType.title,
      categorySlugs: [inferredType.categorySlug],
      serviceTypeSlugs: [inferredType.slug],
    };
  }

  const inferred = SELF_ONBOARDING_CATEGORIES.find(cat =>
    cat.title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .some(word => word.length >= 4 && haystack.includes(word)),
  );
  return {
    categoryLabel: inferred?.title ?? 'Local Directory',
    serviceTypeLabel:
      (seller.service_ids?.length ?? 0) > 0
        ? `${seller.service_ids.length} linked service${seller.service_ids.length === 1 ? '' : 's'}`
        : 'Storefront listing',
    categorySlugs: inferred ? [inferred.slug] : [],
    serviceTypeSlugs: [],
  };
}

export function describeVAdTaxonomy(item: VAdsItem): {
  categoryLabel: string;
  serviceTypeLabel: string;
  categorySlug: string | null;
  serviceTypeSlug: string | null;
} {
  const {meta} = parseAdDescription(item.description);
  const effectiveServiceType = item.service_type || meta.service_type || null;
  const effectiveCategorySlug = item.category_slug || meta.category_slug || null;

  if (effectiveServiceType) {
    const known = findSelfOnboardingType(effectiveServiceType);
    if (known) {
      return {
        categoryLabel: known.categoryTitle,
        serviceTypeLabel: known.title,
        categorySlug: known.categorySlug,
        serviceTypeSlug: known.slug,
      };
    }
  }

  if (effectiveCategorySlug) {
    const found = SELF_ONBOARDING_CATEGORIES.find(c => c.slug === effectiveCategorySlug);
    return {
      categoryLabel: found?.title ?? effectiveCategorySlug,
      serviceTypeLabel: effectiveServiceType || `@${item.advertiser.handle}`,
      categorySlug: effectiveCategorySlug,
      serviceTypeSlug: effectiveServiceType,
    };
  }
  const haystack =
    `${item.title} ${item.description} ${item.advertiser.name} ${item.advertiser.description}`.toLowerCase();
  const inferredType = ALL_SELF_ONBOARDING_TYPES.find(bt =>
    haystack.includes(bt.title.toLowerCase()),
  );
  if (inferredType) {
    return {
      categoryLabel: inferredType.categoryTitle,
      serviceTypeLabel: inferredType.title,
      categorySlug: inferredType.categorySlug,
      serviceTypeSlug: inferredType.slug,
    };
  }
  const inferred = SELF_ONBOARDING_CATEGORIES.find(cat =>
    cat.title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .some(word => word.length >= 4 && haystack.includes(word)),
  );
  return {
    categoryLabel: inferred?.title ?? 'Visual Ad Campaign',
    serviceTypeLabel: effectiveServiceType || `@${item.advertiser.handle}`,
    categorySlug: inferred?.slug ?? null,
    serviceTypeSlug: effectiveServiceType,
  };
}

export async function approveSellerListing(sellerId: number, note = DEFAULT_APPROVE_NOTE) {
  const cleanNote = note.trim().length >= 10 ? note.trim() : DEFAULT_APPROVE_NOTE;
  await api(`/admin/providers/${sellerId}/verification`, {
    method: 'POST',
    body: JSON.stringify({
      status: 'VERIFIED',
      evidence: cleanNote,
    }),
  });
}

export async function rejectSellerListing(sellerId: number, note = DEFAULT_REJECT_NOTE) {
  const cleanNote = note.trim().length >= 10 ? note.trim() : DEFAULT_REJECT_NOTE;
  await api(`/admin/providers/${sellerId}/verification`, {
    method: 'POST',
    body: JSON.stringify({
      status: 'REJECTED',
      evidence: cleanNote,
    }),
  });
}

export async function approveVAdItem(item: VAdsItem, note = DEFAULT_APPROVE_NOTE) {
  const cleanNote = note.trim().length >= 10 ? note.trim() : DEFAULT_APPROVE_NOTE;
  if (item.advertiser.status === 'PENDING' && item.advertiser.review_token) {
    await vAdsClient.reviewAccount(item.advertiser, 'APPROVED', cleanNote);
  }
  if (item.status === 'PENDING') {
    await api(`/admin/v-ads/videos/${encodeURIComponent(item.id)}/review`, {
      method: 'POST',
      body: JSON.stringify({
        status: 'APPROVED',
        reason: cleanNote,
      }),
    });
  }
  if (item.pending_targeting) {
    await api(`/admin/v-ads/targeting/${encodeURIComponent(item.id)}/review`, {
      method: 'POST',
      body: JSON.stringify({
        status: 'APPROVED',
        reason: cleanNote,
        expected_revision: item.pending_targeting.revision,
      }),
    });
  }
}

export async function rejectVAdItem(item: VAdsItem, note = DEFAULT_REJECT_NOTE) {
  const cleanNote = note.trim().length >= 10 ? note.trim() : DEFAULT_REJECT_NOTE;
  if (item.status === 'PENDING') {
    await api(`/admin/v-ads/videos/${encodeURIComponent(item.id)}/review`, {
      method: 'POST',
      body: JSON.stringify({
        status: 'REJECTED',
        reason: cleanNote,
      }),
    });
    return;
  }
  if (item.pending_targeting) {
    await api(`/admin/v-ads/targeting/${encodeURIComponent(item.id)}/review`, {
      method: 'POST',
      body: JSON.stringify({
        status: 'REJECTED',
        reason: cleanNote,
        expected_revision: item.pending_targeting.revision,
      }),
    });
    return;
  }
  if (item.advertiser.status === 'PENDING' && item.advertiser.review_token) {
    await vAdsClient.reviewAccount(item.advertiser, 'REJECTED', cleanNote);
  }
}

export async function reviewStandaloneChannel(
  channel: StandaloneAdvertiser,
  decision: 'APPROVED' | 'REJECTED',
  note?: string,
) {
  const fallback = decision === 'APPROVED' ? DEFAULT_APPROVE_NOTE : DEFAULT_REJECT_NOTE;
  const cleanNote = note && note.trim().length >= 10 ? note.trim() : fallback;
  await vAdsClient.reviewAccount(channel, decision, cleanNote);
}

export function AdminInspectionDrawer({
  target,
  currentUserId,
  serviceLookup = {},
  onClose,
  onUpdated,
}: {
  target: InspectionTarget;
  currentUserId?: number | null;
  serviceLookup?: ServiceLookup;
  onClose: () => void;
  onUpdated: (message: string) => Promise<void> | void;
}) {
  const [note, setNote] = useState(DEFAULT_APPROVE_NOTE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    setNote(DEFAULT_APPROVE_NOTE);
  }, [target]);

  useEffect(() => {
    if (!target) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [target, onClose]);

  if (!target) return null;

  async function execute(action: () => Promise<void>, successMessage: string) {
    setBusy(true);
    setError('');
    try {
      await action();
      await onUpdated(successMessage);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const seller = target.kind === 'seller' ? target.item : null;
  const vAd = target.kind === 'v_ad' ? target.item : null;
  const channel = target.kind === 'advertiser' ? target.item : null;
  const principal = target.kind === 'user' ? target.item : null;

  const sellerTaxonomy = seller ? describeSellerTaxonomy(seller, serviceLookup) : null;
  const vAdTaxonomy = vAd ? describeVAdTaxonomy(vAd) : null;
  const spatial = vAd ? vAd.pending_targeting || vAd.active_targeting : null;
  const sameOwnerBlocked =
    (vAd && vAd.owner_id !== null && vAd.owner_id === currentUserId) ||
    (channel && channel.owner_id !== null && channel.owner_id === currentUserId);

  return (
    <div
      className="editorial-drawer-backdrop"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        className="editorial-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Inspection drawer"
      >
        <header className="editorial-drawer-header">
          <div>
            <p className="eyebrow">
              {seller
                ? `Business Listing #${seller.id}`
                : vAd
                ? 'V Ad Moderation'
                : channel
                ? 'Advertiser Channel'
                : `Account #${principal?.id}`}
            </p>
            <h2>
              {seller?.company || vAd?.title || channel?.name || principal?.name}
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close inspection drawer"
          >
            <X size={18} />
          </button>
        </header>

        <div className="editorial-drawer-body">
          {error && <Notice error message={error} />}

          {/* 1. BUSINESS LISTING INSPECTION */}
          {seller && sellerTaxonomy && (
            <>
              <div className="editorial-drawer-badges">
                <Status context="provider" value={seller.verification_status} />
                <Status value={seller.active ? 'ACTIVE' : 'INACTIVE'} />
                <span className="editorial-chip">{sellerTaxonomy.categoryLabel}</span>
              </div>

              {/* Storefront Media */}
              <div className="editorial-drawer-block">
                <div className="editorial-drawer-block-head">
                  <p className="eyebrow">Storefront Media</p>
                  <a
                    href={`${LIVE_STOREFRONT_URL}/services/nearby?q=${encodeURIComponent(
                      seller.company,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="editorial-inline-link"
                  >
                    Preview on vistrah.in <ExternalLink size={13} />
                  </a>
                </div>
                {seller.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={seller.photo_url}
                    alt={seller.company}
                    className="editorial-media-preview"
                  />
                ) : (
                  <div className="editorial-media-placeholder">
                    <Building2 size={22} aria-hidden="true" />
                    <div>
                      <strong>{seller.company}</strong>
                      <span>/{seller.slug} · Storefront directory listing</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Category, Service Type & GPS Radius */}
              <div className="editorial-drawer-block">
                <p className="eyebrow">Category, Service Type & Location</p>
                <dl className="editorial-kv-grid">
                  <div>
                    <dt>Category</dt>
                    <dd>{sellerTaxonomy.categoryLabel}</dd>
                  </div>
                  <div>
                    <dt>Service Type</dt>
                    <dd>{sellerTaxonomy.serviceTypeLabel}</dd>
                  </div>
                  <div>
                    <dt>GPS / Locality</dt>
                    <dd className="tabular-nums">
                      {seller.latitude != null && seller.longitude != null
                        ? `${seller.latitude.toFixed(4)}, ${seller.longitude.toFixed(4)} (${seller.location})`
                        : seller.location || 'Locality pending'}
                    </dd>
                  </div>
                  <div>
                    <dt>Coverage Radius</dt>
                    <dd className="tabular-nums">
                      {seller.coverage_radius_km != null
                        ? `${seller.coverage_radius_km} km`
                        : '25 km standard local radius'}
                    </dd>
                  </div>
                  <div style={{gridColumn: '1 / -1'}}>
                    <dt>Storefront Address</dt>
                    <dd>{seller.address || 'Not provided'}</dd>
                  </div>
                </dl>
              </div>

              {/* Owner Contact */}
              <div className="editorial-drawer-block">
                <p className="eyebrow">Owner Contact</p>
                <dl className="editorial-kv-grid">
                  <div>
                    <dt>Owner / Representative</dt>
                    <dd>{seller.name || seller.owner?.name || 'Unclaimed'}</dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd className="tabular-nums">
                      <span className="editorial-icon-inline">
                        <Phone size={13} aria-hidden="true" />
                        {seller.phone || seller.owner?.phone || 'Not provided'}
                      </span>
                    </dd>
                  </div>
                  <div style={{gridColumn: '1 / -1'}}>
                    <dt>Email</dt>
                    <dd>
                      <span className="editorial-icon-inline">
                        <Mail size={13} aria-hidden="true" />
                        {seller.email || seller.owner?.email || 'Not provided'}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Approve / Reject with Note */}
              <div className="editorial-drawer-block">
                <div className="editorial-drawer-block-head">
                  <p className="eyebrow">
                    <ShieldCheck size={14} style={{verticalAlign: '-2px', marginRight: 5}} />
                    Moderation Decision
                  </p>
                </div>
                <label className="editorial-field-label">
                  Review Note (minimum 10 characters)
                  <textarea
                    aria-label="Review note"
                    rows={3}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    disabled={busy}
                  />
                </label>
                <div className="editorial-preset-row">
                  {REVIEW_NOTE_PRESETS.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      className="editorial-chip"
                      onClick={() => setNote(preset)}
                    >
                      {preset.slice(0, 36)}…
                    </button>
                  ))}
                </div>
                <div className="button-row">
                  {seller.verification_status !== 'VERIFIED' && (
                    <button
                      type="button"
                      className="button"
                      disabled={busy || note.trim().length < 10}
                      onClick={() =>
                        void execute(
                          () => approveSellerListing(seller.id, note),
                          `${seller.company} approved and verified.`,
                        )
                      }
                    >
                      <CheckCircle2 size={15} />
                      Approve Listing
                    </button>
                  )}
                  {seller.verification_status !== 'REJECTED' && (
                    <button
                      type="button"
                      className="button danger-outline"
                      disabled={busy || note.trim().length < 10}
                      onClick={() =>
                        void execute(
                          () => rejectSellerListing(seller.id, note),
                          `${seller.company} marked rejected.`,
                        )
                      }
                    >
                      <XCircle size={15} />
                      Reject with Note
                    </button>
                  )}
                  <button
                    type="button"
                    className="button secondary"
                    disabled={
                      busy || (!seller.active && seller.verification_status !== 'VERIFIED')
                    }
                    onClick={() =>
                      void execute(async () => {
                        await api(`/admin/providers/${seller.id}/active`, {
                          method: 'PATCH',
                          body: JSON.stringify({active: !seller.active}),
                        });
                      }, seller.active ? 'Listing paused on storefront.' : 'Listing published live.')
                    }
                  >
                    {seller.active ? 'Pause Listing' : 'Publish Live'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 2. V AD INSPECTION */}
          {vAd && vAdTaxonomy && (
            <>
              <div className="editorial-drawer-badges">
                <Status value={vAd.status} />
                <span className="editorial-chip">Channel: {vAd.advertiser.status}</span>
                <span className="editorial-chip tabular-nums">
                  {vAd.views} views · {vAd.likes} likes
                </span>
              </div>

              {/* Ad Media */}
              <div className="editorial-drawer-block">
                <div className="editorial-drawer-block-head">
                  <p className="eyebrow">
                    <Video size={14} style={{verticalAlign: '-2px', marginRight: 5}} />
                    Ad Video Media
                  </p>
                  <span className="tabular-nums editorial-muted">@{vAd.advertiser.handle}</span>
                </div>
                {vAd.preview_available ? (
                  <video
                    key={vAd.id}
                    controls
                    muted
                    playsInline
                    preload="metadata"
                    className="editorial-video-player"
                    src={`/api/admin/v-ads/videos/${encodeURIComponent(vAd.id)}/preview`}
                  />
                ) : (
                  <div className="editorial-media-placeholder">
                    <Video size={22} aria-hidden="true" />
                    <div>
                      <strong>{vAd.title}</strong>
                      <span>
                        {vAd.video_url || 'Private video stream awaiting media upload'}
                      </span>
                    </div>
                  </div>
                )}
                {vAd.description && <p className="editorial-drawer-desc">{vAd.description}</p>}
              </div>

              {/* Category, Service Type & GPS Radius */}
              <div className="editorial-drawer-block">
                <p className="eyebrow">Category, Targeting & Radius</p>
                <dl className="editorial-kv-grid">
                  <div>
                    <dt>Category</dt>
                    <dd>{vAdTaxonomy.categoryLabel}</dd>
                  </div>
                  <div>
                    <dt>Channel / Service</dt>
                    <dd>
                      {vAd.advertiser.name} ({vAdTaxonomy.serviceTypeLabel})
                    </dd>
                  </div>
                  <div>
                    <dt>GPS Center</dt>
                    <dd className="tabular-nums">
                      {spatial ? (
                        <span className="editorial-icon-inline">
                          <MapPin size={13} aria-hidden="true" />
                          {spatial.latitude.toFixed(4)}, {spatial.longitude.toFixed(4)}
                        </span>
                      ) : (
                        'City-wide feed'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Targeting Radius</dt>
                    <dd className="tabular-nums">
                      {spatial
                        ? `${spatial.radius_km} km (Rev #${spatial.revision} · ${spatial.status})`
                        : 'Untargeted'}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Owner Contact */}
              <div className="editorial-drawer-block">
                <p className="eyebrow">Owner Contact</p>
                <dl className="editorial-kv-grid">
                  <div>
                    <dt>Advertiser / Owner</dt>
                    <dd>{vAd.owner?.name || vAd.advertiser.name}</dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd className="tabular-nums">{vAd.owner?.phone || 'Not provided'}</dd>
                  </div>
                  <div style={{gridColumn: '1 / -1'}}>
                    <dt>Email</dt>
                    <dd>{vAd.owner?.email || `@${vAd.advertiser.handle}`}</dd>
                  </div>
                </dl>
              </div>

              {/* Approve / Reject with Note */}
              <div className="editorial-drawer-block">
                <p className="eyebrow">Moderation Decision</p>
                {sameOwnerBlocked ? (
                  <p className="notice">
                    Independent review required: another administrator must approve or reject your
                    own V Ad.
                  </p>
                ) : (
                  <>
                    <label className="editorial-field-label">
                      Review Note (minimum 10 characters)
                      <textarea
                        aria-label="Review note"
                        rows={3}
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <div className="editorial-preset-row">
                      {REVIEW_NOTE_PRESETS.map(preset => (
                        <button
                          key={preset}
                          type="button"
                          className="editorial-chip"
                          onClick={() => setNote(preset)}
                        >
                          {preset.slice(0, 36)}…
                        </button>
                      ))}
                    </div>
                    <div className="button-row">
                      {(vAd.status === 'PENDING' ||
                        vAd.advertiser.status === 'PENDING' ||
                        Boolean(vAd.pending_targeting)) && (
                        <button
                          type="button"
                          className="button"
                          disabled={busy || note.trim().length < 10}
                          onClick={() =>
                            void execute(
                              () => approveVAdItem(vAd, note),
                              `Approved V Ad "${vAd.title}".`,
                            )
                          }
                        >
                          <CheckCircle2 size={15} />
                          Approve V Ad
                        </button>
                      )}
                      {vAd.status !== 'REJECTED' && vAd.status !== 'REMOVED' && (
                        <button
                          type="button"
                          className="button danger-outline"
                          disabled={busy || note.trim().length < 10}
                          onClick={() =>
                            void execute(async () => {
                              if (
                                vAd.status === 'PENDING' ||
                                vAd.pending_targeting ||
                                vAd.advertiser.status === 'PENDING'
                              ) {
                                await rejectVAdItem(vAd, note);
                              } else {
                                await vAdsClient.removeVideo(vAd, note.trim());
                              }
                            }, `Rejected V Ad "${vAd.title}".`)
                          }
                        >
                          <XCircle size={15} />
                          Reject with Note
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* 3. STANDALONE ADVERTISER CHANNEL */}
          {channel && (
            <>
              <div className="editorial-drawer-badges">
                <Status value={channel.status} />
                <span className="editorial-chip">@{channel.handle}</span>
              </div>
              <p className="editorial-drawer-desc">
                {channel.description || 'Advertiser channel awaiting onboarding review.'}
              </p>
              <div className="editorial-drawer-block">
                <p className="eyebrow">Owner Contact</p>
                <dl className="editorial-kv-grid">
                  <div>
                    <dt>Owner</dt>
                    <dd>{channel.owner?.name || channel.name}</dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd className="tabular-nums">{channel.owner?.phone || 'Not provided'}</dd>
                  </div>
                  <div style={{gridColumn: '1 / -1'}}>
                    <dt>Email</dt>
                    <dd>{channel.owner?.email || `@${channel.handle}`}</dd>
                  </div>
                </dl>
              </div>
              <div className="editorial-drawer-block">
                <p className="eyebrow">Channel Moderation</p>
                {sameOwnerBlocked ? (
                  <p className="notice">
                    Another administrator must review your own advertiser channel.
                  </p>
                ) : (
                  <>
                    <label className="editorial-field-label">
                      Review Note (minimum 10 characters)
                      <textarea
                        aria-label="Review note"
                        rows={3}
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        disabled={busy}
                      />
                    </label>
                    <div className="button-row">
                      <button
                        type="button"
                        className="button"
                        disabled={busy || note.trim().length < 10}
                        onClick={() =>
                          void execute(
                            () => reviewStandaloneChannel(channel, 'APPROVED', note),
                            `Approved channel @${channel.handle}.`,
                          )
                        }
                      >
                        <CheckCircle2 size={15} />
                        Approve Channel
                      </button>
                      <button
                        type="button"
                        className="button danger-outline"
                        disabled={busy || note.trim().length < 10}
                        onClick={() =>
                          void execute(
                            () => reviewStandaloneChannel(channel, 'REJECTED', note),
                            `Rejected channel @${channel.handle}.`,
                          )
                        }
                      >
                        <XCircle size={15} />
                        Reject with Note
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* 4. CONSUMER / SELLER ACCOUNT */}
          {principal && (
            <>
              <div className="editorial-drawer-badges tabular-nums">
                <Status value={principal.deleted_at ? 'INACTIVE' : 'ACTIVE'} />
                <span className="editorial-chip">{principal.role}</span>
                <span className="editorial-chip">
                  {principal.businesses_count} business{principal.businesses_count === 1 ? '' : 'es'}
                </span>
                <span className="editorial-chip">{principal.v_ads_channels_count} V Ads</span>
              </div>
              <div className="editorial-drawer-block">
                <p className="eyebrow">
                  <UserIcon size={14} style={{verticalAlign: '-2px', marginRight: 5}} />
                  Account & Consent Details
                </p>
                <dl className="editorial-kv-grid">
                  <div>
                    <dt>Name</dt>
                    <dd>{principal.name}</dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd className="tabular-nums">{principal.phone || 'Not provided'}</dd>
                  </div>
                  <div style={{gridColumn: '1 / -1'}}>
                    <dt>Email</dt>
                    <dd>{principal.email}</dd>
                  </div>
                  <div>
                    <dt>Privacy Consent</dt>
                    <dd className="tabular-nums">
                      {principal.privacy_policy_version || 'Recorded'}
                      {principal.privacy_consented_at
                        ? ` · ${date(principal.privacy_consented_at)}`
                        : ''}
                    </dd>
                  </div>
                  <div>
                    <dt>Joined</dt>
                    <dd className="tabular-nums">
                      {principal.created_at ? date(principal.created_at) : '—'}
                    </dd>
                  </div>
                </dl>
                {principal.businesses_count > 0 && (
                  <div style={{marginTop: 8}}>
                    <Link
                      href={`/businesses?q=${encodeURIComponent(principal.email)}`}
                      className="editorial-inline-link"
                    >
                      View linked businesses <ExternalLink size={13} />
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
