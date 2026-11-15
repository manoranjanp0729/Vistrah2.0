"""Canonical seed definitions for pricing_sections and pricing_items (matching shared/marketing-pricing.*)."""
from __future__ import annotations

import json
from pathlib import Path
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from .models import now
from .pricing_models import PricingItem, PricingSection


def _catalogue_path() -> Path:
    for candidate in (
        Path(__file__).resolve().parents[2] / 'shared' / 'marketing-pricing.json',
        Path('/shared/marketing-pricing.json'),
    ):
        if candidate.exists():
            return candidate
    raise FileNotFoundError('shared/marketing-pricing.json not found')


def _default_fee_clarity(category_ids: list[str]) -> str:
    primary = category_ids[0] if category_ids else ''
    if primary == 'websites':
        return 'One-time build · Domain, hosting & gateway fees separate'
    if primary in ('digital', 'social', 'search'):
        return 'Management fee · Ad media spend billed at actuals'
    if primary == 'influencer':
        return 'Campaign scope · Creator & media fees per approved brief'
    if primary in ('branding', 'video'):
        return 'Production fee · Shoots, talent & licensing separate'
    if primary == 'mobility':
        return 'Route & fleet quote · Fabrication & vehicle count separate'
    return 'Site inventory quote · Printing, mounting & permits separate'


def _pillar_section_for_categories(category_ids: list[str]) -> str:
    cats = set(category_ids)
    if cats & {'websites', 'digital', 'social', 'search', 'influencer'}:
        return 'pillar_digital'
    if cats & {'branding', 'video'}:
        return 'pillar_creative'
    if cats & {'mobility'}:
        return 'pillar_mobility'
    return 'pillar_outdoor'


def build_pricing_seed_data() -> tuple[list[dict], list[dict]]:
    ts = now()
    raw = json.loads(_catalogue_path().read_text(encoding='utf-8'))

    sections: list[dict] = [
        {
            'id': 'v_ads_promo',
            'tab_group': 'v_ads',
            'step_label': 'PROMO',
            'title': 'Launch V Ads Free for Your First Month',
            'subtitle': 'Run hyperlocal V Ads across your neighborhood at ₹0 for the first 30 days. Experience real customer inquiries before paying a rupee.',
            'fee_note': '₹0 due today • No upfront payment required • Transparent monthly rates from Day 31',
            'promo_enabled': True,
            'free_trial_days': 30,
            'promo_badge': 'FIRST 30 DAYS FREE · SELF-SERVE V ADS',
            'cta_label': 'Start Free First Month',
            'cta_href': '/seller/v-ads',
            'meta': {
                'anchor_price_label': '₹0',
                'anchor_title': 'First 30 Days Free on V Ads',
                'anchor_summary': (
                    'Verified businesses get 30 days of hyperlocal V Ads visibility at ₹0 (zero auto-charge from Day 31), '
                    'alongside 90 days of Basic Business Membership at ₹0 for eligible new service providers. '
                    'Studio agency & outdoor services are quoted separately.'
                ),
                'secondary_cta_label': 'Register Business Free',
                'secondary_cta_href': '/provide-service',
                'studio_boundary': (
                    'The First 30 Days Free offer applies exclusively to self-serve spatial & 9:16 Reels V Ads. '
                    'VISTRAH Ads & Marketing Studio retainers, creative/video production, outdoor signage, '
                    'and mobility billboards are scoped and billed separately.'
                ),
                'duration_options': [3, 7, 15, 30],
                'catalogue_notice': raw.get('notice', ''),
            },
            'sort_order': 1,
            'active': True,
            'revision': 1,
            'updated_by': None,
            'updated_at': ts,
        },
        {
            'id': 'pillar_digital',
            'tab_group': 'digital',
            'step_label': '01',
            'title': 'Digital Marketing & Web',
            'subtitle': 'Business websites, e-commerce stores, Social Media Management, Local & Standard SEO, Google/Meta Ads, WhatsApp & Email campaigns.',
            'fee_note': 'Agency / build fee · Paid Google & Meta ad spend billed separately at actuals',
            'promo_enabled': False,
            'free_trial_days': 0,
            'promo_badge': '',
            'cta_label': 'Request Custom Media Plan',
            'cta_href': '#custom-media-plan',
            'meta': {
                'pillar_key': 'digital',
                'category_ids': ['websites', 'digital', 'social', 'search', 'influencer'],
                'default_service_id': 'digital-campaign',
                'default_brief': 'Looking for a custom digital marketing & performance plan (target city, monthly ad spend cap, and lead goals): ',
            },
            'sort_order': 2,
            'active': True,
            'revision': 1,
            'updated_by': None,
            'updated_at': ts,
        },
        {
            'id': 'pillar_creative',
            'tab_group': 'creative',
            'step_label': '02',
            'title': 'Branding, Creative & Video Production',
            'subtitle': 'Social media graphics, promotional posters, brand identity kits, 9:16 Promotional Reels, AI Video Ads, and UGC/studio video shoots.',
            'fee_note': 'Creative production fee · On-site shoots, talent, travel & music licensing scoped separately',
            'promo_enabled': False,
            'free_trial_days': 0,
            'promo_badge': '',
            'cta_label': 'Request Custom Media Plan',
            'cta_href': '#custom-media-plan',
            'meta': {
                'pillar_key': 'creative',
                'category_ids': ['branding', 'video'],
                'default_service_id': 'promotional-reel',
                'default_brief': 'Looking for branding, campaign creatives, or 9:16 V Ads video production (deliverables, language, and timeline): ',
            },
            'sort_order': 3,
            'active': True,
            'revision': 1,
            'updated_by': None,
            'updated_at': ts,
        },
        {
            'id': 'pillar_outdoor',
            'tab_group': 'outdoor_mobility',
            'step_label': '03',
            'title': 'Outdoor Advertising, Signage & Cinema',
            'subtitle': 'High-footfall roadside hoardings, bus shelters, digital outdoor screens (DOOH), retail storefront signage, and cinema placements.',
            'fee_note': 'Site-specific quotation · Printing, mounting & municipal permissions confirmed per location',
            'promo_enabled': False,
            'free_trial_days': 0,
            'promo_badge': '',
            'cta_label': 'Request Custom Media Plan',
            'cta_href': '#custom-media-plan',
            'meta': {
                'pillar_key': 'outdoor',
                'category_ids': ['outdoor', 'screens', 'cinema'],
                'default_service_id': 'roadside-hoarding',
                'default_brief': 'Requesting outdoor hoarding, DOOH screen, or signage availability (preferred junctions, dimensions, and dates): ',
            },
            'sort_order': 4,
            'active': True,
            'revision': 1,
            'updated_by': None,
            'updated_at': ts,
        },
        {
            'id': 'pillar_mobility',
            'tab_group': 'outdoor_mobility',
            'step_label': '04',
            'title': 'Mobility Billboard Advertising',
            'subtitle': 'Auto-rickshaw branding, bus panels, and route-mapped transit or fleet branding across commercial corridors and residential catchments.',
            'fee_note': 'Route & fleet quotation · Vehicle count, fabrication & corridor schedules confirmed per city',
            'promo_enabled': False,
            'free_trial_days': 0,
            'promo_badge': '',
            'cta_label': 'Request Custom Media Plan',
            'cta_href': '#custom-media-plan',
            'meta': {
                'pillar_key': 'mobility',
                'category_ids': ['mobility'],
                'default_service_id': 'auto-branding',
                'default_brief': 'Requesting mobility transit or fleet branding options (corridors/pin codes, vehicle count, and duration): ',
            },
            'sort_order': 5,
            'active': True,
            'revision': 1,
            'updated_by': None,
            'updated_at': ts,
        },
        {
            'id': 'packages',
            'tab_group': 'digital',
            'step_label': 'RETAINERS',
            'title': 'Standalone Monthly Marketing Packages',
            'subtitle': 'Standalone agency retainers are separate from seller membership Basic, Plus, and Premium. Third-party ad media spend and 18% GST are extra.',
            'fee_note': 'Monthly retainer · Ad media spend billed at actuals + 18% GST',
            'promo_enabled': False,
            'free_trial_days': 0,
            'promo_badge': '',
            'cta_label': 'Compare packages',
            'cta_href': '#compare',
            'meta': {},
            'sort_order': 6,
            'active': True,
            'revision': 1,
            'updated_by': None,
            'updated_at': ts,
        },
        {
            'id': 'faqs',
            'tab_group': 'faqs',
            'step_label': 'FAQ',
            'title': 'Frequently asked questions',
            'subtitle': 'Billing, 18% GST Input Tax Credit, First-Month-Free V Ads rules, and Studio media quotations.',
            'fee_note': 'BILLING, GST & CAMPAIGN RULES',
            'promo_enabled': False,
            'free_trial_days': 0,
            'promo_badge': '',
            'cta_label': '',
            'cta_href': '',
            'meta': {},
            'sort_order': 7,
            'active': True,
            'revision': 1,
            'updated_by': None,
            'updated_at': ts,
        },
    ]

    items: list[dict] = []

    # 1. Self-Serve V Ads Radius Tiers (First 30 Days Free -> Day 31+ standard rates)
    v_ads_tiers = [
        (1, 'v-ads-2km', 2, '2 km', 'Neighbourhood catchment', 15000, 450000, 900, 1800),
        (2, 'v-ads-5km', 5, '5 km', 'Ward & locality cluster', 25000, 750000, 2200, 4500),
        (3, 'v-ads-10km', 10, '10 km', 'Multi-zone corridor', 45000, 1350000, 5000, 9800),
        (4, 'v-ads-25km', 25, '25 km', 'City-wide metro reach', 80000, 2400000, 12000, 24000),
    ]
    for order, item_id, km, label, zone, daily_paise, monthly_paise, r_min, r_max in v_ads_tiers:
        items.append(
            {
                'id': item_id,
                'section_id': 'v_ads_promo',
                'item_type': 'v_ads_tier',
                'title': label,
                'subtitle': zone,
                'description': f'Self-serve spatial feed & 9:16 V Ads Reels within {km} km of your verified business pin.',
                'price_paise': daily_paise,
                'monthly_price_paise': monthly_paise,
                'billing_interval': 'day',
                'gst_label': '₹0 Month 1 · +18% GST from Day 31',
                'free_trial_enabled': True,
                'free_trial_days': 30,
                'promo_badge': '₹0 First 30 Days',
                'deliverables': [
                    f'₹0 — First 30 Days Free ({km} km {zone.lower()})',
                    'Spatial Feed + V Ads 9:16 Reels placement',
                    'Live views, likes & inquiries in Seller Studio; zero auto-charge on Day 31',
                ],
                'meta': {
                    'radius_km': km,
                    'reach_min_per_day': r_min,
                    'reach_max_per_day': r_max,
                },
                'sort_order': order,
                'active': True,
                'revision': 1,
                'updated_by': None,
                'updated_at': ts,
            }
        )

    # 2. All 34 Studio Agency Services from shared/marketing-pricing.json
    for idx, svc in enumerate(raw.get('services', []), start=1):
        cat_ids = list(svc.get('category_ids', []))
        price_paise = svc.get('starting_price_paise')
        billing = 'quote' if price_paise is None else svc.get('billing', 'one-time')
        items.append(
            {
                'id': svc['id'],
                'section_id': _pillar_section_for_categories(cat_ids),
                'item_type': 'studio_service',
                'title': svc['name'],
                'subtitle': _default_fee_clarity(cat_ids),
                'description': svc.get('description', ''),
                'price_paise': price_paise,
                'monthly_price_paise': price_paise if svc.get('billing') == 'month' else None,
                'billing_interval': billing,
                'gst_label': _default_fee_clarity(cat_ids),
                'free_trial_enabled': False,
                'free_trial_days': 0,
                'promo_badge': '',
                'deliverables': list(svc.get('deliverables', [])),
                'meta': {
                    'category_ids': cat_ids,
                    'addons': list(svc.get('addons', [])),
                    'exclusions': list(svc.get('exclusions', [])),
                    'delivery_note': svc.get('delivery_note'),
                    'pricing_state': svc.get('pricing_state', 'PROPOSED'),
                    'studio_related': bool(svc.get('studio_related', False)),
                    'raw_billing': svc.get('billing', 'one-time'),
                },
                'sort_order': idx,
                'active': bool(svc.get('enabled', True)),
                'revision': 1,
                'updated_by': None,
                'updated_at': ts,
            }
        )

    # 3. All 4 Standalone Monthly Packages
    for idx, pkg in enumerate(raw.get('packages', []), start=1):
        items.append(
            {
                'id': pkg['id'],
                'section_id': 'packages',
                'item_type': 'package',
                'title': pkg['name'],
                'subtitle': 'Standalone monthly marketing retainer',
                'description': pkg.get('note', ''),
                'price_paise': pkg['monthly_price_paise'],
                'monthly_price_paise': pkg['monthly_price_paise'],
                'billing_interval': 'month',
                'gst_label': '18% GST extra · Ad media spend billed separately',
                'free_trial_enabled': False,
                'free_trial_days': 0,
                'promo_badge': '',
                'deliverables': list(pkg.get('features', [])),
                'meta': {
                    'pricing_state': pkg.get('pricing_state', 'PROPOSED'),
                },
                'sort_order': idx,
                'active': True,
                'revision': 1,
                'updated_by': None,
                'updated_at': ts,
            }
        )

    # 4. Pricing FAQs (led by #1 Free First Month of V Ads)
    faqs = [
        (
            'faq-1',
            'How does the Free First Month of V Ads work?',
            'Verified businesses on VISTRAH receive their first 30 days of self-serve spatial V Ads and 9:16 Reels visibility at ₹0—with ₹0 due today and zero automatic billing lock-in. Configure your neighborhood km radius, publish moderated Reels, and track live reach, views, and customer inquiries inside V Ads Seller Studio. Standard transparent rates (plus 18% GST) apply only from Day 31 onward if you choose to continue. VISTRAH Ads & Marketing Studio agency retainers, creative shoots, outdoor hoardings, and mobility billboards are quoted separately.',
        ),
        (
            'faq-2',
            'Do I receive a GST tax invoice for 18% Input Tax Credit (ITC) from Day 31?',
            'Yes. Your first 30 days of self-serve V Ads are ₹0. For paid campaigns from Day 31 onward—or any approved Studio service—applicable 18% GST is itemised separately on tax invoices issued by Vistrah Groups Pvt Ltd so GST-registered businesses can claim eligible B2B Input Tax Credit using their 15-digit GSTIN.',
        ),
        (
            'faq-3',
            'How does the ₹0 90-day Free Basic Membership work alongside Free First Month V Ads?',
            'Eligible new service providers get 90 days of Basic Business Membership at ₹0 (₹149/month afterward, no automatic renewal), which includes your verified business profile, spatial directory presence, 5 job-posting credits, and V Ads Seller Studio access—where you can immediately activate your ₹0 first 30 days of V Ads.',
        ),
        (
            'faq-4',
            'Can I pause, adjust my km radius, or stop before Day 31?',
            'Yes. In V Ads Seller Studio (/seller/v-ads), you can submit updated geo-pin and radius revisions (2 km to 25 km) or withdraw an active video anytime during or after your free 30-day period. Nothing is billed automatically when Day 30 ends.',
        ),
        (
            'faq-5',
            'Does the Free First Month apply to VISTRAH Ads & Marketing Studio, websites, or hoardings?',
            'No. The ₹0 First 30 Days offer applies strictly to self-serve V Ads on the VISTRAH platform. Managed agency retainers (from ₹4,999/month, excluding Google/Meta ad spend), website builds, video production, roadside hoardings, and auto/bus transit branding require separate custom quotations.',
        ),
    ]
    for idx, (faq_id, question, answer) in enumerate(faqs, start=1):
        items.append(
            {
                'id': faq_id,
                'section_id': 'faqs',
                'item_type': 'faq',
                'title': question,
                'subtitle': 'Merchant FAQ',
                'description': answer,
                'price_paise': None,
                'monthly_price_paise': None,
                'billing_interval': 'none',
                'gst_label': '',
                'free_trial_enabled': False,
                'free_trial_days': 0,
                'promo_badge': '',
                'deliverables': [],
                'meta': {'default_open': idx == 1},
                'sort_order': idx,
                'active': True,
                'revision': 1,
                'updated_by': None,
                'updated_at': ts,
            }
        )

    return sections, items


def pricing_tables_ready(db: Session) -> bool:
    inspector = inspect(db.get_bind())
    return all(inspector.has_table(t) for t in ('pricing_sections', 'pricing_items'))


def ensure_pricing_seeded(db: Session) -> bool:
    if not pricing_tables_ready(db):
        return False
    existing_count = db.scalar(select(PricingSection.id).limit(1))
    if existing_count is not None:
        return True
    sections, items = build_pricing_seed_data()
    for s in sections:
        db.add(PricingSection(**s))
    db.flush()
    for item in items:
        db.add(PricingItem(**item))
    db.commit()
    return True
