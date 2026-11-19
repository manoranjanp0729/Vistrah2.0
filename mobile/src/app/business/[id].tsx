import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import {
  MobileBusinessGrowthAuditView,
  type MobileRequestWebsitePayload,
  type MobileSaveLeadPayload,
} from '../../components/business-growth-audit-view';
import { UiElement } from '../../components/localized-ui';
import { Text } from '../../components/typography';
import { Action, ErrorPanel, Heading, Loading, Page } from '../../components/ui';
import { ApiError, api } from '../../lib/api';
import { useSession } from '../../lib/session';
import { useTheme } from '../../lib/theme';
import {
  evaluateBusinessAuditAccess,
  type BusinessProfileResponse,
  type SavedAuditLead,
} from '../../../../shared/business-audit';

type OwnedSellerBusiness = {
  id: number;
  google_place_id?: string | null;
};

export default function MobileBusinessAuditScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    sector?: string;
    service_type?: string;
    city?: string;
    address?: string;
    phone?: string;
    website_url?: string;
  }>();
  const rawId = typeof params.id === 'string' ? params.id.trim() : '';
  const validId = /^[A-Za-z0-9_-]{1,160}$/.test(rawId) ? rawId : '';
  const session = useSession();
  const { styles } = useTheme();

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
    ] as const) {
      const val = params[key];
      if (typeof val === 'string' && val.trim()) qs.set(key, val.trim());
    }
    return qs.toString();
  }, [params]);

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
    if (!session.ready || !session.user || !validId) return;
    let alive = true;
    setState(prev => ({ ...prev, loading: true, error: '', httpStatus: null }));
    const isAdmin = session.user.role === 'ADMIN';
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
  }, [session.ready, session.user, validId, contextQuery]);

  if (!validId) {
    return (
      <UiElement as={Page} title="Business Growth & Audit">
        <ErrorPanel error="Invalid business identifier." />
      </UiElement>
    );
  }

  if (!session.ready) {
    return (
      <UiElement as={Page} title="Business Growth & Audit">
        <Loading />
      </UiElement>
    );
  }

  if (!session.user) {
    return (
      <Redirect
        href={{
          pathname: '/auth',
          params: { next: `/business/${encodeURIComponent(validId)}` },
        }}
      />
    );
  }

  if (state.loading) {
    return (
      <UiElement as={Page} title="Business Growth & Audit">
        <Loading />
      </UiElement>
    );
  }

  if (state.error) {
    return (
      <UiElement as={Page} title="Business Growth & Audit">
        <ErrorPanel error={state.error} />
      </UiElement>
    );
  }

  const access = evaluateBusinessAuditAccess({
    viewer: session.user,
    targetBusinessId: validId,
    ownedBusinesses: state.ownedBusinesses,
    loadedOwnerUserId: state.profile?.business.owner_user_id,
    httpStatus: state.httpStatus,
  });

  if (!access.allowed || !state.profile) {
    const cleanPlace = validId.startsWith('gp_') && validId.length > 3 ? validId.slice(3) : undefined;
    return (
      <UiElement as={Page} title="Business Audit Access Restricted">
        <View style={{ gap: 14 }}>
          <Heading title="Claim Your Business to Unlock Audit & Growth" />
          <Text style={styles.muted}>
            7-pillar digital presence diagnostics, competitor benchmarks, and custom website
            blueprints are visible only to the verified owner of this business or VISTRAH
            administrators.
          </Text>
          <UiElement
            as={Action}
            label="Claim & List Your Business Free (₹0)"
            onPress={() =>
              router.push({
                pathname: '/seller/onboard',
                params: {
                  ...(cleanPlace ? { place_id: cleanPlace } : {}),
                  ...(typeof params.sector === 'string' ? { category: params.sector } : {}),
                  ...(typeof params.service_type === 'string' ? { type: params.service_type } : {}),
                  ...(typeof params.name === 'string' ? { business: params.name } : {}),
                },
              })
            }
          />
          <UiElement
            as={Action}
            secondary
            label="Back to Services"
            onPress={() => router.replace('/services')}
          />
        </View>
      </UiElement>
    );
  }

  async function saveLead(payload: MobileSaveLeadPayload): Promise<SavedAuditLead> {
    return api<SavedAuditLead>('/marketing-audit/leads', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async function requestWebsite(payload: MobileRequestWebsitePayload): Promise<void> {
    await api('/website-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  return (
    <UiElement
      as={Page}
      title={
        access.mode === 'admin'
          ? 'Business Audit & Strategy'
          : 'My Business Growth & Audit'
      }
    >
      <MobileBusinessGrowthAuditView
        profile={state.profile}
        viewerMode={access.mode}
        onSaveLead={access.mode === 'admin' ? saveLead : undefined}
        onRequestWebsite={requestWebsite}
      />
    </UiElement>
  );
}
