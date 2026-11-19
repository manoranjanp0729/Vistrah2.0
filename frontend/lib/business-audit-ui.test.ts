import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BusinessGrowthAuditView } from '../components/business-growth-audit-view';
import {
  FLAGSHIP_SECTORS,
  buildPrefilledFreeVAdHref,
  buildQrStandeeListingUrl,
  buildWhatsAppProposalHref,
  buildWhatsAppProposalMessage,
  deriveFreeVAdPrefillFromParams,
  evaluateBusinessAuditAccess,
  isFreeVAdPillarActiveOrTicked,
  recalculateLiveAuditState,
  renderPersonalizedWebsitePreview,
  type BusinessProfileResponse,
} from '../../shared/business-audit';
import { buildQrStandeeSvgMarkup, encodeQrMatrix } from '../../shared/qr-matrix';
import { calculateBusinessAuditScore, simulateTickedPlan } from '../../shared/flagship-sectors';
import { safeDestination } from './destinations';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) =>
    createElement('a', { href, ...props }, children),
}));

describe('Step 3: Business Growth & Audit Landing Page, 7-Pillar Cart, Website Preview & Role Gate', () => {
  it('recalculates baseline score via Quick-Check inputs and updates quote cart totals on tick/untick + GST toggle', () => {
    const baseBusiness = {
      is_claimed: false,
      website_url: null,
      instagram_url: null,
      facebook_url: null,
      photo_url: '/api/marketplace/place-photo?ref=places%2FChIJ1%2Fphotos%2F1',
      google_place_id: 'ChIJ_shop_1',
      phone: '9845012345',
      latitude: 12.9716,
      longitude: 77.5946,
    };

    // Initial state: visual_brand_media (10) + google_local_seo (10) = 20 baseline
    const state1 = recalculateLiveAuditState({
      business: baseBusiness,
      hasActiveVAd: false,
      tickedPillarIds: [
        'vistrah_presence', // +20, ₹0
        'hyperlocal_v_ads', // +15, ₹0
        'dedicated_website', // +20, ₹4,999 one-time
        'social_media_reach', // +15, ₹4,999/mo
      ],
      gstIncluded: true,
    });
    expect(state1.audit.baseline_score).toBe(20);
    expect(state1.simulation.projected_score).toBe(90);
    expect(state1.cart.freeItemsCount).toBe(2);
    expect(state1.cart.oneTimeTotalInr).toBe(4999);
    expect(state1.cart.monthlyTotalInr).toBe(4999);
    expect(state1.cart.gstAmountInr).toBe(Math.round(9998 * 0.18));
    expect(state1.cart.grandTotalWithGstInr).toBe(9998 + Math.round(9998 * 0.18));

    // Pasting an Instagram @handle & Website URL in Quick-Check immediately lifts baseline to 55
    // and removes those two pillars from paid charges (no double-counting or double-billing!)
    const state2 = recalculateLiveAuditState({
      business: baseBusiness,
      hasActiveVAd: false,
      quickCheck: {
        websiteInput: 'www.malnadkitchen.in',
        instagramInput: '@malnadkitchen',
      },
      tickedPillarIds: [
        'vistrah_presence',
        'hyperlocal_v_ads',
        'dedicated_website',
        'social_media_reach',
        'paid_ad_campaigns',
      ],
      gstIncluded: false,
    });
    expect(state2.audit.baseline_score).toBe(55); // 20 + website(20) + social(15)
    expect(state2.simulation.projected_score).toBe(100); // 55 + vistrah(20) + vad(15) + paid_ads(10)
    expect(state2.cart.oneTimeTotalInr).toBe(0);
    expect(state2.cart.monthlyTotalInr).toBe(3999);
    expect(state2.cart.gstAmountInr).toBe(0);
  });

  it('renders personalized sector website previews across all 10 flagship sectors and SSR renders all 5 modules', () => {
    for (const sector of FLAGSHIP_SECTORS) {
      const preview = renderPersonalizedWebsitePreview({
        sectorSlug: sector.slug,
        businessName: 'Cauvery Heritage Studio',
        city: 'Mysuru',
        phone: '+91 98450 77889',
        serviceTitle: sector.shortTitle,
      });
      expect(preview.pattern_id).toBe(sector.website_pattern.pattern_id);
      expect(preview.pattern_title).toBe(sector.website_pattern.pattern_title);
      expect(preview.personalized_headline).toContain('Cauvery Heritage Studio');
      expect(preview.personalized_subheadline).toContain('Mysuru');
      expect(preview.contact_phone_display).toBe('+91 98450 77889');
      expect(preview.domain_preview).toBe('cauveryheritagestudio.in');
    }

    const sampleSector = FLAGSHIP_SECTORS[3]; // HealthConnect & Clinics
    const audit = calculateBusinessAuditScore({
      is_vistrah_claimed: true,
      website_url: null,
      has_active_v_ad: false,
      google_place_id: 'ChIJ_clinic_99',
      phone: '08025251111',
      has_coordinates: true,
    });
    const defaultPlan = simulateTickedPlan(
      audit,
      sampleSector.vertical_strategy.recommended_pillar_ids,
    );
    const sampleProfile: BusinessProfileResponse = {
      business: {
        business_id: '42',
        source: 'vistrah',
        provider_id: 42,
        google_place_id: 'ChIJ_clinic_99',
        owner_user_id: 7,
        is_claimed: true,
        verification_status: 'VERIFIED',
        name: 'Arogya Care Clinic',
        company: 'Arogya Care Clinic',
        contact_name: 'Dr. Anand',
        sector_slug: sampleSector.slug,
        sector_title: sampleSector.title,
        service_type: 'dental-clinics',
        service_title: 'Dental Clinics',
        address: 'Indiranagar, Bengaluru',
        city: 'Bengaluru',
        phone: '08025251111',
        whatsapp: '9845011111',
        website_url: null,
        instagram_url: null,
        facebook_url: null,
        photo_url: null,
        latitude: 12.9784,
        longitude: 77.6408,
      },
      audit,
      default_plan: defaultPlan,
      flagship_sector: sampleSector,
      pillars_catalog: [],
      competitor_benchmark: {
        average_score: 54,
        top_performer_score: 88,
        sample_size: 6,
        sector_slug: sampleSector.slug,
        locality: 'Bengaluru',
      },
      saved_lead: null,
    };

    const html = renderToStaticMarkup(
      createElement(BusinessGrowthAuditView, {
        profile: sampleProfile,
        viewerMode: 'admin',
        backHref: '/admin/business-audit',
        onRequestWebsite: async () => {},
      }),
    );

    expect(html).toContain('Arogya Care Clinic');
    expect(html).toContain('Create &amp; Upload Free V Ad');
    expect(html).toContain('Local Competitor Benchmark (Bengaluru)');
    expect(html).toContain('What This Business Is Lacking');
    expect(html).toContain('Active in Baseline');
    expect(html).toContain('Save Proposal &amp; Lead');
    expect(html).toContain('Patient Trust &amp; Slot Booking Portal');
    expect(html).toContain('Request This Website');
  });

  it('enforces strict role-gated access (blocking unauthenticated, normal users, and rival sellers while allowing Admin and verified owner)', () => {
    expect(
      evaluateBusinessAuditAccess({
        viewer: null,
        targetBusinessId: '42',
      }),
    ).toEqual({ allowed: false, reason: 'sign_in_required' });

    // Normal public user -> blocked
    expect(
      evaluateBusinessAuditAccess({
        viewer: { id: 15, role: 'CUSTOMER' },
        targetBusinessId: '42',
        ownedBusinesses: [],
        httpStatus: 403,
      }),
    ).toEqual({ allowed: false, reason: 'access_restricted' });

    // Rival seller (owns #99, trying to view #42) -> blocked
    expect(
      evaluateBusinessAuditAccess({
        viewer: { id: 22, role: 'CUSTOMER' },
        targetBusinessId: '42',
        ownedBusinesses: [{ id: 99, google_place_id: 'ChIJ_other' }],
        loadedOwnerUserId: 7,
      }),
    ).toEqual({ allowed: false, reason: 'access_restricted' });

    // Joined Seller Owner (by numeric provider ID and by linked google_place_id) -> allowed_owner
    expect(
      evaluateBusinessAuditAccess({
        viewer: { id: 7, role: 'CUSTOMER' },
        targetBusinessId: '42',
        ownedBusinesses: [{ id: 42, google_place_id: 'ChIJ_clinic_99' }],
        loadedOwnerUserId: 7,
        httpStatus: 200,
      }),
    ).toEqual({ allowed: true, mode: 'owner' });

    expect(
      evaluateBusinessAuditAccess({
        viewer: { id: 7, role: 'CUSTOMER' },
        targetBusinessId: 'gp_ChIJ_clinic_99',
        ownedBusinesses: [{ id: 42, google_place_id: 'ChIJ_clinic_99' }],
        httpStatus: 200,
      }),
    ).toEqual({ allowed: true, mode: 'owner' });

    // Admin -> allowed_admin on every business
    expect(
      evaluateBusinessAuditAccess({
        viewer: { id: 1, role: 'ADMIN' },
        targetBusinessId: 'gp_ChIJ_unclaimed_prospect',
        httpStatus: 200,
      }),
    ).toEqual({ allowed: true, mode: 'admin' });
  });
});

describe('Step 4: WhatsApp Proposal Formatter, Printable PDF View, QR Standee Card & Pre-Filled Free V Ad Shortcut', () => {
  it('formats branded WhatsApp proposal with scores, lacking pillars, ₹0 Free Forever/One-Time/Monthly/GST totals, and website pattern', () => {
    const sector = FLAGSHIP_SECTORS[4]; // Hospitality, Restaurants & Cafés
    const live = recalculateLiveAuditState({
      business: {
        is_claimed: false,
        website_url: null,
        instagram_url: null,
        facebook_url: null,
        photo_url: null,
        google_place_id: 'ChIJ_cafe_1',
        phone: '09845077889',
        latitude: 13.7091,
        longitude: 75.8132,
      },
      hasActiveVAd: false,
      tickedPillarIds: [
        'vistrah_presence',
        'hyperlocal_v_ads',
        'dedicated_website',
        'social_media_reach',
      ],
      gstIncluded: true,
    });

    const msgWithGst = buildWhatsAppProposalMessage({
      businessName: 'Malnad Filter Coffee House',
      sectorTitle: sector.title,
      city: 'Tarikere',
      audit: live.audit,
      simulation: live.simulation,
      cart: live.cart,
      websitePatternTitle: sector.website_pattern.pattern_title,
    });

    expect(msgWithGst).toContain('*VISTRAH Digital Growth & Audit Proposal*');
    expect(msgWithGst).toContain('*Malnad Filter Coffee House* (Tarikere)');
    expect(msgWithGst).toContain('Baseline: *10/100* → Projected: *80/100* (+70 pts)');
    expect(msgWithGst).toContain('₹0 Free Forever');
    expect(msgWithGst).toContain('₹4,999 One-Time');
    expect(msgWithGst).toContain('₹4,999/month');
    expect(msgWithGst).toContain('18% GST:');
    expect(msgWithGst).toContain(sector.website_pattern.pattern_title);

    const waHref = buildWhatsAppProposalHref('098450 77889', msgWithGst);
    expect(waHref.startsWith('https://wa.me/919845077889?text=')).toBe(true);

    // Without GST toggle
    const liveExclGst = recalculateLiveAuditState({
      business: {
        is_claimed: false,
        website_url: null,
        instagram_url: null,
        facebook_url: null,
        photo_url: null,
        google_place_id: 'ChIJ_cafe_1',
        phone: '09845077889',
        latitude: 13.7091,
        longitude: 75.8132,
      },
      hasActiveVAd: false,
      tickedPillarIds: ['dedicated_website'],
      gstIncluded: false,
    });
    const msgExclGst = buildWhatsAppProposalMessage({
      businessName: 'Malnad Filter Coffee House',
      sectorTitle: sector.title,
      city: 'Tarikere',
      audit: liveExclGst.audit,
      simulation: liveExclGst.simulation,
      cart: liveExclGst.cart,
      websitePatternTitle: sector.website_pattern.pattern_title,
    });
    expect(msgExclGst).toContain('Initial Payable (Excl. GST): *₹4,999*');
  });

  it('generates scannable VISTRAH Verified QR standee URL + SVG matrix and pre-filled Free V Ad shortcut', () => {
    const sector = FLAGSHIP_SECTORS[0]; // Real Estate & Property
    const qrUrl = buildQrStandeeListingUrl({
      businessName: 'Sahyadri Estates',
      sectorSlug: sector.slug,
      serviceType: 'residential-plots',
      city: 'Shivamogga',
    });
    expect(qrUrl).toBe(
      `https://vistrah.in/services/nearby?business=Sahyadri+Estates&category=${sector.slug}&type=residential-plots&locality=Shivamogga`,
    );
    // Also allowed through safeDestination local path guard
    const localPath = qrUrl.replace('https://vistrah.in', '');
    expect(safeDestination(localPath)).toBe(localPath);

    const matrix = encodeQrMatrix(qrUrl);
    expect(matrix.length).toBeGreaterThanOrEqual(33);
    expect((matrix.length - 17) % 4).toBe(0);
    // Top-left 7x7 finder outer ring corners & center must be dark
    expect(matrix[0][0]).toBe(true);
    expect(matrix[0][6]).toBe(true);
    expect(matrix[6][0]).toBe(true);
    expect(matrix[3][3]).toBe(true);

    const standeeSvg = buildQrStandeeSvgMarkup({
      businessName: 'Sahyadri Estates',
      sectorTitle: `${sector.shortTitle} · Shivamogga`,
      targetUrl: qrUrl,
    });
    expect(standeeSvg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(standeeSvg).toContain('VISTRAH VERIFIED PARTNER');
    expect(standeeSvg).toContain('Sahyadri Estates');

    const vAdHref = buildPrefilledFreeVAdHref({
      businessName: 'Sahyadri Estates',
      sectorSlug: sector.slug,
      serviceType: 'residential-plots',
      city: 'Shivamogga',
    });
    expect(vAdHref).toBe(
      `/seller/v-ads?tab=upload&business=Sahyadri+Estates&category=${sector.slug}&type=residential-plots&locality=Shivamogga`,
    );
    expect(safeDestination(vAdHref)).toBe(vAdHref);

    const prefill = deriveFreeVAdPrefillFromParams({
      business: 'Sahyadri Estates',
      category: sector.slug,
      type: 'residential-plots',
      locality: 'Shivamogga',
    });
    expect(prefill.hasPrefill).toBe(true);
    expect(prefill.adType).toBe('BRAND');
    expect(prefill.title).toContain('Sahyadri Estates');
    expect(prefill.title).toContain('Shivamogga');
    expect(prefill.productsAvailable).toContain(sector.title);

    const auditNoVAd = calculateBusinessAuditScore({
      is_vistrah_claimed: true,
      has_active_v_ad: false,
    });
    expect(isFreeVAdPillarActiveOrTicked(auditNoVAd, [])).toBe(false);
    expect(isFreeVAdPillarActiveOrTicked(auditNoVAd, ['hyperlocal_v_ads'])).toBe(true);

    const auditActiveVAd = calculateBusinessAuditScore({
      is_vistrah_claimed: true,
      has_active_v_ad: true,
    });
    expect(isFreeVAdPillarActiveOrTicked(auditActiveVAd, [])).toBe(true);

    // SSR check of Step 4 tools on BusinessGrowthAuditView
    const sampleProfile: BusinessProfileResponse = {
      business: {
        business_id: '77',
        source: 'vistrah',
        provider_id: 77,
        google_place_id: 'ChIJ_est_77',
        owner_user_id: 9,
        is_claimed: true,
        verification_status: 'VERIFIED',
        name: 'Sahyadri Estates',
        company: 'Sahyadri Estates',
        contact_name: 'Ramesh',
        sector_slug: sector.slug,
        sector_title: sector.title,
        service_type: 'residential-plots',
        service_title: 'Residential Plots',
        address: 'BH Road, Shivamogga',
        city: 'Shivamogga',
        phone: '9845012345',
        whatsapp: '9845012345',
        website_url: null,
        instagram_url: null,
        facebook_url: null,
        photo_url: null,
        latitude: 13.9299,
        longitude: 75.5681,
      },
      audit: auditNoVAd,
      default_plan: simulateTickedPlan(auditNoVAd, ['hyperlocal_v_ads', 'dedicated_website']),
      flagship_sector: sector,
      pillars_catalog: [],
      competitor_benchmark: {
        average_score: 52,
        top_performer_score: 85,
        sample_size: 5,
        sector_slug: sector.slug,
        locality: 'Shivamogga',
      },
      saved_lead: null,
    };

    const html = renderToStaticMarkup(
      createElement(BusinessGrowthAuditView, {
        profile: sampleProfile,
        viewerMode: 'owner',
        onRequestWebsite: async () => {},
      }),
    );

    expect(html).toContain('Send Proposal on WhatsApp');
    expect(html).toContain('Print / Save PDF Proposal');
    expect(html).toContain('Upload Your Free V Ad Now');
    expect(html).toContain('VISTRAH Verified QR Card');
    expect(html).toContain('Download Printable QR Standee (SVG)');
  });
});
