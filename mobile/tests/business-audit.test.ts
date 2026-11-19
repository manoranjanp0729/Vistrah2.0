import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
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
} from '../../shared/business-audit.ts';
import { buildQrStandeeSvgMarkup, encodeQrMatrix } from '../../shared/qr-matrix.ts';

test('mobile 7-pillar audit configurator recalculates score, free/one-time/monthly/GST totals, and 10 sector website blueprints', () => {
  const recalc = recalculateLiveAuditState({
    business: {
      is_claimed: true,
      website_url: null,
      instagram_url: null,
      facebook_url: null,
      photo_url: null,
      google_place_id: 'ChIJ_mob_01',
      phone: '9845011223',
      latitude: 13.7091,
      longitude: 75.8132,
    },
    hasActiveVAd: false,
    tickedPillarIds: [
      'hyperlocal_v_ads', // +15, ₹0
      'dedicated_website', // +20, ₹4,999 one-time
      'paid_ad_campaigns', // +10, ₹3,999/mo
      'visual_brand_media', // +10, ₹2,999 one-time
    ],
    gstIncluded: true,
  });

  assert.equal(recalc.audit.baseline_score, 30); // vistrah_presence(20) + google_local_seo(10)
  assert.equal(recalc.simulation.projected_score, 85);
  assert.equal(recalc.cart.freeItemsCount, 1);
  assert.equal(recalc.cart.oneTimeTotalInr, 7998);
  assert.equal(recalc.cart.monthlyTotalInr, 3999);
  assert.equal(recalc.cart.gstAmountInr, Math.round((7998 + 3999) * 0.18));

  assert.equal(FLAGSHIP_SECTORS.length, 10);
  for (const sector of FLAGSHIP_SECTORS) {
    const preview = renderPersonalizedWebsitePreview({
      sectorSlug: sector.slug,
      businessName: 'Malnad Grand',
      city: 'Chikkamagaluru',
      phone: '9845099887',
    });
    assert.ok(preview.personalized_headline.includes('Malnad Grand'));
    assert.ok(preview.personalized_subheadline.includes('Chikkamagaluru'));
    assert.equal(preview.pattern_id, sector.website_pattern.pattern_id);
  }
});

test('mobile role-gated business audit screen and Seller Dashboard shortcut are wired cleanly', () => {
  assert.deepEqual(
    evaluateBusinessAuditAccess({
      viewer: { id: 44, role: 'CUSTOMER' },
      targetBusinessId: '10',
      ownedBusinesses: [{ id: 99, google_place_id: null }],
      httpStatus: 403,
    }),
    { allowed: false, reason: 'access_restricted' },
  );

  assert.deepEqual(
    evaluateBusinessAuditAccess({
      viewer: { id: 44, role: 'CUSTOMER' },
      targetBusinessId: '10',
      ownedBusinesses: [{ id: 10, google_place_id: 'ChIJ_mine' }],
      loadedOwnerUserId: 44,
      httpStatus: 200,
    }),
    { allowed: true, mode: 'owner' },
  );

  assert.deepEqual(
    evaluateBusinessAuditAccess({
      viewer: { id: 1, role: 'ADMIN' },
      targetBusinessId: 'gp_ChIJ_any',
      httpStatus: 200,
    }),
    { allowed: true, mode: 'admin' },
  );

  const sellerIndex = readFileSync(
    new URL('../src/app/seller/index.tsx', import.meta.url),
    'utf8',
  );
  assert.ok(sellerIndex.includes('My Business Growth & Audit'));
  assert.ok(sellerIndex.includes("pathname:'/business/[id]'"));

  const auditScreen = readFileSync(
    new URL('../src/app/business/[id].tsx', import.meta.url),
    'utf8',
  );
  assert.ok(auditScreen.includes('MobileBusinessGrowthAuditView'));
  assert.ok(auditScreen.includes('evaluateBusinessAuditAccess'));
});

test('mobile Step 4 sales & owner tools: WhatsApp proposal, QR standee matrix, and pre-filled Free V Ad shortcut', () => {
  const sector = FLAGSHIP_SECTORS[5]; // Salons, Bridal & Wellness
  const live = recalculateLiveAuditState({
    business: {
      is_claimed: true,
      website_url: null,
      instagram_url: null,
      facebook_url: null,
      photo_url: null,
      google_place_id: 'ChIJ_salon_01',
      phone: '9845099112',
      latitude: 12.9716,
      longitude: 77.5946,
    },
    hasActiveVAd: false,
    tickedPillarIds: ['hyperlocal_v_ads', 'dedicated_website', 'social_media_reach'],
    gstIncluded: true,
  });

  const waMsg = buildWhatsAppProposalMessage({
    businessName: 'Aura Bridal Studio',
    sectorTitle: sector.title,
    city: 'Jayanagar',
    audit: live.audit,
    simulation: live.simulation,
    cart: live.cart,
    websitePatternTitle: sector.website_pattern.pattern_title,
  });
  assert.ok(waMsg.includes('*Aura Bridal Studio* (Jayanagar)'));
  assert.ok(waMsg.includes('₹0 Free Forever'));
  assert.ok(waMsg.includes('₹4,999 One-Time'));
  assert.ok(waMsg.includes('₹4,999/month'));
  assert.ok(waMsg.includes('18% GST:'));

  const waHref = buildWhatsAppProposalHref('9845099112', waMsg);
  assert.ok(waHref.startsWith('https://wa.me/919845099112?text='));

  const qrUrl = buildQrStandeeListingUrl({
    businessName: 'Aura Bridal Studio',
    sectorSlug: sector.slug,
    serviceType: 'bridal-makeup-artists',
    city: 'Jayanagar',
  });
  assert.equal(
    qrUrl,
    `https://vistrah.in/services/nearby?business=Aura+Bridal+Studio&category=${sector.slug}&type=bridal-makeup-artists&locality=Jayanagar`,
  );

  const qr = encodeQrMatrix(qrUrl);
  assert.equal((qr.length - 17) % 4, 0);
  assert.equal(qr[0][0], true);
  assert.equal(qr[3][3], true);

  const standeeSvg = buildQrStandeeSvgMarkup({
    businessName: 'Aura Bridal Studio',
    sectorTitle: `${sector.shortTitle} · Jayanagar`,
    targetUrl: qrUrl,
  });
  assert.ok(standeeSvg.includes('Aura Bridal Studio'));

  assert.equal(isFreeVAdPillarActiveOrTicked(live.audit, ['hyperlocal_v_ads']), true);
  assert.equal(isFreeVAdPillarActiveOrTicked(live.audit, ['dedicated_website']), false);

  const vAdHref = buildPrefilledFreeVAdHref({
    businessName: 'Aura Bridal Studio',
    sectorSlug: sector.slug,
    serviceType: 'bridal-makeup-artists',
    city: 'Jayanagar',
  });
  assert.ok(vAdHref.startsWith('/seller/v-ads?tab=upload&business=Aura+Bridal+Studio'));

  const prefill = deriveFreeVAdPrefillFromParams({
    business: 'Aura Bridal Studio',
    category: sector.slug,
    type: 'bridal-makeup-artists',
    locality: 'Jayanagar',
  });
  assert.equal(prefill.hasPrefill, true);
  assert.equal(prefill.adType, 'BRAND');
  assert.ok(prefill.title.includes('Aura Bridal Studio'));
  assert.ok(prefill.title.includes('Jayanagar'));

  const mobileAuditComp = readFileSync(
    new URL('../src/components/business-growth-audit-view.tsx', import.meta.url),
    'utf8',
  );
  assert.ok(mobileAuditComp.includes('Send Proposal on WhatsApp'));
  assert.ok(mobileAuditComp.includes('Print / Save PDF Proposal'));
  assert.ok(mobileAuditComp.includes('Upload Your Free V Ad Now'));
  assert.ok(mobileAuditComp.includes('VISTRAH Verified QR Card'));
});
