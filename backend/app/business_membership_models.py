"""Additive business membership metadata attached to the existing payment ledger."""
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, JSON, Text, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base
from .models import now


class BusinessSubscription(Base):
    __tablename__ = 'business_subscriptions'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), unique=True)
    non_renewing: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), default=now)


class BusinessCycle(Base):
    __tablename__ = 'business_membership_cycles'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    subscription_id: Mapped[str] = mapped_column(ForeignKey('business_subscriptions.id'), index=True)
    payment_id: Mapped[str] = mapped_column(ForeignKey('payments.id'), unique=True)
    plan_key: Mapped[str] = mapped_column(String(10))
    billing_period: Mapped[str] = mapped_column(String(10))
    state: Mapped[str] = mapped_column(String(12), default='PENDING')
    allowances: Mapped[dict] = mapped_column(JSON)
    starts_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (CheckConstraint("state IN ('PENDING','ACTIVE','FAILED','REFUNDED')"), CheckConstraint("billing_period IN ('MONTHLY','ANNUAL')"), CheckConstraint("plan_key IN ('BASIC','PLUS','PREMIUM')"))


class BusinessAllowance(Base):
    __tablename__ = 'business_allowances'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    cycle_id: Mapped[str | None] = mapped_column(ForeignKey('business_membership_cycles.id'), nullable=True)
    kind: Mapped[str] = mapped_column(String(30))
    allowance: Mapped[int] = mapped_column(Integer)
    used: Mapped[int] = mapped_column(Integer, default=0)
    starts_at: Mapped[object] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[object] = mapped_column(DateTime(timezone=True), index=True)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    expiry_recorded: Mapped[bool] = mapped_column(Boolean, default=False)
    __table_args__ = (UniqueConstraint('cycle_id','kind'), CheckConstraint('allowance > 0 AND used >= 0 AND used <= allowance'))


class BusinessOperation(Base):
    __tablename__ = 'business_benefit_operations'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    key: Mapped[str] = mapped_column(String(120))
    kind: Mapped[str] = mapped_column(String(30))
    quantity: Mapped[int] = mapped_column(Integer)
    subject: Mapped[str] = mapped_column(Text)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (UniqueConstraint('user_id','key'), CheckConstraint('quantity > 0'))


class BusinessEntry(Base):
    __tablename__ = 'business_benefit_entries'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    batch_id: Mapped[str] = mapped_column(ForeignKey('business_allowances.id'), index=True)
    operation_id: Mapped[str | None] = mapped_column(ForeignKey('business_benefit_operations.id'), nullable=True)
    action: Mapped[str] = mapped_column(String(20))
    quantity: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(Text)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (UniqueConstraint('operation_id','batch_id'), CheckConstraint('quantity >= 0'))


class MarketingRequest(Base):
    __tablename__ = 'business_marketing_requests'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    operation_id: Mapped[str] = mapped_column(ForeignKey('business_benefit_operations.id'), unique=True)
    brief: Mapped[str] = mapped_column(Text)
    duration_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default='REQUESTED')
    review_note: Mapped[str] = mapped_column(Text, default='')
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (CheckConstraint("status IN ('REQUESTED','IN_PROGRESS','COMPLETED','CANCELLED')"),)
