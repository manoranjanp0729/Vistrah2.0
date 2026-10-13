"""Seller-priced products and service packages; checkout is a separate gate."""
from datetime import datetime
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, CheckConstraint, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base
from .models import now


class CommerceListing(Base):
    __tablename__ = 'commerce_listings'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    provider_id: Mapped[int] = mapped_column(ForeignKey('providers.id'), index=True)
    seller_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index=True)
    kind: Mapped[str] = mapped_column(String(20))
    service_id: Mapped[int | None] = mapped_column(ForeignKey('services.id'), nullable=True)
    title: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(Text)
    unit_price_paise: Mapped[int] = mapped_column()
    currency: Mapped[str] = mapped_column(String(3), default='INR')
    available: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(20), default='DRAFT', index=True)
    fulfilment_operator: Mapped[str] = mapped_column(String(10), default='SELLER', server_default='SELLER')
    stock_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    allocated_quantity: Mapped[int] = mapped_column(Integer, default=0, server_default='0')
    fulfilment_modes: Mapped[list] = mapped_column(JSON, default=list, server_default='[]')
    delivery_fee_paise: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cancellation_rule: Mapped[str | None] = mapped_column(String(30), nullable=True)
    submitted_by: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    revision: Mapped[int] = mapped_column(default=1)
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey('users.id'), nullable=True)
    review_note: Mapped[str] = mapped_column(Text, default='')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (
        CheckConstraint("fulfilment_operator IN ('SELLER','VISTRAH') AND (fulfilment_operator = 'SELLER' OR kind = 'SERVICE_PACKAGE')", name='ck_commerce_operator'),
        CheckConstraint('allocated_quantity >= 0 AND ((stock_quantity IS NULL AND allocated_quantity = 0) OR (stock_quantity >= allocated_quantity AND stock_quantity <= 1000000))', name='ck_commerce_stock'),
        CheckConstraint('delivery_fee_paise IS NULL OR (delivery_fee_paise >= 0 AND delivery_fee_paise <= 1000000000)', name='ck_commerce_delivery_fee'),
        CheckConstraint("cancellation_rule IS NULL OR cancellation_rule IN ('BEFORE_DISPATCH','BEFORE_BUILD','BEFORE_SERVICE_START')", name='ck_commerce_cancellation'),
        CheckConstraint("kind IN ('PRODUCT','SERVICE_PACKAGE')", name='ck_commerce_kind'),
        CheckConstraint("status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','ARCHIVED')", name='ck_commerce_status'),
        CheckConstraint("currency = 'INR'", name='ck_commerce_currency'),
        CheckConstraint('unit_price_paise > 0 AND unit_price_paise <= 1000000000', name='ck_commerce_price'),
        CheckConstraint('revision > 0', name='ck_commerce_revision'),
        CheckConstraint("(kind = 'PRODUCT' AND service_id IS NULL) OR (kind = 'SERVICE_PACKAGE' AND service_id IS NOT NULL)", name='ck_commerce_service_kind'),
    )
