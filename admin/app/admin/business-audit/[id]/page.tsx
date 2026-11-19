'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { AdminReviewFrame } from '@/components/admin-workspace';
import {
  BusinessGrowthAuditView,
  type RequestWebsitePayload,
  type SaveAuditLeadPayload,
} from '@/components/business-growth-audit-view';
import { Notice } from '@/components/ui';
import { api } from '@/lib/api';
import type { BusinessProfileResponse, SavedAuditLead } from '../../../../../shared/business-audit';

const LIVE_STOREFRONT = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://vistrah.in';

export default function AdminBusinessAuditDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const rawId = typeof params?.id === 'string' ? decodeURIComponent(params.id) : '';

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

  const [profile, setProfile] = useState<BusinessProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!rawId) return;
    let alive = true;
    setLoading(true);
    setError('');
    const path = `/business-profile/${encodeURIComponent(rawId)}${
      contextQuery ? `?${contextQuery}` : ''
    }`;
    api<BusinessProfileResponse>(path)
      .then(res => {
        if (alive) setProfile(res);
      })
      .catch(err => {
        if (alive) setError((err as Error).message || 'Could not load business audit profile.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [rawId, contextQuery]);

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
    <AdminReviewFrame>
      {loading ? (
        <p role="status">Loading 7-Pillar Business Audit & Strategy…</p>
      ) : error ? (
        <Notice error message={error} />
      ) : profile ? (
        <BusinessGrowthAuditView
          profile={profile}
          viewerMode="admin"
          storefrontBaseUrl={LIVE_STOREFRONT}
          backHref="/admin/business-audit"
          backLabel="Back to Data Collection Explorer"
          onSaveLead={saveLead}
          onRequestWebsite={requestWebsite}
        />
      ) : null}
    </AdminReviewFrame>
  );
}
