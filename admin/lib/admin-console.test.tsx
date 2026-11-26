import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import {adminPrimaryDestinations} from '../../shared/admin-dashboard';
import {resolvePrimaryDestination} from '@/components/admin-navigation';
import {AdminOverview} from '@/components/admin-overview';
import {
  AdminInspectionDrawer,
  describeSellerTaxonomy,
  describeVAdTaxonomy,
  type SellerItem,
  type VAdsItem,
} from '@/components/admin-inspection-drawer';

const sampleSeller: SellerItem = {
  id: 108,
  name: 'Rohan Kulkarni',
  company: 'Indiranagar Dental Studio',
  slug: 'indiranagar-dental-studio',
  email: 'hello@indiranagardental.in',
  phone: '+91 98450 11223',
  address: '100 Feet Road, Indiranagar, Bengaluru 560038',
  location: 'Bengaluru',
  verification_status: 'PENDING',
  active: false,
  owner_user_id: 42,
  service_ids: [7],
  category_slug: 'hospitals-and-labs',
  business_type: 'dental-clinic',
  latitude: 12.9784,
  longitude: 77.6408,
  coverage_radius_km: 15,
  owner: {
    id: 42,
    name: 'Rohan Kulkarni',
    email: 'hello@indiranagardental.in',
    phone: '+91 98450 11223',
    role: 'CUSTOMER',
    seller_enabled: true,
    privacy_policy_version: '2026.1',
    privacy_consented_at: '2026-11-20T09:00:00Z',
    marketing_consent: true,
    marketing_consented_at: '2026-11-20T09:00:00Z',
    seller_terms_version: '2026.1',
    seller_consented_at: '2026-11-20T09:00:00Z',
    deleted_at: null,
    created_at: '2026-11-20T09:00:00Z',
  },
  v_ads_channels: [],
};

const sampleVAd: VAdsItem = {
  id: 'vad-202',
  title: 'Weekend Wood-Fired Pizza Tasting',
  description: 'Fresh sourdough pizzas in Koramangala dining room.',
  status: 'PENDING',
  created_at: '2026-11-25T10:00:00Z',
  published_at: null,
  preview_available: true,
  media_upload_id: 'upload-99',
  video_url: 'https://vistrah.in/media/vad-202.mp4',
  views: 120,
  likes: 18,
  comments: 4,
  category_slug: 'restaurants-and-dining',
  service_type: 'Fine Dining & Cafes',
  advertiser: {
    id: 'adv-55',
    name: 'Terra Kitchen',
    handle: 'terrakitchen',
    description: 'Koramangala neighbourhood kitchen',
    status: 'APPROVED',
    owner_id: 77,
  },
  owner_id: 77,
  owner: {
    id: 77,
    name: 'Meera Nair',
    email: 'meera@terrakitchen.in',
    phone: '+91 99001 44556',
    role: 'CUSTOMER',
    seller_enabled: true,
    privacy_policy_version: '2026.1',
    privacy_consented_at: '2026-11-18T08:00:00Z',
    marketing_consent: true,
    marketing_consented_at: '2026-11-18T08:00:00Z',
    seller_terms_version: '2026.1',
    seller_consented_at: '2026-11-18T08:00:00Z',
    deleted_at: null,
    created_at: '2026-11-18T08:00:00Z',
  },
  active_targeting: {
    id: 'rev-1',
    rule_id: 'rule-1',
    video_id: 'vad-202',
    revision: 1,
    latitude: 12.9352,
    longitude: 77.6245,
    radius_km: 10,
    status: 'APPROVED',
    created_at: '2026-11-25T10:00:00Z',
    reviewed_at: '2026-11-25T11:00:00Z',
    reviewed_by: 1,
  },
  pending_targeting: null,
  targeting_revisions: [],
  audit_history: [],
};

function collectAdminFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    if (
      entry.name === 'node_modules' ||
      entry.name.startsWith('.next') ||
      entry.name === '.git'
    ) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectAdminFiles(full, acc);
    } else if (/\.(ts|tsx|css|json)$/.test(entry.name) && !entry.name.includes('.test.')) {
      acc.push(full);
    }
  }
  return acc;
}

describe('VISTRAH Admin Operations Console', () => {
  it('consolidates sidebar navigation to exact 4 focused views with accurate route matching', () => {
    expect(adminPrimaryDestinations).toHaveLength(4);
    expect(adminPrimaryDestinations.map(d => ({label: d.label, href: d.href}))).toEqual([
      {label: 'Overview', href: '/'},
      {label: 'Businesses', href: '/businesses'},
      {label: 'V Ads', href: '/v-ads'},
      {label: 'Users & Audits', href: '/users'},
    ]);

    expect(resolvePrimaryDestination('/').label).toBe('Overview');
    expect(resolvePrimaryDestination('/admin').label).toBe('Overview');
    expect(resolvePrimaryDestination('/businesses').label).toBe('Businesses');
    expect(resolvePrimaryDestination('/listings').label).toBe('Businesses');
    expect(resolvePrimaryDestination('/admin/provider-applications').label).toBe('Businesses');
    expect(resolvePrimaryDestination('/v-ads').label).toBe('V Ads');
    expect(resolvePrimaryDestination('/admin/moderation').label).toBe('V Ads');
    expect(resolvePrimaryDestination('/users').label).toBe('Users & Audits');
    expect(resolvePrimaryDestination('/admin/business-audit/12').label).toBe('Users & Audits');
    expect(resolvePrimaryDestination('/admin/requests').label).toBe('Users & Audits');
  });

  it('renders action-first Overview with exact 4 KPI cards, Needs Review inbox, and empty state', () => {
    const populatedHtml = renderToStaticMarkup(
      <AdminOverview
        data={{
          customers: 140,
          requests: 9,
          providers: 48,
          services: 30,
          new_requests: 2,
          payments: 0,
          pending_sellers: 1,
          pending_v_ads: 1,
          active_sellers: 44,
        }}
        initialPendingListings={[sampleSeller]}
        initialPendingVAds={[sampleVAd]}
        initialAuditLeadsCount={19}
        disableAutoFetch
      />,
    );

    expect(populatedHtml).toContain('Pending Listings');
    expect(populatedHtml).toContain('/businesses?status=PENDING');
    expect(populatedHtml).toContain('Pending V Ads');
    expect(populatedHtml).toContain('/v-ads?status=PENDING');
    expect(populatedHtml).toContain('Verified Businesses');
    expect(populatedHtml).toContain('/businesses?status=VERIFIED');
    expect(populatedHtml).toContain('Audit Leads');
    expect(populatedHtml).toContain('/users?tab=audits');
    expect(populatedHtml).toContain('Needs Review');
    expect(populatedHtml).toContain('Indiranagar Dental Studio');
    expect(populatedHtml).toContain('Approve');
    expect(populatedHtml).toContain('Reject');
    expect(populatedHtml).not.toContain('All Platform Controls');

    const emptyHtml = renderToStaticMarkup(
      <AdminOverview
        data={{
          customers: 140,
          requests: 0,
          providers: 48,
          services: 30,
          new_requests: 0,
          payments: 0,
          pending_sellers: 0,
          pending_v_ads: 0,
          active_sellers: 48,
        }}
        initialPendingListings={[]}
        initialPendingVAds={[]}
        initialAuditLeadsCount={19}
        disableAutoFetch
      />,
    );

    expect(emptyHtml).toContain('All caught up — zero pending items to review');
  });

  it('renders right-side slide-over inspection drawer for both Business Listings and V Ads', () => {
    const sellerTax = describeSellerTaxonomy(sampleSeller);
    expect(sellerTax.categoryLabel).toContain('Hospitals');

    const sellerDrawerHtml = renderToStaticMarkup(
      <AdminInspectionDrawer
        target={{kind: 'seller', item: sampleSeller}}
        currentUserId={1}
        onClose={() => {}}
        onUpdated={() => {}}
      />,
    );
    expect(sellerDrawerHtml).toContain('role="dialog"');
    expect(sellerDrawerHtml).toContain('Indiranagar Dental Studio');
    expect(sellerDrawerHtml).toContain('12.9784, 77.6408');
    expect(sellerDrawerHtml).toContain('15 km');
    expect(sellerDrawerHtml).toContain('+91 98450 11223');
    expect(sellerDrawerHtml).toContain('Approve Listing');
    expect(sellerDrawerHtml).toContain('Reject with Note');

    const vAdTax = describeVAdTaxonomy(sampleVAd);
    expect(vAdTax.categoryLabel).toContain('Restaurants');

    const vAdDrawerHtml = renderToStaticMarkup(
      <AdminInspectionDrawer
        target={{kind: 'v_ad', item: sampleVAd}}
        currentUserId={1}
        onClose={() => {}}
        onUpdated={() => {}}
      />,
    );
    expect(vAdDrawerHtml).toContain('Weekend Wood-Fired Pizza Tasting');
    expect(vAdDrawerHtml).toContain('/api/admin/v-ads/videos/vad-202/preview');
    expect(vAdDrawerHtml).toContain('10 km');
    expect(vAdDrawerHtml).toContain('meera@terrakitchen.in');
    expect(vAdDrawerHtml).toContain('Approve V Ad');
    expect(vAdDrawerHtml).toContain('Reject with Note');
  });

  it('enforces zero purple, zero border-l-4 stripes, zero forest green, and zero V-Essentials leftovers in admin/', () => {
    const adminRoot = path.resolve(__dirname, '..');
    const files = collectAdminFiles(adminRoot);
    expect(files.length).toBeGreaterThan(20);

    const forbiddenPatterns = [
      /\b(?:bg|text|border|from|via|to|ring)-(?:purple|violet|indigo|fuchsia)-\d+\b/i,
      /#(?:7c3aed|8b5cf6|6d28d9|9333ea|a855f7|4f46e5|6366f1|581c87|3b0764)\b/i,
      /#(?:173f35|245744|1f463f)\b/i,
      /\bborder-[lt]-4\b/,
      /\b(?:V-Essentials|V Essentials|AgriConnect|HealthConnect|agri-connect|health-connect)\b/i,
    ];

    const violations: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      for (const regex of forbiddenPatterns) {
        const match = content.match(regex);
        if (match) {
          violations.push(`${path.relative(adminRoot, file)}: matched "${match[0]}"`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
