import { describe, expect, it } from 'vitest';
import {
  AUDIT_PILLARS,
  FLAGSHIP_SECTORS,
  TOTAL_AUDIT_POINTS,
  calculateBusinessAuditScore,
  simulateTickedPlan,
} from '../../shared/flagship-sectors';

describe('7-Pillar = 7-Product Scoring & 10-Sector Website Blueprints', () => {
  it('defines 7 pillars totaling 100 points and 10 sector website patterns', () => {
    expect(AUDIT_PILLARS).toHaveLength(7);
    expect(AUDIT_PILLARS.reduce((acc, p) => acc + p.max_points, 0)).toBe(TOTAL_AUDIT_POINTS);
    expect(FLAGSHIP_SECTORS).toHaveLength(10);
    for (const sector of FLAGSHIP_SECTORS) {
      expect(sector.website_pattern.pattern_id).toBeTruthy();
      expect(sector.website_pattern.pattern_title).toBeTruthy();
      expect(sector.website_pattern.key_sections.length).toBeGreaterThanOrEqual(3);
      expect(sector.vertical_strategy.recommended_pillar_ids.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('computes deterministic baseline score, gaps, projected score <= 100, and INR totals with 18% GST', () => {
    const audit = calculateBusinessAuditScore({
      is_vistrah_claimed: true,
      website_url: null,
      has_active_v_ad: false,
      google_place_id: 'ChIJ_abc',
      phone: '9845012345',
      has_coordinates: true,
    });
    expect(audit.baseline_score).toBe(30); // vistrah_presence (20) + google_local_seo (10)
    expect(audit.gap_codes).toContain('missing_website');
    expect(audit.gap_codes).not.toContain('unclaimed_vistrah');

    const sim = simulateTickedPlan(audit, [
      'vistrah_presence', // already active -> ₹0, +0 pts
      'hyperlocal_v_ads', // free_forever -> ₹0, +15 pts
      'dedicated_website', // one_time -> ₹4,999, +20 pts
      'visual_brand_media', // one_time -> ₹2,999, +10 pts
      'social_media_reach', // monthly -> ₹4,999, +15 pts
    ]);
    expect(sim.projected_score).toBe(90);
    expect(sim.free_items_count).toBe(1);
    expect(sim.one_time_total_inr).toBe(7998);
    expect(sim.monthly_total_inr).toBe(4999);
    expect(sim.gst_amount_inr).toBe(Math.round((7998 + 4999) * 0.18));
  });
});
