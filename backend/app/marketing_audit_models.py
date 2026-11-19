"""Database models for VISTRAH Business Growth & Audit CRM leads and Vertical Website Requests."""
from __future__ import annotations

from datetime import datetime
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base
from .models import now

LEAD_STATUSES = ("new", "audit_shared", "follow_up", "website_requested", "closed")
WEBSITE_REQUEST_STATUSES = (
    "new",
    "in_review",
    "quoted",
    "in_progress",
    "completed",
    "cancelled",
)


class MarketingAuditLead(Base):
    __tablename__ = "marketing_audit_leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    business_id: Mapped[str] = mapped_column(String(180), index=True)
    google_place_id: Mapped[str | None] = mapped_column(String(160), nullable=True, index=True)
    provider_id: Mapped[int | None] = mapped_column(
        ForeignKey("providers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    business_name: Mapped[str] = mapped_column(String(200))
    sector_slug: Mapped[str] = mapped_column(String(100), index=True)
    service_type: Mapped[str] = mapped_column(String(120), default="", server_default="")
    city: Mapped[str] = mapped_column(String(150), default="", server_default="", index=True)
    phone: Mapped[str] = mapped_column(String(30), default="", server_default="")
    baseline_score: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    projected_score: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    ticked_pillar_ids: Mapped[list] = mapped_column(JSON, default=list)
    one_time_total_inr: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    monthly_total_inr: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    gst_included: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1")
    lead_status: Mapped[str] = mapped_column(
        String(32), default="new", server_default="new", index=True
    )
    notes: Mapped[str] = mapped_column(Text, default="", server_default="")
    created_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, onupdate=now
    )

    __table_args__ = (
        CheckConstraint(
            "lead_status IN ('new','audit_shared','follow_up','website_requested','closed')",
            name="ck_marketing_audit_leads_status",
        ),
        CheckConstraint(
            "baseline_score >= 0 AND baseline_score <= 100",
            name="ck_marketing_audit_leads_baseline_range",
        ),
        CheckConstraint(
            "projected_score >= 0 AND projected_score <= 100",
            name="ck_marketing_audit_leads_projected_range",
        ),
        CheckConstraint(
            "one_time_total_inr >= 0 AND monthly_total_inr >= 0",
            name="ck_marketing_audit_leads_totals_nonneg",
        ),
    )


class WebsiteRequest(Base):
    __tablename__ = "website_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    business_id: Mapped[str] = mapped_column(String(180), index=True)
    business_name: Mapped[str] = mapped_column(String(200))
    sector_slug: Mapped[str] = mapped_column(String(100), index=True)
    pattern_id: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(30), default="", server_default="")
    city: Mapped[str] = mapped_column(String(150), default="", server_default="")
    requested_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(
        String(32), default="new", server_default="new", index=True
    )
    notes: Mapped[str] = mapped_column(Text, default="", server_default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, onupdate=now
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('new','in_review','quoted','in_progress','completed','cancelled')",
            name="ck_website_requests_status",
        ),
        Index("ix_website_requests_sector_status", "sector_slug", "status"),
    )
