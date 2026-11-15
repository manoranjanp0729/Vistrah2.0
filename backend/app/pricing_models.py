"""Database models for the live Admin Pricing Editor (sections, promos, V Ads tiers, Studio pillars, packages & FAQs)."""
from __future__ import annotations

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base
from .models import now


class PricingSection(Base):
    __tablename__ = 'pricing_sections'

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    tab_group: Mapped[str] = mapped_column(String(40), index=True)
    step_label: Mapped[str] = mapped_column(String(24), default='')
    title: Mapped[str] = mapped_column(String(240))
    subtitle: Mapped[str] = mapped_column(Text, default='')
    fee_note: Mapped[str] = mapped_column(String(320), default='')
    promo_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    free_trial_days: Mapped[int] = mapped_column(Integer, default=0)
    promo_badge: Mapped[str] = mapped_column(String(160), default='')
    cta_label: Mapped[str] = mapped_column(String(120), default='')
    cta_href: Mapped[str] = mapped_column(String(200), default='')
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    updated_by: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), default=now)

    __table_args__ = (
        CheckConstraint('revision > 0', name='ck_pricing_sections_revision_pos'),
        CheckConstraint('free_trial_days >= 0', name='ck_pricing_sections_trial_nonneg'),
    )


class PricingItem(Base):
    __tablename__ = 'pricing_items'

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    section_id: Mapped[str] = mapped_column(ForeignKey('pricing_sections.id'), index=True)
    item_type: Mapped[str] = mapped_column(String(32), index=True)
    title: Mapped[str] = mapped_column(String(240))
    subtitle: Mapped[str] = mapped_column(String(240), default='')
    description: Mapped[str] = mapped_column(Text, default='')
    price_paise: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    monthly_price_paise: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    billing_interval: Mapped[str] = mapped_column(String(32), default='one-time')
    gst_label: Mapped[str] = mapped_column(String(200), default='18% GST extra')
    free_trial_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    free_trial_days: Mapped[int] = mapped_column(Integer, default=0)
    promo_badge: Mapped[str] = mapped_column(String(120), default='')
    deliverables: Mapped[list] = mapped_column(JSON, default=list)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    updated_by: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), default=now)

    __table_args__ = (
        CheckConstraint('revision > 0', name='ck_pricing_items_revision_pos'),
        CheckConstraint('free_trial_days >= 0', name='ck_pricing_items_trial_nonneg'),
    )
