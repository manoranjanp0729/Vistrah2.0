"""Public & Admin Pricing Editor APIs (/api/pricing and /api/admin/pricing)."""
from __future__ import annotations

import copy
import re
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import Audit, User, now
from .pricing_models import PricingItem, PricingSection
from .pricing_seed import (
    _catalogue_path,
    build_pricing_seed_data,
    ensure_pricing_seeded,
)
from .schemas import Schema
from .security import admin_user
import json

router = APIRouter(tags=['Pricing Editor'])

BillingInterval = Literal['day', 'month', 'one-time', 'quote', 'none']
ItemType = Literal['v_ads_tier', 'studio_service', 'package', 'faq']


def _iso(val) -> str | None:
    return val.isoformat() if hasattr(val, 'isoformat') and val is not None else val


def serialize_section(row: PricingSection | dict) -> dict:
    if isinstance(row, dict):
        return {
            'id': row['id'],
            'tab_group': row['tab_group'],
            'step_label': row['step_label'],
            'title': row['title'],
            'subtitle': row['subtitle'],
            'fee_note': row['fee_note'],
            'promo_enabled': bool(row['promo_enabled']),
            'free_trial_days': int(row['free_trial_days']),
            'promo_badge': row['promo_badge'],
            'cta_label': row['cta_label'],
            'cta_href': row['cta_href'],
            'meta': row.get('meta') or {},
            'sort_order': int(row['sort_order']),
            'active': bool(row['active']),
            'revision': int(row.get('revision', 1)),
            'updated_at': _iso(row.get('updated_at')),
        }
    return {
        'id': row.id,
        'tab_group': row.tab_group,
        'step_label': row.step_label,
        'title': row.title,
        'subtitle': row.subtitle,
        'fee_note': row.fee_note,
        'promo_enabled': bool(row.promo_enabled),
        'free_trial_days': int(row.free_trial_days),
        'promo_badge': row.promo_badge,
        'cta_label': row.cta_label,
        'cta_href': row.cta_href,
        'meta': row.meta or {},
        'sort_order': int(row.sort_order),
        'active': bool(row.active),
        'revision': int(row.revision),
        'updated_at': _iso(row.updated_at),
    }


def serialize_item(row: PricingItem | dict) -> dict:
    if isinstance(row, dict):
        return {
            'id': row['id'],
            'section_id': row['section_id'],
            'item_type': row['item_type'],
            'title': row['title'],
            'subtitle': row['subtitle'],
            'description': row['description'],
            'price_paise': row['price_paise'],
            'monthly_price_paise': row['monthly_price_paise'],
            'billing_interval': row['billing_interval'],
            'gst_label': row['gst_label'],
            'free_trial_enabled': bool(row['free_trial_enabled']),
            'free_trial_days': int(row['free_trial_days']),
            'promo_badge': row['promo_badge'],
            'deliverables': list(row.get('deliverables') or []),
            'meta': row.get('meta') or {},
            'sort_order': int(row['sort_order']),
            'active': bool(row['active']),
            'revision': int(row.get('revision', 1)),
            'updated_at': _iso(row.get('updated_at')),
        }
    return {
        'id': row.id,
        'section_id': row.section_id,
        'item_type': row.item_type,
        'title': row.title,
        'subtitle': row.subtitle,
        'description': row.description,
        'price_paise': row.price_paise,
        'monthly_price_paise': row.monthly_price_paise,
        'billing_interval': row.billing_interval,
        'gst_label': row.gst_label,
        'free_trial_enabled': bool(row.free_trial_enabled),
        'free_trial_days': int(row.free_trial_days),
        'promo_badge': row.promo_badge,
        'deliverables': list(row.deliverables or []),
        'meta': row.meta or {},
        'sort_order': int(row.sort_order),
        'active': bool(row.active),
        'revision': int(row.revision),
        'updated_at': _iso(row.updated_at),
    }


def _clean_deliverables(values: list[str]) -> list[str]:
    cleaned: list[str] = []
    for raw_item in values:
        text = raw_item.strip()
        if not text:
            continue
        if len(text) > 300:
            raise HTTPException(422, 'Each deliverable bullet must be 300 characters or fewer.')
        cleaned.append(text)
    if len(cleaned) > 30:
        raise HTTPException(422, 'At most 30 deliverable items are allowed.')
    return cleaned


def _catalogue_static_meta() -> dict:
    raw = json.loads(_catalogue_path().read_text(encoding='utf-8'))
    return {
        'currency': raw.get('currency', 'INR'),
        'notice': raw.get('notice', ''),
        'categories': raw.get('categories', []),
    }


def _item_to_catalogue_service(item: dict) -> dict:
    meta = item.get('meta') or {}
    billing_interval = item['billing_interval']
    billing: str = 'month' if billing_interval == 'month' else 'one-time'
    price = None if billing_interval == 'quote' else item['price_paise']
    return {
        'id': item['id'],
        'name': item['title'],
        'category_ids': list(meta.get('category_ids') or ['digital']),
        'starting_price_paise': price,
        'billing': billing,
        'description': item['description'],
        'deliverables': list(item.get('deliverables') or []),
        'addons': list(meta.get('addons') or []),
        'exclusions': list(meta.get('exclusions') or []),
        'delivery_note': meta.get('delivery_note'),
        'enabled': bool(item['active']),
        'pricing_state': meta.get('pricing_state', 'APPROVED'),
        'studio_related': bool(meta.get('studio_related', False)),
        'gst_label': item.get('gst_label', ''),
        'subtitle': item.get('subtitle', ''),
    }


def _item_to_catalogue_package(item: dict) -> dict:
    meta = item.get('meta') or {}
    monthly = item['monthly_price_paise'] if item['monthly_price_paise'] is not None else (item['price_paise'] or 0)
    return {
        'id': item['id'],
        'name': item['title'],
        'monthly_price_paise': monthly,
        'features': list(item.get('deliverables') or []),
        'pricing_state': meta.get('pricing_state', 'APPROVED'),
        'note': item['description'],
        'gst_label': item.get('gst_label', ''),
    }


class PricingSectionUpdate(Schema):
    title: str = Field(min_length=2, max_length=240)
    subtitle: str = Field(default='', max_length=3000)
    fee_note: str = Field(default='', max_length=320)
    promo_enabled: bool = False
    free_trial_days: int = Field(default=0, ge=0, le=365, strict=True)
    promo_badge: str = Field(default='', max_length=160)
    cta_label: str = Field(default='', max_length=120)
    cta_href: str = Field(default='', max_length=200)
    meta: dict | None = None
    sort_order: int | None = Field(default=None, ge=0, le=10000, strict=True)
    active: bool = True
    expected_revision: int | None = Field(default=None, ge=1, strict=True)


class PricingItemUpdate(Schema):
    title: str = Field(min_length=2, max_length=240)
    subtitle: str = Field(default='', max_length=240)
    description: str = Field(default='', max_length=5000)
    price_paise: int | None = Field(default=None, ge=0, le=10000000000, strict=True)
    monthly_price_paise: int | None = Field(default=None, ge=0, le=10000000000, strict=True)
    billing_interval: BillingInterval = 'one-time'
    gst_label: str = Field(default='18% GST extra', max_length=200)
    free_trial_enabled: bool = False
    free_trial_days: int = Field(default=0, ge=0, le=365, strict=True)
    promo_badge: str = Field(default='', max_length=120)
    deliverables: list[str] = Field(default_factory=list, max_length=30)
    meta: dict | None = None
    sort_order: int | None = Field(default=None, ge=0, le=10000, strict=True)
    active: bool = True
    expected_revision: int | None = Field(default=None, ge=1, strict=True)


class PricingItemCreate(PricingItemUpdate):
    id: str = Field(min_length=2, max_length=80, pattern=r'^[a-z0-9][a-z0-9-]*$')
    section_id: str = Field(min_length=2, max_length=80)
    item_type: ItemType


@router.get('/pricing')
@router.get('/api/pricing')
def get_public_pricing(response: Response, db: Session = Depends(get_db)):
    response.headers['Cache-Control'] = 'no-store'
    static_meta = _catalogue_static_meta()
    if ensure_pricing_seeded(db):
        sec_rows = db.scalars(
            select(PricingSection)
            .where(PricingSection.active == True)  # noqa: E712
            .order_by(PricingSection.sort_order.asc(), PricingSection.id.asc())
        ).all()
        active_sec_ids = {s.id for s in sec_rows}
        item_rows = db.scalars(
            select(PricingItem)
            .where(PricingItem.active == True)  # noqa: E712
            .order_by(PricingItem.sort_order.asc(), PricingItem.id.asc())
        ).all()
        sections = [serialize_section(s) for s in sec_rows]
        items = [serialize_item(i) for i in item_rows if i.section_id in active_sec_ids]
    else:
        raw_secs, raw_items = build_pricing_seed_data()
        sections = [serialize_section(s) for s in raw_secs if s['active']]
        active_sec_ids = {s['id'] for s in sections}
        items = [serialize_item(i) for i in raw_items if i['active'] and i['section_id'] in active_sec_ids]

    promo_section = next((s for s in sections if s['id'] == 'v_ads_promo'), None)
    pillars = [
        s
        for s in sections
        if s['id'] in ('pillar_digital', 'pillar_creative', 'pillar_outdoor', 'pillar_mobility')
    ]
    v_ads_tiers = [i for i in items if i['item_type'] == 'v_ads_tier']
    studio_services = [_item_to_catalogue_service(i) for i in items if i['item_type'] == 'studio_service']
    packages = [_item_to_catalogue_package(i) for i in items if i['item_type'] == 'package']
    faqs = [
        {
            'id': i['id'],
            'question': i['title'],
            'answer': i['description'],
            'default_open': bool((i.get('meta') or {}).get('default_open', False)),
        }
        for i in items
        if i['item_type'] == 'faq'
    ]

    return {
        'currency': static_meta['currency'],
        'notice': (promo_section or {}).get('meta', {}).get('catalogue_notice') or static_meta['notice'],
        'categories': static_meta['categories'],
        'promo': promo_section,
        'v_ads_tiers': v_ads_tiers,
        'pillars': pillars,
        'services': studio_services,
        'packages': packages,
        'faqs': faqs,
        'sections': sections,
        'items': items,
    }


@router.get('/admin/pricing')
@router.get('/api/admin/pricing')
def get_admin_pricing(
    response: Response,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    response.headers['Cache-Control'] = 'private, no-store'
    if not ensure_pricing_seeded(db):
        raise HTTPException(503, 'Pricing Editor tables are not migrated on this server yet.')
    static_meta = _catalogue_static_meta()
    sections = [
        serialize_section(s)
        for s in db.scalars(
            select(PricingSection).order_by(PricingSection.sort_order.asc(), PricingSection.id.asc())
        ).all()
    ]
    items = [
        serialize_item(i)
        for i in db.scalars(
            select(PricingItem).order_by(PricingItem.sort_order.asc(), PricingItem.id.asc())
        ).all()
    ]
    return {
        'currency': static_meta['currency'],
        'categories': static_meta['categories'],
        'sections': sections,
        'items': items,
    }


@router.put('/admin/pricing/sections/{section_id}')
@router.put('/api/admin/pricing/sections/{section_id}')
def update_pricing_section(
    section_id: str,
    data: PricingSectionUpdate,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    if not ensure_pricing_seeded(db):
        raise HTTPException(503, 'Pricing Editor tables are not migrated on this server yet.')
    row = db.get(PricingSection, section_id)
    if not row:
        raise HTTPException(404, 'Pricing section not found')
    if data.expected_revision is not None and row.revision != data.expected_revision:
        raise HTTPException(409, 'Pricing section changed in another session. Reload before saving.')

    row.title = data.title.strip()
    row.subtitle = data.subtitle.strip()
    row.fee_note = data.fee_note.strip()
    row.promo_enabled = data.promo_enabled
    row.free_trial_days = data.free_trial_days if data.promo_enabled else 0
    row.promo_badge = data.promo_badge.strip()
    row.cta_label = data.cta_label.strip()
    row.cta_href = data.cta_href.strip()
    if data.meta is not None:
        merged_meta = copy.deepcopy(row.meta or {})
        merged_meta.update(data.meta)
        row.meta = merged_meta
    if data.sort_order is not None:
        row.sort_order = data.sort_order
    row.active = data.active
    row.revision = int(row.revision) + 1
    row.updated_by = user.id
    row.updated_at = now()

    db.add(
        Audit(
            actor_id=user.id,
            action='PRICING_SECTION_UPDATED',
            entity='pricing_section',
            entity_id=section_id,
            details={
                'title': row.title,
                'promo_enabled': row.promo_enabled,
                'free_trial_days': row.free_trial_days,
                'active': row.active,
                'revision': row.revision,
            },
        )
    )
    db.commit()
    db.refresh(row)
    return serialize_section(row)


@router.post('/admin/pricing/items', status_code=201)
@router.post('/api/admin/pricing/items', status_code=201)
def create_pricing_item(
    data: PricingItemCreate,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    if not ensure_pricing_seeded(db):
        raise HTTPException(503, 'Pricing Editor tables are not migrated on this server yet.')
    if not re.match(r'^[a-z0-9][a-z0-9-]*$', data.id):
        raise HTTPException(422, 'Item ID must contain lowercase letters, numbers, and hyphens only.')
    if db.get(PricingItem, data.id):
        raise HTTPException(409, 'A pricing item with this ID already exists.')
    sec = db.get(PricingSection, data.section_id)
    if not sec:
        raise HTTPException(404, 'Target pricing section not found.')

    deliverables = _clean_deliverables(data.deliverables)
    price_paise = None if data.billing_interval in ('quote', 'none') else data.price_paise
    monthly_paise = None if data.billing_interval in ('quote', 'none') else data.monthly_price_paise
    if data.item_type == 'v_ads_tier' and price_paise is not None and monthly_paise is None:
        monthly_paise = price_paise * 30

    row = PricingItem(
        id=data.id,
        section_id=data.section_id,
        item_type=data.item_type,
        title=data.title.strip(),
        subtitle=data.subtitle.strip(),
        description=data.description.strip(),
        price_paise=price_paise,
        monthly_price_paise=monthly_paise,
        billing_interval=data.billing_interval,
        gst_label=data.gst_label.strip(),
        free_trial_enabled=data.free_trial_enabled,
        free_trial_days=data.free_trial_days if data.free_trial_enabled else 0,
        promo_badge=data.promo_badge.strip(),
        deliverables=deliverables,
        meta=data.meta or {},
        sort_order=data.sort_order if data.sort_order is not None else 99,
        active=data.active,
        revision=1,
        updated_by=user.id,
        updated_at=now(),
    )
    db.add(row)
    db.add(
        Audit(
            actor_id=user.id,
            action='PRICING_ITEM_CREATED',
            entity='pricing_item',
            entity_id=row.id,
            details={
                'section_id': row.section_id,
                'item_type': row.item_type,
                'price_paise': row.price_paise,
                'active': row.active,
            },
        )
    )
    db.commit()
    db.refresh(row)
    return serialize_item(row)


@router.put('/admin/pricing/{item_id}')
@router.put('/api/admin/pricing/{item_id}')
def update_pricing_item(
    item_id: str,
    data: PricingItemUpdate,
    user: User = Depends(admin_user),
    db: Session = Depends(get_db),
):
    if not ensure_pricing_seeded(db):
        raise HTTPException(503, 'Pricing Editor tables are not migrated on this server yet.')
    row = db.get(PricingItem, item_id)
    if not row:
        raise HTTPException(404, 'Pricing item not found')
    if data.expected_revision is not None and row.revision != data.expected_revision:
        raise HTTPException(409, 'Pricing item changed in another session. Reload before saving.')

    deliverables = _clean_deliverables(data.deliverables)
    if row.item_type == 'studio_service' and not deliverables:
        raise HTTPException(422, 'Studio services require at least one deliverable bullet.')

    price_paise = None if data.billing_interval in ('quote', 'none') else data.price_paise
    monthly_paise = None if data.billing_interval in ('quote', 'none') else data.monthly_price_paise
    if row.item_type == 'v_ads_tier' and price_paise is not None and monthly_paise is None:
        monthly_paise = price_paise * 30
    if row.item_type == 'package' and price_paise is not None:
        monthly_paise = price_paise

    previous_price = row.price_paise
    row.title = data.title.strip()
    row.subtitle = data.subtitle.strip()
    row.description = data.description.strip()
    row.price_paise = price_paise
    row.monthly_price_paise = monthly_paise
    row.billing_interval = data.billing_interval
    row.gst_label = data.gst_label.strip()
    row.free_trial_enabled = data.free_trial_enabled
    row.free_trial_days = data.free_trial_days if data.free_trial_enabled else 0
    row.promo_badge = data.promo_badge.strip()
    row.deliverables = deliverables
    if data.meta is not None:
        merged_meta = copy.deepcopy(row.meta or {})
        merged_meta.update(data.meta)
        row.meta = merged_meta
    if data.sort_order is not None:
        row.sort_order = data.sort_order
    row.active = data.active
    row.revision = int(row.revision) + 1
    row.updated_by = user.id
    row.updated_at = now()

    db.add(
        Audit(
            actor_id=user.id,
            action='PRICING_ITEM_UPDATED',
            entity='pricing_item',
            entity_id=item_id,
            details={
                'previous_price_paise': previous_price,
                'price_paise': row.price_paise,
                'monthly_price_paise': row.monthly_price_paise,
                'billing_interval': row.billing_interval,
                'free_trial_enabled': row.free_trial_enabled,
                'free_trial_days': row.free_trial_days,
                'active': row.active,
                'revision': row.revision,
            },
        )
    )
    db.commit()
    db.refresh(row)
    return serialize_item(row)
