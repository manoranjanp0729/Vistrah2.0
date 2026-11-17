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


def _default_fee_clarity(category_ids: list[str], service_id: str = '') -> str:
    if service_id == 'business-workflow-automation':
        return 'Custom automation scope · Third-party API & SaaS fees separate'
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
    if cats & {'websites', 'digital', 'social', 'search'}:
        return 'pillar_digital'
    if cats & {'branding', 'video', 'influencer'}:
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
            'step_label': 'FREE FOREVER',
            'title': 'List Your Business & Upload V Ads — 100% Free Forever',
            'subtitle': 'List your business across all 808+ service types and publish hyperlocal V Ads for any target radius inside VISTRAH at ₹0 forever. Pay only when you hire VISTRAH Ads & Marketing Studio or request custom Website & Automation solutions.',
            'fee_note': '₹0 / Free Forever for Business Listings (808+ services) & Self-Serve V Ads (any radius on VISTRAH) • Zero commission',
            'promo_enabled': True,
            'free_trial_days': 0,
            'promo_badge': '₹0 / FREE FOREVER · LISTING & ANY-RADIUS V ADS',
            'cta_label': 'Create & Upload Free V Ad',
            'cta_href': '/seller/v-ads',
            'meta': {
                'anchor_price_label': '₹0',
                'anchor_title': 'Free Forever: Business Listing + Any-Radius V Ads',
                'anchor_summary': (
                    'List your business across 808+ service types and create & upload V Ads for any target radius on VISTRAH at ₹0 forever. '
                    'Done-for-you VISTRAH Ads & Marketing Studio and Website / Business Automation services are quoted transparently below.'
                ),
                'secondary_cta_label': 'List Business Free',
                'secondary_cta_href': '/seller/onboard',
                'studio_boundary': (
                    'Business listings across all 808+ service types and self-serve V Ads creation/upload for any target radius inside VISTRAH are 100% Free Forever (₹0). '
                    'Paid pricing applies strictly to optional done-for-you VISTRAH Ads & Marketing Studio campaigns/production and VISTRAH Tech Website & Business Automation solutions.'
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
            'id': 'pillar_creative',
            'tab_group': 'creative',
            'step_label': '01',
            'title': 'VISTRAH Ads & Marketing Studio',
            'subtitle': 'Custom commercial video ad production (Reels, Shorts, brand films), graphic & brochure/poster design, brand identity kits, and creator campaigns.',
            'fee_note': 'Creative production fee · On-site shoots, talent, travel & music licensing scoped separately',
            'promo_enabled': False,
            'free_trial_days': 0,
            'promo_badge': '',
            'cta_label': 'Request Custom Media Plan',
            'cta_href': '#custom-media-plan',
            'meta': {
                'pillar_key': 'creative',
                'category_ids': ['branding', 'video', 'influencer'],
                'default_service_id': 'promotional-reel',
                'default_brief': 'Looking for custom commercial video ad production, graphic/brochure design, or brand creatives (deliverables, language, and timeline): ',
            },
            'sort_order': 2,
            'active': True,
            'revision': 1,
            'updated_by': None,
            'updated_at': ts,
        },
        {
            'id': 'pillar_digital',
            'tab_group': 'digital',
            'step_label': '02',
            'title': 'Website & Digital Setup (VISTRAH Tech / Automation)',
            'subtitle': 'Custom business website design & launch, booking/e-commerce portals, business workflow automation, WhatsApp setup, SEO, and managed Meta/Google/social marketing campaigns.',
            'fee_note': 'One-time build or monthly agency fee · Domain, cloud & Meta/Google ad spend billed separately at actuals',
            'promo_enabled': False,
            'free_trial_days': 0,
            'promo_badge': '',
            'cta_label': 'Request Custom Media Plan',
            'cta_href': '#custom-media-plan',
            'meta': {
                'pillar_key': 'digital',
                'category_ids': ['websites', 'digital', 'social', 'search'],
                'default_service_id': 'business-website',
                'default_brief': 'Looking for custom business website development, business workflow automation, or managed Meta/Google/social campaigns (city, goals, and timeline): ',
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
            'subtitle': '₹0 / Free Forever business listings & any-radius V Ads, Studio quotations, Website & Automation builds, and 18% GST Input Tax Credit.',
            'fee_note': 'FREE PLATFORM, STUDIO & GST RULES',
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

    # 1. Self-Serve V Ads Radius Tiers — ₹0 / Free Forever for ANY radius on VISTRAH
    v_ads_tiers = [
        (1, 'v-ads-2km', 2, '2 km', 'Neighbourhood catchment', 0, 0, 900, 1800),
        (2, 'v-ads-5km', 5, '5 km', 'Ward & locality cluster', 0, 0, 2200, 4500),
        (3, 'v-ads-10km', 10, '10 km', 'Multi-zone corridor', 0, 0, 5000, 9800),
        (4, 'v-ads-25km', 25, '25 km', 'City-wide metro reach', 0, 0, 12000, 24000),
        (5, 'v-ads-50km', 50, '50 km+', 'District & regional reach', 0, 0, 20000, 45000),
    ]
    for order, item_id, km, label, zone, daily_paise, monthly_paise, r_min, r_max in v_ads_tiers:
        items.append(
            {
                'id': item_id,
                'section_id': 'v_ads_promo',
                'item_type': 'v_ads_tier',
                'title': label,
                'subtitle': zone,
                'description': f'Free for any radius on VISTRAH — 9:16 V Ads Reels & nearby discovery within {label} of your verified pin.',
                'price_paise': daily_paise,
                'monthly_price_paise': monthly_paise,
                'billing_interval': 'none',
                'gst_label': '₹0 / Free Forever · Any radius on VISTRAH',
                'free_trial_enabled': True,
                'free_trial_days': 0,
                'promo_badge': '₹0 Free Forever',
                'deliverables': [
                    f'₹0 / Free Forever — Free for any radius on VISTRAH ({label} {zone.lower()})',
                    'Free business listing across 808+ service types + 9:16 V Ads Reels placement',
                    'Direct Call, Website, Directions & live engagement metrics in Seller Studio',
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

    # 2. All Studio Agency & Website/Automation Services from shared/marketing-pricing.json
    for idx, svc in enumerate(raw.get('services', []), start=1):
        cat_ids = list(svc.get('category_ids', []))
        price_paise = svc.get('starting_price_paise')
        billing = 'quote' if price_paise is None else svc.get('billing', 'one-time')
        fee_clarity = _default_fee_clarity(cat_ids, svc.get('id', ''))
        items.append(
            {
                'id': svc['id'],
                'section_id': _pillar_section_for_categories(cat_ids),
                'item_type': 'studio_service',
                'title': svc['name'],
                'subtitle': fee_clarity,
                'description': svc.get('description', ''),
                'price_paise': price_paise,
                'monthly_price_paise': price_paise if svc.get('billing') == 'month' else None,
                'billing_interval': billing,
                'gst_label': fee_clarity,
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

    # 4. Pricing FAQs (₹0 / Free Forever Listings & Any-Radius V Ads + Paid Studio/Website/Automation)
    faqs = [
        (
            'faq-1',
            'Are business listings and uploading V Ads really 100% free for any radius?',
            'Yes! Listing your business across all 808+ service types on VISTRAH (/seller/onboard) and creating/uploading self-serve V Ads for ANY target radius inside VISTRAH (/seller/v-ads) are ₹0 / Free Forever—with zero per-radius charges and zero lead commissions. All V Ads go through standard quality moderation before appearing live.',
        ),
        (
            'faq-2',
            'What services are paid on VISTRAH?',
            'Paid pricing applies only when you hire our done-for-you teams: (1) VISTRAH Ads & Marketing Studio for custom commercial video production (Reels, Shorts, brand films), graphic/brochure design, managed Meta/Google/social campaigns, outdoor hoardings, and transit branding; and (2) Website & Digital Setup (VISTRAH Tech / Automation) for custom business website design & launch and business workflow automation.',
        ),
        (
            'faq-3',
            'How do I request a custom business website or workflow automation?',
            'Select any Website Design & Development or Business Workflow Automation option on /pricing to request an itemised INR quote, or tap "Request website" from any listing card (/contact?intent=request-website) so our VISTRAH Tech team can scope your domain, design, WhatsApp enquiry flow, and automation setup.',
        ),
        (
            'faq-4',
            'Can I change my V Ads target radius anytime without paying extra?',
            'Yes. Inside V Ads Studio (/seller/v-ads), you can configure or update your geographic pin and target radius—whether 2 km neighbourhood reach, 10 km city corridor, 25 km metro reach, or wider—at ₹0 forever. Updated targeting revisions go live right after admin moderation review.',
        ),
        (
            'faq-5',
            'Do paid Studio, Website, and Automation projects include GST tax invoices?',
            'Yes. For any approved paid VISTRAH Ads & Marketing Studio campaign, creative shoot, custom website build, or workflow automation project, Vistrah India Pvt Limited issues an itemised INR tax invoice with 18% GST separated so GST-registered businesses can claim eligible B2B Input Tax Credit (ITC) using their 15-digit GSTIN.',
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


def sync_free_v_ads_pricing(db: Session) -> dict[str, int]:
    """Idempotently sync canonical Free-Forever V Ads, Studio pillars, Website/Automation & FAQs into DB."""
    if not pricing_tables_ready(db):
        return {'sections_upserted': 0, 'items_upserted': 0}
    sections, items = build_pricing_seed_data()
    ts = now()
    sec_count = 0
    for s in sections:
        existing_sec = db.get(PricingSection, s['id'])
        if existing_sec is None:
            db.add(PricingSection(**s))
        else:
            existing_sec.tab_group = s['tab_group']
            existing_sec.step_label = s['step_label']
            existing_sec.title = s['title']
            existing_sec.subtitle = s['subtitle']
            existing_sec.fee_note = s['fee_note']
            existing_sec.promo_enabled = s['promo_enabled']
            existing_sec.free_trial_days = s['free_trial_days']
            existing_sec.promo_badge = s['promo_badge']
            existing_sec.cta_label = s['cta_label']
            existing_sec.cta_href = s['cta_href']
            existing_sec.meta = s['meta']
            existing_sec.sort_order = s['sort_order']
            existing_sec.updated_at = ts
        sec_count += 1
    db.flush()

    item_count = 0
    for item in items:
        existing_item = db.get(PricingItem, item['id'])
        if existing_item is None:
            db.add(PricingItem(**item))
            item_count += 1
        elif item['item_type'] in ('v_ads_tier', 'faq') or item['id'] == 'business-workflow-automation':
            existing_item.section_id = item['section_id']
            existing_item.title = item['title']
            existing_item.subtitle = item['subtitle']
            existing_item.description = item['description']
            existing_item.price_paise = item['price_paise']
            existing_item.monthly_price_paise = item['monthly_price_paise']
            existing_item.billing_interval = item['billing_interval']
            existing_item.gst_label = item['gst_label']
            existing_item.free_trial_enabled = item['free_trial_enabled']
            existing_item.free_trial_days = item['free_trial_days']
            existing_item.promo_badge = item['promo_badge']
            existing_item.deliverables = item['deliverables']
            existing_item.meta = item['meta']
            existing_item.sort_order = item['sort_order']
            existing_item.updated_at = ts
            item_count += 1
        else:
            existing_item.section_id = item['section_id']
    db.commit()
    return {'sections_upserted': sec_count, 'items_upserted': item_count}


if __name__ == '__main__':
    from .database import SessionLocal

    with SessionLocal() as session:
        summary = sync_free_v_ads_pricing(session)
        print(json.dumps(summary))
