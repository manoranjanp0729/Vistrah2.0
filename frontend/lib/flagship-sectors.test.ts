import { describe, expect, it } from 'vitest';
import {
  AUDIT_PILLARS,
  FLAGSHIP_SECTORS,
  TOTAL_AUDIT_POINTS,
  calculateBusinessAuditScore,
  getScoreTierLabel,
  simulateTickedPlan,
} from '../../shared/flagship-sectors';

describe('Plain-Language 7-Pillar Scoring, Score Tiers & 10-Sector Website Patterns', () => {
  it('defines 7 everyday pillars totaling 100 points, plain score tiers, and 10 sector 3-step plans', () => {
    expect(AUDIT_PILLARS).toHaveLength(7);
    expect(AUDIT_PILLARS.reduce((acc, p) => acc + p.max_points, 0)).toBe(TOTAL_AUDIT_POINTS);
    expect(AUDIT_PILLARS.map(p => p.product_title)).toEqual([
      'Get Listed on VISTRAH',
      'Your Own Business Website',
      'Free Local Area Ads (V Ads)',
      'Instagram & Facebook Reels + Page Care',
      'Instagram & Facebook Customer Ads',
      'Professional Shop & Work Photos/Videos',
      'Rank Higher on Google Search & Maps',
    ]);

    expect(getScoreTierLabel(20)).toBe('Hard to Find Online');
    expect(getScoreTierLabel(55)).toBe('Seen, But Losing Customers');
    expect(getScoreTierLabel(80)).toBe('Good Local Reach');
    expect(getScoreTierLabel(95)).toBe('Top Choice in Your Area');

    expect(FLAGSHIP_SECTORS).toHaveLength(10);
    for (const sector of FLAGSHIP_SECTORS) {
      expect(sector.website_pattern.pattern_id).toBeTruthy();
      expect(sector.website_pattern.pattern_title).toBeTruthy();
      expect(sector.website_pattern.key_sections.length).toBeGreaterThanOrEqual(3);
      expect(sector.vertical_strategy.plan_heading).toMatch(/^Simple 3-Step Plan/);
      expect(sector.vertical_strategy.funnel_steps).toHaveLength(3);
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
