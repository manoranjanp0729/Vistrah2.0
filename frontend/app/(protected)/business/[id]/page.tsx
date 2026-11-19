'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Lock, ShieldAlert, Sparkles } from 'lucide-react';
import {
  BusinessGrowthAuditView,
  type RequestWebsitePayload,
  type SaveAuditLeadPayload,
} from '@/components/business-growth-audit-view';
import { useUser } from '@/components/customer';
import { UiText } from '@/components/localized-ui';
import { ButtonLink, Notice } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import {
  evaluateBusinessAuditAccess,
  type BusinessProfileResponse,
  type SavedAuditLead,
} from '../../../../../shared/business-audit';
import { selfOnboardingUrl } from '../../../../../shared/self-onboarding';

type OwnedSellerBusiness = {
  id: number;
  google_place_id?: string | null;
};

export default function ProtectedBusinessGrowthAuditPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const rawId = typeof params?.id === 'string' ? decodeURIComponent(params.id) : '';
  const validId = /^[A-Za-z0-9_-]{1,160}$/.test(rawId) ? rawId : '';

  const { user, loading: userLoading, error: userError } = useUser();

  const contextQuery = useMemo(() => {
    const qs = new URLSearchParams();
    for (const key of [
      'name',
      'sector',
      'service_type',
      'city',
      'address',
      'phone',
      'website_url',
      'photo_url',
    ]) {
      const val = searchParams?.get(key);
      if (val) qs.set(key, val);
    }
    return qs.toString();
  }, [searchParams]);

  const [state, setState] = useState<{
    loading: boolean;
    profile: BusinessProfileResponse | null;
    ownedBusinesses: OwnedSellerBusiness[] | null;
    httpStatus: number | null;
    error: string;
  }>({
    loading: true,
    profile: null,
    ownedBusinesses: null,
    httpStatus: null,
    error: '',
  });

  useEffect(() => {
    if (userLoading || !validId || !user) return;
    let alive = true;
    setState(prev => ({ ...prev, loading: true, error: '', httpStatus: null }));

    const isAdmin = user.role === 'ADMIN';
    const profilePath = `/business-profile/${encodeURIComponent(validId)}${
      contextQuery ? `?${contextQuery}` : ''
    }`;

    Promise.all([
      isAdmin
        ? Promise.resolve<OwnedSellerBusiness[]>([])
        : api<OwnedSellerBusiness[]>('/seller/businesses').catch(() => []),
      api<BusinessProfileResponse>(profilePath),
    ])
      .then(([owned, profile]) => {
        if (!alive) return;
        setState({
          loading: false,
          profile,
          ownedBusinesses: owned,
          httpStatus: 200,
          error: '',
        });
      })
      .catch(err => {
        if (!alive) return;
        const status = err instanceof ApiError ? err.status : 500;
        setState({
          loading: false,
          profile: null,
          ownedBusinesses: [],
          httpStatus: status,
          error: status === 403 || status === 404 ? '' : (err as Error).message,
        });
      });

    return () => {
      alive = false;
    };
  }, [user, userLoading, validId, contextQuery]);

  if (!validId) {
    return (
      <div className="container page">
        <Notice error message="Invalid business identifier." />
      </div>
    );
  }

  if (userLoading) {
    return (
      <div className="container page" role="status">
        <UiText value="Verifying business access…" />
      </div>
    );
  }

  if (userError) {
    return (
      <div className="container page">
        <Notice error message={userError} />
      </div>
    );
  }

  const nextUrl = `/business/${encodeURIComponent(validId)}${
    contextQuery ? `?${contextQuery}` : ''
  }`;

  if (!user) {
    return (
      <div className="container page" style={{ maxWidth: 640, display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Lock size={22} aria-hidden="true" />
          <h1 style={{ margin: 0 }}>Sign in to view Business Growth & Audit</h1>
        </div>
        <p style={{ margin: 0, opacity: 0.85 }}>
          Internal 7-pillar growth diagnostics, local benchmarks, and custom website blueprints are
          private to verified VISTRAH business owners and authorized VISTRAH administrators.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <ButtonLink href={`/login?next=${encodeURIComponent(nextUrl)}`}>Sign in</ButtonLink>
          <ButtonLink secondary href="/seller/onboard">
            Claim / List Your Business Free
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (state.loading) {
    return (
      <div className="container page" role="status">
        <UiText value="Loading Business Growth & Audit Workspace…" />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="container page">
        <Notice error message={state.error} />
      </div>
    );
  }

  const access = evaluateBusinessAuditAccess({
    viewer: user,
    targetBusinessId: validId,
    ownedBusinesses: state.ownedBusinesses,
    loadedOwnerUserId: state.profile?.business.owner_user_id,
    httpStatus: state.httpStatus,
  });

  if (!access.allowed || !state.profile) {
    const cleanPlace = validId.startsWith('gp_') && validId.length > 3 ? validId.slice(3) : undefined;
    const claimHref = selfOnboardingUrl({
      place_id: cleanPlace,
      category: searchParams?.get('sector') || undefined,
      type: searchParams?.get('service_type') || undefined,
      business: searchParams?.get('name') || undefined,
      locality: searchParams?.get('city') || undefined,
    });
    return (
      <div className="container page" style={{ maxWidth: 680, display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldAlert size={24} color="#d97706" aria-hidden="true" />
          <h1 style={{ margin: 0 }}>Business Audit Access Restricted</h1>
        </div>
        <p style={{ margin: 0, opacity: 0.86 }}>
          To protect business privacy, 7-pillar audit scores and growth strategies are visible only
          to the verified owner of this business or VISTRAH administrators. If this is your
          business, claim & list it free on VISTRAH in ~3 minutes to unlock your growth dashboard!
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link href={claimHref} className="button">
            <Sparkles size={15} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
            Claim & List Your Business Free (₹0)
          </Link>
          <ButtonLink secondary href="/seller">
            Go to Seller Dashboard
          </ButtonLink>
          <ButtonLink secondary href="/services">
            Browse 10 Unified Sectors
          </ButtonLink>
        </div>
      </div>
    );
  }

  async function saveLead(payload: SaveAuditLeadPayload): Promise<SavedAuditLead> {
    return api<SavedAuditLead>('/marketing-audit/leads', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async function requestWebsite(payload: RequestWebsitePayload): Promise<void> {
    await api('/website-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  return (
    <div className="container">
      <BusinessGrowthAuditView
        profile={state.profile}
        viewerMode={access.mode}
        backHref={access.mode === 'admin' ? '/admin/business-audit' : '/seller'}
        backLabel={access.mode === 'admin' ? 'Admin Audit Explorer' : 'Seller Dashboard'}
        onSaveLead={access.mode === 'admin' ? saveLead : undefined}
        onRequestWebsite={requestWebsite}
      />
    </div>
  );
}
